import express from 'express';
import {
    createReservation,
    getReservations,
    updateReservationStatus,
    updateReservation,
    deleteReservation,
} from '../controllers/reservationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All reservation routes require authentication
router.use(authenticate);

router.get('/', getReservations);
router.post('/', authorize('admin', 'waiter'), createReservation);
router.put('/:id', authorize('admin', 'waiter'), updateReservation);
router.patch('/:id/status', authorize('admin', 'waiter'), updateReservationStatus);
router.delete('/:id', authorize('admin'), deleteReservation);

export default router;
