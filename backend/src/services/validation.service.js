import { db } from '../storage/db.js';
import { geminiService } from './gemini.service.js';
import { fileStorage } from '../storage/fileStorage.js';

export const validationService = {
  /**
   * Run Autonomous Agentic Gemini LLM Forensic Evaluation suite against a document
   */
  async runValidation({ document, extractedData, lineItems, userId }) {
    // 1. Fetch user's existing documents to provide historical context (for duplicate/pricing anomaly checks)
    let userDocs = [];
    try {
      const existing = await db.documents.findByUserId(userId, { limit: 100 });
      userDocs = existing?.documents || [];
    } catch (e) {
      // Continue without history if lookup fails
    }

    // 2. Fetch file buffer if available for multimodal verification
    let buffer = null;
    try {
      if (document.storage_path) {
        buffer = await fileStorage.getFileBuffer(document.storage_path);
      }
    } catch (e) {
      // Buffer optional
    }

    // 3. Run Autonomous Agentic Evaluation via Gemini LLM
    const evaluation = await geminiService.evaluateDocumentWithAgent({
      document,
      extractedData,
      lineItems,
      userDocuments: userDocs,
      buffer,
      mimeType: document.mime_type,
    });

    // 4. Format findings for database storage
    const issues = (evaluation.findings || []).map((f) => ({
      user_id: userId,
      document_id: document.id,
      issue_type: f.issue_type || 'COMPLIANCE_ANOMALY',
      severity: f.severity || 'Warning',
      field_name: f.field_name || 'general',
      extracted_value: f.extracted_value !== undefined && f.extracted_value !== null ? String(f.extracted_value) : null,
      expected_value: f.expected_value || 'Standard Compliance Value',
      explanation: f.explanation + (f.recommendation ? `\n\n💡 Auditor Recommendation: ${f.recommendation}` : ''),
      recommendation: f.recommendation || 'Review document before approval.',
    }));

    // 5. Store issues in DB
    await db.validationIssues.deleteByDocumentId(document.id);
    if (issues.length > 0) {
      await db.validationIssues.createMany(issues);
    }

    // 6. Update extractedData with agentic evaluation (audit score, recommendations, summary)
    const existingExtractedJson = extractedData.extracted_json || {};
    const updatedExtractedJson = {
      ...existingExtractedJson,
      agentic_evaluation: {
        audit_score: evaluation.audit_score,
        overall_status: evaluation.overall_status,
        executive_summary: evaluation.executive_summary,
        actionable_recommendations: evaluation.actionable_recommendations || [],
        source: evaluation.source || 'gemini_agentic_evaluator',
      },
    };

    await db.extractedData.update(extractedData.id, {
      extracted_json: updatedExtractedJson,
    });

    // 7. Update document validation status and summary
    const overallStatus = evaluation.overall_status || 'Valid';
    await db.documents.update(document.id, {
      validation_status: overallStatus,
      processing_status: overallStatus === 'Critical Issue' ? 'Review Required' : 'Processed',
      summary: evaluation.executive_summary || document.summary,
    });

    return {
      validationStatus: overallStatus,
      auditScore: evaluation.audit_score,
      executiveSummary: evaluation.executive_summary,
      actionableRecommendations: evaluation.actionable_recommendations,
      issuesCount: issues.length,
      issues,
    };
  },

  /**
   * Handle user manual review, approval, corrections, or rejection
   */
  async recordReview({ documentId, userId, action, notes, corrections }) {
    // 1. Record in audit trail
    const reviewRecord = await db.documentReviews.create({
      document_id: documentId,
      user_id: userId,
      reviewer_action: action,
      review_notes: notes || '',
      correction_data: corrections || null,
    });

    // 2. If corrections are provided, update extracted data safely
    if (corrections && Object.keys(corrections).length > 0) {
      const ext = await db.extractedData.findByDocumentId(documentId);
      if (ext) {
        await db.extractedData.update(ext.id, corrections);
      }
    }

    // 3. Update document validation status based on action
    let newStatus = 'Valid';
    if (action === 'Reject') newStatus = 'Critical Issue';
    if (action === 'Mark for Review') newStatus = 'Review Required';
    if (action === 'Approve') newStatus = 'Valid';

    await db.documents.update(documentId, {
      validation_status: newStatus,
      processing_status: action === 'Reject' ? 'Failed' : 'Processed',
    });

    // 4. If approved or corrected, resolve open validation issues
    if (action === 'Approve') {
      const issues = await db.validationIssues.findByDocumentId(documentId);
      for (const iss of issues) {
        await db.validationIssues.updateStatus(iss.id, 'Resolved');
      }
    }

    return reviewRecord;
  },
};
