import { useState, useEffect, useCallback } from 'react';
import { menuAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

export const useMenu = (options = {}) => {
    const { autoFetch = true, category = null, available = true } = options;
    const [items, setItems] = useState([]);
    const [grouped, setGrouped] = useState({});
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { socket, isConnected } = useSocket();

    const fetchMenu = useCallback(async (params = {}) => {
        try {
            setLoading(true);
            setError(null);

            const queryParams = {
                ...params,
                category: category || params.category,
            };

            if (available !== null) {
                queryParams.available = available;
            }

            const response = await menuAPI.getAll(queryParams);
            setItems(response.data.data);
            setGrouped(response.data.grouped || {});
            return response.data;
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to fetch menu';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [category, available]);

    const fetchCategories = useCallback(async () => {
        try {
            const response = await menuAPI.getCategories();
            setCategories(response.data.data);
            return response.data.data;
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    }, []);

    const createItem = useCallback(async (itemData) => {
        try {
            const response = await menuAPI.create(itemData);
            const newItem = response.data.data;

            setItems((prev) => [...prev, newItem]);
            toast.success('Menu item created!');
            return newItem;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create item');
            throw err;
        }
    }, []);

    const updateItem = useCallback(async (itemId, itemData) => {
        try {
            const response = await menuAPI.update(itemId, itemData);
            const updatedItem = response.data.data;

            setItems((prev) =>
                prev.map((item) => (item._id === itemId ? updatedItem : item))
            );

            toast.success('Menu item updated!');
            return updatedItem;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update item');
            throw err;
        }
    }, []);

    const deleteItem = useCallback(async (itemId) => {
        try {
            await menuAPI.delete(itemId);
            setItems((prev) => prev.filter((item) => item._id !== itemId));
            toast.success('Menu item deleted!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete item');
            throw err;
        }
    }, []);

    const toggleAvailability = useCallback(async (itemId) => {
        try {
            const response = await menuAPI.toggleAvailability(itemId);
            const updatedItem = response.data.data;

            setItems((prev) =>
                prev.map((item) => (item._id === itemId ? updatedItem : item))
            );

            socket.emitMenuAvailabilityChange(
                updatedItem._id,
                updatedItem.name,
                updatedItem.isAvailable
            );

            toast.success(
                `${updatedItem.name} is now ${updatedItem.isAvailable ? 'available' : 'unavailable'}`
            );
            return updatedItem;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to toggle availability');
            throw err;
        }
    }, [socket]);

    // Listen for real-time menu updates (availability toggle)
    useEffect(() => {
        if (!isConnected) return;

        const handleMenuUpdate = (data) => {
            setItems((prev) =>
                prev.map((item) =>
                    item._id === data.itemId
                        ? { ...item, isAvailable: data.isAvailable }
                        : item
                )
            );

            if (!data.isAvailable) {
                toast.error(`${data.itemName} is now sold out`, { icon: '⚠️' });
            }
        };

        // Listen for CRUD changes (create/update/delete) — just refetch
        const handleMenuChanged = () => {
            fetchMenu();
            fetchCategories();
        };

        socket.on('menu:updated', handleMenuUpdate);
        socket.on('menu:changed', handleMenuChanged);

        return () => {
            socket.off('menu:updated', handleMenuUpdate);
            socket.off('menu:changed', handleMenuChanged);
        };
    }, [isConnected, socket, fetchMenu, fetchCategories]);

    // Initial fetch
    useEffect(() => {
        if (autoFetch) {
            fetchMenu().catch(() => { });
            fetchCategories();
        }
    }, [autoFetch, fetchMenu, fetchCategories]);

    return {
        items,
        grouped,
        categories,
        loading,
        error,
        refetch: fetchMenu,
        fetchCategories,
        createItem,
        updateItem,
        deleteItem,
        toggleAvailability,
    };
};

export default useMenu;
