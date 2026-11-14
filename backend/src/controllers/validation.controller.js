import { validationService } from '../services/validation.service.js';
import { db } from '../storage/db.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../utils/errorHandler.js';
import { reviewDocumentSchema } from '../validators/document.schema.js';

export const validationController = {
  async getValidationIssues(req, res, next) {
    try {
      const { status, severity } = req.query;
      const issues = await db.validationIssues.findByUserId(req.user.id, { status, severity });

      // Group issues by document
      const docMap = {};
      issues.forEach((issue) => {
        if (!docMap[issue.document_id]) {
          docMap[issue.document_id] = {
            document_id: issue.document_id,
            document_name: issue.document_name,
            document_type: issue.document_type,
            issues: [],
          };
        }
        docMap[issue.document_id].issues.push(issue);
      });

      return successResponse(res, {
        totalIssues: issues.length,
        issues,
        groupedByDocument: Object.values(docMap),
      });
    } catch (err) {
      next(err);
    }
  },

  async getDocumentValidation(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await db.documents.findById(id, req.user.id);
      if (!doc) throw new AppError('Document not found.', 404);

      const issues = await db.validationIssues.findByDocumentId(id);
      const reviews = await db.documentReviews.findByDocumentId(id);

      return successResponse(res, {
        document_id: id,
        validation_status: doc.validation_status,
        issues,
        reviews,
      });
    } catch (err) {
      next(err);
    }
  },

  async reviewDocument(req, res, next) {
    try {
      const { id } = req.params;
      const validatedData = reviewDocumentSchema.parse(req.body);

      const doc = await db.documents.findById(id, req.user.id);
      if (!doc) throw new AppError('Document not found.', 404);

      const result = await validationService.recordReview({
        documentId: id,
        userId: req.user.id,
        action: validatedData.action,
        notes: validatedData.notes,
        corrections: validatedData.corrections,
      });

      return successResponse(res, result, `Document review action '${validatedData.action}' recorded successfully.`);
    } catch (err) {
      next(err);
    }
  },

  async updateIssueStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['Open', 'Resolved', 'Dismissed'].includes(status)) {
        throw new AppError('Invalid status. Allowed values: Open, Resolved, Dismissed.', 400);
      }

      const updated = await db.validationIssues.updateStatus(id, status);
      return successResponse(res, updated, 'Validation issue status updated.');
    } catch (err) {
      next(err);
    }
  },
};

