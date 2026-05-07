import express from 'express';
import { getPublicOrderStatus } from '../controllers/orderController.js';

const router = express.Router();

// No auth required — these are guest-facing endpoints
router.get('/order/:orderNumber/status', getPublicOrderStatus);

export default router;
