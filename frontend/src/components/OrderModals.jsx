import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, CheckCircle, Clock, ChefHat, Play, CheckSquare } from 'lucide-react';
import { useTables } from '../hooks/useTables';
import { InlineLoader } from './Loader';

// ── One-Tap Table Transfer Modal ─────────────────────────
export const TransferTableModal = ({ isOpen, onClose, order, onSubmit }) => {
    const { tables, loading } = useTables({ autoFetch: true });
    const [selectedId, setSelectedId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !order) return null;

    const availableTables = tables.filter(t => t.status === 'available');

    const handleSubmit = async () => {
        if (!selectedId) return;
        setSubmitting(true);
        await onSubmit(order._id, selectedId);
        setSubmitting(false);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <motion.div className="modal" onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="modal-header">
                    <h3 className="modal-title">Transfer Order #{order.orderNumber}</h3>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="modal-body" style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                    <div style={{ marginBottom: 'var(--spacing-md)', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        Currently at <strong style={{ color: 'var(--color-text)' }}>Table {order.tableNumber}</strong>. Select a new table:
                    </div>
                    {loading ? (
                        <InlineLoader />
                    ) : availableTables.length === 0 ? (
                        <p style={{ color: 'var(--color-error)' }}>No tables available.</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                            {availableTables.map(t => (
                                <button
                                    key={t._id}
                                    onClick={() => setSelectedId(t._id)}
                                    className={`btn ${selectedId === t._id ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                    style={{ padding: '12px 0' }}
                                >
                                    T{t.tableNumber}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={!selectedId || submitting}>
                        {submitting ? 'Transferring...' : 'Transfer'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ── Animated Order Journey Modal ─────────────────────────
const STAGES = [
    { key: 'pending', label: 'Placed', icon: Clock },
    { key: 'confirmed', label: 'Confirmed', icon: CheckSquare },
    { key: 'preparing', label: 'Cooking', icon: ChefHat },
    { key: 'ready', label: 'Ready', icon: Play },
    { key: 'served', label: 'Served', icon: CheckCircle },
    { key: 'completed', label: 'Done', icon: CheckCircle },
];

export const OrderJourneyModal = ({ isOpen, onClose, order }) => {
    if (!isOpen || !order) return null;

    const currentIdx = STAGES.findIndex(s => {
        if (s.key === 'served' && order.status === 'partially_served') return true;
        return s.key === order.status;
    });

    const isCancelled = order.status === 'cancelled';

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <motion.div className="modal" onClick={e => e.stopPropagation()} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">Order Journey: #{order.orderNumber}</h3>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="modal-body" style={{ padding: 'var(--spacing-xl)', position: 'relative' }}>
                    {isCancelled ? (
                        <div style={{ textAlign: 'center', color: 'var(--color-error)', padding: '2rem' }}>
                            <h2>Order Cancelled</h2>
                            <p>This order was cancelled.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                            {/* Background Line */}
                            <div style={{ position: 'absolute', top: '24px', left: '10%', right: '10%', height: '4px', background: 'var(--color-border-light)', zIndex: 0, borderRadius: '2px' }} />
                            
                            {/* Animated Progress Line */}
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(Math.max(0, currentIdx) / (STAGES.length - 1)) * 80 + 10}%` }}
                                transition={{ duration: 1, ease: "easeInOut" }}
                                style={{ position: 'absolute', top: '24px', left: '10%', height: '4px', background: 'var(--color-primary)', zIndex: 0, borderRadius: '2px' }} 
                            />

                            {STAGES.map((stage, idx) => {
                                const isPast = currentIdx >= idx;
                                const isCurrent = currentIdx === idx;
                                const Icon = stage.icon;

                                return (
                                    <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, gap: '8px' }}>
                                        <motion.div 
                                            initial={{ scale: 0.8, backgroundColor: '#fff' }}
                                            animate={{ 
                                                scale: isCurrent ? 1.2 : 1, 
                                                backgroundColor: isPast ? 'var(--color-primary)' : 'var(--color-bg-card)',
                                                color: isPast ? '#fff' : 'var(--color-text-muted)'
                                            }}
                                            transition={{ delay: idx * 0.15 }}
                                            style={{ 
                                                width: '48px', height: '48px', borderRadius: '50%', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: `2px solid ${isPast ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                boxShadow: isCurrent ? '0 0 15px rgba(200, 151, 90, 0.4)' : 'none'
                                            }}
                                        >
                                            <Icon size={20} />
                                        </motion.div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--color-text)' : 'var(--color-text-muted)', marginTop: '4px' }}>
                                            {stage.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
