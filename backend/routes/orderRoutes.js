import express from 'express';
import {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    updateItemStatus,
    addItemsToOrder,
    removeItemFromOrder,
    processPayment,
    getKitchenOrders,
    getReadyOrders,
    getUnpaidOrders,
    getOrderStats,
    getMyOrders,
    getInvoice,
    setPriority,
    transferTable,
} from '../controllers/orderController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { orderValidation, validate, validateObjectId } from '../middleware/validation.js';

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// General order routes
router.get('/', getAllOrders);
router.get('/my-orders', getMyOrders);

// Specialized views for different roles
router.get('/kitchen', authorize('admin', 'chef'), getKitchenOrders);
router.get('/ready', authorize('admin', 'waiter', 'runner'), getReadyOrders);
router.get('/unpaid', authorize('admin', 'cashier'), getUnpaidOrders);
router.get('/stats', authorize('admin'), getOrderStats);

// Single order routes
router.get('/:id', validateObjectId('id'), validate, getOrderById);
router.get('/:id/invoice', validateObjectId('id'), validate, getInvoice);

// Create order - waiters and admin
router.post('/', authorize('admin', 'waiter'), orderValidation.create, validate, createOrder);

// Update order status - different roles for different statuses
router.patch('/:id/status', validateObjectId('id'), validate, orderValidation.updateStatus, validate, updateOrderStatus);

// Update individual item status - chef
router.patch('/:id/items/:itemId/status', authorize('admin', 'chef', 'waiter', 'runner'), updateItemStatus);

// Add/remove items - waiter
router.post('/:id/items', authorize('admin', 'waiter'), validateObjectId('id'), validate, orderValidation.addItems, validate, addItemsToOrder);
router.delete('/:id/items/:itemId', authorize('admin', 'waiter'), removeItemFromOrder);

// Payment - cashier and admin
router.post('/:id/payment', authorize('admin', 'cashier'), validateObjectId('id'), validate, orderValidation.payment, validate, processPayment);

// Kitchen priority flag — chef and admin
router.patch('/:id/priority', authorize('admin', 'chef'), validateObjectId('id'), validate, setPriority);

// One-tap table transfer — waiter and admin
router.patch('/:id/transfer', authorize('admin', 'waiter'), validateObjectId('id'), validate, transferTable);

export default router;
