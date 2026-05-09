import mongoose from 'mongoose';

const shiftNoteSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'Note content is required'],
        maxlength: [1000, 'Note cannot exceed 1000 characters'],
        trim: true,
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    authorName: { type: String, default: '' },
    authorRole: { type: String, default: '' },
    // shift: 'morning' | 'afternoon' | 'evening' derived from createdAt hour
    shift: {
        type: String,
        enum: ['morning', 'afternoon', 'evening'],
        default: function () {
            const h = new Date().getHours();
            if (h < 12) return 'morning';
            if (h < 17) return 'afternoon';
            return 'evening';
        },
    },
    pinned: { type: Boolean, default: false },
}, { timestamps: true });

shiftNoteSchema.index({ createdAt: -1 });

const ShiftNote = mongoose.model('ShiftNote', shiftNoteSchema);
export default ShiftNote;
