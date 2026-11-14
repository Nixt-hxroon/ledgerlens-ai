import { Router } from 'express';
import { comparisonController } from '../controllers/comparison.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/', comparisonController.compare);
router.get('/', comparisonController.getComparisons);
router.get('/candidates', comparisonController.getCandidates);
router.get('/:id', comparisonController.getComparisonById);

export default router;
