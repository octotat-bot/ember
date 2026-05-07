import MenuItem from '../models/MenuItem.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { emitMenuUpdate, emitMenuChanged } from '../utils/socketEmitter.js';

// @desc    Get all menu items
// @route   GET /api/menu
// @access  Public
export const getAllMenuItems = asyncHandler(async (req, res) => {
    const { category, available, vegetarian, vegan, glutenFree, search, sort } = req.query;

    const query = {};

    // Filter by category
    if (category) {
        query.category = category;
    }

    // Filter by availability
    if (available !== undefined) {
        query.isAvailable = available === 'true';
    }

    // Dietary filters
    if (vegetarian === 'true') query.isVegetarian = true;
    if (vegan === 'true') query.isVegan = true;
    if (glutenFree === 'true') query.isGlutenFree = true;

    // Search by name or description
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    // Sorting
    let sortOption = { category: 1, name: 1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    if (sort === 'price-desc') sortOption = { price: -1 };
    if (sort === 'popular') sortOption = { popularity: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };

    const menuItems = await MenuItem.find(query).sort(sortOption);

    // Group by category for easier frontend rendering
    const groupedItems = {};
    menuItems.forEach(item => {
        if (!groupedItems[item.category]) {
            groupedItems[item.category] = [];
        }
        groupedItems[item.category].push(item);
    });

    res.json({
        success: true,
        count: menuItems.length,
        data: menuItems,
        grouped: groupedItems
    });
});

// @desc    Get menu item by ID
// @route   GET /api/menu/:id
// @access  Public
export const getMenuItemById = asyncHandler(async (req, res) => {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
        return res.status(404).json({
            success: false,
            message: 'Menu item not found'
        });
    }

    res.json({
        success: true,
        data: menuItem
    });
});

// @desc    Create menu item
// @route   POST /api/menu
// @access  Private/Admin
export const createMenuItem = asyncHandler(async (req, res) => {
    const {
        name,
        description,
        price,
        category,
        image,
        isVegetarian,
        isVegan,
        isGlutenFree,
        spiceLevel,
        preparationTime,
        allergens,
        calories,
        ingredients,
        discount
    } = req.body;

    // Check for duplicate name in same category
    const existing = await MenuItem.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        category
    });

    if (existing) {
        return res.status(400).json({
            success: false,
            message: 'An item with this name already exists in this category'
        });
    }

    const menuItem = await MenuItem.create({
        name,
        description,
        price,
        category,
        image,
        isVegetarian,
        isVegan,
        isGlutenFree,
        spiceLevel,
        preparationTime,
        allergens,
        calories,
        ingredients,
        discount
    });

    emitMenuChanged('created', menuItem);

    res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: menuItem
    });
});

// @desc    Update menu item
// @route   PUT /api/menu/:id
// @access  Private/Admin
export const updateMenuItem = asyncHandler(async (req, res) => {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
        return res.status(404).json({
            success: false,
            message: 'Menu item not found'
        });
    }

    // Check for duplicate name if name is being changed
    if (req.body.name && req.body.name !== menuItem.name) {
        const existing = await MenuItem.findOne({
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
            category: req.body.category || menuItem.category,
            _id: { $ne: menuItem._id }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'An item with this name already exists in this category'
            });
        }
    }

    // Update fields
    const allowedFields = [
        'name', 'description', 'price', 'category', 'image',
        'isAvailable', 'isVegetarian', 'isVegan', 'isGlutenFree',
        'spiceLevel', 'preparationTime', 'allergens', 'calories',
        'ingredients', 'discount'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            menuItem[field] = req.body[field];
        }
    });

    await menuItem.save();

    emitMenuChanged('updated', menuItem);

    res.json({
        success: true,
        message: 'Menu item updated successfully',
        data: menuItem
    });
});

// @desc    Delete menu item
// @route   DELETE /api/menu/:id
// @access  Private/Admin
export const deleteMenuItem = asyncHandler(async (req, res) => {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
        return res.status(404).json({
            success: false,
            message: 'Menu item not found'
        });
    }

    await MenuItem.findByIdAndDelete(req.params.id);

    emitMenuChanged('deleted', menuItem);

    res.json({
        success: true,
        message: 'Menu item deleted successfully'
    });
});

// @desc    Toggle menu item availability
// @route   PATCH /api/menu/:id/toggle-availability
// @access  Private/Admin/Chef
export const toggleAvailability = asyncHandler(async (req, res) => {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
        return res.status(404).json({
            success: false,
            message: 'Menu item not found'
        });
    }

    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();

    // Broadcast menu update
    emitMenuUpdate(menuItem);

    res.json({
        success: true,
        message: `Menu item is now ${menuItem.isAvailable ? 'available' : 'unavailable'}`,
        data: menuItem
    });
});

// @desc    Get menu categories with counts
// @route   GET /api/menu/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res) => {
    const categories = await MenuItem.aggregate([
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                availableCount: {
                    $sum: { $cond: ['$isAvailable', 1, 0] }
                }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.json({
        success: true,
        data: categories.map(cat => ({
            category: cat._id,
            total: cat.count,
            available: cat.availableCount
        }))
    });
});

// @desc    Get popular items
// @route   GET /api/menu/popular
// @access  Public
export const getPopularItems = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    const items = await MenuItem.find({ isAvailable: true })
        .sort({ popularity: -1 })
        .limit(limit);

    res.json({
        success: true,
        data: items
    });
});

// @desc    Bulk update availability
// @route   PATCH /api/menu/bulk-availability
// @access  Private/Admin
export const bulkUpdateAvailability = asyncHandler(async (req, res) => {
    const { itemIds, isAvailable } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Please provide item IDs'
        });
    }

    if (typeof isAvailable !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: 'Please specify availability status'
        });
    }

    const result = await MenuItem.updateMany(
        { _id: { $in: itemIds } },
        { isAvailable }
    );

    emitMenuChanged('bulk-updated', { itemIds, isAvailable });

    res.json({
        success: true,
        message: `${result.modifiedCount} items updated`,
        data: { modifiedCount: result.modifiedCount }
    });
});

// @desc    Toggle 86'd status for a menu item
// @route   PATCH /api/menu/:id/toggle-86
// @access  Private (Chef, Admin)
export const toggle86 = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
        return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    if (menuItem.is86d) {
        // Un-86 the item
        menuItem.is86d = false;
        menuItem.isAvailable = true;
        menuItem.eightySixReason = '';
        menuItem.eightySixAt = null;
        menuItem.eightySixBy = null;
    } else {
        // 86 the item
        menuItem.is86d = true;
        menuItem.isAvailable = false;
        menuItem.eightySixReason = reason || 'Out of stock';
        menuItem.eightySixAt = new Date();
        menuItem.eightySixBy = req.user._id;
    }

    await menuItem.save();

    // Broadcast 86 update to all clients
    emitMenuUpdate(menuItem);

    res.json({
        success: true,
        message: menuItem.is86d ? `${menuItem.name} has been 86'd` : `${menuItem.name} is back on the menu`,
        data: menuItem
    });
});

// @desc    Get all 86'd items (86 Board)
// @route   GET /api/menu/86-board
// @access  Private (Chef, Admin)
export const get86Board = asyncHandler(async (req, res) => {
    const items = await MenuItem.find({ is86d: true })
        .populate('eightySixBy', 'name')
        .sort({ eightySixAt: -1 });

    res.json({
        success: true,
        count: items.length,
        data: items
    });
});
