import { geminiService } from '../services/gemini.service.js';
import { analyticsService } from '../services/analytics.service.js';
import { db } from '../storage/db.js';
import { successResponse } from '../utils/response.js';
import { askInsightSchema } from '../validators/document.schema.js';

export const insightsController = {
  /**
   * Ask natural language questions grounded in database data
   */
  async askQuestion(req, res, next) {
    try {
      const { question } = askInsightSchema.parse(req.body);

      // Fetch current user's real documents and extractions
      const { documents } = await db.documents.findByUserId(req.user.id, { limit: 500 });
      const userExtractions = [];
      for (const d of documents) {
        const ext = await db.extractedData.findByDocumentId(d.id);
        if (ext) userExtractions.push(ext);
      }
      const validationIssues = await db.validationIssues.findByUserId(req.user.id, {});

      const answerData = await geminiService.answerUserQuestion({
        question,
        userDocuments: documents,
        userExtractions,
        userValidationIssues: validationIssues,
      });

      return successResponse(res, answerData);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Retrieve structured AI insights report
   */
  async getReport(req, res, next) {
    try {
      const report = await analyticsService.getInsightsReport(req.user.id);
      return successResponse(res, report);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Export documents report as CSV
   */
  async exportCSV(req, res, next) {
    try {
      const { documents } = await db.documents.findByUserId(req.user.id, { limit: 1000 });
      
      const rows = [
        ['Document ID', 'File Name', 'Category', 'Vendor', 'Document Number', 'Date', 'Due Date', 'Total Amount', 'Currency', 'Processing Status', 'Validation Status'].join(','),
      ];

      for (const doc of documents) {
        const ext = await db.extractedData.findByDocumentId(doc.id);
        const row = [
          `"${doc.id}"`,
          `"${(doc.original_filename || '').replace(/"/g, '""')}"`,
          `"${doc.document_type || ''}"`,
          `"${(ext?.vendor_name || 'N/A').replace(/"/g, '""')}"`,
          `"${(ext?.invoice_number || 'N/A').replace(/"/g, '""')}"`,
          `"${ext?.document_date || ''}"`,
          `"${ext?.due_date || ''}"`,
          ext?.total_amount !== undefined ? ext.total_amount : 0,
          `"${ext?.currency || 'USD'}"`,
          `"${doc.processing_status}"`,
          `"${doc.validation_status}"`,
        ];
        rows.push(row.join(','));
      }

      const csvContent = rows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ledgerlens_documents_report.csv"');
      return res.send(csvContent);
    } catch (err) {
      next(err);
    }
  },
};

