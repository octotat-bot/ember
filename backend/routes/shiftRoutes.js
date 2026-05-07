import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    startShift,
    getActiveShift,
    getMyTablesForHandoff,
    endShift,
    dismissBriefing,
    getShiftHistory
} from '../controllers/shiftController.js';

const router = express.Router();

router.use(authenticate);

router.post('/start', startShift);
router.get('/active', getActiveShift);
router.get('/my-tables', getMyTablesForHandoff);
router.post('/end', endShift);
router.post('/dismiss-briefing/:tableId', dismissBriefing);
router.get('/history', getShiftHistory);

export default router;
