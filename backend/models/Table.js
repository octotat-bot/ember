import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
    tableNumber: {
        type: Number,
        required: [true, 'Table number is required'],
        unique: true,
        min: [1, 'Table number must be positive']
    },
    capacity: {
        type: Number,
        required: [true, 'Capacity is required'],
        min: [1, 'Capacity must be at least 1'],
        max: [20, 'Capacity cannot exceed 20']
    },
    status: {
        type: String,
        enum: {
            values: ['available', 'occupied', 'reserved', 'cleaning'],
            message: '{VALUE} is not a valid status'
        },
        default: 'available'
    },
    location: {
        type: String,
        enum: ['indoor', 'outdoor', 'private', 'bar'],
        default: 'indoor'
    },
    currentOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    qrCode: {
        type: String,
        unique: true,
        sparse: true // Allow null values
    },
    isActive: {
        type: Boolean,
        default: true
    },
    notes: {
        type: String,
        maxlength: 200,
        default: ''
    },
    // Shift Handoff: note left by outgoing staff
    handoffNote: {
        type: String,
        maxlength: 500,
        default: ''
    },
    handoffBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    handoffAt: {
        type: Date,
        default: null
    },
    // Live Table Timer: when the table became occupied
    occupiedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries

tableSchema.index({ status: 1 });

const Table = mongoose.model('Table', tableSchema);

export default Table;
