import Reservation from '../models/Reservation.js';
import Table from '../models/Table.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { emitTableStatusUpdate, emitTableChanged } from '../utils/socketEmitter.js';

// @desc    Create a reservation
// @route   POST /api/reservations
// @access  Private (admin, waiter)
export const createReservation = asyncHandler(async (req, res) => {
    const { tableId, guestName, guestPhone, partySize, reservationTime, notes } = req.body;

    if (!tableId || !guestName || !partySize || !reservationTime) {
        return res.status(400).json({
            success: false,
            message: 'Table, guest name, party size, and reservation time are required',
        });
    }

    const table = await Table.findById(tableId);
    if (!table) {
        return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const resTime = new Date(reservationTime);
    if (resTime < new Date()) {
        return res.status(400).json({ success: false, message: 'Reservation time must be in the future' });
    }

    if (partySize > table.capacity) {
        return res.status(400).json({
            success: false,
            message: `Party size (${partySize}) exceeds table capacity (${table.capacity})`,
        });
    }

    // Check for overlapping reservations on the same table (within 2 hours)
    const twoHoursBefore = new Date(resTime.getTime() - 2 * 60 * 60 * 1000);
    const twoHoursAfter = new Date(resTime.getTime() + 2 * 60 * 60 * 1000);

    const overlap = await Reservation.findOne({
        table: tableId,
        status: { $in: ['upcoming', 'seated'] },
        reservationTime: { $gte: twoHoursBefore, $lte: twoHoursAfter },
    });

    if (overlap) {
        return res.status(400).json({
            success: false,
            message: `Table ${table.tableNumber} already has a reservation near that time (${new Date(overlap.reservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        });
    }

    const reservation = await Reservation.create({
        table: tableId,
        guestName,
        guestPhone: guestPhone || '',
        partySize,
        reservationTime: resTime,
        notes: notes || '',
        createdBy: req.user._id,
    });

    // If reservation is within the next 30 minutes, mark the table as reserved
    const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);
    if (resTime <= thirtyMinutesFromNow && table.status === 'available') {
        const previousStatus = table.status;
        table.status = 'reserved';
        await table.save();
        emitTableStatusUpdate(table, previousStatus);
    }

    // Populate the response
    const populated = await Reservation.findById(reservation._id)
        .populate('table', 'tableNumber capacity location')
        .populate('createdBy', 'name');

    emitTableChanged('reservation-created', { reservation: populated, table });

    res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        data: populated,
    });
});

// @desc    Get all reservations (with optional filters)
// @route   GET /api/reservations
// @access  Private
export const getReservations = asyncHandler(async (req, res) => {
    const { status, date, tableId } = req.query;

    const query = {};

    if (status) {
        query.status = status;
    } else {
        // By default, show upcoming and seated
        query.status = { $in: ['upcoming', 'seated'] };
    }

    if (date) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        query.reservationTime = { $gte: dayStart, $lte: dayEnd };
    }

    if (tableId) {
        query.table = tableId;
    }

    const reservations = await Reservation.find(query)
        .populate('table', 'tableNumber capacity location')
        .populate('createdBy', 'name')
        .sort({ reservationTime: 1 });

    res.json({
        success: true,
        count: reservations.length,
        data: reservations,
    });
});

// @desc    Update reservation status (seat, complete, cancel, no-show)
// @route   PATCH /api/reservations/:id/status
// @access  Private (admin, waiter)
export const updateReservationStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    const validStatuses = ['seated', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    // Validate transitions
    const validTransitions = {
        upcoming: ['seated', 'cancelled', 'no-show'],
        seated: ['completed'],
    };

    if (!validTransitions[reservation.status]?.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Cannot change reservation from "${reservation.status}" to "${status}"`,
        });
    }

    reservation.status = status;
    await reservation.save();

    const table = await Table.findById(reservation.table);

    // Handle table status based on reservation status
    if (table) {
        const previousStatus = table.status;

        if (status === 'seated' && table.status === 'reserved') {
            table.status = 'occupied';
            await table.save();
            emitTableStatusUpdate(table, previousStatus);
        } else if (['cancelled', 'no-show'].includes(status) && table.status === 'reserved') {
            // Check if there are other upcoming reservations for this table soon
            const otherUpcoming = await Reservation.findOne({
                table: table._id,
                _id: { $ne: reservation._id },
                status: 'upcoming',
                reservationTime: { $lte: new Date(Date.now() + 30 * 60 * 1000) },
            });

            if (!otherUpcoming) {
                table.status = 'available';
                await table.save();
                emitTableStatusUpdate(table, previousStatus);
            }
        }
    }

    const populated = await Reservation.findById(reservation._id)
        .populate('table', 'tableNumber capacity location')
        .populate('createdBy', 'name');

    emitTableChanged('reservation-updated', { reservation: populated });

    res.json({
        success: true,
        message: `Reservation ${status}`,
        data: populated,
    });
});

// @desc    Update reservation details
// @route   PUT /api/reservations/:id
// @access  Private (admin, waiter)
export const updateReservation = asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    if (!['upcoming'].includes(reservation.status)) {
        return res.status(400).json({ success: false, message: 'Can only edit upcoming reservations' });
    }

    const allowed = ['guestName', 'guestPhone', 'partySize', 'reservationTime', 'notes'];
    allowed.forEach((field) => {
        if (req.body[field] !== undefined) {
            reservation[field] = req.body[field];
        }
    });

    await reservation.save();

    const populated = await Reservation.findById(reservation._id)
        .populate('table', 'tableNumber capacity location')
        .populate('createdBy', 'name');

    emitTableChanged('reservation-updated', { reservation: populated });

    res.json({
        success: true,
        message: 'Reservation updated',
        data: populated,
    });
});

// @desc    Delete reservation
// @route   DELETE /api/reservations/:id
// @access  Private (admin)
export const deleteReservation = asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    // If table is reserved because of this reservation, free it
    const table = await Table.findById(reservation.table);
    if (table && table.status === 'reserved') {
        const otherUpcoming = await Reservation.findOne({
            table: table._id,
            _id: { $ne: reservation._id },
            status: 'upcoming',
            reservationTime: { $lte: new Date(Date.now() + 30 * 60 * 1000) },
        });

        if (!otherUpcoming) {
            const prev = table.status;
            table.status = 'available';
            await table.save();
            emitTableStatusUpdate(table, prev);
        }
    }

    await Reservation.findByIdAndDelete(req.params.id);

    emitTableChanged('reservation-deleted', { reservationId: req.params.id });

    res.json({ success: true, message: 'Reservation deleted' });
});
