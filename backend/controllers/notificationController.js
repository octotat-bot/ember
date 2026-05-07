import Notification from '../models/Notification.js';

/**
 * Build the base query filter for notifications relevant to a user.
 * Matches notifications that are:
 *  - Directly addressed to the user (recipient === user._id)
 *  - Targeted at the user's role (recipientRole === user.role)
 *  - Broadcast to everyone (recipient is null AND recipientRole is null)
 */
const buildUserFilter = (user) => ({
    $or: [
        { recipient: user._id },
        { recipient: null, recipientRole: user.role },
        { recipient: null, recipientRole: null }
    ]
});

/**
 * GET /
 * Fetch notifications for the authenticated user.
 */
export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find(buildUserFilter(req.user))
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        const userId = req.user._id.toString();

        const data = notifications.map((n) => ({
            ...n,
            read: n.readBy.some((id) => id.toString() === userId)
        }));

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('getNotifications error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};

/**
 * PATCH /:id/read
 * Mark a single notification as read for the authenticated user.
 */
export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { readBy: req.user._id } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        return res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('markAsRead error:', error);
        return res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
};

/**
 * POST /read-all
 * Mark all notifications for the authenticated user as read.
 */
export const markAllAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            {
                ...buildUserFilter(req.user),
                readBy: { $ne: req.user._id }
            },
            { $addToSet: { readBy: req.user._id } }
        );

        return res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
            count: result.modifiedCount
        });
    } catch (error) {
        console.error('markAllAsRead error:', error);
        return res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
    }
};

/**
 * DELETE /clear
 * Delete notifications directly addressed to the user.
 * For role-based / broadcast notifications, just mark them as read instead.
 */
export const clearAll = async (req, res) => {
    try {
        // Delete notifications that were sent specifically to this user
        const deleteResult = await Notification.deleteMany({ recipient: req.user._id });

        // Mark role-based and broadcast notifications as read (don't delete — other users need them)
        const updateResult = await Notification.updateMany(
            {
                $or: [
                    { recipient: null, recipientRole: req.user.role },
                    { recipient: null, recipientRole: null }
                ],
                readBy: { $ne: req.user._id }
            },
            { $addToSet: { readBy: req.user._id } }
        );

        return res.status(200).json({
            success: true,
            message: 'Notifications cleared',
            deleted: deleteResult.deletedCount,
            markedRead: updateResult.modifiedCount
        });
    } catch (error) {
        console.error('clearAll error:', error);
        return res.status(500).json({ success: false, message: 'Failed to clear notifications' });
    }
};

/**
 * GET /unread-count
 * Return the count of unread notifications for the authenticated user.
 */
export const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            ...buildUserFilter(req.user),
            readBy: { $ne: req.user._id }
        });

        return res.status(200).json({ success: true, count });
    } catch (error) {
        console.error('getUnreadCount error:', error);
        return res.status(500).json({ success: false, message: 'Failed to get unread count' });
    }
};
