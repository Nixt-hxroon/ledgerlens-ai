import { Router } from 'express';
import { insightsController } from '../controllers/insights.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/ask', insightsController.askQuestion);
router.get('/reports', insightsController.getReport);
router.get('/export-csv', insightsController.exportCSV);

export default router;
