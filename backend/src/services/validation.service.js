import { db } from '../storage/db.js';
import {
  validateInvoiceMath,
  validateLineItems,
  validateDateChronology,
  parseNumber,
  roundCurrency,
} from '../utils/calculations.js';

export const validationService = {
  /**
   * Run full deterministic validation suite against an extracted document
   */
  async runValidation({ document, extractedData, lineItems, userId }) {
    const issues = [];
    const docType = document.document_type;

    // 1. Mandatory Field Checks
    if (docType === 'Invoice') {
      if (!extractedData.invoice_number) {
        issues.push({
          user_id: userId,
          document_id: document.id,
          issue_type: 'MISSING_MANDATORY_FIELD',
          severity: 'Critical Issue',
          field_name: 'invoice_number',
          extracted_value: null,
          expected_value: 'Non-empty alphanumeric string',
          explanation: 'Invoice number is absent or unreadable. Invoices require an identifier for tax compliance.',
        });
      }

      if (!extractedData.vendor_name) {
        issues.push({
          user_id: userId,
          document_id: document.id,
          issue_type: 'MISSING_MANDATORY_FIELD',
          severity: 'Critical Issue',
          field_name: 'vendor_name',
          extracted_value: null,
          expected_value: 'Legitimate vendor/issuer entity name',
          explanation: 'Vendor or issuer name could not be identified on this invoice.',
        });
      }

      if (!extractedData.due_date) {
        issues.push({
          user_id: userId,
          document_id: document.id,
          issue_type: 'MISSING_DUE_DATE',
          severity: 'Warning',
          field_name: 'due_date',
          extracted_value: null,
          expected_value: 'Valid YYYY-MM-DD date',
          explanation: 'No explicit payment due date is stated. Payment terms default to Net 30 days.',
        });
      }
    }

    // 2. Arithmetic & Calculation Consistency
    if (extractedData.total_amount !== null && extractedData.total_amount !== undefined) {
      const mathCheck = validateInvoiceMath({
        subtotal: extractedData.subtotal,
        taxAmount: extractedData.tax_amount,
        discount: extractedData.discount,
        totalAmount: extractedData.total_amount,
      });

      if (!mathCheck.isValid && (extractedData.subtotal > 0 || extractedData.tax_amount > 0)) {
        issues.push({
          user_id: userId,
          document_id: document.id,
          issue_type: 'ARITHMETIC_TOTAL_MISMATCH',
          severity: 'Critical Issue',
          field_name: 'total_amount',
          extracted_value: `${extractedData.currency || '$'} ${mathCheck.statedTotal.toFixed(2)}`,
          expected_value: `${extractedData.currency || '$'} ${mathCheck.calculatedTotal.toFixed(2)}`,
          explanation: `Calculated sum (Subtotal: ${extractedData.subtotal} + Tax: ${extractedData.tax_amount} - Discount: ${extractedData.discount}) yields ${mathCheck.calculatedTotal.toFixed(2)}, but document states ${mathCheck.statedTotal.toFixed(2)}. Difference: ${mathCheck.difference.toFixed(2)}.`,
        });
      }
    }

    // 3. Line Item Consistency
    if (lineItems && lineItems.length > 0) {
      const lineCheck = validateLineItems(lineItems, extractedData.subtotal);

      lineCheck.issues.forEach((it) => {
        issues.push({
          user_id: userId,
          document_id: document.id,
          issue_type: 'LINE_ITEM_CALCULATION_MISMATCH',
          severity: 'Warning',
          field_name: `line_items[${it.index}]`,
          extracted_value: `$${it.stated.toFixed(2)}`,
          expected_value: `$${it.expected.toFixed(2)}`,
          explanation: `Line item "${it.description}": ${it.reason}`,
        });
      });

      if (!lineCheck.subtotalMatch && extractedData.subtotal > 0) {
        issues.push({
          user_id: userId,
          document_id: document.id,
          issue_type: 'SUBTOTAL_LINE_ITEM_MISMATCH',
          severity: 'Warning',
          field_name: 'subtotal',
          extracted_value: `$${parseNumber(extractedData.subtotal).toFixed(2)}`,
          expected_value: `$${lineCheck.calculatedSubtotal.toFixed(2)}`,
          explanation: `Sum of all individual line items ($${lineCheck.calculatedSubtotal.toFixed(2)}) differs from stated document subtotal ($${parseNumber(extractedData.subtotal).toFixed(2)}).`,
        });
      }
    }

    // 4. Date Chronology Check
    if (extractedData.document_date && extractedData.due_date) {
      const dateCheck = validateDateChronology(extractedData.document_date, extractedData.due_date);
      if (!dateCheck.valid) {
        issues.push({
          user_id: userId,
          document_id: document.id,
          issue_type: 'DATE_CHRONOLOGY_ERROR',
          severity: 'Critical Issue',
          field_name: 'due_date',
          extracted_value: extractedData.due_date,
          expected_value: `Date on or after ${extractedData.document_date}`,
          explanation: dateCheck.reason,
        });
      }
    }

    // 5. Duplicate Document Detection
    if (extractedData.invoice_number && extractedData.vendor_name) {
      const existingDocs = await db.documents.findByUserId(userId, { limit: 200 });
      for (const otherDoc of existingDocs.documents) {
        if (otherDoc.id !== document.id) {
          const otherExt = await db.extractedData.findByDocumentId(otherDoc.id);
          if (
            otherExt &&
            otherExt.invoice_number?.toLowerCase() === extractedData.invoice_number.toLowerCase() &&
            otherExt.vendor_name?.toLowerCase() === extractedData.vendor_name.toLowerCase()
          ) {
            issues.push({
              user_id: userId,
              document_id: document.id,
              issue_type: 'DUPLICATE_DOCUMENT_DETECTED',
              severity: 'Critical Issue',
              field_name: 'invoice_number',
              extracted_value: extractedData.invoice_number,
              expected_value: 'Unique document number for this vendor',
              explanation: `Potential duplicate: Invoice number "${extractedData.invoice_number}" for vendor "${extractedData.vendor_name}" matches already recorded document "${otherDoc.original_filename}".`,
            });
            break;
          }
        }
      }
    }

    // 6. Suspicious Values Check
    const totalNum = parseNumber(extractedData.total_amount);
    if (totalNum <= 0 && docType === 'Invoice') {
      issues.push({
        user_id: userId,
        document_id: document.id,
        issue_type: 'SUSPICIOUS_AMOUNT',
        severity: 'Review Required',
        field_name: 'total_amount',
        extracted_value: `$${totalNum}`,
        expected_value: 'Positive numeric total value > 0',
        explanation: 'Invoice records a zero or negative total amount, requiring manual review.',
      });
    }

    // Determine overall document validation status
    let overallStatus = 'Valid';
    if (issues.some((i) => i.severity === 'Critical Issue')) {
      overallStatus = 'Critical Issue';
    } else if (issues.some((i) => i.severity === 'Warning')) {
      overallStatus = 'Warning';
    } else if (issues.some((i) => i.severity === 'Review Required')) {
      overallStatus = 'Review Required';
    }

    // Remove old validation issues for this document
    await db.validationIssues.deleteByDocumentId(document.id);

    // Save new validation issues
    if (issues.length > 0) {
      await db.validationIssues.createMany(issues);
    }

    // Update document validation status
    await db.documents.update(document.id, {
      validation_status: overallStatus,
      processing_status: overallStatus === 'Critical Issue' ? 'Review Required' : 'Processed',
    });

    return {
      validationStatus: overallStatus,
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
