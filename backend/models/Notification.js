import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null  // null means "all users" or role-based
    },
    recipientRole: {
        type: String,
        enum: ['admin', 'waiter', 'chef', 'runner', 'cashier', null],
        default: null  // null means broadcast to all
    },
    type: {
        type: String,
        enum: ['order_new', 'order_status', 'order_ready', 'order_cancelled', 'payment', 'table_update', 'menu_update', 'staff', 'system'],
        required: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 200
    },
    message: {
        type: String,
        required: true,
        maxlength: 500
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}  // e.g., { orderId, orderNumber, tableNumber }
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    priority: {
        type: String,
        enum: ['low', 'normal', 'high'],
        default: 'normal'
    }
}, {
    timestamps: true
});

// Index for fast queries
notificationSchema.index({ recipientRole: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });
// Auto-delete notifications older than 7 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
