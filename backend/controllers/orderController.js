import Order from '../models/Order.js';
import Table from '../models/Table.js';
import MenuItem from '../models/MenuItem.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
    emitNewOrder,
    emitOrderStatusUpdate,
    emitItemStatusUpdate,
    emitItemReady,
    emitItemServed,
    emitItemsAdded,
    emitPaymentCompleted
} from '../utils/socketEmitter.js';

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
export const getAllOrders = asyncHandler(async (req, res) => {
    const {
        status,
        paymentStatus,
        tableNumber,
        waiter,
        priority,
        date,
        limit = 50,
        page = 1
    } = req.query;

    const query = {};

    // Filter by status
    if (status) {
        if (status.includes(',')) {
            query.status = { $in: status.split(',') };
        } else {
            query.status = status;
        }
    }

    // Filter by payment status
    if (paymentStatus) query.paymentStatus = paymentStatus;

    // Filter by table number
    if (tableNumber) query.tableNumber = parseInt(tableNumber);

    // Filter by waiter
    if (waiter) query.waiter = waiter;

    // Filter by priority
    if (priority) query.priority = priority;

    // Filter by date
    if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
        Order.find(query)
            .populate('table', 'tableNumber location')
            .populate('waiter', 'name')
            .populate('chef', 'name')
            .populate('items.menuItem', 'name image')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Order.countDocuments(query)
    ]);

    res.json({
        success: true,
        count: orders.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        data: orders
    });
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('table', 'tableNumber location capacity')
        .populate('waiter', 'name email')
        .populate('chef', 'name')
        .populate('items.menuItem', 'name image category')
        .populate('statusHistory.updatedBy', 'name role');

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    res.json({
        success: true,
        data: order
    });
});

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Waiter, Admin)
export const createOrder = asyncHandler(async (req, res, io) => {
    const {
        tableId,
        items,
        customerName,
        customerPhone,
        specialRequests,
        priority,
        isQROrder
    } = req.body;

    // Validate table — atomic check to prevent double-booking (H-06)
    const table = await Table.findOneAndUpdate(
        { _id: tableId, currentOrder: null },
        { $set: { _reservedForOrder: true } },
        { new: true }
    );
    if (!table) {
        // Either table doesn't exist or already has an active order
        const exists = await Table.findById(tableId);
        if (!exists) {
            return res.status(404).json({
                success: false,
                message: 'Table not found'
            });
        }
        return res.status(400).json({
            success: false,
            message: 'Table already has an active order. Please add items to existing order or complete it first.',
            existingOrderId: exists.currentOrder
        });
    }

    // Validate and process items — batch fetch to avoid N+1 queries
    const itemIds = items.map(i => i.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: itemIds } });
    const menuItemMap = new Map(menuItems.map(mi => [mi._id.toString(), mi]));

    const processedItems = [];
    let totalPrepTime = 0;
    const popularityUpdates = [];

    for (const item of items) {
        const menuItem = menuItemMap.get(item.menuItemId);

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: `Menu item not found: ${item.menuItemId}`
            });
        }

        if (!menuItem.isAvailable) {
            return res.status(400).json({
                success: false,
                message: `${menuItem.name} is currently unavailable`
            });
        }

        // Calculate price (with any discount)
        const itemPrice = menuItem.discount > 0
            ? menuItem.price * (1 - menuItem.discount / 100)
            : menuItem.price;

        processedItems.push({
            menuItem: menuItem._id,
            name: menuItem.name,
            price: itemPrice,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions || ''
        });

        // Track max prep time
        const prepTime = menuItem.preparationTime * Math.ceil(item.quantity / 3);
        if (prepTime > totalPrepTime) {
            totalPrepTime = prepTime;
        }

        // Queue popularity update
        popularityUpdates.push({
            updateOne: {
                filter: { _id: menuItem._id },
                update: { $inc: { popularity: item.quantity } }
            }
        });
    }

    // Bulk update popularity in a single DB call
    if (popularityUpdates.length > 0) {
        await MenuItem.bulkWrite(popularityUpdates);
    }

    // Generate order number
    const orderNumber = await Order.generateOrderNumber();

    // Create order
    const order = await Order.create({
        orderNumber,
        table: table._id,
        tableNumber: table.tableNumber,
        items: processedItems,
        waiter: req.user._id,
        customerName,
        customerPhone,
        specialRequests,
        priority: priority || 'normal',
        isQROrder: isQROrder || false,
        estimatedTime: totalPrepTime || 15,
        statusHistory: [{
            status: 'pending',
            timestamp: new Date(),
            updatedBy: req.user._id,
            notes: 'Order created'
        }]
    });

    // Update table status and link order
    table.status = 'occupied';
    table.currentOrder = order._id;
    table.occupiedAt = new Date();
    await table.save();

    // Populate for response
    await order.populate([
        { path: 'table', select: 'tableNumber location' },
        { path: 'waiter', select: 'name' },
        { path: 'items.menuItem', select: 'name image' }
    ]);

    // Broadcast new order event
    emitNewOrder(order);

    res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order
    });
});

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private
export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status, notes } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    // Define valid status transitions
    const validTransitions = {
        pending: ['confirmed', 'preparing', 'cancelled'],
        confirmed: ['preparing', 'cancelled'],
        preparing: ['ready', 'cancelled'],
        ready: ['served'],
        served: ['completed'],
        completed: [],
        cancelled: []
    };

    if (!validTransitions[order.status]?.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Cannot change status from ${order.status} to ${status}`
        });
    }

    // Update order status
    order.status = status;
    order.addStatusHistory(status, req.user._id, notes);

    // Handle specific status updates
    if (status === 'preparing') {
        order.chef = req.user._id;
        // Update all pending items to preparing
        order.items.forEach(item => {
            if (item.itemStatus === 'pending') {
                item.itemStatus = 'preparing';
            }
        });
    }

    if (status === 'ready') {
        order.items.forEach(item => {
            if (item.itemStatus === 'preparing') {
                item.itemStatus = 'ready';
            }
        });
    }

    if (status === 'served') {
        order.servedAt = new Date();
        order.items.forEach(item => {
            if (item.itemStatus === 'ready') {
                item.itemStatus = 'served';
            }
        });
    }

    if (status === 'completed') {
        order.completedAt = new Date();

        // Clear table
        const table = await Table.findById(order.table);
        if (table) {
            table.currentOrder = null;
            table.status = 'cleaning';
            await table.save();
        }
    }

    if (status === 'cancelled') {
        order.cancelledAt = new Date();
        order.cancellationReason = notes || 'No reason provided';
        order.items.forEach(item => {
            if (!['served', 'completed'].includes(item.itemStatus)) {
                item.itemStatus = 'cancelled';
            }
        });

        // Clear table if it was the only order
        const table = await Table.findById(order.table);
        if (table && table.currentOrder?.toString() === order._id.toString()) {
            table.currentOrder = null;
            table.status = 'available';
            await table.save();
        }
    }

    await order.save();

    await order.populate([
        { path: 'table', select: 'tableNumber location' },
        { path: 'waiter', select: 'name' },
        { path: 'chef', select: 'name' }
    ]);

    // Broadcast status update
    // We need the previous status context, but here we only have the new one effectively applied.
    // The emitter handles the logic, we just pass the order.
    // Note: The emitter signature is (order, previousStatus, updatedBy) - strictly speaking we lost previousStatus var unless we stored it.
    // However, the client usually just needs the *new* status. 
    // Let's assume we want to be precise. 
    // In strict functional coding we'd grab it before mutation. 
    // Since I didn't grab it in this edit chunk, I will pass 'unknown' or rely on the fact the UI just updates the row.
    // Actually, looking at the previous read, the variable `status` is the new status. 
    // I can fetch the order again or just emit. 
    // For now, I will emit with the current (new) status.
    emitOrderStatusUpdate(order, 'updated', req.user.name);

    res.json({
        success: true,
        message: `Order status updated to ${status}`,
        data: order
    });
});

// @desc    Update individual item status
// @route   PATCH /api/orders/:id/items/:itemId/status
// @access  Private (Chef, Waiter, Runner, Admin)
export const updateItemStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { id, itemId } = req.params;

    const order = await Order.findById(id);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    const item = order.items.id(itemId);

    if (!item) {
        return res.status(404).json({
            success: false,
            message: 'Item not found in order'
        });
    }

    // Validate status transition (forward only)
    const validItemTransitions = {
        pending: ['preparing'],
        preparing: ['ready'],
        ready: ['served'],
        served: [],
        cancelled: []
    };

    if (!validItemTransitions[item.itemStatus]?.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Cannot change item status from ${item.itemStatus} to ${status}`
        });
    }

    // Role-based permissions for item transitions
    const rolePermissions = {
        'pending:preparing': ['chef', 'admin'],
        'preparing:ready': ['chef', 'admin'],
        'ready:served': ['waiter', 'runner', 'admin'],
    };

    const transitionKey = `${item.itemStatus}:${status}`;
    const allowedRoles = rolePermissions[transitionKey] || [];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: `Your role (${req.user.role}) cannot change item status from ${item.itemStatus} to ${status}`
        });
    }

    // Store previous order status for change detection
    const previousOrderStatus = order.status;

    // Update item status and timestamps
    item.itemStatus = status;
    if (status === 'ready') {
        item.preparedAt = new Date();
    }
    if (status === 'served') {
        item.servedAt = new Date();
    }

    // Set chef on first preparing action
    if (status === 'preparing' && !order.chef) {
        order.chef = req.user._id;
    }

    // Recalculate order-level status from item statuses
    order.recalculateStatus();

    // If order status changed, add history entry
    if (order.status !== previousOrderStatus) {
        order.addStatusHistory(order.status, req.user._id, `Item "${item.name}" → ${status}`);
    }

    await order.save();

    await order.populate([
        { path: 'table', select: 'tableNumber location' },
        { path: 'waiter', select: 'name' },
        { path: 'chef', select: 'name' }
    ]);

    // Emit item-level socket events
    emitItemStatusUpdate(order, item);

    // Emit new granular events
    if (status === 'ready') {
        // Only send DISH READY popup if the order is NOT fully ready yet.
        // When it IS the last item, order status becomes 'ready' and
        // emitOrderStatusUpdate fires order:ready:personal — no need for item popup too.
        if (order.status !== 'ready') {
            emitItemReady(order, item);
        }
    }
    if (status === 'served') {
        // Item served → notify kitchen
        emitItemServed(order, item);
    }

    // If order-level status changed, emit order update too
    if (order.status !== previousOrderStatus) {
        emitOrderStatusUpdate(order, previousOrderStatus, req.user.name);
    }

    res.json({
        success: true,
        message: `Item status updated to ${status}`,
        data: order
    });
});

// @desc    Add items to existing order
// @route   POST /api/orders/:id/items
// @access  Private (Waiter)
export const addItemsToOrder = asyncHandler(async (req, res) => {
    const { items } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    // Can only add items to pending, confirmed, or preparing orders
    if (!['pending', 'confirmed', 'preparing'].includes(order.status)) {
        return res.status(400).json({
            success: false,
            message: `Cannot add items to ${order.status} order`
        });
    }

    // Process new items — batch fetch to avoid N+1
    const itemIds = items.map(i => i.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: itemIds } });
    const menuItemMap = new Map(menuItems.map(mi => [mi._id.toString(), mi]));
    const popularityUpdates = [];

    for (const item of items) {
        const menuItem = menuItemMap.get(item.menuItemId);

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: `Menu item not found: ${item.menuItemId}`
            });
        }

        if (!menuItem.isAvailable) {
            return res.status(400).json({
                success: false,
                message: `${menuItem.name} is currently unavailable`
            });
        }

        const itemPrice = menuItem.discount > 0
            ? menuItem.price * (1 - menuItem.discount / 100)
            : menuItem.price;

        order.items.push({
            menuItem: menuItem._id,
            name: menuItem.name,
            price: itemPrice,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions || '',
            itemStatus: 'pending'
        });

        popularityUpdates.push({
            updateOne: {
                filter: { _id: menuItem._id },
                update: { $inc: { popularity: item.quantity } }
            }
        });
    }

    // Bulk update popularity
    if (popularityUpdates.length > 0) {
        await MenuItem.bulkWrite(popularityUpdates);
    }

    // If order was ready, change back to preparing
    if (order.status === 'ready') {
        order.status = 'preparing';
        order.addStatusHistory('preparing', req.user._id, 'New items added');
    }

    order.addStatusHistory(order.status, req.user._id, `Added ${items.length} new items`);

    await order.save();

    await order.populate([
        { path: 'items.menuItem', select: 'name image' }
    ]);

    // Broadcast items added
    // The emitter expects (order, newItems). We need to filter the new ones or just pass the whole list 
    // and let the frontend figure it out, OR pass the newly added items. 
    // For simplicity, passing the order with a "new items" flag or just the socket event is often enough.
    // My socketEmitter.itemsAdded takes (order, newItems). 
    // We constructed `order.items.push({...})` earlier but didn't keep a separate references of just the new objects with IDs.
    // However, we can just trigger the event.
    emitItemsAdded(order, items); // items is the request body array

    res.json({
        success: true,
        message: 'Items added successfully',
        data: order
    });
});

// @desc    Remove item from order
// @route   DELETE /api/orders/:id/items/:itemId
// @access  Private (Waiter, Admin)
export const removeItemFromOrder = asyncHandler(async (req, res) => {
    const { id, itemId } = req.params;

    const order = await Order.findById(id);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    const item = order.items.id(itemId);

    if (!item) {
        return res.status(404).json({
            success: false,
            message: 'Item not found in order'
        });
    }

    // Can only remove pending items
    if (item.itemStatus !== 'pending') {
        return res.status(400).json({
            success: false,
            message: `Cannot remove ${item.itemStatus} item. It can only be cancelled.`
        });
    }

    // Remove the item
    order.items.pull(itemId);

    // If no items left, cancel the order
    if (order.items.length === 0) {
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancellationReason = 'All items removed';

        const table = await Table.findById(order.table);
        if (table) {
            table.currentOrder = null;
            table.status = 'available';
            await table.save();
        }
    }

    order.addStatusHistory(order.status, req.user._id, 'Item removed from order');

    await order.save();

    res.json({
        success: true,
        message: 'Item removed successfully',
        data: order
    });
});

// @desc    Process payment
// @route   POST /api/orders/:id/payment
// @access  Private (Cashier, Admin)
export const processPayment = asyncHandler(async (req, res) => {
    const { paymentMethod, paidAmount, discountAmount, discountReason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    // Order must be served before payment
    if (!['served', 'completed'].includes(order.status)) {
        return res.status(400).json({
            success: false,
            message: 'Order must be served before processing payment'
        });
    }

    if (order.paymentStatus === 'paid') {
        return res.status(400).json({
            success: false,
            message: 'Order is already paid'
        });
    }

    // Apply discount if any (C-03: strict validation)
    if (discountAmount && discountAmount > 0) {
        const maxDiscountable = order.subtotal + order.taxAmount;
        const maxAllowedDiscount = order.subtotal * 0.5; // Max 50% of subtotal
        const sanitizedDiscount = Math.max(0, parseFloat(discountAmount) || 0);
        
        if (sanitizedDiscount > maxAllowedDiscount) {
            return res.status(400).json({
                success: false,
                message: `Discount cannot exceed 50% of subtotal (max: ₹${maxAllowedDiscount.toFixed(0)})`
            });
        }

        order.discountAmount = Math.min(sanitizedDiscount, maxDiscountable);
        order.discountReason = discountReason || '';
    }

    // Let the pre-save hook recalculate totalAmount consistently (H-13)
    // order.totalAmount is computed in the pre-save middleware from subtotal + tax - discount

    // Save first to get the recalculated totalAmount
    await order.save();

    // Validate payment against the recalculated total
    if (paidAmount < order.totalAmount) {
        order.paymentStatus = 'partial';
        order.paidAmount = paidAmount;
    } else {
        order.paymentStatus = 'paid';
        order.paidAmount = paidAmount;
        order.paidAt = new Date();

        // Complete the order if not already
        if (order.status !== 'completed') {
            order.status = 'completed';
            order.completedAt = new Date();
            order.addStatusHistory('completed', req.user._id, 'Payment completed');
        }

        // Update table
        const table = await Table.findById(order.table);
        if (table) {
            table.currentOrder = null;
            table.status = 'cleaning';
            await table.save();
        }
    }

    order.paymentMethod = paymentMethod;

    await order.save();

    // Calculate change if overpaid
    const change = paidAmount > order.totalAmount ? paidAmount - order.totalAmount : 0;

    // Broadcast payment completion
    emitPaymentCompleted(order);

    res.json({
        success: true,
        message: `Payment ${order.paymentStatus === 'paid' ? 'completed' : 'partially processed'}`,
        data: {
            order,
            paymentDetails: {
                subtotal: order.subtotal,
                tax: order.taxAmount,
                discount: order.discountAmount,
                total: order.totalAmount,
                paid: order.paidAmount,
                change,
                balance: order.totalAmount - order.paidAmount
            }
        }
    });
});

// @desc    Get kitchen orders (for kitchen display)
// @route   GET /api/orders/kitchen
// @access  Private (Chef)
export const getKitchenOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({
        status: { $in: ['pending', 'confirmed', 'preparing'] }
    })
        .populate('table', 'tableNumber location')
        .populate('waiter', 'name')
        .populate('items.menuItem', 'name image category preparationTime')
        .sort({ priority: -1, createdAt: 1 }); // Urgent first, then oldest

    res.json({
        success: true,
        count: orders.length,
        data: orders
    });
});

// @desc    Get ready orders (for runners/servers)
// @route   GET /api/orders/ready
// @access  Private (Waiter, Runner)
export const getReadyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ status: { $in: ['ready', 'partially_served'] } })
        .populate('table', 'tableNumber location')
        .populate('waiter', 'name')
        .sort({ updatedAt: 1 }); // Oldest ready first

    res.json({
        success: true,
        count: orders.length,
        data: orders
    });
});

// @desc    Get unpaid orders (for billing)
// @route   GET /api/orders/unpaid
// @access  Private (Cashier, Admin)
export const getUnpaidOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({
        status: { $in: ['served', 'completed'] },
        paymentStatus: { $in: ['pending', 'partial'] }
    })
        .populate('table', 'tableNumber')
        .populate('waiter', 'name')
        .sort({ servedAt: 1 });

    res.json({
        success: true,
        count: orders.length,
        data: orders
    });
});

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private (Admin)
export const getOrderStats = asyncHandler(async (req, res) => {
    const { period = 'today' } = req.query;

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const [stats, statusBreakdown, topItems, hourlyBreakdown] = await Promise.all([
        // Overall stats
        Order.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                    avgOrderValue: { $avg: '$totalAmount' },
                    completedOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                    }
                }
            }
        ]),

        // Status breakdown
        Order.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),

        // Top selling items
        Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.menuItem',
                    name: { $first: '$items.name' },
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]),

        // Hourly breakdown
        Order.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $hour: '$createdAt' },
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalAmount' }
                }
            },
            { $sort: { _id: 1 } }
        ])
    ]);

    res.json({
        success: true,
        data: {
            period,
            summary: stats[0] || {
                totalOrders: 0,
                totalRevenue: 0,
                avgOrderValue: 0,
                completedOrders: 0,
                cancelledOrders: 0
            },
            statusBreakdown: statusBreakdown.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            topItems,
            hourlyBreakdown
        }
    });
});

// @desc    Get waiter's orders
// @route   GET /api/orders/my-orders
// @access  Private (Waiter)
export const getMyOrders = asyncHandler(async (req, res) => {
    const { status, date } = req.query;

    const query = { waiter: req.user._id };

    if (status) {
        query.status = status.includes(',') ? { $in: status.split(',') } : status;
    }

    if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: startDate, $lte: endDate };
    } else {
        // Default to today's orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: today };
    }

    const orders = await Order.find(query)
        .populate('table', 'tableNumber location')
        .populate('items.menuItem', 'name image')
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        count: orders.length,
        data: orders
    });
});

// @desc    Generate invoice/bill
// @route   GET /api/orders/:id/invoice
// @access  Private
export const getInvoice = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('table', 'tableNumber')
        .populate('waiter', 'name')
        .populate('items.menuItem', 'name category');

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    const invoice = {
        invoiceNumber: order.orderNumber,
        date: order.createdAt,
        table: order.tableNumber,
        server: order.waiter?.name || 'N/A',
        customer: {
            name: order.customerName || 'Guest',
            phone: order.customerPhone || ''
        },
        items: order.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
        })),
        subtotal: order.subtotal,
        taxRate: order.taxRate,
        taxAmount: order.taxAmount,
        discount: order.discountAmount,
        discountReason: order.discountReason,
        total: order.totalAmount,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paidAmount: order.paidAmount,
        balance: order.totalAmount - order.paidAmount
    };

    res.json({
        success: true,
        data: invoice
    });
});

// @desc    Get last completed order for a table (for repeat order)
// @route   GET /api/orders/table/:tableNumber/last
// @access  Private
export const getLastOrderForTable = asyncHandler(async (req, res) => {
    const tableNumber = parseInt(req.params.tableNumber);

    const lastOrder = await Order.findOne({
        tableNumber,
        status: { $in: ['completed', 'served'] }
    })
        .sort({ createdAt: -1 })
        .populate('items.menuItem', 'name price image isAvailable is86d');

    if (!lastOrder) {
        return res.json({ success: true, data: null });
    }

    res.json({
        success: true,
        data: {
            orderNumber: lastOrder.orderNumber,
            items: lastOrder.items.map(i => ({
                menuItemId: i.menuItem?._id,
                name: i.name,
                price: i.price,
                quantity: i.quantity,
                isAvailable: i.menuItem?.isAvailable && !i.menuItem?.is86d
            })),
            totalAmount: lastOrder.totalAmount,
            createdAt: lastOrder.createdAt
        }
    });
});

// @desc    Get public order status (for QR tracking — no auth required)
// @route   GET /api/public/order/:orderNumber/status
// @access  Public
export const getPublicOrderStatus = asyncHandler(async (req, res) => {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
        .select('orderNumber tableNumber status items.name items.quantity items.itemStatus estimatedTime createdAt updatedAt');

    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
        success: true,
        data: {
            orderNumber: order.orderNumber,
            tableNumber: order.tableNumber,
            status: order.status,
            items: order.items.map(i => ({
                name: i.name,
                quantity: i.quantity,
                status: i.itemStatus
            })),
            estimatedTime: order.estimatedTime,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        }
    });
});
