import { Router } from 'express';
import { documentController } from '../controllers/document.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.middleware.js';

const router = Router();

// All document routes require authenticated user
router.use(requireAuth);

router.post('/', uploadSingle, documentController.uploadSingle);
router.post('/batch', uploadMultiple, documentController.uploadBatch);
router.get('/', documentController.getDocuments);
router.get('/invoices/arranged', documentController.getArrangedInvoices);
router.get('/:id', documentController.getDocumentById);
router.get('/:id/file', documentController.getDocumentFile);
router.get('/:id/sheet-data', documentController.getDocumentSheetData);
router.get('/:id/invoice', documentController.getDocumentInvoice);
router.post('/:id/process', documentController.reprocessDocument);
router.post('/:id/reprocess', documentController.reprocessDocument);
router.patch('/:id', documentController.updateExtractedData);
router.delete('/:id', documentController.deleteDocument);

export default router;

