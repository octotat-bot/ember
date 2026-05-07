import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
    menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
        max: [50, 'Quantity cannot exceed 50']
    },
    specialInstructions: {
        type: String,
        maxlength: [200, 'Instructions cannot exceed 200 characters'],
        default: ''
    },
    itemStatus: {
        type: String,
        enum: ['pending', 'preparing', 'ready', 'served', 'cancelled'],
        default: 'pending'
    },
    preparedAt: {
        type: Date,
        default: null
    },
    servedAt: {
        type: Date,
        default: null
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const statusHistorySchema = new mongoose.Schema({
    status: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: {
        type: String,
        default: ''
    }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    table: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table',
        required: [true, 'Table is required']
    },
    tableNumber: {
        type: Number,
        required: true
    },
    items: [orderItemSchema],
    status: {
        type: String,
        enum: {
            values: ['pending', 'confirmed', 'preparing', 'ready', 'partially_served', 'served', 'completed', 'cancelled'],
            message: '{VALUE} is not a valid order status'
        },
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    statusHistory: [statusHistorySchema],
    waiter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Waiter is required']
    },
    chef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    customerName: {
        type: String,
        trim: true,
        default: ''
    },
    customerPhone: {
        type: String,
        trim: true,
        default: ''
    },
    specialRequests: {
        type: String,
        maxlength: [500, 'Special requests cannot exceed 500 characters'],
        default: ''
    },
    subtotal: {
        type: Number,
        default: 0
    },
    taxRate: {
        type: Number,
        default: 18 // 18% GST
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    discountReason: {
        type: String,
        default: ''
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'partial', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'wallet', 'split'],
        default: null
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    paidAt: {
        type: Date,
        default: null
    },
    estimatedTime: {
        type: Number, // in minutes
        default: null
    },
    servedAt: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    },
    cancelledAt: {
        type: Date,
        default: null
    },
    cancellationReason: {
        type: String,
        default: ''
    },
    isQROrder: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Pre-save middleware to calculate totals
orderSchema.pre('save', function (next) {
    // Calculate subtotal
    this.subtotal = this.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);

    // Calculate tax
    this.taxAmount = (this.subtotal * this.taxRate) / 100;

    // Calculate total
    this.totalAmount = this.subtotal + this.taxAmount - this.discountAmount;

    // C-03: Ensure total is not negative and enforce minimum > 0 when items exist
    if (this.totalAmount < 0) {
        this.totalAmount = 0;
    }

    if (this.items.length > 0 && this.totalAmount === 0 && this.subtotal > 0) {
        this.totalAmount = 1; // Minimum ₹1 to prevent zero-total orders
    }

    next();
});

// Method to add status history
orderSchema.methods.addStatusHistory = function (status, userId, notes = '') {
    this.statusHistory.push({
        status,
        timestamp: new Date(),
        updatedBy: userId,
        notes
    });
};

// Method to recalculate order status from individual item statuses
orderSchema.methods.recalculateStatus = function () {
    const statuses = this.items.map(i => i.itemStatus);
    // Don't recalculate for cancelled/completed orders
    if (['cancelled', 'completed'].includes(this.status)) return this;
    // Skip if there are cancelled items — only consider active ones
    const activeStatuses = statuses.filter(s => s !== 'cancelled');
    if (activeStatuses.length === 0) return this;

    const all = (s) => activeStatuses.every(st => st === s);
    const any = (s) => activeStatuses.some(st => st === s);
    const allIn = (...s) => activeStatuses.every(st => s.includes(st));

    if (all('pending')) {
        // Keep current status (could be pending or confirmed)
    } else if (any('preparing')) {
        this.status = 'preparing';
    } else if (allIn('ready', 'served') && any('served') && any('ready')) {
        this.status = 'partially_served';
    } else if (all('served')) {
        this.status = 'served';
        if (!this.servedAt) this.servedAt = new Date();
    } else if (allIn('ready', 'served')) {
        this.status = 'ready';
    }

    return this;
};

// Method to calculate estimated time
orderSchema.methods.calculateEstimatedTime = async function () {
    await this.populate('items.menuItem');
    let maxTime = 0;

    this.items.forEach(item => {
        if (item.menuItem && item.menuItem.preparationTime) {
            const itemTime = item.menuItem.preparationTime * Math.ceil(item.quantity / 3);
            if (itemTime > maxTime) {
                maxTime = itemTime;
            }
        }
    });

    this.estimatedTime = maxTime || 15;
    return this.estimatedTime;
};

// H-11: Atomic order number generation using a counter collection
orderSchema.statics.generateOrderNumber = async function () {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const counterKey = `order-${dateStr}`;

    // Use findOneAndUpdate with upsert for atomic increment
    const Counter = mongoose.connection.collection('counters');
    const result = await Counter.findOneAndUpdate(
        { _id: counterKey },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
    );

    const orderNum = String(result.seq).padStart(4, '0');
    return `ORD-${dateStr}-${orderNum}`;
};

// Indexes for faster queries

orderSchema.index({ status: 1 });
orderSchema.index({ table: 1 });
orderSchema.index({ waiter: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
