import AppSettings from '../models/AppSettings.js';

const ALLOWED_FIELDS = [
    'restaurantName',
    'taxRate',
    'currency',
    'currencySymbol',
    'orderTimeout',
    'autoConfirmOrders',
    'enableNotificationSounds',
    'businessHoursStart',
    'businessHoursEnd',
    'address',
    'phone',
    'email'
];

// @desc    Get app settings
// @route   GET /api/settings
// @access  Authenticated
export const getSettings = async (req, res) => {
    try {
        const settings = await AppSettings.getSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update app settings
// @route   PUT /api/settings
// @access  Admin only
export const updateSettings = async (req, res) => {
    try {
        // Filter out any fields not in the allowed list
        const updates = {};
        for (const key of ALLOWED_FIELDS) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        const settings = await AppSettings.findOneAndUpdate(
            {},
            { $set: updates },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
