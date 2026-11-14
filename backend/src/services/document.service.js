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

    // 6. Run deterministic validation engine
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
};
