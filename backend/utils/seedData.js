import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import MenuItem from '../models/MenuItem.js';
import Table from '../models/Table.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const seedData = async () => {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🧹 Clearing existing data...');
        await User.deleteMany({});
        await MenuItem.deleteMany({});
        await Table.deleteMany({});

        // Create users
        console.log('👥 Creating users...');
        const users = await User.create([
            {
                name: 'Admin User',
                email: 'admin@cafe.com',
                password: 'admin123',
                role: 'admin',
                phone: '9876543210'
            },
            {
                name: 'John Waiter',
                email: 'waiter@cafe.com',
                password: 'waiter123',
                role: 'waiter',
                phone: '9876543211'
            },
            {
                name: 'Chef Mario',
                email: 'chef@cafe.com',
                password: 'chef123',
                role: 'chef',
                phone: '9876543212'
            },
            {
                name: 'Runner Tom',
                email: 'runner@cafe.com',
                password: 'runner123',
                role: 'runner',
                phone: '9876543213'
            },
            {
                name: 'Cashier Lisa',
                email: 'cashier@cafe.com',
                password: 'cashier123',
                role: 'cashier',
                phone: '9876543214'
            }
        ]);
        console.log(`✅ Created ${users.length} users`);

        // Create menu items
        console.log('🍽️ Creating menu items...');
        const menuItems = await MenuItem.create([
            // Beverages
            {
                name: 'Espresso',
                description: 'Rich and intense single shot espresso',
                price: 80,
                category: 'beverages',
                isVegetarian: true,
                preparationTime: 3,
                isAvailable: true
            },
            {
                name: 'Cappuccino',
                description: 'Espresso with steamed milk and foam',
                price: 120,
                category: 'beverages',
                isVegetarian: true,
                preparationTime: 5,
                isAvailable: true
            },
            {
                name: 'Cafe Latte',
                description: 'Smooth espresso with creamy steamed milk',
                price: 140,
                category: 'beverages',
                isVegetarian: true,
                preparationTime: 5,
                isAvailable: true
            },
            {
                name: 'Iced Americano',
                description: 'Chilled espresso with cold water and ice',
                price: 110,
                category: 'beverages',
                isVegetarian: true,
                isVegan: true,
                preparationTime: 4,
                isAvailable: true
            },
            {
                name: 'Fresh Orange Juice',
                description: 'Freshly squeezed orange juice',
                price: 90,
                category: 'beverages',
                isVegetarian: true,
                isVegan: true,
                isGlutenFree: true,
                preparationTime: 5,
                isAvailable: true
            },
            {
                name: 'Mango Smoothie',
                description: 'Blend of fresh mangoes with yogurt',
                price: 150,
                category: 'beverages',
                isVegetarian: true,
                preparationTime: 6,
                isAvailable: true
            },

            // Breakfast
            {
                name: 'Classic Pancakes',
                description: 'Fluffy pancakes served with maple syrup and butter',
                price: 180,
                category: 'breakfast',
                isVegetarian: true,
                preparationTime: 12,
                calories: 450,
                isAvailable: true
            },
            {
                name: 'Eggs Benedict',
                description: 'Poached eggs on English muffin with hollandaise',
                price: 220,
                category: 'breakfast',
                isVegetarian: true,
                preparationTime: 15,
                allergens: ['eggs', 'gluten', 'dairy'],
                isAvailable: true
            },
            {
                name: 'Avocado Toast',
                description: 'Smashed avocado on sourdough with cherry tomatoes',
                price: 190,
                category: 'breakfast',
                isVegetarian: true,
                isVegan: true,
                preparationTime: 8,
                isAvailable: true
            },
            {
                name: 'Full English Breakfast',
                description: 'Eggs, bacon, sausage, beans, mushrooms, and toast',
                price: 350,
                category: 'breakfast',
                preparationTime: 20,
                calories: 850,
                isAvailable: true
            },

            // Appetizers
            {
                name: 'Crispy Chicken Wings',
                description: 'Spicy buffalo wings with blue cheese dip',
                price: 280,
                category: 'appetizers',
                spiceLevel: 3,
                preparationTime: 15,
                isAvailable: true
            },
            {
                name: 'Vegetable Spring Rolls',
                description: 'Crispy rolls filled with mixed vegetables',
                price: 180,
                category: 'appetizers',
                isVegetarian: true,
                isVegan: true,
                preparationTime: 12,
                isAvailable: true
            },
            {
                name: 'Bruschetta',
                description: 'Toasted bread with fresh tomatoes, basil, and garlic',
                price: 160,
                category: 'appetizers',
                isVegetarian: true,
                isVegan: true,
                preparationTime: 8,
                isAvailable: true
            },
            {
                name: 'Loaded Nachos',
                description: 'Tortilla chips with cheese, jalapeños, salsa, and sour cream',
                price: 250,
                category: 'appetizers',
                isVegetarian: true,
                spiceLevel: 2,
                preparationTime: 10,
                isAvailable: true
            },
            {
                name: 'Garlic Bread',
                description: 'Toasted bread with garlic butter and herbs',
                price: 120,
                category: 'appetizers',
                isVegetarian: true,
                preparationTime: 6,
                isAvailable: true
            },

            // Main Course
            {
                name: 'Grilled Salmon',
                description: 'Atlantic salmon with herb butter, served with vegetables',
                price: 480,
                category: 'main-course',
                isGlutenFree: true,
                preparationTime: 20,
                calories: 520,
                allergens: ['fish'],
                isAvailable: true
            },
            {
                name: 'Chicken Alfredo Pasta',
                description: 'Fettuccine in creamy alfredo sauce with grilled chicken',
                price: 380,
                category: 'main-course',
                preparationTime: 18,
                allergens: ['gluten', 'dairy'],
                isAvailable: true
            },
            {
                name: 'Margherita Pizza',
                description: 'Classic pizza with tomato sauce, mozzarella, and fresh basil',
                price: 320,
                category: 'main-course',
                isVegetarian: true,
                preparationTime: 15,
                isAvailable: true
            },
            {
                name: 'BBQ Burger',
                description: 'Beef patty with BBQ sauce, cheese, bacon, and onion rings',
                price: 350,
                category: 'main-course',
                preparationTime: 18,
                calories: 780,
                isAvailable: true
            },
            {
                name: 'Butter Chicken',
                description: 'Creamy tomato-based curry with tender chicken pieces',
                price: 340,
                category: 'main-course',
                spiceLevel: 2,
                preparationTime: 20,
                isGlutenFree: true,
                isAvailable: true
            },
            {
                name: 'Paneer Tikka Masala',
                description: 'Grilled cottage cheese in spiced tomato gravy',
                price: 300,
                category: 'main-course',
                isVegetarian: true,
                spiceLevel: 2,
                preparationTime: 18,
                isGlutenFree: true,
                isAvailable: true
            },
            {
                name: 'Grilled Chicken Steak',
                description: 'Juicy chicken breast with mushroom sauce and mashed potatoes',
                price: 420,
                category: 'main-course',
                isGlutenFree: true,
                preparationTime: 22,
                isAvailable: true
            },
            {
                name: 'Vegetable Biryani',
                description: 'Fragrant basmati rice with mixed vegetables and aromatic spices',
                price: 260,
                category: 'main-course',
                isVegetarian: true,
                isVegan: true,
                spiceLevel: 2,
                preparationTime: 25,
                isAvailable: true
            },

            // Snacks
            {
                name: 'French Fries',
                description: 'Crispy golden fries with ketchup and mayo',
                price: 120,
                category: 'snacks',
                isVegetarian: true,
                isVegan: true,
                preparationTime: 8,
                isAvailable: true
            },
            {
                name: 'Cheese Sandwich',
                description: 'Grilled cheese sandwich with herbs',
                price: 140,
                category: 'snacks',
                isVegetarian: true,
                preparationTime: 8,
                isAvailable: true
            },
            {
                name: 'Chicken Wrap',
                description: 'Grilled chicken with lettuce, tomato in tortilla wrap',
                price: 200,
                category: 'snacks',
                preparationTime: 10,
                isAvailable: true
            },
            {
                name: 'Veg Club Sandwich',
                description: 'Triple-decker sandwich with fresh vegetables and cheese',
                price: 180,
                category: 'snacks',
                isVegetarian: true,
                preparationTime: 10,
                isAvailable: true
            },

            // Desserts
            {
                name: 'Chocolate Lava Cake',
                description: 'Warm chocolate cake with molten center, served with ice cream',
                price: 220,
                category: 'desserts',
                isVegetarian: true,
                preparationTime: 12,
                allergens: ['eggs', 'dairy', 'gluten'],
                isAvailable: true
            },
            {
                name: 'New York Cheesecake',
                description: 'Creamy classic cheesecake with berry compote',
                price: 200,
                category: 'desserts',
                isVegetarian: true,
                preparationTime: 5,
                isAvailable: true
            },
            {
                name: 'Tiramisu',
                description: 'Italian coffee-flavored dessert with mascarpone',
                price: 240,
                category: 'desserts',
                isVegetarian: true,
                preparationTime: 5,
                allergens: ['eggs', 'dairy'],
                isAvailable: true
            },
            {
                name: 'Ice Cream Sundae',
                description: 'Three scoops with chocolate sauce, nuts, and cherry',
                price: 180,
                category: 'desserts',
                isVegetarian: true,
                preparationTime: 5,
                allergens: ['dairy', 'nuts'],
                isAvailable: true
            },
            {
                name: 'Brownie with Ice Cream',
                description: 'Warm chocolate brownie served with vanilla ice cream',
                price: 190,
                category: 'desserts',
                isVegetarian: true,
                preparationTime: 6,
                isAvailable: true
            },

            // Specials
            {
                name: 'Chef\'s Special Platter',
                description: 'Daily special curated by our head chef - ask your server',
                price: 550,
                category: 'specials',
                preparationTime: 25,
                discount: 10,
                isAvailable: true
            },
            {
                name: 'Weekend Brunch Special',
                description: 'Eggs, waffles, bacon, fresh fruits, and bottomless coffee',
                price: 450,
                category: 'specials',
                preparationTime: 20,
                isAvailable: true
            }
        ]);
        console.log(`✅ Created ${menuItems.length} menu items`);

        // Create tables
        console.log('🪑 Creating tables...');
        const tables = [];
        for (let i = 1; i <= 15; i++) {
            tables.push({
                tableNumber: i,
                capacity: i <= 5 ? 2 : (i <= 10 ? 4 : 6),
                location: i <= 10 ? 'indoor' : (i <= 13 ? 'outdoor' : 'private'),
                status: 'available',
                qrCode: `TABLE-${i}-${uuidv4().slice(0, 8).toUpperCase()}`
            });
        }
        const createdTables = await Table.create(tables);
        console.log(`✅ Created ${createdTables.length} tables`);

        console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🎉 Database Seeded Successfully!                 ║
║                                                    ║
║   Users: ${users.length}                                         ║
║   Menu Items: ${menuItems.length}                                    ║
║   Tables: ${createdTables.length}                                       ║
║                                                    ║
║   Login Credentials:                               ║
║   ─────────────────                                ║
║   Admin:   admin@cafe.com / admin123               ║
║   Waiter:  waiter@cafe.com / waiter123             ║
║   Chef:    chef@cafe.com / chef123                 ║
║   Runner:  runner@cafe.com / runner123             ║
║   Cashier: cashier@cafe.com / cashier123           ║
║                                                    ║
╚════════════════════════════════════════════════════╝
    `);

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error.message);
        process.exit(1);
    }
};

seedData();
