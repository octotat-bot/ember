import { useState, useEffect, useCallback } from 'react';
import { tableAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

export const useTables = (options = {}) => {
    const { autoFetch = true, status = null } = options;
    const [tables, setTables] = useState([]);
    const [summary, setSummary] = useState({
        total: 0,
        available: 0,
        occupied: 0,
        reserved: 0,
        cleaning: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { socket, isConnected } = useSocket();

    const fetchTables = useCallback(async (params = {}) => {
        try {
            setLoading(true);
            setError(null);

            const queryParams = status ? { status, ...params } : params;
            const response = await tableAPI.getAll(queryParams);
            setTables(response.data.data);
            return response.data;
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to fetch tables';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [status]);

    const fetchSummary = useCallback(async () => {
        try {
            const response = await tableAPI.getSummary();
            setSummary(response.data.data);
            return response.data.data;
        } catch (err) {
            console.error('Failed to fetch table summary:', err);
        }
    }, []);

    const createTable = useCallback(async (tableData) => {
        try {
            const response = await tableAPI.create(tableData);
            const newTable = response.data.data;

            setTables((prev) => [...prev, newTable].sort((a, b) => a.tableNumber - b.tableNumber));
            fetchSummary();
            toast.success(`Table ${newTable.tableNumber} created!`);
            return newTable;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create table');
            throw err;
        }
    }, [fetchSummary]);

    const updateTable = useCallback(async (tableId, tableData) => {
        try {
            const response = await tableAPI.update(tableId, tableData);
            const updatedTable = response.data.data;

            setTables((prev) =>
                prev.map((t) => (t._id === tableId ? updatedTable : t))
            );

            toast.success('Table updated!');
            return updatedTable;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update table');
            throw err;
        }
    }, []);

    const updateStatus = useCallback(async (tableId, newStatus) => {
        try {
            const table = tables.find((t) => t._id === tableId);
            const previousStatus = table?.status;

            const response = await tableAPI.updateStatus(tableId, newStatus);
            const updatedTable = response.data.data;

            setTables((prev) =>
                prev.map((t) => (t._id === tableId ? updatedTable : t))
            );

            fetchSummary();

            socket.emitTableStatusChange(
                tableId,
                updatedTable.tableNumber,
                newStatus,
                previousStatus
            );

            toast.success(`Table ${updatedTable.tableNumber} is now ${newStatus}`);
            return updatedTable;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status');
            throw err;
        }
    }, [tables, socket, fetchSummary]);

    const deleteTable = useCallback(async (tableId) => {
        try {
            await tableAPI.delete(tableId);
            setTables((prev) => prev.filter((t) => t._id !== tableId));
            fetchSummary();
            toast.success('Table deleted!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete table');
            throw err;
        }
    }, [fetchSummary]);

    // Listen for real-time table updates
    useEffect(() => {
        if (!isConnected) return;

        const handleTableUpdate = (data) => {
            setTables((prev) =>
                prev.map((t) =>
                    t._id === data.tableId ? { ...t, status: data.status } : t
                )
            );
            fetchSummary();
        };

        const handleTableAvailable = (data) => {
            toast.success(`Table ${data.tableNumber} is now available`, { icon: '🪑' });
        };

        // Listen for CRUD changes (create/update/delete) — just refetch
        const handleTableChanged = () => {
            fetchTables();
            fetchSummary();
        };

        socket.on('table:updated', handleTableUpdate);
        socket.on('table:available', handleTableAvailable);
        socket.on('table:changed', handleTableChanged);

        return () => {
            socket.off('table:updated', handleTableUpdate);
            socket.off('table:available', handleTableAvailable);
            socket.off('table:changed', handleTableChanged);
        };
    }, [isConnected, socket, fetchSummary, fetchTables]);

    // Initial fetch
    useEffect(() => {
        if (autoFetch) {
            fetchTables().catch(() => { });
            fetchSummary();
        }
    }, [autoFetch, fetchTables, fetchSummary]);

    return {
        tables,
        summary,
        loading,
        error,
        refetch: fetchTables,
        fetchSummary,
        createTable,
        updateTable,
        updateStatus,
        deleteTable,
    };
};

export const useTable = (tableId) => {
    const [table, setTable] = useState(null);
    const [loading, setLoading] = useState(!!tableId);
    const [error, setError] = useState(null);

    const fetchTable = useCallback(async () => {
        if (!tableId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await tableAPI.getById(tableId);
            setTable(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch table');
        } finally {
            setLoading(false);
        }
    }, [tableId]);

    useEffect(() => {
        fetchTable();
    }, [fetchTable]);

    return { table, loading, error, refetch: fetchTable };
};

export default useTables;
