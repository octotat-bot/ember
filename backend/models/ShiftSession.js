import mongoose from 'mongoose';

const shiftSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        required: true
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date,
        default: null
    },
    // Performance metrics captured at shift end
    metrics: {
        tablesServed: { type: Number, default: 0 },
        ordersHandled: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        avgOrderValue: { type: Number, default: 0 },
        itemsServed: { type: Number, default: 0 },
        avgServiceTime: { type: Number, default: 0 }, // minutes
    },
    // Handoff notes for each table
    handoffNotes: [{
        tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
        tableNumber: Number,
        note: String,
        skipped: { type: Boolean, default: false }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for quick lookup of active shifts
shiftSessionSchema.index({ user: 1, isActive: 1 });
shiftSessionSchema.index({ endedAt: -1 });

const ShiftSession = mongoose.model('ShiftSession', shiftSessionSchema);

export default ShiftSession;
