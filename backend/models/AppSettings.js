import mongoose from 'mongoose';

const appSettingsSchema = new mongoose.Schema({
    restaurantName: {
        type: String,
        default: 'Ember',
        maxlength: 100
    },
    taxRate: {
        type: Number,
        default: 18,
        min: 0,
        max: 100
    },
    currency: {
        type: String,
        default: 'INR',
        maxlength: 10
    },
    currencySymbol: {
        type: String,
        default: '₹',
        maxlength: 5
    },
    orderTimeout: {
        type: Number,  // in minutes
        default: 30,
        min: 5,
        max: 120
    },
    autoConfirmOrders: {
        type: Boolean,
        default: false
    },
    enableNotificationSounds: {
        type: Boolean,
        default: true
    },
    businessHoursStart: {
        type: String,  // "08:00"
        default: '08:00'
    },
    businessHoursEnd: {
        type: String,  // "23:00"
        default: '23:00'
    },
    address: {
        type: String,
        default: '',
        maxlength: 300
    },
    phone: {
        type: String,
        default: '',
        maxlength: 20
    },
    email: {
        type: String,
        default: '',
        maxlength: 100
    }
}, {
    timestamps: true
});

// Static method to get settings (singleton pattern - always returns one document)
appSettingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

const AppSettings = mongoose.model('AppSettings', appSettingsSchema);
export default AppSettings;
