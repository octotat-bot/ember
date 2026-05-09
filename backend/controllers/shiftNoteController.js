import ShiftNote from '../models/ShiftNote.js';
import asyncHandler from 'express-async-handler';

// @desc    Get shift notes (last 24 hours, pinned always included)
// @route   GET /api/shift-notes
// @access  Private
export const getShiftNotes = asyncHandler(async (req, res) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const notes = await ShiftNote.find({
        $or: [{ createdAt: { $gte: since } }, { pinned: true }]
    })
        .populate('author', 'name role')
        .sort({ pinned: -1, createdAt: -1 })
        .limit(50);

    res.json({ success: true, data: notes });
});

// @desc    Create a shift note
// @route   POST /api/shift-notes
// @access  Private
export const createShiftNote = asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content?.trim()) {
        return res.status(400).json({ success: false, message: 'Note content is required' });
    }

    const note = await ShiftNote.create({
        content: content.trim(),
        author: req.user._id,
        authorName: req.user.name,
        authorRole: req.user.role,
    });

    await note.populate('author', 'name role');

    // Broadcast to all connected clients
    const io = req.app.get('io');
    if (io) io.emit('shift:note', note);

    res.status(201).json({ success: true, data: note });
});

// @desc    Toggle pin on a shift note
// @route   PATCH /api/shift-notes/:id/pin
// @access  Private (Admin only)
export const togglePin = asyncHandler(async (req, res) => {
    const note = await ShiftNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    note.pinned = !note.pinned;
    await note.save();

    res.json({ success: true, data: note });
});

// @desc    Delete a shift note
// @route   DELETE /api/shift-notes/:id
// @access  Private (own note or admin)
export const deleteShiftNote = asyncHandler(async (req, res) => {
    const note = await ShiftNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    const isOwn = note.author.toString() === req.user._id.toString();
    if (!isOwn && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this note' });
    }

    await note.deleteOne();
    res.json({ success: true, message: 'Note deleted' });
});
