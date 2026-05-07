import { body, param, query, validationResult } from 'express-validator';

// Validation result handler
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// User validation rules
export const userValidation = {
    register: [
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Invalid email format')
            .normalizeEmail(),
        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('role')
            .optional()
            .isIn(['admin', 'waiter', 'chef', 'runner', 'cashier'])
            .withMessage('Invalid role'),
        body('phone')
            .optional()
            .matches(/^\d{10}$/).withMessage('Phone must be 10 digits')
    ],
    login: [
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Invalid email format'),
        body('password')
            .notEmpty().withMessage('Password is required')
    ],
    update: [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
        body('phone')
            .optional()
            .matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
        body('role')
            .optional()
            .isIn(['admin', 'waiter', 'chef', 'runner', 'cashier'])
            .withMessage('Invalid role')
    ]
};

// Menu item validation rules
export const menuValidation = {
    create: [
        body('name')
            .trim()
            .notEmpty().withMessage('Item name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
        body('price')
            .notEmpty().withMessage('Price is required')
            .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
        body('category')
            .notEmpty().withMessage('Category is required')
            .isIn(['appetizers', 'main-course', 'beverages', 'desserts', 'snacks', 'breakfast', 'specials'])
            .withMessage('Invalid category'),
        body('description')
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
        body('isVegetarian').optional().isBoolean(),
        body('isVegan').optional().isBoolean(),
        body('isGlutenFree').optional().isBoolean(),
        body('spiceLevel')
            .optional()
            .isInt({ min: 0, max: 5 }).withMessage('Spice level must be 0-5'),
        body('preparationTime')
            .optional()
            .isInt({ min: 1 }).withMessage('Preparation time must be at least 1 minute'),
        body('discount')
            .optional()
            .isFloat({ min: 0, max: 100 }).withMessage('Discount must be 0-100%')
    ],
    update: [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
        body('price')
            .optional()
            .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
        body('category')
            .optional()
            .isIn(['appetizers', 'main-course', 'beverages', 'desserts', 'snacks', 'breakfast', 'specials'])
            .withMessage('Invalid category')
    ]
};

// Order validation rules
export const orderValidation = {
    create: [
        body('tableId')
            .notEmpty().withMessage('Table is required')
            .isMongoId().withMessage('Invalid table ID'),
        body('items')
            .isArray({ min: 1 }).withMessage('Order must have at least one item'),
        body('items.*.menuItemId')
            .notEmpty().withMessage('Menu item ID is required')
            .isMongoId().withMessage('Invalid menu item ID'),
        body('items.*.quantity')
            .notEmpty().withMessage('Quantity is required')
            .isInt({ min: 1, max: 50 }).withMessage('Quantity must be 1-50'),
        body('items.*.specialInstructions')
            .optional()
            .trim()
            .isLength({ max: 200 }).withMessage('Instructions cannot exceed 200 characters'),
        body('customerName')
            .optional()
            .trim()
            .isLength({ max: 50 }),
        body('customerPhone')
            .optional()
            .trim(),
        body('specialRequests')
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('Special requests cannot exceed 500 characters'),
        body('priority')
            .optional()
            .isIn(['low', 'normal', 'high', 'urgent'])
            .withMessage('Invalid priority')
    ],
    updateStatus: [
        body('status')
            .notEmpty().withMessage('Status is required')
            .isIn(['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'])
            .withMessage('Invalid status'),
        body('notes')
            .optional()
            .trim()
            .isLength({ max: 200 })
    ],
    addItems: [
        body('items')
            .isArray({ min: 1 }).withMessage('Must add at least one item'),
        body('items.*.menuItemId')
            .notEmpty().withMessage('Menu item ID is required')
            .isMongoId().withMessage('Invalid menu item ID'),
        body('items.*.quantity')
            .notEmpty().withMessage('Quantity is required')
            .isInt({ min: 1, max: 50 }).withMessage('Quantity must be 1-50')
    ],
    payment: [
        body('paymentMethod')
            .notEmpty().withMessage('Payment method is required')
            .isIn(['cash', 'card', 'upi', 'wallet', 'split'])
            .withMessage('Invalid payment method'),
        body('paidAmount')
            .notEmpty().withMessage('Paid amount is required')
            .isFloat({ min: 0 }).withMessage('Amount must be positive'),
        body('discountAmount')
            .optional()
            .isFloat({ min: 0 }).withMessage('Discount must be positive'),
        body('discountReason')
            .optional()
            .trim()
            .isLength({ max: 200 })
    ]
};

// Table validation rules
export const tableValidation = {
    create: [
        body('tableNumber')
            .notEmpty().withMessage('Table number is required')
            .isInt({ min: 1 }).withMessage('Table number must be positive'),
        body('capacity')
            .notEmpty().withMessage('Capacity is required')
            .isInt({ min: 1, max: 20 }).withMessage('Capacity must be 1-20'),
        body('location')
            .optional()
            .isIn(['indoor', 'outdoor', 'private', 'bar'])
            .withMessage('Invalid location')
    ],
    updateStatus: [
        body('status')
            .notEmpty().withMessage('Status is required')
            .isIn(['available', 'occupied', 'reserved', 'cleaning'])
            .withMessage('Invalid status')
    ]
};

// Common validation for MongoDB ObjectId
export const validateObjectId = (paramName = 'id') => [
    param(paramName)
        .isMongoId().withMessage(`Invalid ${paramName} format`)
];

// Pagination validation
export const paginationValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
];
