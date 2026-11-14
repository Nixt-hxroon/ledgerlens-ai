import { db } from '../storage/db.js';
import { roundCurrency, parseNumber, ROUNDING_TOLERANCE } from '../utils/calculations.js';

export const comparisonService = {
  /**
   * Compare an Invoice document against a Purchase Order document
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

    // 1. Vendor Comparison
    const invVendor = (invoiceExt.vendor_name || '').trim().toLowerCase();
    const poVendor = (poExt.vendor_name || '').trim().toLowerCase();
    const vendorMatches = invVendor.length > 0 && poVendor.length > 0 &&
      (invVendor.includes(poVendor) || poVendor.includes(invVendor));

    // 2. Reference Match
    const poRefOnInvoice = (invoiceExt.purchase_order_number || '').trim().toLowerCase();
    const poNumber = (poExt.invoice_number || '').trim().toLowerCase(); // PO documents store PO number in document/invoice_number
    const poRefMatches = Boolean(poRefOnInvoice && poNumber && (poRefOnInvoice.includes(poNumber) || poNumber.includes(poRefOnInvoice)));

    // 3. Totals Comparison
    const invTotal = parseNumber(invoiceExt.total_amount);
    const poTotal = parseNumber(poExt.total_amount);
    const totalDifference = roundCurrency(invTotal - poTotal);
    const totalsMatch = Math.abs(totalDifference) <= ROUNDING_TOLERANCE;

    // 4. Subtotal & Tax Comparison
    const invSubtotal = parseNumber(invoiceExt.subtotal);
    const poSubtotal = parseNumber(poExt.subtotal);
    const subtotalDiff = roundCurrency(invSubtotal - poSubtotal);

    const invTax = parseNumber(invoiceExt.tax_amount);
    const poTax = parseNumber(poExt.tax_amount);
    const taxDiff = roundCurrency(invTax - poTax);

    // 5. Line items comparison
    const lineItemComparisons = [];
    let lineDiscrepancies = 0;

    // Compare available lines
    const maxLines = Math.max(invoiceLines.length, poLines.length, 1);
    for (let i = 0; i < maxLines; i++) {
      const invItem = invoiceLines[i];
      const poItem = poLines[i];

      if (invItem && poItem) {
        const qtyDiff = parseNumber(invItem.quantity) - parseNumber(poItem.quantity);
        const priceDiff = parseNumber(invItem.unit_price) - parseNumber(poItem.unit_price);
        const amountDiff = parseNumber(invItem.total_amount) - parseNumber(poItem.total_amount);

        const hasDiff = Math.abs(qtyDiff) > 0.01 || Math.abs(priceDiff) > 0.05 || Math.abs(amountDiff) > 0.05;
        if (hasDiff) lineDiscrepancies++;

        lineItemComparisons.push({
          item_index: i + 1,
          description: {
            invoice: invItem.description,
            po: poItem.description,
            match: invItem.description.toLowerCase() === poItem.description.toLowerCase(),
          },
          quantity: {
            invoice: parseNumber(invItem.quantity),
            po: parseNumber(poItem.quantity),
            difference: roundCurrency(qtyDiff),
            match: Math.abs(qtyDiff) <= 0.01,
          },
          unit_price: {
            invoice: parseNumber(invItem.unit_price),
            po: parseNumber(poItem.unit_price),
            difference: roundCurrency(priceDiff),
            match: Math.abs(priceDiff) <= 0.05,
          },
          total_amount: {
            invoice: parseNumber(invItem.total_amount),
            po: parseNumber(poItem.total_amount),
            difference: roundCurrency(amountDiff),
            match: Math.abs(amountDiff) <= 0.05,
          },
        });
      } else if (invItem && !poItem) {
        lineDiscrepancies++;
        lineItemComparisons.push({
          item_index: i + 1,
          description: { invoice: invItem.description, po: 'Item not listed on PO', match: false },
          quantity: { invoice: parseNumber(invItem.quantity), po: 0, difference: parseNumber(invItem.quantity), match: false },
          unit_price: { invoice: parseNumber(invItem.unit_price), po: 0, difference: parseNumber(invItem.unit_price), match: false },
          total_amount: { invoice: parseNumber(invItem.total_amount), po: 0, difference: parseNumber(invItem.total_amount), match: false },
        });
      } else if (!invItem && poItem) {
        lineDiscrepancies++;
        lineItemComparisons.push({
          item_index: i + 1,
          description: { invoice: 'Item unbilled on Invoice', po: poItem.description, match: false },
          quantity: { invoice: 0, po: parseNumber(poItem.quantity), difference: -parseNumber(poItem.quantity), match: false },
          unit_price: { invoice: 0, po: parseNumber(poItem.unit_price), difference: -parseNumber(poItem.unit_price), match: false },
          total_amount: { invoice: 0, po: parseNumber(poItem.total_amount), difference: -parseNumber(poItem.total_amount), match: false },
        });
      }
    }

    // Determine overall Match Status
    let matchStatus = 'Matched';
    if (!totalsMatch || lineDiscrepancies > 0 || !vendorMatches) {
      matchStatus = 'Discrepancy Detected';
    } else if (!poRefMatches && vendorMatches && totalsMatch) {
      matchStatus = 'Partial Match';
    }

    // Generate readable AI & deterministic explanation
    let explanation = '';
    if (matchStatus === 'Matched') {
      explanation = `Invoice ${invoiceExt.invoice_number || 'Inv'} perfectly reconciles with Purchase Order ${poExt.invoice_number || 'PO'}. Vendor names match (${invoiceExt.vendor_name}), and both documents agree on total value ($${invTotal.toFixed(2)}).`;
    } else if (matchStatus === 'Discrepancy Detected') {
      const parts = [];
      if (!vendorMatches) parts.push(`Vendor name mismatch (Invoice: "${invoiceExt.vendor_name}", PO: "${poExt.vendor_name}")`);
      if (!totalsMatch) {
        const dir = totalDifference > 0 ? 'overbilled by' : 'underbilled by';
        parts.push(`Total amount variance: Invoice is ${dir} $${Math.abs(totalDifference).toFixed(2)} (Invoice: $${invTotal.toFixed(2)}, PO: $${poTotal.toFixed(2)})`);
      }
      if (lineDiscrepancies > 0) parts.push(`${lineDiscrepancies} line item(s) have pricing or quantity discrepancies`);
      explanation = `Discrepancies detected between Invoice and Purchase Order: ${parts.join('; ')}. Immediate review recommended before payment authorization.`;
    } else {
      explanation = `Documents match on vendor and financial totals ($${invTotal.toFixed(2)}), but explicit PO cross-reference identifier is missing or unverified on the invoice.`;
    }

    const comparisonResult = {
      summary: {
        invoice_filename: invoiceDoc.original_filename,
        po_filename: poDoc.original_filename,
        invoice_number: invoiceExt.invoice_number,
        po_number: poExt.invoice_number,
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
          matches: totalsMatch,
        },
        subtotals: {
          invoice_subtotal: invSubtotal,
          po_subtotal: poSubtotal,
          difference: subtotalDiff,
        },
        taxes: {
          invoice_tax: invTax,
          po_tax: poTax,
          difference: taxDiff,
        },
        match_status: matchStatus,
        explanation,
      },
      line_items: lineItemComparisons,
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
      if (invoiceExt?.purchase_order_number && poExt.invoice_number &&
          invoiceExt.purchase_order_number.toLowerCase() === poExt.invoice_number.toLowerCase()) {
        score += 60;
      }
      // Match by Vendor
      if (invoiceExt?.vendor_name && poExt.vendor_name &&
          invoiceExt.vendor_name.toLowerCase().includes(poExt.vendor_name.toLowerCase())) {
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
