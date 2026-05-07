import { useState, useEffect, useCallback } from 'react';
import { orderAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

export const useOrders = (options = {}) => {
    const { autoFetch = true, type = 'all', pollInterval = null } = options;
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { socket, isConnected } = useSocket();

    const fetchOrders = useCallback(async (params = {}) => {
        try {
            setLoading(true);
            setError(null);

            let response;
            switch (type) {
                case 'kitchen':
                    response = await orderAPI.getKitchen();
                    break;
                case 'ready':
                    response = await orderAPI.getReady();
                    break;
                case 'unpaid':
                    response = await orderAPI.getUnpaid();
                    break;
                case 'my-orders':
                    response = await orderAPI.getMyOrders(params);
                    break;
                default:
                    response = await orderAPI.getAll(params);
            }

            setOrders(response.data.data);
            return response.data;
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to fetch orders';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [type]);

    const createOrder = useCallback(async (orderData) => {
        try {
            const response = await orderAPI.create(orderData);
            const newOrder = response.data.data;

            setOrders((prev) => [newOrder, ...prev]);
            // Backend already emits socket event via emitNewOrder — no need to emit again here
            toast.success('Order created successfully!');
            return newOrder;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create order');
            throw err;
        }
    }, []);

    const updateStatus = useCallback(async (orderId, status, notes = '') => {
        try {
            const response = await orderAPI.updateStatus(orderId, status, notes);
            const updatedOrder = response.data.data;

            setOrders((prev) =>
                prev.map((o) => (o._id === orderId ? updatedOrder : o))
            );

            // Backend already emits socket event via emitOrderStatusUpdate
            toast.success(`Order status updated to ${status}`);
            return updatedOrder;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status');
            throw err;
        }
    }, []);

    const addItems = useCallback(async (orderId, items) => {
        try {
            const response = await orderAPI.addItems(orderId, items);
            const updatedOrder = response.data.data;

            setOrders((prev) =>
                prev.map((o) => (o._id === orderId ? updatedOrder : o))
            );

            // Backend already emits socket event via emitItemsAdded
            toast.success('Items added to order');
            return updatedOrder;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add items');
            throw err;
        }
    }, []);

    const processPayment = useCallback(async (orderId, paymentData) => {
        try {
            const response = await orderAPI.processPayment(orderId, paymentData);

            setOrders((prev) =>
                prev.map((o) =>
                    o._id === orderId ? response.data.data.order : o
                )
            );

            // Backend already emits socket event via emitPaymentCompleted
            toast.success('Payment processed successfully!');
            return response.data.data;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
            throw err;
        }
    }, []);

    // Setup real-time updates
    useEffect(() => {
        if (!isConnected) return;

        const handleOrderNew = (data) => {
            if (type === 'kitchen' || type === 'all') {
                setOrders((prev) => [data.order, ...prev]);
                toast.success(`New order from Table ${data.order.tableNumber}`, {
                    icon: '🔔',
                });
            }
        };

        const handleOrderUpdate = (data) => {
            setOrders((prev) =>
                prev.map((o) =>
                    o._id === data.orderId
                        ? { ...o, ...(data.order || {}), status: data.status }
                        : o
                )
            );
        };

        const handleOrderReady = (data) => {
            if (type === 'ready' || type === 'all') {
                fetchOrders();
                toast.success(`Order #${data.orderNumber} is ready!`, { icon: '✅' });
            }
        };

        // Item-level updates → refetch to get the latest item statuses
        const handleItemUpdate = (data) => {
            if (data.order) {
                setOrders((prev) =>
                    prev.map((o) => o._id === data.orderId ? { ...o, ...data.order } : o)
                );
            } else {
                fetchOrders();
            }
        };

        const handleItemReady = () => {
            if (type === 'ready' || type === 'kitchen') {
                fetchOrders();
            }
        };

        const handleOrderCompleted = () => fetchOrders();
        const handleOrderCancelled = () => fetchOrders();

        socket.on('order:new', handleOrderNew);
        socket.on('order:updated', handleOrderUpdate);
        socket.on('order:ready', handleOrderReady);
        socket.on('order:item:updated', handleItemUpdate);
        socket.on('item:ready', handleItemReady);
        socket.on('order:completed', handleOrderCompleted);
        socket.on('order:cancelled', handleOrderCancelled);

        return () => {
            socket.off('order:new', handleOrderNew);
            socket.off('order:updated', handleOrderUpdate);
            socket.off('order:ready', handleOrderReady);
            socket.off('order:item:updated', handleItemUpdate);
            socket.off('item:ready', handleItemReady);
            socket.off('order:completed', handleOrderCompleted);
            socket.off('order:cancelled', handleOrderCancelled);
        };
    }, [isConnected, socket, type, fetchOrders]);

    // Initial fetch
    useEffect(() => {
        if (autoFetch) {
            fetchOrders().catch(() => { });
        }
    }, [autoFetch, fetchOrders]);

    // Polling
    useEffect(() => {
        if (pollInterval && pollInterval > 0) {
            const interval = setInterval(fetchOrders, pollInterval);
            return () => clearInterval(interval);
        }
    }, [pollInterval, fetchOrders]);

    return {
        orders,
        loading,
        error,
        refetch: fetchOrders,
        createOrder,
        updateStatus,
        addItems,
        processPayment,
    };
};

export const useOrder = (orderId) => {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(!!orderId);
    const [error, setError] = useState(null);

    const fetchOrder = useCallback(async () => {
        if (!orderId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await orderAPI.getById(orderId);
            setOrder(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch order');
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    return { order, loading, error, refetch: fetchOrder };
};

export default useOrders;
