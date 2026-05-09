import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useOrders } from '../hooks/useOrders';
import { useSocket } from '../context/SocketContext';
import { orderAPI } from '../services/api';
import { PageLoader } from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    AlertTriangle,
    CheckCircle,
    ChefHat,
    Timer,
    Flame,
    Loader2,
    Play,
    ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Item status button config per spec ────────────────
const ITEM_BUTTON_CONFIG = {
    pending: {
        label: 'START',
        color: '#6B6460',
        bg: 'rgba(107, 100, 96, 0.15)',
        nextStatus: 'preparing',
        isButton: true,
    },
    preparing: {
        label: 'MARK READY',
        color: '#C8975A',
        bg: 'rgba(200, 151, 90, 0.15)',
        nextStatus: 'ready',
        isButton: true,
    },
    ready: {
        label: 'READY',
        color: '#5a9e5a',
        bg: 'rgba(90, 158, 90, 0.15)',
        nextStatus: null,
        isButton: false,
    },
    served: {
        label: 'SERVED',
        color: 'var(--color-text-muted)',
        bg: 'rgba(107, 100, 96, 0.08)',
        nextStatus: null,
        isButton: false,
    },
};

// ═══════════════════════════════════════════════════════
//  KITCHEN ORDER CARD
// ═══════════════════════════════════════════════════════
const KitchenOrderCard = ({ order, onStatusChange, onItemStatusChange, updatingItem }) => {
    const [updating, setUpdating] = useState(false);
    const [now, setNow] = useState(new Date());

    // Live timer — update every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(interval);
    }, []);

    const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
    const waitTime = Math.floor((now - createdAt) / 60000);

    const isUrgent = order.priority === 'urgent' || waitTime > 20;
    const isHigh = order.priority === 'high' || waitTime > 15;
    const isWarning = waitTime > 10;

    const getWaitColor = () => {
        if (isUrgent) return { text: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.15)' };
        if (isHigh) return { text: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.15)' };
        if (isWarning) return { text: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' };
        return { text: 'var(--color-success)', bg: 'rgba(34, 197, 94, 0.1)' };
    };
    const waitColor = getWaitColor();

    const isNewItem = (item) => {
        if (!item.addedAt) return false;
        return (now - new Date(item.addedAt)) < 5 * 60 * 1000;
    };

    const handleStatusUpdate = async (newStatus) => {
        setUpdating(true);
        try {
            await onStatusChange(order._id, newStatus);
        } finally {
            setUpdating(false);
        }
    };

    // Determine the order-level primary action
    const getPrimaryAction = () => {
        if (order.status === 'pending' || order.status === 'confirmed') {
            return { status: 'preparing', label: 'Start Preparing', icon: ChefHat, color: 'primary' };
        }
        if (order.status === 'preparing') {
            const allReady = order.items?.every((i) => ['ready', 'served'].includes(i.itemStatus));
            if (allReady) {
                return { status: 'ready', label: 'Order Ready — Send Out', icon: CheckCircle, color: 'success' };
            }
            return null;
        }
        return null;
    };

    const primaryAction = getPrimaryAction();

    // Count item statuses for the progress bar
    const activeItems = order.items?.filter(i => i.itemStatus !== 'cancelled') || [];
    const totalItems = activeItems.length;
    const readyOrServedItems = activeItems.filter((i) => ['ready', 'served'].includes(i.itemStatus)).length;
    const progress = totalItems > 0 ? (readyOrServedItems / totalItems) * 100 : 0;

    // Card stays on KDS until ALL items are READY or SERVED
    // (This is handled by the backend query, but we show it regardless)

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
                background: 'var(--color-bg-card)',
                border: `2px solid ${isUrgent ? 'var(--color-error)' : isHigh ? 'var(--color-warning)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                ...(isUrgent ? { animation: 'pulse-border 1.5s infinite' } : {}),
            }}
        >
            {/* ── Header ───────────────────────────────── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                borderBottom: '1px solid var(--color-border-light)',
                background: isUrgent ? 'rgba(239, 68, 68, 0.05)' : isHigh ? 'rgba(245, 158, 11, 0.03)' : 'transparent',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                        #{order.orderNumber?.split('-').pop()}
                    </span>
                    <span style={{
                        background: 'var(--color-bg-tertiary)', padding: '0.3rem 0.8rem',
                        borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.9rem',
                    }}>
                        Table {order.tableNumber}
                    </span>
                    {order.waiter?.name && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            by {order.waiter.name}
                        </span>
                    )}
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    background: waitColor.bg,
                    padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)',
                    color: waitColor.text,
                    fontWeight: 700, fontSize: '0.9rem',
                }}>
                    {isUrgent && <AlertTriangle size={14} />}
                    <Timer size={16} />
                    {waitTime}m
                </div>
            </div>

            {/* ── Progress bar (only when preparing) ──── */}
            {order.status === 'preparing' && totalItems > 0 && (
                <div style={{ padding: '0 var(--spacing-lg)', paddingTop: 'var(--spacing-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                        <span>{readyOrServedItems} of {totalItems} items done</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--color-bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            style={{ height: '100%', background: progress === 100 ? 'var(--color-success)' : '#C8975A', borderRadius: 2 }}
                        />
                    </div>
                </div>
            )}

            {/* ── Items ────────────────────────────────── */}
            <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                {order.items?.map((item, idx) => {
                    const cfg = ITEM_BUTTON_CONFIG[item.itemStatus] || ITEM_BUTTON_CONFIG.pending;
                    const isUpdating = updatingItem === item._id;
                    const showingItemActions = order.status === 'preparing';

                    return (
                        <div key={item._id || idx} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: 'var(--spacing-sm) 0',
                            borderBottom: idx < order.items.length - 1 ? '1px dashed var(--color-border-light)' : 'none',
                        }}>
                            {/* Left: quantity + name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1 }}>
                                <span style={{
                                    background: 'var(--color-primary)', color: '#fff',
                                    padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
                                    fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                                }}>
                                    {item.quantity}x
                                </span>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</span>
                                        {isNewItem(item) && (
                                            <span style={{
                                                background: 'var(--color-warning)', color: '#fff',
                                                padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)',
                                                fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
                                                animation: 'pulse-badge 2s infinite',
                                            }}>
                                                NEW
                                            </span>
                                        )}
                                    </div>
                                    {item.specialInstructions && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-warning)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                            <AlertTriangle size={11} />
                                            {item.specialInstructions}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: action button or static badge */}
                            {showingItemActions && cfg.isButton ? (
                                <button
                                    onClick={() => {
                                        if (isUpdating) return;
                                        onItemStatusChange?.(order._id, item._id, cfg.nextStatus);
                                    }}
                                    disabled={isUpdating}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                                        padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-full)',
                                        background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.color}`,
                                        fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.03em',
                                        cursor: 'pointer',
                                        opacity: isUpdating ? 0.5 : 1,
                                        transition: 'all 0.2s ease',
                                        minHeight: '44px', minWidth: '44px',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {isUpdating ? (
                                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                    ) : cfg.nextStatus === 'preparing' ? (
                                        <Play size={13} fill={cfg.color} />
                                    ) : (
                                        <ArrowRight size={13} />
                                    )}
                                    {cfg.label}
                                </button>
                            ) : showingItemActions && !cfg.isButton ? (
                                /* Static badge for ready / served items */
                                <span style={{
                                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                                    padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-full)',
                                    background: cfg.bg, color: cfg.color,
                                    fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.03em',
                                    minHeight: '44px', minWidth: '44px',
                                    textTransform: 'uppercase',
                                    opacity: item.itemStatus === 'served' ? 0.5 : 1,
                                }}>
                                    {item.itemStatus === 'ready' && <CheckCircle size={13} />}
                                    {cfg.label}
                                </span>
                            ) : (
                                /* Before order is in preparing state — show small status chip */
                                <span style={{
                                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                                    padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-full)',
                                    background: cfg.bg, color: cfg.color, fontSize: '0.7rem', fontWeight: 600,
                                }}>
                                    {cfg.label}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Special Requests ──────────────────────── */}
            {order.specialRequests && (
                <div style={{
                    padding: 'var(--spacing-sm) var(--spacing-lg)',
                    background: 'rgba(245, 158, 11, 0.08)',
                    borderTop: '1px solid var(--color-border-light)',
                    display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
                }}>
                    <Flame size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)' }}>{order.specialRequests}</span>
                </div>
            )}

            {/* ── Primary Action ───────────────────────── */}
            {primaryAction && (
                <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', borderTop: '1px solid var(--color-border-light)' }}>
                    <button
                        className={`btn btn-${primaryAction.color}`}
                        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 700, minHeight: '56px' }}
                        onClick={() => handleStatusUpdate(primaryAction.status)}
                        disabled={updating}
                    >
                        {updating ? (
                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <>
                                <primaryAction.icon size={18} />
                                {primaryAction.label}
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Show hint when preparing but not all done */}
            {order.status === 'preparing' && !primaryAction && totalItems > 0 && (
                <div style={{
                    padding: 'var(--spacing-sm) var(--spacing-lg)',
                    borderTop: '1px solid var(--color-border-light)',
                    textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)',
                    fontStyle: 'italic',
                }}>
                    Mark all items as done to send this order out
                </div>
            )}
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════
//  KITCHEN DISPLAY PAGE
// ═══════════════════════════════════════════════════════
const Kitchen = () => {
    const { orders, loading, error, updateStatus, refetch } = useOrders({ type: 'kitchen', autoFetch: true });
    const { socket } = useSocket();
    const [filter, setFilter] = useState('all');
    const [updatingItem, setUpdatingItem] = useState(null);

    const handleItemStatus = async (orderId, itemId, newStatus) => {
        setUpdatingItem(itemId);
        try {
            await orderAPI.updateItemStatus(orderId, itemId, newStatus);
            refetch();
        } catch {
            toast.error('Failed to update item status');
        } finally {
            setUpdatingItem(null);
        }
    };

    useEffect(() => { if (error) toast.error(error); }, [error]);

    useEffect(() => {
        if (!socket?.on) return;
        const handleNewOrder = (data) => {
            toast.success(`New order from Table ${data?.order?.tableNumber || '?'}!`, { icon: '🔔', duration: 5000 });
            refetch();
        };
        const handleUpdate = () => refetch();

        socket.on('order:new', handleNewOrder);
        socket.on('order:updated', handleUpdate);
        socket.on('order:items:new', handleUpdate);
        socket.on('order:item:updated', handleUpdate);
        socket.on('item:served', handleUpdate);

        return () => {
            socket.off('order:new', handleNewOrder);
            socket.off('order:updated', handleUpdate);
            socket.off('order:items:new', handleUpdate);
            socket.off('order:item:updated', handleUpdate);
            socket.off('item:served', handleUpdate);
        };
    }, [socket, refetch]);

    const filteredOrders = orders.filter((order) => {
        if (filter === 'all') return true;
        if (filter === 'new') return ['pending', 'confirmed'].includes(order.status);
        return order.status === filter;
    });

    const newCount = orders.filter((o) => ['pending', 'confirmed'].includes(o.status)).length;
    const preparingCount = orders.filter((o) => o.status === 'preparing').length;

    return (
        <Layout title="Kitchen Display">
            {/* ── Stats + Filters ──────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap', gap: 'var(--spacing-md)',
            }}>
                {/* Counters */}
                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <div style={{
                        background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md) var(--spacing-lg)',
                        display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)',
                    }}>
                        <Clock size={24} style={{ color: 'var(--color-warning)' }} />
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{newCount}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>New Orders</div>
                        </div>
                    </div>
                    <div style={{
                        background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md) var(--spacing-lg)',
                        display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)',
                    }}>
                        <ChefHat size={24} style={{ color: '#C8975A' }} />
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{preparingCount}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Preparing</div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                    {[
                        { key: 'all', label: `All (${orders.length})` },
                        { key: 'new', label: `New (${newCount})` },
                        { key: 'preparing', label: `Preparing (${preparingCount})` },
                    ].map((f) => (
                        <button key={f.key} className={`btn ${filter === f.key ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setFilter(f.key)}>
                            {f.label}
                        </button>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={refetch}>Refresh</button>
                </div>
            </div>

            {/* ── Orders Grid ──────────────────────────── */}
            {loading ? (
                <PageLoader text="Loading kitchen orders..." />
            ) : filteredOrders.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{
                        textAlign: 'center', padding: 'var(--spacing-2xl)',
                        background: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-border)',
                    }}>
                    <ChefHat size={64} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: 'var(--spacing-md)' }} />
                    <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--spacing-sm)' }}>All Clear!</h3>
                    <p style={{ color: 'var(--color-text-muted)' }}>No orders in the kitchen right now. New orders will appear automatically.</p>
                </motion.div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--spacing-lg)' }}>
                    <AnimatePresence>
                        {filteredOrders.map((order) => (
                            <KitchenOrderCard
                                key={order._id}
                                order={order}
                                onStatusChange={updateStatus}
                                onItemStatusChange={handleItemStatus}
                                updatingItem={updatingItem}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </Layout>
    );
};

export default Kitchen;
