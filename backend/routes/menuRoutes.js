import express from 'express';
import {
    getAllMenuItems,
    getMenuItemById,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleAvailability,
    getCategories,
    getPopularItems,
    bulkUpdateAvailability,
    toggle86,
    get86Board
} from '../controllers/menuController.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { menuValidation, validate, validateObjectId } from '../middleware/validation.js';

const router = express.Router();

// Public routes (with optional auth for personalization)
router.get('/', optionalAuth, getAllMenuItems);
router.get('/categories', getCategories);
router.get('/popular', getPopularItems);
router.get('/:id', validateObjectId('id'), validate, getMenuItemById);

// Protected routes
router.use(authenticate);

// Admin only routes
router.post('/', authorize('admin'), menuValidation.create, validate, createMenuItem);
router.put('/:id', authorize('admin'), validateObjectId('id'), validate, menuValidation.update, validate, updateMenuItem);
router.delete('/:id', authorize('admin'), validateObjectId('id'), validate, deleteMenuItem);
router.patch('/bulk-availability', authorize('admin'), bulkUpdateAvailability);

// Admin and Chef can toggle availability
router.patch('/:id/toggle-availability', authorize('admin', 'chef'), validateObjectId('id'), validate, toggleAvailability);

// 86 Board routes (Chef and Admin)
router.get('/86-board', authorize('admin', 'chef'), get86Board);
router.patch('/:id/toggle-86', authorize('admin', 'chef'), validateObjectId('id'), validate, toggle86);

export default router;
