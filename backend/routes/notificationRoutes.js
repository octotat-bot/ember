import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    getUnreadCount
} from '../controllers/notificationController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.post('/read-all', markAllAsRead);
router.delete('/clear', clearAll);

export default router;
