import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
    table: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table',
        required: [true, 'Table is required'],
    },
    guestName: {
        type: String,
        required: [true, 'Guest name is required'],
        trim: true,
        maxlength: [100, 'Guest name cannot exceed 100 characters'],
    },
    guestPhone: {
        type: String,
        trim: true,
        maxlength: 20,
        default: '',
    },
    partySize: {
        type: Number,
        required: [true, 'Party size is required'],
        min: [1, 'Party size must be at least 1'],
        max: [20, 'Party size cannot exceed 20'],
    },
    reservationTime: {
        type: Date,
        required: [true, 'Reservation time is required'],
    },
    status: {
        type: String,
        enum: ['upcoming', 'seated', 'completed', 'cancelled', 'no-show'],
        default: 'upcoming',
    },
    notes: {
        type: String,
        maxlength: 300,
        default: '',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

// Indexes
reservationSchema.index({ table: 1, reservationTime: 1 });
reservationSchema.index({ status: 1, reservationTime: 1 });
reservationSchema.index({ reservationTime: 1 });

const Reservation = mongoose.model('Reservation', reservationSchema);
export default Reservation;
