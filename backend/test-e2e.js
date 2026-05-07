import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

async function login(email, password) {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    return res.data.data.token;
}

async function runTest() {
    try {
        console.log('--- Starting E2E Test ---');
        
        // 1. Admin setup
        console.log('Logging in as Admin...');
        const adminToken = await login('admin@cafe.com', 'admin123');
        const adminAuth = { headers: { Authorization: `Bearer ${adminToken}` } };
        
        // Ensure at least one table exists
        let tables = await axios.get(`${API_URL}/tables`, adminAuth).then(r => r.data.data);
        if (tables.length === 0) {
            console.log('Creating table...');
            await axios.post(`${API_URL}/tables`, { tableNumber: 1, capacity: 4 }, adminAuth);
            tables = await axios.get(`${API_URL}/tables`, adminAuth).then(r => r.data.data);
        }
        const tableId = tables[0]._id;
        console.log(`Table ID: ${tableId}`);

        // Ensure at least one menu item exists
        let items = await axios.get(`${API_URL}/menu`, adminAuth).then(r => r.data.data);
        if (items.length === 0) {
            console.log('Creating menu item...');
            await axios.post(`${API_URL}/menu`, {
                name: 'Test Burger',
                description: 'A delicious test burger',
                price: 12.99,
                category: 'main',
                preparationTime: 10
            }, adminAuth);
            items = await axios.get(`${API_URL}/menu`, adminAuth).then(r => r.data.data);
        }
        const menuItemId = items[0]._id;
        console.log(`Menu Item ID: ${menuItemId}`);

        // Force table to available first
        await axios.patch(`${API_URL}/tables/${tableId}/status`, { status: 'available' }, adminAuth).catch(() => {});

        // 2. Waiter flow - create order
        console.log('\nLogging in as Waiter...');
        const waiterToken = await login('waiter@cafe.com', 'waiter123');
        const waiterAuth = { headers: { Authorization: `Bearer ${waiterToken}` } };
        
        console.log('Waiter updating table status to occupied...');
        await axios.patch(`${API_URL}/tables/${tableId}/status`, { status: 'occupied' }, waiterAuth);

        console.log('Waiter creating order...');
        const orderData = {
            tableId,
            items: [{ menuItemId, quantity: 2 }]
        };
        const orderRes = await axios.post(`${API_URL}/orders`, orderData, waiterAuth);
        const orderId = orderRes.data.data._id;
        console.log(`Order created: ${orderId} (Status: ${orderRes.data.data.status})`);

        // 3. Waiter confirm order
        console.log('Waiter confirming order...');
        await axios.patch(`${API_URL}/orders/${orderId}/status`, { status: 'confirmed' }, waiterAuth);
        
        // 4. Chef flow
        console.log('\nLogging in as Chef...');
        const chefToken = await login('chef@cafe.com', 'chef123');
        const chefAuth = { headers: { Authorization: `Bearer ${chefToken}` } };

        console.log('Chef updating order to preparing...');
        await axios.patch(`${API_URL}/orders/${orderId}/status`, { status: 'preparing' }, chefAuth);
        
        const currentOrder = await axios.get(`${API_URL}/orders/${orderId}`, chefAuth).then(r => r.data.data);
        const itemId = currentOrder.items[0]._id;
        
        console.log('Chef updating item status to ready...');
        await axios.patch(`${API_URL}/orders/${orderId}/items/${itemId}/status`, { status: 'ready' }, chefAuth);

        // 5. Waiter/Runner flow
        console.log('\nLogging in as Waiter (acting as runner)...');
        console.log('Waiter marking order as served...');
        await axios.patch(`${API_URL}/orders/${orderId}/status`, { status: 'served' }, waiterAuth);

        // 6. Cashier flow
        console.log('\nLogging in as Cashier...');
        const cashierToken = await login('cashier@cafe.com', 'cashier123');
        const cashierAuth = { headers: { Authorization: `Bearer ${cashierToken}` } };

        console.log('Cashier processing payment...');
        await axios.post(`${API_URL}/orders/${orderId}/payment`, {
            paymentMethod: 'card',
            paidAmount: 26.00 // roughly 12.99 * 2
        }, cashierAuth);

        // 8. Waiter marks table as cleaning then available
        console.log('\nWait updating table...');
        await axios.patch(`${API_URL}/tables/${tableId}/status`, { status: 'cleaning' }, waiterAuth);
        await axios.patch(`${API_URL}/tables/${tableId}/status`, { status: 'available' }, waiterAuth);

        console.log('\n✅ E2E Workflow Completed Successfully!');
        
    } catch (err) {
        console.error('❌ Error during E2E test:', err.response?.data || err.message);
    }
}

runTest();
