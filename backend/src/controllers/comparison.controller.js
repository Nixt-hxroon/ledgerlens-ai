import { comparisonService } from '../services/comparison.service.js';
import { db } from '../storage/db.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../utils/errorHandler.js';
import { compareDocumentsSchema } from '../validators/document.schema.js';

export const comparisonController = {
  async compare(req, res, next) {
    try {
      const validatedData = compareDocumentsSchema.parse(req.body);

      const comparison = await comparisonService.compareDocuments({
        invoiceId: validatedData.invoice_id,
        purchaseOrderId: validatedData.purchase_order_id,
        userId: req.user.id,
      });

      return successResponse(res, comparison, 'Cross-document comparison completed successfully.', 201);
    } catch (err) {
      next(err);
    }
  },

  async getComparisons(req, res, next) {
    try {
      const matches = await db.documentMatches.findByUserId(req.user.id);
      return successResponse(res, matches);
    } catch (err) {
      next(err);
    }
  },

  async getComparisonById(req, res, next) {
    try {
      const { id } = req.params;
      const match = await db.documentMatches.findById(id, req.user.id);
      if (!match) throw new AppError('Comparison record not found.', 404);
      return successResponse(res, match);
    } catch (err) {
      next(err);
    }
  },

  async getCandidates(req, res, next) {
    try {
      const { invoice_id } = req.query;
      if (!invoice_id) {
        throw new AppError('Invoice ID required.', 400);
      }
      const candidates = await comparisonService.findCandidatesForInvoice(invoice_id, req.user.id);
      return successResponse(res, candidates);
    } catch (err) {
      next(err);
    }
  },
};
