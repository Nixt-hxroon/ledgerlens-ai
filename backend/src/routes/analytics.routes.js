import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', analyticsController.getDashboard);
router.get('/spending', analyticsController.getSpending);
router.get('/vendors', analyticsController.getVendors);
router.get('/documents', analyticsController.getDocuments);

export default router;

