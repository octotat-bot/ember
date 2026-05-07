import ShiftSession from '../models/ShiftSession.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Start a shift (called on login)
// @route   POST /api/shifts/start
// @access  Private
export const startShift = asyncHandler(async (req, res) => {
    // End any existing active shift for this user
    await ShiftSession.updateMany(
        { user: req.user._id, isActive: true },
        { isActive: false, endedAt: new Date() }
    );

    const session = await ShiftSession.create({
        user: req.user._id,
        role: req.user.role,
    });

    res.status(201).json({ success: true, data: session });
});

// @desc    Get active shift & pending handoff notes for current user
// @route   GET /api/shifts/active
// @access  Private
export const getActiveShift = asyncHandler(async (req, res) => {
    const session = await ShiftSession.findOne({ user: req.user._id, isActive: true })
        .sort({ startedAt: -1 });

    // Find handoff notes on tables that need briefing
    const tablesWithNotes = await Table.find({
        handoffNote: { $ne: '' },
        handoffNote: { $exists: true, $ne: null, $ne: '' },
        status: 'occupied'
    }).select('tableNumber handoffNote handoffBy handoffAt')
      .populate('handoffBy', 'name');

    res.json({
        success: true,
        data: {
            shift: session,
            handoffBriefings: tablesWithNotes
        }
    });
});

// @desc    Get tables assigned to current user for handoff
// @route   GET /api/shifts/my-tables
// @access  Private
export const getMyTablesForHandoff = asyncHandler(async (req, res) => {
    // Get all occupied tables (in a real app, tables would be assigned to specific users)
    const tables = await Table.find({
        status: 'occupied',
        isActive: true
    }).populate('currentOrder', 'orderNumber status items totalAmount');

    res.json({ success: true, data: tables });
});

// @desc    End shift with handoff notes
// @route   POST /api/shifts/end
// @access  Private
export const endShift = asyncHandler(async (req, res) => {
    const { handoffNotes } = req.body; // [{ tableId, note, skipped }]

    const session = await ShiftSession.findOne({ user: req.user._id, isActive: true })
        .sort({ startedAt: -1 });

    if (!session) {
        return res.status(404).json({ success: false, message: 'No active shift found' });
    }

    // Calculate shift metrics
    const shiftStart = session.startedAt;
    const shiftEnd = new Date();

    const orders = await Order.find({
        waiter: req.user._id,
        createdAt: { $gte: shiftStart, $lte: shiftEnd }
    });

    const completedOrders = orders.filter(o => ['completed', 'served'].includes(o.status));
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalItems = completedOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0);

    session.endedAt = shiftEnd;
    session.isActive = false;
    session.handoffNotes = handoffNotes || [];
    session.metrics = {
        tablesServed: new Set(orders.map(o => o.tableNumber)).size,
        ordersHandled: orders.length,
        totalRevenue,
        avgOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
        itemsServed: totalItems,
        avgServiceTime: completedOrders.length > 0
            ? completedOrders.reduce((sum, o) => {
                const start = new Date(o.createdAt);
                const end = o.completedAt ? new Date(o.completedAt) : shiftEnd;
                return sum + (end - start) / 60000;
            }, 0) / completedOrders.length
            : 0
    };

    await session.save();

    // Write handoff notes to tables
    if (handoffNotes && handoffNotes.length > 0) {
        for (const note of handoffNotes) {
            if (!note.skipped && note.note) {
                await Table.findByIdAndUpdate(note.tableId, {
                    handoffNote: note.note,
                    handoffBy: req.user._id,
                    handoffAt: new Date()
                });
            }
        }
    }

    res.json({
        success: true,
        message: 'Shift ended successfully',
        data: session
    });
});

// @desc    Dismiss handoff briefing (clear note on table)
// @route   POST /api/shifts/dismiss-briefing/:tableId
// @access  Private
export const dismissBriefing = asyncHandler(async (req, res) => {
    await Table.findByIdAndUpdate(req.params.tableId, {
        handoffNote: '',
        handoffBy: null,
        handoffAt: null
    });

    res.json({ success: true, message: 'Briefing dismissed' });
});

// @desc    Get shift history for a user
// @route   GET /api/shifts/history
// @access  Private
export const getShiftHistory = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const shifts = await ShiftSession.find({ user: req.user._id })
        .sort({ startedAt: -1 })
        .limit(parseInt(limit));

    res.json({ success: true, data: shifts });
});
