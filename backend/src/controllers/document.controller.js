import { documentService } from '../services/document.service.js';
import { db } from '../storage/db.js';
import { fileStorage } from '../storage/fileStorage.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AppError } from '../utils/errorHandler.js';
import { updateExtractedDataSchema } from '../validators/document.schema.js';

export const documentController = {
  /**
   * Upload and process a single document
   */
  async uploadSingle(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('No document file was uploaded.', 400);
      }

      const doc = await documentService.uploadDocument({
        file: req.file,
        userId: req.user.id,
      });

      return successResponse(res, doc, 'Document uploaded and analyzed successfully.', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Upload batch documents
   */
  async uploadBatch(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        throw new AppError('No document files uploaded.', 400);
      }

      const results = [];
      for (const file of req.files) {
        try {
          const doc = await documentService.uploadDocument({
            file,
            userId: req.user.id,
          });
          results.push({ success: true, filename: file.originalname, document: doc });
        } catch (uploadErr) {
          results.push({ success: false, filename: file.originalname, error: uploadErr.message });
        }
      }

      return successResponse(res, results, `Processed ${results.length} documents.`, 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get user documents with filtering and search
   */
  async getDocuments(req, res, next) {
    try {
      const { category, status, search, sortBy, sortOrder, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const result = await db.documents.findByUserId(req.user.id, {
        category,
        status,
        search,
        sortBy,
        sortOrder,
        limit: parseInt(limit, 10),
        offset,
      });

      // Enrich documents with extracted amounts and vendor
      const enrichedDocs = await Promise.all(
        result.documents.map(async (doc) => {
          const ext = await db.extractedData.findByDocumentId(doc.id);
          return {
            ...doc,
            vendor_name: ext?.vendor_name || null,
            invoice_number: ext?.invoice_number || null,
            total_amount: ext?.total_amount || 0,
            currency: ext?.currency || 'USD',
          };
        })
      );

      return successResponse(res, {
        documents: enrichedDocs,
        pagination: {
          total: result.total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(result.total / parseInt(limit, 10)),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get detailed document data by ID
   */
  async getDocumentById(req, res, next) {
    try {
      const { id } = req.params;
      const details = await documentService.getDocumentDetails(id, req.user.id);
      if (!details) {
        throw new AppError('Document not found.', 404);
      }
      return successResponse(res, details);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Stream raw document file for preview
   */
  async getDocumentFile(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await db.documents.findById(id, req.user.id);
      if (!doc) {
        throw new AppError('Document not found.', 404);
      }

      const buffer = await fileStorage.getFileBuffer(doc.storage_path);
      if (!buffer) {
        throw new AppError('Document file content is not accessible.', 404);
      }

      res.removeHeader('X-Frame-Options');
      res.setHeader('Content-Security-Policy', "frame-ancestors *");
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', doc.mime_type);
      res.setHeader('Content-Disposition', `inline; filename="${doc.original_filename}"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Reprocess document with Gemini AI
   */
  async reprocessDocument(req, res, next) {
    try {
      const { id } = req.params;
      const result = await documentService.processDocument(id, req.user.id);
      return successResponse(res, result, 'Document reprocessed successfully.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update extracted fields manually
   */
  async updateExtractedData(req, res, next) {
    try {
      const { id } = req.params;
      const validatedData = updateExtractedDataSchema.parse(req.body);

      const doc = await db.documents.findById(id, req.user.id);
      if (!doc) throw new AppError('Document not found.', 404);

      const ext = await db.extractedData.findByDocumentId(id);
      if (!ext) throw new AppError('Extracted data record not found.', 404);

      const { line_items, ...fields } = validatedData;

      // Update extracted data
      const updatedExt = await db.extractedData.update(ext.id, fields);

      // If line items updated
      if (line_items) {
        await db.lineItems.deleteByExtractedDataId(ext.id);
        const newLines = line_items.map((li) => ({
          extracted_data_id: ext.id,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          tax_amount: li.tax_amount,
          total_amount: li.total_amount,
        }));
        await db.lineItems.createMany(newLines);
      }

      // Re-run validation on updated fields
      const lines = await db.lineItems.findByExtractedDataId(ext.id);
      await documentService.validationService?.runValidation?.({
        document: doc,
        extractedData: updatedExt,
        lineItems: lines,
        userId: req.user.id,
      });

      const fullDetails = await documentService.getDocumentDetails(id, req.user.id);
      return successResponse(res, fullDetails, 'Document fields successfully updated.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete document
   */
  async deleteDocument(req, res, next) {
    try {
      const { id } = req.params;
      await documentService.deleteDocument(id, req.user.id);
      return successResponse(res, null, 'Document deleted successfully.');
    } catch (err) {
      next(err);
    }
  },
};

