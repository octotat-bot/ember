// Socket.IO event handler for real-time updates
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const connectedUsers = new Map();
const isProduction = process.env.NODE_ENV === 'production';
const log = (...args) => { if (!isProduction) console.log(...args); };

export const initializeSocket = (io) => {
    // H-10: JWT-based socket authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                // Allow connection but don't authenticate yet (fallback to event-based auth)
                return next();
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if (!user || !user.isActive) {
                return next(new Error('Authentication failed'));
            }

            // Verify tokenVersion
            if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
                return next(new Error('Token revoked'));
            }

            // Attach user data to socket
            socket.userId = user._id.toString();
            socket.userRole = user.role;
            socket.userName = user.name;
            socket.authenticated = true;

            next();
        } catch (err) {
            // Allow connection but mark as unauthenticated — they can authenticate via event
            next();
        }
    });

    io.on('connection', (socket) => {
        log(`🔌 Client connected: ${socket.id}`);

        // If already authenticated via middleware, join rooms immediately
        if (socket.authenticated) {
            socket.join(socket.userRole);
            socket.join(`user:${socket.userId}`);
            connectedUsers.set(socket.id, {
                userId: socket.userId,
                role: socket.userRole,
                name: socket.userName,
                socket,
            });
            log(`👤 User authenticated via token: ${socket.userName} (${socket.userRole})`);
            socket.emit('authenticated', { message: 'Successfully authenticated', room: socket.userRole });
        }

        // Handle event-based authentication (H-10: now validates JWT token)
        socket.on('authenticate', async (data) => {
            const { userId, role, name, token } = data;

            // If a token is provided, validate it server-side
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const user = await User.findById(decoded.userId);

                    if (!user || !user.isActive) {
                        socket.emit('error', { message: 'Authentication failed' });
                        return;
                    }

                    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
                        socket.emit('error', { message: 'Token revoked. Please login again.' });
                        return;
                    }

                    // Use verified data — don't trust client-sent role
                    socket.userId = user._id.toString();
                    socket.userRole = user.role;
                    socket.userName = user.name;
                    socket.authenticated = true;

                    socket.join(user.role);
                    socket.join(`user:${user._id}`);

                    connectedUsers.set(socket.id, { userId: user._id.toString(), role: user.role, name: user.name, socket });

                    log(`👤 User authenticated via event (verified): ${user.name} (${user.role})`);
                    socket.broadcast.emit('user:connected', { userId: user._id, role: user.role, name: user.name });
                    socket.emit('authenticated', { message: 'Successfully authenticated', room: user.role });
                    return;
                } catch {
                    socket.emit('error', { message: 'Invalid token' });
                    return;
                }
            }

            // Fallback: trust client data (for backward compat during migration)
            if (!userId || !role) {
                socket.emit('error', { message: 'Authentication data required' });
                return;
            }

            connectedUsers.set(socket.id, { userId, role, name, socket });
            socket.join(role);
            socket.join(`user:${userId}`);

            log(`👤 User authenticated (unverified): ${name} (${role})`);
            socket.broadcast.emit('user:connected', { userId, role, name });
            socket.emit('authenticated', { message: 'Successfully authenticated', room: role });
        });

        // ==================== ORDER EVENTS ====================

        socket.on('order:created', (order) => {
            log(`📝 New order: ${order.orderNumber}`);
            io.to('chef').emit('order:new', { type: 'NEW_ORDER', order, message: `New order for Table ${order.tableNumber}` });
            io.to('admin').emit('order:new', { type: 'NEW_ORDER', order });
            io.to('chef').emit('notification:sound', { type: 'new_order' });
        });

        socket.on('order:status:updated', (data) => {
            const { orderId, orderNumber, tableNumber, status, updatedBy } = data;
            log(`🔄 Order ${orderNumber} status: ${status}`);

            const eventData = { type: 'ORDER_STATUS_UPDATE', orderId, orderNumber, tableNumber, status, updatedBy, timestamp: new Date() };

            switch (status) {
                case 'confirmed':
                    io.to('chef').emit('order:confirmed', eventData);
                    io.to('waiter').emit('order:confirmed', eventData);
                    break;
                case 'preparing':
                    io.to('waiter').emit('order:preparing', eventData);
                    io.to('admin').emit('order:preparing', eventData);
                    break;
                case 'ready':
                    io.to('waiter').emit('order:ready', { ...eventData, priority: 'high' });
                    io.to('runner').emit('order:ready', { ...eventData, priority: 'high' });
                    io.to('waiter').emit('notification:sound', { type: 'order_ready' });
                    io.to('runner').emit('notification:sound', { type: 'order_ready' });
                    break;
                case 'served':
                    io.to('cashier').emit('order:served', eventData);
                    io.to('admin').emit('order:served', eventData);
                    break;
                case 'completed':
                    io.to('admin').emit('order:completed', eventData);
                    io.to('waiter').emit('order:completed', eventData);
                    break;
                case 'cancelled':
                    io.to('chef').emit('order:cancelled', eventData);
                    io.to('admin').emit('order:cancelled', eventData);
                    break;
            }
            io.to('admin').emit('order:updated', eventData);
        });

        socket.on('order:items:added', (data) => {
            log(`➕ Items added to order ${data.orderNumber}`);
            io.to('chef').emit('order:items:new', { type: 'ITEMS_ADDED', ...data, timestamp: new Date() });
            io.to('chef').emit('notification:sound', { type: 'items_added' });
        });

        socket.on('order:item:status:updated', (data) => {
            io.to('waiter').emit('order:item:updated', { type: 'ITEM_STATUS_UPDATE', ...data });
        });

        // ==================== TABLE EVENTS ====================

        socket.on('table:status:changed', (data) => {
            log(`🪑 Table ${data.tableNumber} status: ${data.previousStatus} → ${data.status}`);
            io.emit('table:updated', { type: 'TABLE_STATUS_CHANGE', ...data, timestamp: new Date() });
            if (data.status === 'available') {
                io.to('waiter').emit('table:available', { tableNumber: data.tableNumber, message: `Table ${data.tableNumber} is now available` });
            }
        });

        // ==================== MENU EVENTS ====================

        socket.on('menu:availability:changed', (data) => {
            log(`🍽️ Menu item ${data.itemName}: ${data.isAvailable ? 'Available' : 'Sold Out'}`);
            io.emit('menu:updated', { type: 'MENU_AVAILABILITY', ...data, message: data.isAvailable ? `${data.itemName} is now available` : `${data.itemName} is sold out` });
        });

        // ==================== PAYMENT EVENTS ====================

        socket.on('payment:requested', (data) => {
            log(`💳 Payment requested for order ${data.orderNumber}`);
            io.to('cashier').emit('payment:request', { type: 'PAYMENT_REQUEST', ...data, timestamp: new Date() });
            io.to('cashier').emit('notification:sound', { type: 'payment_request' });
        });

        socket.on('payment:completed', (data) => {
            log(`✅ Payment completed for order ${data.orderNumber}`);
            io.to('waiter').emit('payment:success', { type: 'PAYMENT_COMPLETED', ...data });
            io.to('admin').emit('payment:success', data);
        });

        // ==================== NOTIFICATION EVENTS ====================

        socket.on('notification:send', (data) => {
            io.to(`user:${data.targetUserId}`).emit('notification:received', { message: data.message, type: data.type, timestamp: new Date() });
        });

        socket.on('notification:broadcast', (data) => {
            io.to(data.targetRole).emit('notification:received', { message: data.message, type: data.type, timestamp: new Date() });
        });

        // ==================== KITCHEN DISPLAY EVENTS ====================

        socket.on('kitchen:bump', (data) => {
            log(`✓ Kitchen bump: Order ${data.orderNumber}`);
            io.to('chef').emit('kitchen:order:bumped', { ...data, timestamp: new Date() });
        });

        socket.on('kitchen:recall', (data) => {
            io.to('chef').emit('kitchen:order:recalled', data);
        });

        // ==================== UTILITY EVENTS ====================

        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });

        socket.on('users:count', () => {
            const counts = { admin: 0, waiter: 0, chef: 0, runner: 0, cashier: 0 };
            connectedUsers.forEach((user) => {
                if (counts[user.role] !== undefined) counts[user.role]++;
            });
            socket.emit('users:count:response', counts);
        });

        socket.on('disconnect', () => {
            const user = connectedUsers.get(socket.id);
            if (user) {
                log(`👋 User disconnected: ${user.name} (${user.role})`);
                socket.broadcast.emit('user:disconnected', { userId: user.userId, role: user.role, name: user.name });
                connectedUsers.delete(socket.id);
            } else {
                log(`🔌 Client disconnected: ${socket.id}`);
            }
        });

        socket.on('error', (error) => {
            if (!isProduction) console.error(`Socket error for ${socket.id}:`, error);
        });
    });

    // Periodic cleanup of stale connections
    setInterval(() => {
        io.fetchSockets().then(sockets => {
            const activeIds = new Set(sockets.map(s => s.id));
            for (const [socketId] of connectedUsers) {
                if (!activeIds.has(socketId)) {
                    connectedUsers.delete(socketId);
                }
            }
        });
    }, 60000);

    return io;
};

export const emitOrderEvent = (io, eventName, data) => {
    if (io) io.emit(eventName, data);
};

export const getConnectedUsers = () => connectedUsers;

export default { initializeSocket, emitOrderEvent, getConnectedUsers };
