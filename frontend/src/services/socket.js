import { io } from 'socket.io-client';

// In development, connect to same origin via Vite proxy.
// In production, use relative path (served behind a reverse proxy) or explicit URL.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.listeners = new Map();
    }

    connect() {
        // Return existing socket if already connected or connecting
        if (this.socket) {
            if (this.isConnected || this.socket.connecting) {
                return this.socket;
            }
            // Socket exists but is disconnected — clean it up first
            this.socket.removeAllListeners();
            this.socket.disconnect();
        }

        // H-10: Include JWT token in handshake for server-side validation
        const token = sessionStorage.getItem('token');

        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            auth: token ? { token } : {},
        });

        this.setupEventHandlers();
        return this.socket;
    }

    setupEventHandlers() {
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            // M-18: Re-authenticate on reconnect
            if (this._authCredentials) {
                this._authCredentials.token = sessionStorage.getItem('token');
                this.socket.emit('authenticate', this._authCredentials);
            }
        });

        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
            this.reconnectAttempts++;
        });

        this.socket.on('authenticated', () => {
            // Authentication confirmed
        });

        this.socket.on('error', () => {
            // Socket error — handled by reconnect logic
        });
    }

    // Store credentials for re-authentication on reconnect (M-18)
    _authCredentials = null;

    authenticate(userId, role, name) {
        if (!this.socket) {
            this.connect();
        }
        // Store credentials for re-auth on reconnect
        const token = sessionStorage.getItem('token');
        this._authCredentials = { userId, role, name, token };
        this.socket.emit('authenticate', { userId, role, name, token });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }

    // Subscribe to an event
    on(event, callback) {
        if (!this.socket) {
            this.connect();
        }

        // Store listener reference for cleanup
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);

        this.socket.on(event, callback);
    }

    // Unsubscribe from an event
    off(event, callback) {
        if (this.socket) {
            if (callback) {
                this.socket.off(event, callback);
                const listeners = this.listeners.get(event);
                if (listeners) {
                    const index = listeners.indexOf(callback);
                    if (index > -1) {
                        listeners.splice(index, 1);
                    }
                }
            } else {
                this.socket.off(event);
                this.listeners.delete(event);
            }
        }
    }

    // Emit an event
    emit(event, data) {
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
        } else {
            // Socket not connected — reconnect and retry
            this.connect();
            setTimeout(() => {
                if (this.socket && this.isConnected) {
                    this.socket.emit(event, data);
                }
            }, 1000);
        }
    }

    // Order events
    emitOrderCreated(order) {
        this.emit('order:created', order);
    }

    emitOrderStatusUpdate(orderId, orderNumber, tableNumber, status, updatedBy) {
        this.emit('order:status:updated', {
            orderId,
            orderNumber,
            tableNumber,
            status,
            updatedBy,
        });
    }

    emitItemsAdded(orderId, orderNumber, tableNumber, newItems) {
        this.emit('order:items:added', {
            orderId,
            orderNumber,
            tableNumber,
            newItems,
        });
    }

    emitTableStatusChange(tableId, tableNumber, status, previousStatus) {
        this.emit('table:status:changed', {
            tableId,
            tableNumber,
            status,
            previousStatus,
        });
    }

    emitMenuAvailabilityChange(itemId, itemName, isAvailable) {
        this.emit('menu:availability:changed', {
            itemId,
            itemName,
            isAvailable,
        });
    }

    emitPaymentRequest(orderId, orderNumber, tableNumber, amount) {
        this.emit('payment:requested', {
            orderId,
            orderNumber,
            tableNumber,
            amount,
        });
    }

    emitPaymentCompleted(orderId, orderNumber, tableNumber, paymentMethod) {
        this.emit('payment:completed', {
            orderId,
            orderNumber,
            tableNumber,
            paymentMethod,
        });
    }

    emitKitchenBump(orderId, orderNumber) {
        this.emit('kitchen:bump', { orderId, orderNumber });
    }

    // Cleanup all listeners
    cleanup() {
        if (this.socket) {
            this.listeners.forEach((callbacks, event) => {
                callbacks.forEach((callback) => {
                    this.socket.off(event, callback);
                });
            });
            this.listeners.clear();
        }
    }

    getSocket() {
        return this.socket;
    }

    getConnectionStatus() {
        return this.isConnected;
    }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
