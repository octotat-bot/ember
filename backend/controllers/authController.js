import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

// Generate JWT token
const generateToken = (userId, tokenVersion = 0) => {
    return jwt.sign(
        { userId, tokenVersion },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Admin only (except first-ever user bootstrap)
export const register = asyncHandler(async (req, res) => {
    const { name, email, password, role, phone } = req.body;

    // Check how many users exist
    const userCount = await User.countDocuments();

    // If users already exist, only an authenticated admin can register new staff
    if (userCount > 0) {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Only admins can create new staff accounts.'
            });
        }
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only admins can create new staff accounts.'
            });
        }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        return res.status(400).json({
            success: false,
            message: 'User with this email already exists'
        });
    }

    // First user is always admin; subsequent users get the role the admin assigns (default: waiter)
    const validRoles = ['admin', 'waiter', 'chef', 'runner', 'cashier'];
    const userRole = userCount === 0 ? 'admin' : (validRoles.includes(role) ? role : 'waiter');

    // Create user
    const user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role: userRole,
        phone
    });

    // For the bootstrap case (first user), return a token so they can log in immediately
    if (userCount === 0) {
        const token = generateToken(user._id, user.tokenVersion);
        return res.status(201).json({
            success: true,
            message: 'Admin account created successfully',
            data: { user, token }
        });
    }

    // For admin-created staff, just return the user (no token — they aren't logging in)
    res.status(201).json({
        success: true,
        message: 'Staff account created successfully',
        data: { user }
    });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    }

    if (!user.isActive) {
        return res.status(403).json({
            success: false,
            message: 'Your account has been deactivated. Please contact admin.'
        });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.tokenVersion);

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user,
            token
        }
    });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: req.user
    });
});

// @desc    Update current user profile
// @route   PUT /api/auth/me
// @access  Private
export const updateMe = asyncHandler(async (req, res) => {
    const allowedFields = ['name', 'phone', 'avatar'];
    const updates = {};

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    });

    const user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
    );

    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user
    });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Please provide current and new password'
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'New password must be at least 6 characters'
        });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: 'Current password is incorrect'
        });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token (tokenVersion was incremented by pre-save hook)
    const token = generateToken(user._id, user.tokenVersion);

    res.json({
        success: true,
        message: 'Password changed successfully',
        data: { token }
    });
});

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req, res) => {
    const { role, isActive, search } = req.query;

    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
            { name: { $regex: escaped, $options: 'i' } },
            { email: { $regex: escaped, $options: 'i' } }
        ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    res.json({
        success: true,
        count: users.length,
        data: users
    });
});

// @desc    Get user by ID (Admin only)
// @route   GET /api/auth/users/:id
// @access  Private/Admin
export const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    res.json({
        success: true,
        data: user
    });
});

// @desc    Update user (Admin only)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
    const { name, role, isActive, phone } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Prevent admin from deactivating themselves
    if (req.params.id === req.user._id.toString() && isActive === false) {
        return res.status(400).json({
            success: false,
            message: 'You cannot deactivate your own account'
        });
    }

    // Prevent changing own role
    if (req.params.id === req.user._id.toString() && role && role !== req.user.role) {
        return res.status(400).json({
            success: false,
            message: 'You cannot change your own role'
        });
    }

    // Update fields
    if (name) user.name = name;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
        success: true,
        message: 'User updated successfully',
        data: user
    });
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
        return res.status(400).json({
            success: false,
            message: 'You cannot delete your own account'
        });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
        success: true,
        message: 'User deleted successfully'
    });
});

// @desc    Reset user password (Admin only)
// @route   PUT /api/auth/users/:id/reset-password
// @access  Private/Admin
export const resetUserPassword = asyncHandler(async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters'
        });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    user.password = newPassword;
    await user.save();

    res.json({
        success: true,
        message: 'Password reset successfully'
    });
});
