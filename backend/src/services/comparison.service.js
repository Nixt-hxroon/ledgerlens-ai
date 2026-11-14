import { db } from '../storage/db.js';
import { roundCurrency, parseNumber } from '../utils/calculations.js';
import { geminiService } from './gemini.service.js';

export const comparisonService = {
  /**
   * Autonomous Agentic Cross-Document 3-Way Reconciliation
   * Compares an Invoice against a Purchase Order
   */
  async compareDocuments({ invoiceId, purchaseOrderId, userId }) {
    const invoiceDoc = await db.documents.findById(invoiceId, userId);
    const poDoc = await db.documents.findById(purchaseOrderId, userId);

    if (!invoiceDoc || !poDoc) {
      throw new Error('One or both documents not found or not owned by user.');
    }

    const invoiceExt = await db.extractedData.findByDocumentId(invoiceId);
    const poExt = await db.extractedData.findByDocumentId(purchaseOrderId);

    if (!invoiceExt || !poExt) {
      throw new Error('Both documents must be processed with extracted data before comparison.');
    }

    const invoiceLines = await db.lineItems.findByExtractedDataId(invoiceExt.id);
    const poLines = await db.lineItems.findByExtractedDataId(poExt.id);

    // Run Autonomous Agentic Reconciler
    const agenticRecon = await geminiService.reconcileWithAgent({
      invoiceDoc,
      poDoc,
      invoiceExt,
      poExt,
      invoiceLines,
      poLines,
    });

    const invTotal = parseNumber(invoiceExt.total_amount);
    const poTotal = parseNumber(poExt.total_amount);
    const totalDifference = roundCurrency(invTotal - poTotal);

    const invVendor = (invoiceExt.vendor_name || '').trim().toLowerCase();
    const poVendor = (poExt.vendor_name || '').trim().toLowerCase();
    const vendorMatches =
      invVendor.length > 0 &&
      poVendor.length > 0 &&
      (invVendor.includes(poVendor) || poVendor.includes(invVendor));

    const poRefOnInvoice = (invoiceExt.purchase_order_number || '').trim().toLowerCase();
    const poNumber = (poExt.invoice_number || '').trim().toLowerCase();
    const poRefMatches = Boolean(
      poRefOnInvoice && poNumber && (poRefOnInvoice.includes(poNumber) || poNumber.includes(poRefOnInvoice))
    );

    const matchStatus = agenticRecon.match_status || 'Matched';

    const comparisonResult = {
      summary: {
        invoice_filename: invoiceDoc.original_filename,
        po_filename: poDoc.original_filename,
        invoice_number: invoiceExt.invoice_number,
        po_number: poExt.invoice_number,
        reconciliation_score: agenticRecon.reconciliation_score || 95,
        vendor: {
          invoice: invoiceExt.vendor_name,
          po: poExt.vendor_name,
          matches: vendorMatches,
        },
        po_reference: {
          stated_on_invoice: invoiceExt.purchase_order_number,
          actual_po_number: poExt.invoice_number,
          matches: poRefMatches,
        },
        totals: {
          invoice_total: invTotal,
          po_total: poTotal,
          difference: totalDifference,
          currency: invoiceExt.currency || 'USD',
          matches: Math.abs(totalDifference) <= 0.05,
        },
        subtotals: {
          invoice_subtotal: parseNumber(invoiceExt.subtotal),
          po_subtotal: parseNumber(poExt.subtotal),
          difference: roundCurrency(parseNumber(invoiceExt.subtotal) - parseNumber(poExt.subtotal)),
        },
        taxes: {
          invoice_tax: parseNumber(invoiceExt.tax_amount),
          po_tax: parseNumber(poExt.tax_amount),
          difference: roundCurrency(parseNumber(invoiceExt.tax_amount) - parseNumber(poExt.tax_amount)),
        },
        match_status: matchStatus,
        explanation: agenticRecon.executive_summary || 'Reconciliation completed.',
        settlement_recommendation: agenticRecon.settlement_recommendation || 'Proceed with standard AP verification.',
      },
      line_items: agenticRecon.line_items || [],
      agentic_reconciliation: agenticRecon,
    };

    // Store in document_matches
    const record = await db.documentMatches.create({
      user_id: userId,
      invoice_document_id: invoiceId,
      purchase_order_document_id: purchaseOrderId,
      match_status: matchStatus,
      comparison_result: comparisonResult,
    });

    return record;
  },

  /**
   * Find candidate Purchase Orders for an invoice
   */
  async findCandidatesForInvoice(invoiceId, userId) {
    const invoiceDoc = await db.documents.findById(invoiceId, userId);
    if (!invoiceDoc) return [];

    const invoiceExt = await db.extractedData.findByDocumentId(invoiceId);
    const allDocs = await db.documents.findByUserId(userId, { limit: 100 });
    const poDocs = allDocs.documents.filter((d) => d.document_type === 'Purchase Order');

    const candidates = [];
    for (const po of poDocs) {
      const poExt = await db.extractedData.findByDocumentId(po.id);
      if (!poExt) continue;

      let score = 0;
      // Match by PO ref
      if (
        invoiceExt?.purchase_order_number &&
        poExt.invoice_number &&
        invoiceExt.purchase_order_number.toLowerCase() === poExt.invoice_number.toLowerCase()
      ) {
        score += 60;
      }
      // Match by Vendor
      if (
        invoiceExt?.vendor_name &&
        poExt.vendor_name &&
        invoiceExt.vendor_name.toLowerCase().includes(poExt.vendor_name.toLowerCase())
      ) {
        score += 30;
      }
      // Match by total amount
      if (Math.abs(parseNumber(invoiceExt?.total_amount) - parseNumber(poExt.total_amount)) <= 0.05) {
        score += 20;
      }

      candidates.push({
        id: po.id,
        filename: po.original_filename,
        po_number: poExt.invoice_number || 'N/A',
        vendor: poExt.vendor_name || 'N/A',
        total_amount: poExt.total_amount,
        currency: poExt.currency || 'USD',
        relevance_score: score,
      });
    }

    return candidates.sort((a, b) => b.relevance_score - a.relevance_score);
  },
};
