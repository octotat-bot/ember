import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        default: ''
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: {
            values: ['appetizers', 'main-course', 'beverages', 'desserts', 'snacks', 'breakfast', 'specials'],
            message: '{VALUE} is not a valid category'
        }
    },
    image: {
        type: String,
        default: null
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    isVegetarian: {
        type: Boolean,
        default: false
    },
    isVegan: {
        type: Boolean,
        default: false
    },
    isGlutenFree: {
        type: Boolean,
        default: false
    },
    spiceLevel: {
        type: Number,
        min: 0,
        max: 5,
        default: 0 // 0 = not spicy, 5 = very spicy
    },
    preparationTime: {
        type: Number, // in minutes
        min: [1, 'Preparation time must be at least 1 minute'],
        default: 15
    },
    allergens: [{
        type: String,
        enum: ['nuts', 'dairy', 'gluten', 'eggs', 'soy', 'shellfish', 'fish']
    }],
    calories: {
        type: Number,
        min: 0,
        default: null
    },
    ingredients: [{
        type: String,
        trim: true
    }],
    popularity: {
        type: Number,
        default: 0 // Will be updated based on order count
    },
    discount: {
        type: Number,
        min: 0,
        max: 100,
        default: 0 // Percentage discount
    },
    // Food Cost & Margin Tracker
    costPrice: {
        type: Number,
        min: 0,
        default: 0 // Cost price for margin calculation
    },
    // Chef's 86 Board
    is86d: {
        type: Boolean,
        default: false
    },
    eightySixReason: {
        type: String,
        maxlength: 200,
        default: ''
    },
    eightySixAt: {
        type: Date,
        default: null
    },
    eightySixBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// Virtual for discounted price
menuItemSchema.virtual('discountedPrice').get(function () {
    if (this.discount > 0) {
        return this.price * (1 - this.discount / 100);
    }
    return this.price;
});

// Virtual for profit margin
menuItemSchema.virtual('margin').get(function () {
    if (!this.costPrice || this.costPrice === 0) return null;
    const sellPrice = this.discount > 0 ? this.price * (1 - this.discount / 100) : this.price;
    return ((sellPrice - this.costPrice) / sellPrice * 100).toFixed(1);
});

// Ensure virtuals are included in JSON
menuItemSchema.set('toJSON', { virtuals: true });
menuItemSchema.set('toObject', { virtuals: true });

// Indexes for faster queries
menuItemSchema.index({ category: 1 });
menuItemSchema.index({ isAvailable: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });
menuItemSchema.index({ popularity: -1 });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

export default MenuItem;
