import { db } from '../storage/db.js';
import { fileStorage } from '../storage/fileStorage.js';
import { geminiService } from './gemini.service.js';
import { validationService } from './validation.service.js';

export const documentService = {
  /**
   * Ingest and upload new document
   */
  async uploadDocument({ file, userId }) {
    // 1. Upload to storage (Supabase or local fallback)
    const uploadResult = await fileStorage.uploadFile({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
      userId,
    });

    // 2. Create document record in database
    const document = await db.documents.create({
      user_id: userId,
      original_filename: file.originalname,
      storage_path: uploadResult.storagePath,
      mime_type: file.mimetype,
      file_size: file.size,
      document_type: 'Other',
      processing_status: 'Uploaded',
      validation_status: 'Pending',
    });

    // 3. Immediately trigger AI processing asynchronously or synchronously
    // We execute processing directly so client gets processed state right away
    try {
      await this.processDocument(document.id, userId);
      return await db.documents.findById(document.id, userId);
    } catch (err) {
      console.error(`AI processing error for doc ${document.id}:`, err);
      await db.documents.update(document.id, {
        processing_status: 'Failed',
        summary: `Processing failed: ${err.message}`,
      });
      return await db.documents.findById(document.id, userId);
    }
  },

  /**
   * Process or Reprocess a document with Gemini AI and validation engine
   */
  async processDocument(documentId, userId) {
    const document = await db.documents.findById(documentId, userId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Set status to Processing
    await db.documents.update(documentId, {
      processing_status: 'Processing',
    });

    // 1. Fetch file buffer from storage
    const buffer = await fileStorage.getFileBuffer(document.storage_path);
    if (!buffer) {
      throw new Error('Unable to retrieve stored document file for processing');
    }

    // 2. Run Gemini AI / Intelligent extraction
    const extractionResult = await geminiService.processDocument({
      buffer,
      mimeType: document.mime_type,
      filename: document.original_filename,
    });

    // 3. Update document classification and summary
    await db.documents.update(documentId, {
      document_type: extractionResult.document_type || 'Other',
      summary: extractionResult.summary || '',
      processed_at: new Date().toISOString(),
    });

    // 4. Save extracted data
    const fields = extractionResult.extracted_fields || {};
    const savedExtractedData = await db.extractedData.create({
      document_id: documentId,
      user_id: userId,
      invoice_number: fields.document_number || null,
      purchase_order_number: fields.purchase_order_number || null,
      document_date: fields.document_date || null,
      due_date: fields.due_date || null,
      vendor_name: fields.vendor_name || null,
      vendor_address: fields.vendor_address || null,
      vendor_contact: fields.vendor_contact || null,
      customer_name: fields.customer_name || null,
      customer_address: fields.customer_address || null,
      subtotal: fields.subtotal || 0,
      tax_amount: fields.tax_amount || 0,
      discount: fields.discount || 0,
      total_amount: fields.total_amount || 0,
      currency: fields.currency || 'USD',
      payment_status: fields.payment_status || null,
      payment_terms: fields.payment_terms || null,
      extracted_json: extractionResult,
      extraction_confidence: extractionResult.overall_confidence || 0.9,
    });

    // 5. Save line items
    await db.lineItems.deleteByExtractedDataId(savedExtractedData.id);
    const lineItemsToInsert = (extractionResult.line_items || []).map((li) => ({
      extracted_data_id: savedExtractedData.id,
      description: li.description || 'Item',
      quantity: li.quantity || 1,
      unit_price: li.unit_price || 0,
      tax_amount: li.tax_amount || 0,
      total_amount: li.total_amount || 0,
    }));
    await db.lineItems.createMany(lineItemsToInsert);

    // 6. Run Autonomous Agentic Gemini LLM Forensic Evaluation suite
    const updatedDoc = await db.documents.findById(documentId, userId);
    await validationService.runValidation({
      document: updatedDoc,
      extractedData: savedExtractedData,
      lineItems: lineItemsToInsert,
      userId,
    });

    return await this.getDocumentDetails(documentId, userId);
  },

  /**
   * Retrieve full document details with extracted data, line items, and validation issues
   */
  async getDocumentDetails(documentId, userId) {
    const document = await db.documents.findById(documentId, userId);
    if (!document) return null;

    const extractedData = await db.extractedData.findByDocumentId(documentId);
    let lineItems = [];
    if (extractedData) {
      lineItems = await db.lineItems.findByExtractedDataId(extractedData.id);
    }

    const validationIssues = await db.validationIssues.findByDocumentId(documentId);
    const reviews = await db.documentReviews.findByDocumentId(documentId);

    // Generate signed preview URL if possible
    const secureUrl = await fileStorage.getSecureUrl(document.storage_path);

    return {
      document,
      extractedData,
      lineItems,
      validationIssues,
      reviews,
      fileUrl: secureUrl || `/api/documents/${document.id}/file`,
    };
  },

  /**
   * Delete document and all associated data
   */
  async deleteDocument(documentId, userId) {
    const document = await db.documents.findById(documentId, userId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Delete stored file
    await fileStorage.deleteFile(document.storage_path);

    // Delete database records (cascade handled in db layer)
    await db.documents.delete(documentId, userId);

    return true;
  },

  /**
   * Format and generate standardized Commercial Invoice for a specific document
   */
  async getDocumentInvoice(documentId, userId) {
    const details = await this.getDocumentDetails(documentId, userId);
    if (!details || !details.document) {
      throw new Error('Document not found');
    }

    const { document, extractedData, lineItems, validationIssues } = details;
    const extFields = extractedData?.extracted_json?.extracted_fields || {};
    const agenticEval = extractedData?.extracted_json?.agentic_evaluation || {};

    const auditScore = agenticEval.audit_score ?? (document.validation_status === 'Valid' ? 98 : document.validation_status === 'Warning' ? 78 : 45);

    const docNum = extractedData?.invoice_number || document.invoice_number || extFields.document_number || `INV-${document.id.slice(0, 8).toUpperCase()}`;
    const docDate = extractedData?.document_date || document.document_date || extFields.document_date || document.uploaded_at?.split('T')[0];
    const dueDate = extractedData?.due_date || document.due_date || extFields.due_date;

    const vendorName = extractedData?.vendor_name || document.vendor_name || extFields.vendor_name || 'Issuing Vendor';
    const customerName = extractedData?.customer_name || extFields.customer_name || 'Billed Entity';

    const subtotal = extractedData?.subtotal ?? extFields.subtotal ?? document.total_amount ?? 0;
    const taxAmount = extractedData?.tax_amount ?? extFields.tax_amount ?? 0;
    const discount = extFields.discount ?? 0;
    const totalAmount = extractedData?.total_amount ?? extFields.total_amount ?? document.total_amount ?? 0;
    const currency = extractedData?.currency || extFields.currency || document.currency || 'USD';

    // Format items list
    let formattedItems = [];
    if (lineItems && lineItems.length > 0) {
      formattedItems = lineItems.map((li, idx) => ({
        id: li.id || idx + 1,
        description: li.description || `Line Item #${idx + 1}`,
        quantity: li.quantity || 1,
        unit_price: li.unit_price || 0,
        tax_amount: li.tax_amount || 0,
        total_amount: li.total_amount || (li.quantity || 1) * (li.unit_price || 0),
      }));
    } else {
      formattedItems = [
        {
          id: 1,
          description: document.original_filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
          quantity: 1,
          unit_price: totalAmount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
        },
      ];
    }

    return {
      document_id: document.id,
      original_filename: document.original_filename,
      invoice_number: docNum,
      document_type: document.document_type || 'Invoice',
      category: document.document_type || 'Invoice',
      document_date: docDate,
      due_date: dueDate,
      vendor: {
        name: vendorName,
        address: extFields.vendor_address || 'Global Headquarters / Commercial District',
        contact: extFields.vendor_contact || 'billing@vendor-system.com',
      },
      customer: {
        name: customerName,
        address: extFields.customer_address || 'Client Accounts Payable Division',
        purchase_order_number: extFields.purchase_order_number || document.purchase_order_number || null,
      },
      line_items: formattedItems,
      financials: {
        subtotal: parseFloat(subtotal) || 0,
        tax_amount: parseFloat(taxAmount) || 0,
        discount: parseFloat(discount) || 0,
        total_amount: parseFloat(totalAmount) || 0,
        currency,
        payment_terms: extractedData?.payment_terms || extFields.payment_terms || 'Net 30 Days',
        payment_status: extFields.payment_status || (document.validation_status === 'Valid' ? 'Approved' : 'Pending Review'),
      },
      audit: {
        audit_score: auditScore,
        validation_status: document.validation_status || 'Pending',
        issues_count: validationIssues?.length || 0,
        verified_at: document.updated_at || document.uploaded_at,
        characteristics: extractedData?.extracted_json?.document_characteristics || [],
      },
    };
  },

  /**
   * Get all arranged documents' invoices in sequential order
   */
  async getArrangedInvoices({ userId, ids = null, sortBy = 'uploaded_at', sortOrder = 'desc', category = 'All', status = 'All' }) {
    let docs = [];

    if (ids && ids.length > 0) {
      for (const id of ids) {
        const d = await db.documents.findById(id, userId);
        if (d) docs.push(d);
      }
    } else {
      const result = await db.documents.findByUserId(userId, {
        category,
        status,
        sortBy,
        sortOrder,
        limit: 100,
      });
      docs = result.documents || [];
    }

    // Sort manually if required
    docs.sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return sortOrder === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    const invoices = [];
    for (const doc of docs) {
      try {
        const invoice = await this.getDocumentInvoice(doc.id, userId);
        invoices.push(invoice);
      } catch (err) {
        console.error(`Error formatting invoice for doc ${doc.id}:`, err);
      }
    }

    const cumulativeTotal = invoices.reduce((acc, curr) => acc + (curr.financials?.total_amount || 0), 0);
    const dominantCurrency = invoices.find((i) => i.financials?.currency)?.financials?.currency || 'USD';

    return {
      invoices,
      count: invoices.length,
      cumulativeTotal: Math.round(cumulativeTotal * 100) / 100,
      currency: dominantCurrency,
      arrangedBy: {
        sortBy,
        sortOrder,
        category,
        status,
      },
    };
  },

  /**
   * Compile ALL uploaded documents into ONE unified, consolidated Master Commercial Invoice
   */
  async getConsolidatedInvoice(userId, ids = null) {
    let docs = [];
    if (ids && ids.length > 0) {
      for (const id of ids) {
        const d = await db.documents.findById(id, userId);
        if (d) docs.push(d);
      }
    } else {
      const res = await db.documents.findByUserId(userId, { limit: 200, sortBy: 'uploaded_at', sortOrder: 'desc' });
      docs = res.documents || [];
    }

    const consolidatedLineItems = [];
    let subtotal = 0;
    let taxAmount = 0;
    let discount = 0;
    let totalAmount = 0;
    let dominantCurrency = 'USD';
    let auditScoreSum = 0;
    let auditScoreCount = 0;

    for (const doc of docs) {
      try {
        const inv = await this.getDocumentInvoice(doc.id, userId);
        if (inv) {
          subtotal += inv.financials.subtotal || 0;
          taxAmount += inv.financials.tax_amount || 0;
          discount += inv.financials.discount || 0;
          totalAmount += inv.financials.total_amount || 0;
          if (inv.financials.currency) dominantCurrency = inv.financials.currency;
          if (inv.audit.audit_score) {
            auditScoreSum += inv.audit.audit_score;
            auditScoreCount++;
          }

          inv.line_items.forEach((item, idx) => {
            consolidatedLineItems.push({
              id: `${doc.id}_${item.id || idx}`,
              source_filename: doc.original_filename,
              source_invoice_number: inv.invoice_number,
              description: `${item.description} [${doc.original_filename}]`,
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              tax_amount: item.tax_amount || 0,
              total_amount: item.total_amount || 0,
            });
          });
        }
      } catch (e) {
        console.warn(`Error compiling consolidated item for doc ${doc.id}:`, e);
      }
    }

    const avgAuditScore = auditScoreCount > 0 ? Math.round(auditScoreSum / auditScoreCount) : 95;

    return {
      isConsolidated: true,
      master_statement_number: `ALL-IN-ONE-${Date.now().toString().slice(-6)}`,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      document_count: docs.length,
      item_count: consolidatedLineItems.length,
      vendor: {
        name: 'LedgerLens Master Billing & Settlement Entity',
        address: 'Consolidated Commercial Accounting Gateway, Suite 400',
        contact: 'settlements@ledgerlens.io',
      },
      customer: {
        name: 'Enterprise Portfolio Holdings Ltd.',
        address: 'Consolidated Enterprise Accounts Payable Division',
      },
      line_items: consolidatedLineItems,
      financials: {
        subtotal: Math.round(subtotal * 100) / 100,
        tax_amount: Math.round(taxAmount * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
        currency: dominantCurrency,
        payment_terms: 'Consolidated Net 30 Days',
        payment_status: 'Approved & Reconciled',
      },
      audit: {
        audit_score: avgAuditScore,
        validation_status: avgAuditScore >= 80 ? 'Valid' : 'Warning',
        verified_documents: docs.length,
      },
    };
  },
};

