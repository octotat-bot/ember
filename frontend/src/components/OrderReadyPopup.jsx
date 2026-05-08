import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChefHat, MapPin, X, ArrowRight, UtensilsCrossed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OrderReadyPopup = ({ alerts, onDismiss }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 'var(--spacing-lg)',
            right: 'var(--spacing-lg)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
            maxWidth: '420px',
            width: '100%',
            pointerEvents: 'none',
        }}>
            <AnimatePresence>
                {alerts.map((alert) =>
                    alert.type === 'item_ready'
                        ? <ItemReadyCard key={alert.id} alert={alert} onDismiss={onDismiss} />
                        : <OrderReadyCard key={alert.id} alert={alert} onDismiss={onDismiss} />
                )}
            </AnimatePresence>
        </div>
    );
};

const OrderReadyCard = ({ alert, onDismiss }) => {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(100);

    // Auto-dismiss after 15 seconds
    useEffect(() => {
        const duration = 15000;
        const interval = 50;
        const step = (interval / duration) * 100;

        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    onDismiss(alert.id);
                    return 0;
                }
                return prev - step;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [alert.id, onDismiss]);

    const handleGoServe = () => {
        onDismiss(alert.id);
        navigate('/orders');
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 400, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 400, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ pointerEvents: 'auto' }}
        >
            <div style={{
                background: 'white',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 20px 60px rgba(29, 45, 68, 0.25), 0 0 0 1px rgba(29, 45, 68, 0.08)',
                overflow: 'hidden',
                position: 'relative',
            }}>
                {/* Amber accent top bar */}
                <div style={{
                    height: '4px',
                    background: '#FFFFFF',
                    backgroundSize: '200% 100%',
                    animation: 'shimmerGold 2s infinite linear',
                }} />

                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    background: '#141414',
                    color: 'white',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <motion.div
                            animate={{ rotate: [0, -15, 15, -15, 15, 0] }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        >
                            <Bell size={20} fill="currentColor" />
                        </motion.div>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.5px' }}>
                            ORDER READY
                        </span>
                    </div>
                    <button
                        onClick={() => onDismiss(alert.id)}
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            color: 'white',
                            borderRadius: 'var(--radius-full)',
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: 'var(--spacing-lg)' }}>
                    {/* Order info */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 'var(--spacing-md)',
                    }}>
                        <div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 800,
                                color: '#0A0A0A',
                                lineHeight: 1,
                            }}>
                                #{alert.orderNumber}
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                color: '#7A8DA0',
                                fontSize: '0.85rem',
                                marginTop: '0.25rem',
                            }}>
                                <MapPin size={13} />
                                Table {alert.tableNumber}
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            background: 'rgba(200, 150, 62, 0.1)',
                            color: '#C8963E',
                            padding: '0.4rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                        }}>
                            <ChefHat size={14} />
                            {alert.chefName}
                        </div>
                    </div>

                    {/* Items */}
                    {alert.items && alert.items.length > 0 && (
                        <div style={{
                            background: '#FFF9F0',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            marginBottom: 'var(--spacing-md)',
                            border: '1px solid rgba(200, 150, 62, 0.15)',
                        }}>
                            {alert.items.slice(0, 5).map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.3rem 0',
                                    fontSize: '0.85rem',
                                    color: '#0A0A0A',
                                    borderBottom: idx < Math.min(alert.items.length, 5) - 1 ? '1px solid rgba(29, 45, 68, 0.05)' : 'none',
                                }}>
                                    <span>{item.name}</span>
                                    <span style={{
                                        fontWeight: 600,
                                        color: '#7A8DA0',
                                        fontSize: '0.8rem',
                                    }}>
                                        x{item.quantity}
                                    </span>
                                </div>
                            ))}
                            {alert.items.length > 5 && (
                                <div style={{ fontSize: '0.75rem', color: '#7A8DA0', textAlign: 'center', paddingTop: '0.3rem' }}>
                                    +{alert.items.length - 5} more items
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action button */}
                    <button
                        onClick={handleGoServe}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: '#141414',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--spacing-sm)',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(200, 150, 62, 0.3)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(200, 150, 62, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(200, 150, 62, 0.3)';
                        }}
                    >
                        Go Serve <ArrowRight size={16} />
                    </button>
                </div>

                {/* Progress bar (auto-dismiss countdown) */}
                <div style={{
                    height: '3px',
                    background: 'rgba(29, 45, 68, 0.06)',
                }}>
                    <motion.div
                        style={{
                            height: '100%',
                            background: 'var(--gradient-gold)',
                            width: `${progress}%`,
                        }}
                        transition={{ duration: 0.05 }}
                    />
                </div>
            </div>
        </motion.div>
    );
};

// ─── Item Ready Card ──────────────────────────────────
const ItemReadyCard = ({ alert, onDismiss }) => {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const duration = 10000; // 10s for item alerts
        const interval = 50;
        const step = (interval / duration) * 100;
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev <= 0) { clearInterval(timer); onDismiss(alert.id); return 0; }
                return prev - step;
            });
        }, interval);
        return () => clearInterval(timer);
    }, [alert.id, onDismiss]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 400, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 400, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ pointerEvents: 'auto' }}
        >
            <div style={{
                background: 'white',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 20px 60px rgba(200, 150, 62, 0.2), 0 0 0 1px rgba(200, 150, 62, 0.15)',
                overflow: 'hidden',
            }}>
                {/* Amber top bar */}
                <div style={{ height: '4px', background: 'linear-gradient(90deg, #C8963E, #F0B429, #C8963E)', backgroundSize: '200% 100%', animation: 'shimmerGold 2s infinite linear' }} />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-sm) var(--spacing-lg)', background: '#C8963E', color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <motion.div animate={{ rotate: [0, -15, 15, -15, 15, 0] }} transition={{ duration: 0.6, delay: 0.2 }}>
                            <UtensilsCrossed size={18} />
                        </motion.div>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.5px' }}>DISH READY</span>
                    </div>
                    <button onClick={() => onDismiss(alert.id)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 'var(--radius-full)', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={12} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                        <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0A0A0A' }}>
                                {alert.batchItems && alert.batchItems.length > 1
                                    ? `${alert.batchItems.length} Dishes Ready`
                                    : `${alert.quantity && alert.quantity > 1 ? `${alert.quantity}× ` : ''}${alert.itemName || 'Item'}`
                                }
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#7A8DA0', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                <MapPin size={11} /> Table {alert.tableNumber || '?'}
                                <span style={{ marginLeft: '0.5rem', color: '#C8963E', fontWeight: 600 }}>#{alert.orderNumber}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(200, 150, 62, 0.1)', color: '#C8963E', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600 }}>
                            <ChefHat size={13} /> {alert.chefName || 'Kitchen'}
                        </div>
                    </div>

                    {/* Batch item list */}
                    {alert.batchItems && alert.batchItems.length > 1 && (
                        <div style={{ background: '#FFF9F0', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', marginBottom: 'var(--spacing-sm)', border: '1px solid rgba(200, 150, 62, 0.15)' }}>
                            {alert.batchItems.map((it, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#0A0A0A', padding: '0.2rem 0', borderBottom: i < alert.batchItems.length - 1 ? '1px solid rgba(29,45,68,0.05)' : 'none' }}>
                                    <span>{it.name}</span>
                                    <span style={{ color: '#7A8DA0', fontWeight: 600 }}>×{it.quantity}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={() => { onDismiss(alert.id); navigate('/orders'); }}
                        style={{ width: '100%', padding: '0.6rem', background: '#141414', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        Go Serve <ArrowRight size={14} />
                    </button>
                </div>

                {/* Progress bar */}
                <div style={{ height: '3px', background: 'rgba(200, 150, 62, 0.1)' }}>
                    <motion.div style={{ height: '100%', background: '#C8963E', width: `${progress}%` }} transition={{ duration: 0.05 }} />
                </div>
            </div>
        </motion.div>
    );
};


const styleTag = document.createElement('style');
styleTag.textContent = `
@keyframes shimmerGold {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
`;
if (!document.querySelector('[data-order-ready-popup]')) {
    styleTag.setAttribute('data-order-ready-popup', '');
    document.head.appendChild(styleTag);
}

export default OrderReadyPopup;
