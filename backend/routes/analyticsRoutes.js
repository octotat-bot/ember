import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getNightReport, getProfitability, getSlowHours } from '../controllers/analyticsController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/night-report', getNightReport);
router.get('/profitability', getProfitability);
router.get('/slow-hours', getSlowHours);

export default router;
