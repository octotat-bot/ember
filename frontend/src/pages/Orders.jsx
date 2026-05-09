import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useOrders } from '../hooks/useOrders';
import { useTables } from '../hooks/useTables';
import { useSocket } from '../context/SocketContext';
import { useMenu } from '../hooks/useMenu';
import { useAuth } from '../context/AuthContext';
import { orderAPI } from '../services/api';
import { PageLoader, InlineLoader } from '../components/Loader';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { TransferTableModal, OrderJourneyModal } from '../components/OrderModals';
import {
    Plus, Clock, X, Minus, Search, UtensilsCrossed, Leaf,
    ChevronDown, ChevronUp, Ban, CheckCircle, Loader2, ArrowRight,
} from 'lucide-react';

// ── Status flow label helper ──────────────────────────
const STATUS_FLOW = {
    // pending → preparing in one click (skips 'confirmed' — kitchen is notified immediately)
    pending: { next: 'preparing', label: 'Confirm & Send to Kitchen', color: 'primary', roles: ['admin', 'waiter'] },
    confirmed: { next: 'preparing', label: 'Send to Kitchen', color: 'primary', roles: ['admin', 'waiter', 'chef'] },
    preparing: { next: 'ready', label: 'Mark Ready', color: 'success', roles: ['admin', 'chef'] },
    ready: { next: 'served', label: 'Mark Served', color: 'success', roles: ['admin', 'waiter', 'runner'] },
    partially_served: { next: null, label: 'Partially Served', color: 'ghost', roles: [] },
    served: { next: null, label: 'Awaiting Payment', color: 'ghost', roles: [] },
    completed: { next: null, label: 'Completed', color: 'ghost', roles: [] },
    cancelled: { next: null, label: 'Cancelled', color: 'ghost', roles: [] },
};

const CANCELLABLE = ['pending', 'confirmed'];

// ── Status badge color ────────────────────────────────
const statusLabel = (s) => (s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// ═══════════════════════════════════════════════════════
//  CREATE ORDER MODAL  (faster 2-step flow + Quick Add)
// ═══════════════════════════════════════════════════════
const CreateOrderModal = ({ isOpen, onClose, onSubmit, existingOrder }) => {
    const { tables, loading: tablesLoading } = useTables({ autoFetch: true });
    const { items: menuItems, categories, loading: menuLoading } = useMenu({ autoFetch: true, available: true });
    // If existingOrder is passed, lock the table to that order's table.
    const [selectedTable, setSelectedTable] = useState(null);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [menuSearch, setMenuSearch] = useState('');
    const [menuCategory, setMenuCategory] = useState('all');
    const [showReview, setShowReview] = useState(false);

    useEffect(() => {
        if (existingOrder && isOpen) {
            setSelectedTable({ _id: existingOrder.table, tableNumber: existingOrder.tableNumber });
        }
    }, [existingOrder, isOpen]);

    const addToCart = (item) => {
        const existing = cart.find((c) => c.menuItemId === item._id);
        if (existing) {
            setCart(cart.map((c) => c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1, isVegetarian: item.isVegetarian }]);
        }
    };

    const updateQuantity = (itemId, delta) => {
        setCart(cart.map((c) => c.menuItemId === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0));
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const filteredMenuItems = menuItems.filter((item) => {
        const matchesSearch = (item.name || '').toLowerCase().includes(menuSearch.toLowerCase());
        const matchesCat = menuCategory === 'all' || item.category === menuCategory;
        return matchesSearch && matchesCat;
    });

    const handleSubmit = async () => {
        if (!selectedTable || cart.length === 0) return;
        setLoading(true);
        try {
            await onSubmit({
                tableId: selectedTable._id,
                items: cart.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity, specialInstructions: '' })),
            }, existingOrder?._id);
            onClose();
            setSelectedTable(null);
            setCart([]);
            setShowReview(false);
        } catch {
            // error handled by hook
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onClose();
        setShowReview(false);
        setMenuSearch('');
        setMenuCategory('all');
        setSelectedTable(null);
        setCart([]);
    };

    if (!isOpen) return null;

    const availableTables = tables.filter((t) => t.status === 'available');

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <motion.div className="modal" onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ maxWidth: '900px', width: '95vw' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {existingOrder ? `Add to Order #${existingOrder.orderNumber}` : showReview ? 'Review Order' : 'New Order'}
                    </h3>
                    <button className="modal-close" onClick={handleClose}><X size={20} /></button>
                </div>

                <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                    {!showReview ? (
                        <>
                            {/* Table Selection — compact row */}
                            {!existingOrder && (
                                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                    <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)', display: 'block' }}>Select Table</label>
                                    {tablesLoading ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-md)' }}><InlineLoader /></div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                            {availableTables.map((table) => (
                                                <motion.button key={table._id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                                    className={`btn ${selectedTable?._id === table._id ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                                    onClick={() => setSelectedTable(table)}
                                                    style={{ gap: '0.25rem' }}>
                                                    <span style={{ fontWeight: 700 }}>{table.tableNumber}</span>
                                                    <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>({table.capacity})</span>
                                                </motion.button>
                                            ))}
                                            {availableTables.length === 0 && (
                                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                                    No available tables. Free up a table first.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Search + Category */}
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                    <input className="input" placeholder="Search menu..." value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} style={{ paddingLeft: '2.25rem', padding: '0.5rem 0.75rem 0.5rem 2.25rem' }} />
                                </div>
                                <select className="input" value={menuCategory} onChange={(e) => setMenuCategory(e.target.value)} style={{ width: 'auto', padding: '0.5rem 0.75rem' }}>
                                    <option value="all">All</option>
                                    {categories.map((cat) => <option key={cat.category} value={cat.category}>{(cat.category || '').replace(/-/g, ' ')}</option>)}
                                </select>
                            </div>

                            {/* Menu Grid */}
                            {menuLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-lg)' }}><InlineLoader /></div>
                            ) : filteredMenuItems.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
                                    <UtensilsCrossed size={40} style={{ marginBottom: 'var(--spacing-sm)', opacity: 0.3 }} />
                                    <p>{menuItems.length === 0 ? 'Add items from the Menu page.' : 'No items match your search.'}</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--spacing-sm)' }}>
                                    {filteredMenuItems.map((item) => {
                                        const inCart = cart.find((c) => c.menuItemId === item._id);
                                        return (
                                            <motion.div key={item._id} className="card"
                                                style={{ padding: 'var(--spacing-sm)', cursor: 'pointer', border: inCart ? '2px solid var(--color-primary)' : undefined }}
                                                onClick={() => addToCart(item)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.name}</div>
                                                    {item.isVegetarian && <Leaf size={12} style={{ color: 'var(--color-success)', flexShrink: 0 }} />}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>₹{item.price}</span>
                                                    {inCart && (
                                                        <span style={{ fontSize: '0.7rem', background: 'var(--color-primary)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                                                            {inCart.quantity}
                                                        </span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Review Screen */
                        <>
                            <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Table</span>
                                    <span style={{ fontWeight: 600 }}>Table {selectedTable?.tableNumber} ({selectedTable?.capacity} seats)</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Items</span>
                                    <span style={{ fontWeight: 600 }}>{cartItemCount} items</span>
                                </div>
                            </div>
                            <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Order Items</h4>
                            {cart.map((item) => (
                                <div key={item.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-border-light)' }}>
                                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => updateQuantity(item.menuItemId, -1)} style={{ padding: '0.25rem' }}><Minus size={14} /></button>
                                        <span style={{ fontWeight: 600, minWidth: '1.5rem', textAlign: 'center' }}>{item.quantity}</span>
                                        <button className="btn btn-ghost btn-sm" onClick={() => updateQuantity(item.menuItemId, 1)} style={{ padding: '0.25rem' }}><Plus size={14} /></button>
                                        <span style={{ color: 'var(--color-success)', fontWeight: 600, marginLeft: 'var(--spacing-sm)', minWidth: '3rem', textAlign: 'right' }}>₹{item.price * item.quantity}</span>
                                    </div>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--spacing-md)', marginTop: 'var(--spacing-sm)', fontWeight: 700, fontSize: '1.1rem' }}>
                                <span>Total</span>
                                <span style={{ color: 'var(--color-success)' }}>₹{cartTotal}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Cart Summary Bar */}
                {!showReview && cart.length > 0 && (
                    <div style={{ padding: 'var(--spacing-sm) var(--spacing-lg)', background: 'var(--color-bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border-light)' }}>
                        <span style={{ fontWeight: 600 }}>{cartItemCount} items — ₹{cartTotal}</span>
                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                            {cart.slice(0, 3).map((item) => (
                                <span key={item.menuItemId} style={{ fontSize: '0.7rem', background: 'var(--color-bg-hover)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    {item.quantity}x {item.name.length > 12 ? item.name.slice(0, 12) + '…' : item.name}
                                </span>
                            ))}
                            {cart.length > 3 && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>+{cart.length - 3} more</span>}
                        </div>
                    </div>
                )}

                <div className="modal-footer">
                    {showReview ? (
                        <>
                            <button className="btn btn-ghost" onClick={() => setShowReview(false)}>Back</button>
                            <div style={{ flex: 1 }} />
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !selectedTable || cart.length === 0}>
                                {loading ? (existingOrder ? 'Adding...' : 'Creating...') : `${existingOrder ? 'Add Items' : 'Place Order'} — ₹${cartTotal}`}
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-ghost" onClick={handleClose}>Cancel</button>
                            <div style={{ flex: 1 }} />
                            <button className="btn btn-primary" onClick={() => setShowReview(true)}
                                disabled={!selectedTable || cart.length === 0}>
                                Review Order ({cartItemCount})
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════
//  ITEM PROGRESS BAR — mini inline bar for order rows
// ═══════════════════════════════════════════════════════
const ItemProgressBar = ({ items }) => {
    const active = (items || []).filter(i => i.itemStatus !== 'cancelled');
    const total = active.length;
    if (total === 0) return null;
    const servedCount = active.filter(i => i.itemStatus === 'served').length;
    const pct = (servedCount / total) * 100;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 60, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: '#C8975A',
                        borderRadius: 3,
                        transition: 'width 0.3s ease',
                    }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {servedCount}/{total} served
                </span>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════
//  EXPANDABLE ORDER ROW
// ═══════════════════════════════════════════════════════
const OrderRow = ({ order, role, onAction, onCancel, actionLoading, onItemServe, servingItemId, onQuickAdd, onTransfer, onTrack }) => {
    const [expanded, setExpanded] = useState(false);
    const flow = STATUS_FLOW[order.status] || {};
    const canAct = flow.next && flow.roles.includes(role);
    const canCancel = CANCELLABLE.includes(order.status) && ['admin', 'waiter'].includes(role);

    const isCancelled = order.status === 'cancelled';

    // Item-level progress
    const activeItems = (order.items || []).filter(i => i.itemStatus !== 'cancelled');
    const hasItemProgress = activeItems.length > 0 && !['pending', 'confirmed', 'cancelled'].includes(order.status);

    return (
        <>
            <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
                <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {order.orderNumber}
                    </div>
                </td>
                <td>Table {order.tableNumber}</td>
                <td>{order.items?.length || 0}</td>
                <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span className={`badge status-${order.status}`}>{statusLabel(order.status)}</span>
                        {/* Mini progress bar for active orders */}
                        {hasItemProgress && <ItemProgressBar items={order.items} />}
                    </div>
                </td>
                <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>₹{(order.totalAmount || 0).toFixed(0)}</td>
                <td style={{ color: 'var(--color-text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={14} /> {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                        {order.waiter?.name && (
                            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{order.waiter.name}</span>
                        )}
                    </div>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                        {canAct && (
                            <button
                                className={`btn btn-${flow.color} btn-sm`}
                                onClick={() => onAction(order._id, flow.next)}
                                disabled={actionLoading === order._id}
                            >
                                {actionLoading === order._id ? '...' : flow.label}
                            </button>
                        )}
                        {canCancel && (
                            <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--color-error)' }}
                                onClick={() => onCancel(order)}
                                disabled={actionLoading === order._id}
                            >
                                <Ban size={14} />
                            </button>
                        )}
                        {!canAct && !canCancel && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                {flow.label || '—'}
                            </span>
                        )}
                    </div>
                </td>
            </tr>
            {/* Expanded detail row with item-level details */}
            {expanded && (
                <tr>
                    <td colSpan={7} style={{ padding: 0 }}>
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden', background: 'var(--color-bg-tertiary)', padding: 'var(--spacing-md) var(--spacing-lg)' }}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
                                {/* Items list with item-level status and serve buttons */}
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Items</div>
                                    {(order.items || []).map((item, idx) => {
                                        const isReady = item.itemStatus === 'ready';
                                        const isServed = item.itemStatus === 'served';
                                        const canServe = isReady && ['admin', 'waiter', 'runner'].includes(role);
                                        const isServingThis = servingItemId === item._id;

                                        return (
                                            <div key={item._id || idx} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '0.35rem 0', fontSize: '0.85rem',
                                                borderBottom: idx < order.items.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span>{item.quantity}x {item.name}</span>
                                                    <span style={{
                                                        fontSize: '0.65rem', padding: '0.1rem 0.4rem',
                                                        borderRadius: 'var(--radius-full)',
                                                        background: item.itemStatus === 'served' ? 'rgba(90,158,90,0.12)' :
                                                                    item.itemStatus === 'ready' ? 'rgba(90,158,90,0.15)' :
                                                                    item.itemStatus === 'preparing' ? 'rgba(200,151,90,0.12)' : 'rgba(107,100,96,0.1)',
                                                        color: item.itemStatus === 'served' ? '#5a9e5a' :
                                                               item.itemStatus === 'ready' ? '#5a9e5a' :
                                                               item.itemStatus === 'preparing' ? '#C8975A' : '#6B6460',
                                                        fontWeight: 600, textTransform: 'capitalize',
                                                    }}>
                                                        {item.itemStatus}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ color: 'var(--color-text-muted)' }}>₹{((item.price || 0) * (item.quantity || 1)).toFixed(0)}</span>
                                                    {canServe && (
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                                            onClick={() => onItemServe?.(order._id, item._id)}
                                                            disabled={isServingThis}
                                                        >
                                                            {isServingThis ? (
                                                                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                                            ) : (
                                                                <><CheckCircle size={12} /> Serve</>
                                                            )}
                                                        </button>
                                                    )}
                                                    {isServed && (
                                                        <CheckCircle size={14} style={{ color: '#5a9e5a' }} />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {['pending', 'confirmed', 'preparing'].includes(order.status) && ['admin', 'waiter'].includes(role) && (
                                        <button 
                                            onClick={() => onQuickAdd(order)}
                                            className="btn btn-ghost btn-sm" 
                                            style={{ marginTop: 'var(--spacing-sm)', width: '100%', border: '1px dashed var(--color-primary)', color: 'var(--color-primary)' }}
                                        >
                                            <Plus size={14} /> Quick Add Items
                                        </button>
                                    )}
                                </div>
                                {/* Order info */}
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Details</div>
                                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <div>Subtotal: ₹{(order.subtotal || 0).toFixed(0)}</div>
                                        <div>Tax ({order.taxRate || 18}%): ₹{(order.taxAmount || 0).toFixed(0)}</div>
                                        <div style={{ fontWeight: 700 }}>Total: ₹{(order.totalAmount || 0).toFixed(0)}</div>
                                        {order.paymentStatus && order.paymentStatus !== 'pending' && (
                                            <div style={{ marginTop: '0.25rem' }}>
                                                Payment: <span className={`badge status-${order.paymentStatus}`}>{order.paymentStatus}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Status flow visual */}
                            <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                {['pending', 'confirmed', 'preparing', 'ready', 'partially_served', 'served', 'completed'].map((s, i, arr) => {
                                    const isCurrent = order.status === s;
                                    const isPast = arr.indexOf(order.status) > i;
                                    return (
                                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <div style={{
                                                padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)',
                                                fontSize: '0.65rem', fontWeight: 600, textTransform: 'capitalize',
                                                background: isCurrent ? (s === 'partially_served' ? '#1a2a2e' : 'var(--color-primary)') : isPast ? 'var(--color-success)' : 'var(--color-bg-hover)',
                                                color: isCurrent ? (s === 'partially_served' ? '#5a9eae' : '#fff') : isPast ? '#fff' : 'var(--color-text-muted)',
                                            }}>
                                                {s.replace(/_/g, ' ')}
                                            </div>
                                            {i < arr.length - 1 && <span style={{ color: 'var(--color-border)', fontSize: '0.7rem' }}>→</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Extra Action Buttons */}
                            <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => onTrack(order)}>
                                    <Clock size={14} /> Track Journey
                                </button>
                                {!['completed', 'cancelled'].includes(order.status) && ['admin', 'waiter'].includes(role) && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => onTransfer(order)}>
                                        <ArrowRight size={14} /> Transfer Table
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </td>
                </tr>
            )}
        </>
    );
};

// ═══════════════════════════════════════════════════════
//  ORDERS PAGE
// ═══════════════════════════════════════════════════════
const Orders = () => {
    const { orders, loading, error, createOrder, updateStatus, refetch } = useOrders({ type: 'all' });
    const { user, hasRole } = useAuth();
    const { socket } = useSocket();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filter, setFilter] = useState('active');
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [cancelConfirm, setCancelConfirm] = useState({ open: false, order: null });
    const [servingItemId, setServingItemId] = useState(null);
    const [quickAddOrder, setQuickAddOrder] = useState(null);
    const [transferOrder, setTransferOrder] = useState(null);
    const [trackOrder, setTrackOrder] = useState(null);

    const role = user?.role || 'waiter';

    useEffect(() => { if (error) toast.error(error); }, [error]);

    // Auto-open create modal when navigated with ?new=true
    useEffect(() => {
        if (searchParams.get('new') === 'true') {
            setShowCreateModal(true);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        if (!socket?.on) return;
        const handleRefresh = () => refetch();
        socket.on('order:new', handleRefresh);
        socket.on('order:updated', handleRefresh);
        socket.on('order:item:updated', handleRefresh);
        return () => {
            socket.off('order:new', handleRefresh);
            socket.off('order:updated', handleRefresh);
            socket.off('order:item:updated', handleRefresh);
        };
    }, [socket, refetch]);

    const handleAction = async (orderId, newStatus) => {
        setActionLoading(orderId);
        try {
            await updateStatus(orderId, newStatus);
        } catch {
            // handled by hook
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancel = async () => {
        const order = cancelConfirm.order;
        if (!order) return;
        setActionLoading(order._id);
        try {
            await updateStatus(order._id, 'cancelled');
            setCancelConfirm({ open: false, order: null });
        } catch {
            // handled by hook
        } finally {
            setActionLoading(null);
        }
    };

    const handleItemServe = async (orderId, itemId) => {
        setServingItemId(itemId);
        try {
            await orderAPI.updateItemStatus(orderId, itemId, 'served');
            refetch();
            toast.success('Item marked as served');
        } catch {
            toast.error('Failed to serve item');
        } finally {
            setServingItemId(null);
        }
    };

    const filteredOrders = orders.filter((order) => {
        if (filter === 'active' && ['completed', 'cancelled'].includes(order.status)) return false;
        if (filter === 'completed' && order.status !== 'completed') return false;
        if (filter === 'cancelled' && order.status !== 'cancelled') return false;

        if (search) {
            const q = search.toLowerCase();
            const matchOrder = order.orderNumber?.toLowerCase().includes(q);
            const matchTable = `table ${order.tableNumber}`.toLowerCase().includes(q);
            const matchItems = order.items?.some((item) => item.name?.toLowerCase().includes(q));
            if (!matchOrder && !matchTable && !matchItems) return false;
        }
        return true;
    });

    const activeCount = orders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length;
    const completedCount = orders.filter((o) => o.status === 'completed').length;

    return (
        <Layout title="Orders">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                        {[
                            { key: 'active', label: `Active (${activeCount})` },
                            { key: 'completed', label: `Done (${completedCount})` },
                            { key: 'all', label: 'All' },
                        ].map((f) => (
                            <button key={f.key} className={`btn ${filter === f.key ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setFilter(f.key)}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '220px' }}>
                        <Search size={14} color="#6B6460" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input className="top-right-search" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    {hasRole(['admin', 'waiter']) && (
                        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                            <Plus size={18} /> New Order
                        </button>
                    )}
                </div>
            </div>

            {/* Orders Table */}
            {loading ? (
                <PageLoader text="Loading orders..." />
            ) : filteredOrders.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
                    <UtensilsCrossed size={64} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
                    <h3 style={{ marginTop: 'var(--spacing-md)' }}>
                        {search ? 'No matching orders' : 'No Orders Yet'}
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--spacing-sm)' }}>
                        {search ? 'Try a different search term' : 'Create your first order to get started'}
                    </p>
                </motion.div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Table</th>
                                <th>Items</th>
                                <th>Status</th>
                                <th>Total</th>
                                <th>Time</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((order) => (
                                <OrderRow
                                    key={order._id}
                                    order={order}
                                    role={role}
                                    onAction={handleAction}
                                    onCancel={(o) => setCancelConfirm({ open: true, order: o })}
                                    actionLoading={actionLoading}
                                    onItemServe={handleItemServe}
                                    servingItemId={servingItemId}
                                    onQuickAdd={setQuickAddOrder}
                                    onTransfer={setTransferOrder}
                                    onTrack={setTrackOrder}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <CreateOrderModal
                isOpen={showCreateModal || !!quickAddOrder}
                onClose={() => { setShowCreateModal(false); setQuickAddOrder(null); }}
                existingOrder={quickAddOrder}
                onSubmit={async (data, existingId) => {
                    if (existingId) {
                        await orderAPI.addItems(existingId, data.items);
                        toast.success('Items added to order!');
                        refetch();
                    } else {
                        await createOrder(data);
                    }
                }}
            />

            <TransferTableModal 
                isOpen={!!transferOrder} 
                onClose={() => setTransferOrder(null)} 
                order={transferOrder} 
                onSubmit={async (orderId, tableId) => {
                    try {
                        await orderAPI.transferTable(orderId, tableId);
                        toast.success('Table transferred successfully!');
                        refetch();
                    } catch {
                        toast.error('Failed to transfer table');
                    }
                }}
            />

            <OrderJourneyModal
                isOpen={!!trackOrder}
                onClose={() => setTrackOrder(null)}
                order={trackOrder}
            />

            <ConfirmModal
                isOpen={cancelConfirm.open}
                onClose={() => setCancelConfirm({ open: false, order: null })}
                onConfirm={handleCancel}
                title="Cancel Order?"
                message={`This will cancel order ${cancelConfirm.order?.orderNumber || ''}. The kitchen will be notified.`}
                confirmText="Cancel Order"
                variant="danger"
                loading={!!actionLoading}
            />
        </Layout>
    );
};

export default Orders;
