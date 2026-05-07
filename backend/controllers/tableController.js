import Table from '../models/Table.js';
import Order from '../models/Order.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';
import { emitTableStatusUpdate, emitTableChanged } from '../utils/socketEmitter.js';

// @desc    Get all tables
// @route   GET /api/tables
// @access  Private
export const getAllTables = asyncHandler(async (req, res) => {
    const { status, location, available } = req.query;

    const query = { isActive: true };

    if (status) query.status = status;
    if (location) query.location = location;
    if (available === 'true') query.status = 'available';

    const tables = await Table.find(query)
        .populate('currentOrder', 'orderNumber status items totalAmount')
        .sort({ tableNumber: 1 });

    res.json({
        success: true,
        count: tables.length,
        data: tables
    });
});

// @desc    Get table by ID
// @route   GET /api/tables/:id
// @access  Private
export const getTableById = asyncHandler(async (req, res) => {
    const table = await Table.findById(req.params.id)
        .populate({
            path: 'currentOrder',
            populate: {
                path: 'items.menuItem',
                select: 'name price image'
            }
        });

    if (!table) {
        return res.status(404).json({
            success: false,
            message: 'Table not found'
        });
    }

    res.json({
        success: true,
        data: table
    });
});

// @desc    Get table by number
// @route   GET /api/tables/number/:tableNumber
// @access  Private
export const getTableByNumber = asyncHandler(async (req, res) => {
    const table = await Table.findOne({
        tableNumber: parseInt(req.params.tableNumber),
        isActive: true
    }).populate({
        path: 'currentOrder',
        populate: {
            path: 'items.menuItem',
            select: 'name price image'
        }
    });

    if (!table) {
        return res.status(404).json({
            success: false,
            message: 'Table not found'
        });
    }

    res.json({
        success: true,
        data: table
    });
});

// @desc    Create new table
// @route   POST /api/tables
// @access  Private/Admin
export const createTable = asyncHandler(async (req, res) => {
    const { tableNumber, capacity, location, notes } = req.body;

    // Check if table number already exists
    const existingTable = await Table.findOne({ tableNumber });
    if (existingTable) {
        return res.status(400).json({
            success: false,
            message: `Table ${tableNumber} already exists`
        });
    }

    // Generate QR code identifier
    const qrCode = `TABLE-${tableNumber}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const table = await Table.create({
        tableNumber,
        capacity,
        location,
        notes,
        qrCode
    });

    emitTableChanged('created', table);

    res.status(201).json({
        success: true,
        message: 'Table created successfully',
        data: table
    });
});

// @desc    Update table
// @route   PUT /api/tables/:id
// @access  Private/Admin
export const updateTable = asyncHandler(async (req, res) => {
    const table = await Table.findById(req.params.id);

    if (!table) {
        return res.status(404).json({
            success: false,
            message: 'Table not found'
        });
    }

    // Check for duplicate table number if being changed
    if (req.body.tableNumber && req.body.tableNumber !== table.tableNumber) {
        const existing = await Table.findOne({
            tableNumber: req.body.tableNumber,
            _id: { $ne: table._id }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Table ${req.body.tableNumber} already exists`
            });
        }
    }

    const allowedFields = ['tableNumber', 'capacity', 'location', 'notes', 'isActive'];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            table[field] = req.body[field];
        }
    });

    await table.save();

    emitTableChanged('updated', table);

    res.json({
        success: true,
        message: 'Table updated successfully',
        data: table
    });
});

// @desc    Update table status
// @route   PATCH /api/tables/:id/status
// @access  Private
export const updateTableStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    const table = await Table.findById(req.params.id);

    if (!table) {
        return res.status(404).json({
            success: false,
            message: 'Table not found'
        });
    }

    // Validate status transitions
    const validTransitions = {
        available: ['occupied', 'reserved', 'cleaning'],
        occupied: ['available', 'cleaning'],
        reserved: ['occupied', 'available'],
        cleaning: ['available']
    };

    if (!validTransitions[table.status]?.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Cannot change status from ${table.status} to ${status}`
        });
    }

    // If changing to available, clear current order and occupiedAt
    if (status === 'available') {
        table.currentOrder = null;
        table.occupiedAt = null;
        table.handoffNote = '';
        table.handoffBy = null;
        table.handoffAt = null;
    }

    // If changing to occupied, set occupiedAt
    if (status === 'occupied' && table.status !== 'occupied') {
        table.occupiedAt = new Date();
    }

    const previousStatus = table.status;
    table.status = status;
    await table.save();

    // Broadcast table status update
    emitTableStatusUpdate(table, previousStatus);

    res.json({
        success: true,
        message: 'Table status updated',
        data: table
    });
});

// @desc    Delete table
// @route   DELETE /api/tables/:id
// @access  Private/Admin
export const deleteTable = asyncHandler(async (req, res) => {
    const table = await Table.findById(req.params.id);

    if (!table) {
        return res.status(404).json({
            success: false,
            message: 'Table not found'
        });
    }

    // Check if table has active order
    if (table.status === 'occupied' && table.currentOrder) {
        return res.status(400).json({
            success: false,
            message: 'Cannot delete table with active order. Please complete or cancel the order first.'
        });
    }

    // Soft delete - just mark as inactive
    table.isActive = false;
    await table.save();

    emitTableChanged('deleted', table);

    res.json({
        success: true,
        message: 'Table deleted successfully'
    });
});

// @desc    Get table orders history
// @route   GET /api/tables/:id/orders
// @access  Private
export const getTableOrders = asyncHandler(async (req, res) => {
    const { limit = 10, status } = req.query;

    const table = await Table.findById(req.params.id);

    if (!table) {
        return res.status(404).json({
            success: false,
            message: 'Table not found'
        });
    }

    const query = { table: table._id };
    if (status) query.status = status;

    const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('waiter', 'name')
        .populate('items.menuItem', 'name price');

    res.json({
        success: true,
        data: orders
    });
});

// @desc    Get table summary (for dashboard)
// @route   GET /api/tables/summary
// @access  Private
export const getTablesSummary = asyncHandler(async (req, res) => {
    const summary = await Table.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const totalTables = await Table.countDocuments({ isActive: true });

    const statusCounts = {
        available: 0,
        occupied: 0,
        reserved: 0,
        cleaning: 0
    };

    summary.forEach(item => {
        statusCounts[item._id] = item.count;
    });

    res.json({
        success: true,
        data: {
            total: totalTables,
            ...statusCounts
        }
    });
});

// @desc    Get table by QR code
// @route   GET /api/tables/qr/:qrCode
// @access  Public
export const getTableByQR = asyncHandler(async (req, res) => {
    const table = await Table.findOne({
        qrCode: req.params.qrCode,
        isActive: true
    });

    if (!table) {
        return res.status(404).json({
            success: false,
            message: 'Invalid QR code'
        });
    }

    res.json({
        success: true,
        data: {
            tableNumber: table.tableNumber,
            capacity: table.capacity,
            status: table.status,
            location: table.location
        }
    });
});

// @desc    Create multiple tables at once
// @route   POST /api/tables/bulk
// @access  Private/Admin
export const bulkCreateTables = asyncHandler(async (req, res) => {
    const { startNumber, endNumber, capacity, location } = req.body;

    if (!startNumber || !endNumber || startNumber > endNumber) {
        return res.status(400).json({
            success: false,
            message: 'Invalid table number range'
        });
    }

    const existingTables = await Table.find({
        tableNumber: { $gte: startNumber, $lte: endNumber }
    });

    const existingNumbers = existingTables.map(t => t.tableNumber);

    const tablesToCreate = [];
    for (let num = startNumber; num <= endNumber; num++) {
        if (!existingNumbers.includes(num)) {
            tablesToCreate.push({
                tableNumber: num,
                capacity: capacity || 4,
                location: location || 'indoor',
                qrCode: `TABLE-${num}-${uuidv4().slice(0, 8).toUpperCase()}`
            });
        }
    }

    if (tablesToCreate.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'All tables in this range already exist'
        });
    }

    const tables = await Table.insertMany(tablesToCreate);

    emitTableChanged('bulk-created', { tables });

    res.status(201).json({
        success: true,
        message: `${tables.length} tables created successfully`,
        data: tables
    });
});
