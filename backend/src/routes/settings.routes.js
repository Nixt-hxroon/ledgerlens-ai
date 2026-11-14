import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/profile', settingsController.getProfile);
router.patch('/profile', settingsController.updateProfile);
router.post('/change-password', settingsController.changePassword);

export default router;
