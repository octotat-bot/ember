import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getShiftNotes, createShiftNote, togglePin, deleteShiftNote } from '../controllers/shiftNoteController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getShiftNotes);
router.post('/', createShiftNote);
router.patch('/:id/pin', authorize('admin'), togglePin);
router.delete('/:id', deleteShiftNote);

export default router;
