import express from 'express';
import {
    getAllTables,
    getTableById,
    getTableByNumber,
    createTable,
    updateTable,
    updateTableStatus,
    deleteTable,
    getTableOrders,
    getTablesSummary,
    getTableByQR,
    bulkCreateTables
} from '../controllers/tableController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { tableValidation, validate, validateObjectId } from '../middleware/validation.js';

const router = express.Router();

// Public route for QR code access
router.get('/qr/:qrCode', getTableByQR);

// All table routes require authentication
router.use(authenticate);

// Routes accessible by all staff
router.get('/', getAllTables);
router.get('/summary', getTablesSummary);
router.get('/number/:tableNumber', getTableByNumber);
router.get('/:id', validateObjectId('id'), validate, getTableById);
router.get('/:id/orders', validateObjectId('id'), validate, getTableOrders);

// Status update - waiters, runners, and admin
router.patch('/:id/status', authorize('admin', 'waiter', 'runner'), validateObjectId('id'), validate, tableValidation.updateStatus, validate, updateTableStatus);

// Admin only routes
router.post('/', authorize('admin'), tableValidation.create, validate, createTable);
router.post('/bulk', authorize('admin'), bulkCreateTables);
router.put('/:id', authorize('admin'), validateObjectId('id'), validate, updateTable);
router.delete('/:id', authorize('admin'), validateObjectId('id'), validate, deleteTable);

export default router;
