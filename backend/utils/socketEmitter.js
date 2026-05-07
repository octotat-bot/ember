// Socket event emitter utility for controllers
// This allows controllers to emit real-time events to all connected clients

import Notification from '../models/Notification.js';

let ioInstance = null;
const isProduction = process.env.NODE_ENV === 'production';
const log = (...args) => { if (!isProduction) console.log(...args); };

export const setIO = (io) => {
    ioInstance = io;
};

export const getIO = () => ioInstance;

// Helper: persist a notification to the database and also emit via socket
const saveNotification = async ({ recipientRole = null, recipient = null, type, title, message, data = {}, priority = 'normal' }) => {
    try {
        const notification = await Notification.create({
            recipient,
            recipientRole,
            type,
            title,
            message,
            data,
            priority,
        });

        // Also push via socket to the targeted audience
        if (ioInstance) {
            const payload = {
                id: notification._id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                priority: notification.priority,
                read: false,
                createdAt: notification.createdAt,
                timestamp: notification.createdAt,
            };

            if (recipientRole) {
                ioInstance.to(recipientRole).emit('notification:received', payload);
            } else if (recipient) {
                ioInstance.to(`user:${recipient}`).emit('notification:received', payload);
            } else {
                ioInstance.emit('notification:received', payload);
            }
        }

        return notification;
    } catch (err) {
        console.error('Failed to save notification:', err.message);
    }
};

// ==================== ORDER EVENTS ====================

export const emitNewOrder = (order) => {
    if (!ioInstance) return;

    log(`📡 Broadcasting: New order #${order.orderNumber}`);

    // Notify kitchen (chefs) about new order
    ioInstance.to('chef').emit('order:new', {
        type: 'NEW_ORDER',
        order,
        message: `New order for Table ${order.tableNumber}`,
        timestamp: new Date()
    });

    // Notify all admins
    ioInstance.to('admin').emit('order:new', {
        type: 'NEW_ORDER',
        order,
        timestamp: new Date()
    });

    // Notify all waiters so they see the new order
    ioInstance.to('waiter').emit('order:new', {
        type: 'NEW_ORDER',
        order,
        timestamp: new Date()
    });

    // Play notification sound on kitchen devices
    ioInstance.to('chef').emit('notification:sound', { type: 'new_order' });

    // Persist notifications for each relevant role
    saveNotification({
        recipientRole: 'chef',
        type: 'order_new',
        title: 'New Order',
        message: `New order #${order.orderNumber} for Table ${order.tableNumber}`,
        data: { orderId: order._id, orderNumber: order.orderNumber, tableNumber: order.tableNumber },
        priority: 'high',
    });
    saveNotification({
        recipientRole: 'admin',
        type: 'order_new',
        title: 'New Order',
        message: `New order #${order.orderNumber} for Table ${order.tableNumber}`,
        data: { orderId: order._id, orderNumber: order.orderNumber, tableNumber: order.tableNumber },
    });
};

export const emitOrderStatusUpdate = (order, previousStatus, updatedBy) => {
    if (!ioInstance) return;

    log(`📡 Broadcasting: Order #${order.orderNumber} status ${previousStatus} → ${order.status}`);

    const eventData = {
        type: 'ORDER_STATUS_UPDATE',
        orderId: order._id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        status: order.status,
        previousStatus,
        updatedBy,
        order,
        timestamp: new Date()
    };

    // Broadcast to everyone so all panels update
    ioInstance.emit('order:updated', eventData);

    // Specific status-based notifications
    const notifData = { orderId: order._id, orderNumber: order.orderNumber, tableNumber: order.tableNumber, status: order.status };

    switch (order.status) {
        case 'confirmed':
            ioInstance.to('chef').emit('order:confirmed', eventData);
            saveNotification({
                recipientRole: 'chef',
                type: 'order_status',
                title: 'Order Confirmed',
                message: `Order #${order.orderNumber} (Table ${order.tableNumber}) confirmed — start preparing`,
                data: notifData,
            });
            break;

        case 'preparing':
            ioInstance.to('waiter').emit('order:preparing', eventData);
            saveNotification({
                recipientRole: 'waiter',
                type: 'order_status',
                title: 'Order Preparing',
                message: `Order #${order.orderNumber} (Table ${order.tableNumber}) is being prepared`,
                data: notifData,
            });
            break;

        case 'ready':
            // Notify waiters and runners with sound
            ioInstance.to('waiter').emit('order:ready', { ...eventData, priority: 'high' });
            ioInstance.to('runner').emit('order:ready', { ...eventData, priority: 'high' });
            ioInstance.to('waiter').emit('notification:sound', { type: 'order_ready' });
            ioInstance.to('runner').emit('notification:sound', { type: 'order_ready' });

            // *** Targeted popup for the specific waiter who took this order ***
            {
                const waiterId = order.waiter?._id || order.waiter;
                if (waiterId) {
                    ioInstance.to(`user:${waiterId}`).emit('order:ready:personal', {
                        orderId: order._id,
                        orderNumber: order.orderNumber,
                        tableNumber: order.tableNumber || order.table?.tableNumber,
                        items: order.items?.map(i => ({ name: i.name, quantity: i.quantity })),
                        chefName: order.chef?.name || updatedBy || 'Chef',
                        timestamp: new Date(),
                    });
                }
            }

            saveNotification({
                recipientRole: 'waiter',
                type: 'order_ready',
                title: 'Order Ready!',
                message: `Order #${order.orderNumber} for Table ${order.tableNumber} is ready to serve`,
                data: notifData,
                priority: 'high',
            });
            saveNotification({
                recipientRole: 'runner',
                type: 'order_ready',
                title: 'Order Ready!',
                message: `Order #${order.orderNumber} for Table ${order.tableNumber} is ready to serve`,
                data: notifData,
                priority: 'high',
            });
            break;

        case 'served':
            ioInstance.to('cashier').emit('order:served', eventData);
            saveNotification({
                recipientRole: 'cashier',
                type: 'order_status',
                title: 'Order Served',
                message: `Order #${order.orderNumber} (Table ${order.tableNumber}) served — ready for billing`,
                data: notifData,
            });
            break;

        case 'completed':
            ioInstance.to('admin').emit('order:completed', eventData);
            saveNotification({
                recipientRole: 'admin',
                type: 'order_status',
                title: 'Order Completed',
                message: `Order #${order.orderNumber} (Table ${order.tableNumber}) completed & paid`,
                data: notifData,
            });
            break;

        case 'cancelled':
            ioInstance.to('chef').emit('order:cancelled', eventData);
            saveNotification({
                recipientRole: 'chef',
                type: 'order_cancelled',
                title: 'Order Cancelled',
                message: `Order #${order.orderNumber} (Table ${order.tableNumber}) has been cancelled`,
                data: notifData,
                priority: 'high',
            });
            saveNotification({
                recipientRole: 'admin',
                type: 'order_cancelled',
                title: 'Order Cancelled',
                message: `Order #${order.orderNumber} (Table ${order.tableNumber}) has been cancelled`,
                data: notifData,
            });
            break;
    }
};

export const emitItemsAdded = (order, newItems) => {
    if (!ioInstance) return;

    log(`📡 Broadcasting: Items added to order #${order.orderNumber}`);

    ioInstance.to('chef').emit('order:items:new', {
        type: 'ITEMS_ADDED',
        orderId: order._id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        newItems,
        order,
        timestamp: new Date()
    });

    ioInstance.to('chef').emit('notification:sound', { type: 'items_added' });

    // Also notify waiters
    ioInstance.to('waiter').emit('order:items:new', {
        type: 'ITEMS_ADDED',
        orderId: order._id,
        order,
        timestamp: new Date()
    });
};

export const emitItemStatusUpdate = (order, item) => {
    if (!ioInstance) return;

    ioInstance.emit('order:item:updated', {
        type: 'ITEM_STATUS_UPDATE',
        orderId: order._id,
        orderNumber: order.orderNumber,
        itemId: item._id,
        itemName: item.name,
        status: item.itemStatus,
        order,
        timestamp: new Date()
    });
};

// Item marked ready by chef → notify waiter and runner
export const emitItemReady = (order, item) => {
    if (!ioInstance) return;

    log(`📡 Broadcasting: Item "${item.name}" ready in order #${order.orderNumber}`);

    const payload = {
        orderId: order._id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        itemId: item._id,
        itemName: item.name,
        quantity: item.quantity,
        timestamp: new Date()
    };

    ioInstance.to('waiter').emit('item:ready', payload);
    ioInstance.to('runner').emit('item:ready', payload);
    ioInstance.to('waiter').emit('notification:sound', { type: 'item_ready' });
    ioInstance.to('runner').emit('notification:sound', { type: 'item_ready' });

    // Also notify the specific waiter who owns the order
    const waiterId = order.waiter?._id || order.waiter;
    if (waiterId) {
        ioInstance.to(`user:${waiterId}`).emit('item:ready', payload);
    }
};

// Item served → notify kitchen
export const emitItemServed = (order, item) => {
    if (!ioInstance) return;

    log(`📡 Broadcasting: Item "${item.name}" served in order #${order.orderNumber}`);

    ioInstance.to('chef').emit('item:served', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        itemId: item._id,
        itemName: item.name,
        timestamp: new Date()
    });

    // Check if all items are served — notify all
    const activeItems = order.items.filter(i => i.itemStatus !== 'cancelled');
    const allServed = activeItems.every(i => i.itemStatus === 'served');
    if (allServed) {
        ioInstance.emit('order:all_served', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            tableNumber: order.tableNumber,
            timestamp: new Date()
        });
    }
};

// ==================== TABLE EVENTS ====================

export const emitTableStatusUpdate = (table, previousStatus) => {
    if (!ioInstance) return;

    log(`📡 Broadcasting: Table ${table.tableNumber} status ${previousStatus} → ${table.status}`);

    // Broadcast to all connected users
    ioInstance.emit('table:updated', {
        type: 'TABLE_STATUS_CHANGE',
        tableId: table._id,
        tableNumber: table.tableNumber,
        status: table.status,
        previousStatus,
        table,
        timestamp: new Date()
    });

    // If table became available, notify waiters specifically
    if (table.status === 'available') {
        ioInstance.to('waiter').emit('table:available', {
            tableNumber: table.tableNumber,
            message: `Table ${table.tableNumber} is now available`
        });
        saveNotification({
            recipientRole: 'waiter',
            type: 'table_update',
            title: 'Table Available',
            message: `Table ${table.tableNumber} is now available`,
            data: { tableId: table._id, tableNumber: table.tableNumber, status: table.status },
        });
    }
};

// ==================== MENU EVENTS ====================

export const emitMenuUpdate = (menuItem) => {
    if (!ioInstance) return;

    log(`📡 Broadcasting: Menu item ${menuItem.name} ${menuItem.isAvailable ? 'available' : 'sold out'}`);

    ioInstance.emit('menu:updated', {
        type: 'MENU_AVAILABILITY',
        itemId: menuItem._id,
        itemName: menuItem.name,
        isAvailable: menuItem.isAvailable,
        menuItem,
        message: menuItem.isAvailable
            ? `${menuItem.name} is now available`
            : `${menuItem.name} is sold out`,
        timestamp: new Date()
    });

    // Persist a notification about menu changes
    saveNotification({
        type: 'menu_update',
        title: menuItem.isAvailable ? 'Item Available' : 'Item Sold Out',
        message: menuItem.isAvailable
            ? `${menuItem.name} is now available`
            : `${menuItem.name} is sold out`,
        data: { itemId: menuItem._id, itemName: menuItem.name, isAvailable: menuItem.isAvailable },
    });
};

// ==================== PAYMENT EVENTS ====================

export const emitPaymentCompleted = (order) => {
    if (!ioInstance) return;

    log(`📡 Broadcasting: Payment completed for order #${order.orderNumber}`);

    // Notify everyone
    ioInstance.emit('payment:completed', {
        type: 'PAYMENT_COMPLETED',
        orderId: order._id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        paymentMethod: order.paymentMethod,
        amount: order.totalAmount,
        order,
        timestamp: new Date()
    });

    // Notify waiter specifically
    ioInstance.to('waiter').emit('payment:success', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber
    });

    // Persist payment notification
    saveNotification({
        recipientRole: 'admin',
        type: 'payment',
        title: 'Payment Received',
        message: `Payment of ₹${order.totalAmount?.toFixed(0) || 0} received for order #${order.orderNumber} (${order.paymentMethod})`,
        data: { orderId: order._id, orderNumber: order.orderNumber, tableNumber: order.tableNumber, amount: order.totalAmount, paymentMethod: order.paymentMethod },
    });
};

// ==================== MENU CRUD EVENTS ====================

export const emitMenuChanged = (action, menuItem) => {
    if (!ioInstance) return;
    log(`📡 Broadcasting: Menu ${action} — ${menuItem?.name || 'item'}`);
    ioInstance.emit('menu:changed', { action, item: menuItem, timestamp: new Date() });
};

// ==================== TABLE CRUD EVENTS ====================

export const emitTableChanged = (action, table) => {
    if (!ioInstance) return;
    log(`📡 Broadcasting: Table ${action} — #${table?.tableNumber || '?'}`);
    ioInstance.emit('table:changed', { action, table, timestamp: new Date() });
};

// ==================== UTILITY ====================

export const emitToRole = (role, event, data) => {
    if (!ioInstance) return;
    ioInstance.to(role).emit(event, { ...data, timestamp: new Date() });
};

export const emitToAll = (event, data) => {
    if (!ioInstance) return;
    ioInstance.emit(event, { ...data, timestamp: new Date() });
};

export const getConnectedUsersCount = async () => {
    if (!ioInstance) return {};

    const sockets = await ioInstance.fetchSockets();
    const counts = { admin: 0, waiter: 0, chef: 0, runner: 0, cashier: 0, total: sockets.length };

    sockets.forEach(socket => {
        const rooms = Array.from(socket.rooms);
        ['admin', 'waiter', 'chef', 'runner', 'cashier'].forEach(role => {
            if (rooms.includes(role)) counts[role]++;
        });
    });

    return counts;
};

export default {
    setIO,
    getIO,
    emitNewOrder,
    emitOrderStatusUpdate,
    emitItemsAdded,
    emitItemStatusUpdate,
    emitItemReady,
    emitItemServed,
    emitTableStatusUpdate,
    emitMenuUpdate,
    emitPaymentCompleted,
    emitToRole,
    emitMenuChanged,
    emitTableChanged,
    emitToAll,
    getConnectedUsersCount
};
