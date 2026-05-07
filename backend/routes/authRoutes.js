import express from 'express';
import {
    register,
    login,
    getMe,
    updateMe,
    changePassword,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    resetUserPassword
} from '../controllers/authController.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { userValidation, validate, validateObjectId } from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.post('/login', userValidation.login, validate, login);

// Register uses optional auth — first-ever user (bootstrap) needs no token,
// all subsequent registrations require an authenticated admin.
router.post('/register', optionalAuth, userValidation.register, validate, register);

// Protected routes - any authenticated user
router.use(authenticate); // All routes below require authentication

router.get('/me', getMe);
router.put('/me', userValidation.update, validate, updateMe);
router.put('/change-password', changePassword);

// Admin only routes
router.get('/users', authorize('admin'), getAllUsers);
router.get('/users/:id', authorize('admin'), validateObjectId('id'), validate, getUserById);
router.put('/users/:id', authorize('admin'), validateObjectId('id'), validate, userValidation.update, validate, updateUser);
router.delete('/users/:id', authorize('admin'), validateObjectId('id'), validate, deleteUser);
router.put('/users/:id/reset-password', authorize('admin'), validateObjectId('id'), validate, resetUserPassword);

export default router;
