import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useOrders } from '../hooks/useOrders';
import { useSocket } from '../context/SocketContext';
import { orderAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, UtensilsCrossed, Loader2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLoader } from '../components/Loader';

const ReadyOrders = () => {
    const { orders, loading, refetch } = useOrders({ type: 'ready' });
    const { socket } = useSocket();
    const [servingItem, setServingItem] = useState(null); // tracks itemId being served

    // Serve a single item via the item-level endpoint
    const handleServeItem = async (orderId, itemId) => {
        setServingItem(itemId);
        try {
            await orderAPI.updateItemStatus(orderId, itemId, 'served');
            refetch();
            toast.success('Item marked as served');
        } catch {
            toast.error('Failed to mark item served');
        } finally {
            setServingItem(null);
        }
    };

    useEffect(() => {
        if (!socket?.on) return;
        const handleReady = () => { refetch(); };
        const handleUpdate = () => refetch();
        socket.on('order:ready', handleReady);
        socket.on('order:updated', handleUpdate);
        socket.on('order:item:updated', handleUpdate);
        socket.on('item:ready', handleReady);
        return () => {
            socket.off('order:ready', handleReady);
            socket.off('order:updated', handleUpdate);
            socket.off('order:item:updated', handleUpdate);
            socket.off('item:ready', handleReady);
        };
    }, [socket, refetch]);

    return (
        <Layout title="Ready Orders">
            {loading ? (
                <PageLoader text="Loading ready orders..." />
            ) : orders.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="empty-state"
                >
                    <div className="empty-state-icon">
                        <UtensilsCrossed size={40} />
                    </div>
                    <h3 className="empty-state-title">No Ready Orders</h3>
                    <p className="empty-state-description">Orders will appear here when kitchen marks items ready</p>
                </motion.div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--spacing-lg)' }}>
                    <AnimatePresence>
                        {orders.map((order) => {
                            const activeItems = (order.items || []).filter(i => i.itemStatus !== 'cancelled');
                            const servedCount = activeItems.filter(i => i.itemStatus === 'served').length;
                            const totalCount = activeItems.length;
                            const allServed = servedCount === totalCount;
                            const progressPct = totalCount > 0 ? (servedCount / totalCount) * 100 : 0;

                            return (
                                <motion.div
                                    key={order._id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="card"
                                    style={{
                                        borderColor: allServed ? 'var(--color-text-muted)' : 'var(--color-success)',
                                        borderWidth: 2,
                                        opacity: allServed ? 0.6 : 1,
                                    }}
                                >
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                        <span style={{ fontWeight: 600, color: '#0A0A0A' }}>{order.orderNumber}</span>
                                        <span className={`badge status-${order.status}`}>
                                            {(order.status || '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                                        </span>
                                    </div>

                                    {/* Table number */}
                                    <div style={{
                                        textAlign: 'center', padding: 'var(--spacing-md) var(--spacing-lg)',
                                        background: '#E5E5E5', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)',
                                    }}>
                                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>Table {order.tableNumber}</div>
                                    </div>

                                    {/* Progress indicator */}
                                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>
                                            <span>{servedCount} of {totalCount} items served</span>
                                            <span>{Math.round(progressPct)}%</span>
                                        </div>
                                        <div style={{ height: 5, background: 'var(--color-bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progressPct}%` }}
                                                style={{
                                                    height: '100%',
                                                    background: progressPct === 100 ? 'var(--color-success)' : '#C8975A',
                                                    borderRadius: 3,
                                                    transition: 'width 0.3s ease',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Items list with individual SERVE buttons */}
                                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                        {activeItems.map((item) => {
                                            const isReady = item.itemStatus === 'ready';
                                            const isServed = item.itemStatus === 'served';
                                            const isPreparing = item.itemStatus === 'preparing' || item.itemStatus === 'pending';
                                            const isServingThis = servingItem === item._id;

                                            return (
                                                <div
                                                    key={item._id}
                                                    style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: 'var(--spacing-sm) 0',
                                                        borderBottom: '1px solid var(--color-border-light)',
                                                        opacity: isPreparing ? 0.45 : 1,
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                                        <span style={{
                                                            fontWeight: 700, fontSize: '0.85rem',
                                                            background: '#0A0A0A', color: 'white',
                                                            padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                                                        }}>
                                                            {item.quantity}x
                                                        </span>
                                                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.name}</span>
                                                    </div>

                                                    {isReady ? (
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() => handleServeItem(order._id, item._id)}
                                                            disabled={isServingThis}
                                                            style={{ minHeight: '36px', minWidth: '80px', fontWeight: 700 }}
                                                        >
                                                            {isServingThis ? (
                                                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                            ) : (
                                                                <>
                                                                    <CheckCircle size={14} />
                                                                    Serve
                                                                </>
                                                            )}
                                                        </button>
                                                    ) : isServed ? (
                                                        <span style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                            padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-full)',
                                                            background: 'rgba(90, 158, 90, 0.12)', color: '#5a9e5a',
                                                            fontSize: '0.75rem', fontWeight: 600,
                                                        }}>
                                                            <CheckCircle size={12} /> Served
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-full)',
                                                            background: 'rgba(200, 151, 90, 0.12)', color: '#C8975A',
                                                            fontSize: '0.75rem', fontWeight: 600, fontStyle: 'italic',
                                                        }}>
                                                            {item.itemStatus === 'preparing' ? 'Preparing…' : 'Pending'}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Waiter info */}
                                    {order.waiter?.name && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Clock size={12} /> Waiter: {order.waiter.name}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </Layout>
    );
};

export default ReadyOrders;
