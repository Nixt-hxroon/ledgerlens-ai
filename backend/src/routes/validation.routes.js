import { Router } from 'express';
import { validationController } from '../controllers/validation.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', validationController.getValidationIssues);
router.get('/:id', validationController.getDocumentValidation);
router.post('/:id/review', validationController.reviewDocument);
router.patch('/issue/:id', validationController.updateIssueStatus);

export default router;
