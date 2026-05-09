import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { orderAPI, tableAPI } from '../services/api';
import { PageLoader } from '../components/Loader';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp,
    Users,
    UtensilsCrossed,
    DollarSign,
    Clock,
    CheckCircle,
    ChefHat,
    Wifi,
    CreditCard,
    ArrowRight,
    TableIcon,
    Flame,
    Timer,
    Package,
    ClipboardList,
    Zap,
    Eye,
    Receipt,
} from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Animation variants ──────────────────────────────────
const cell = (delay = 0) => ({
    initial: { opacity: 0, y: 16, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
});

// ─── Bento Cell wrapper ──────────────────────────────────
const BentoCell = ({ children, area, style = {}, className = '', delay = 0, onClick }) => (
    <motion.div
        {...cell(delay)}
        onClick={onClick}
        className={`bento-cell ${className}`}
        style={{ gridArea: area, ...style }}
    >
        {children}
    </motion.div>
);

// ─── Mini stat (used inside bento cells) ─────────────────
const MiniStat = ({ icon: MiniIcon, label, value, color = 'var(--color-primary)' }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-md)',
            background: `color-mix(in srgb, ${color} 10%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color, flexShrink: 0,
        }}>
            <MiniIcon size={20} />
        </div>
        <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{label}</div>
        </div>
    </div>
);

const OrderRow = ({ order }) => {
    const getBadgeStyle = (status) => {
        const base = {
            fontFamily: 'var(--font-primary)',
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            borderRadius: '3px',
            padding: '3px 8px',
            fontWeight: 600,
        };
        switch (status) {
            case 'served': return { ...base, background: 'rgba(90,158,90,0.12)', color: '#3d8a3d' };
            case 'partially_served': return { ...base, background: 'rgba(90,158,174,0.12)', color: '#3d7a8a' };
            case 'ready': return { ...base, background: 'rgba(90,158,90,0.15)', color: '#3d8a3d' };
            case 'preparing': return { ...base, background: 'rgba(200,151,90,0.12)', color: '#a06a20' };
            default: return { ...base, background: 'rgba(107,100,96,0.1)', color: '#6B6460' };
        }
    };

    return (
        <div style={{
            padding: '1rem', borderBottom: '0.5px solid var(--color-border)',
            transition: 'background 0.2s', margin: '0 -0.5rem',
            background: 'transparent', cursor: 'pointer'
        }} className="order-row-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: 0 }}>
                <div style={{
                    width: 42, height: 42, borderRadius: '4px',
                    background: 'var(--color-bg-hover)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: '11px', flexShrink: 0,
                    color: 'var(--color-text-muted)', fontFamily: 'var(--font-primary)'
                }}>
                    T{order.tableNumber}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text)', fontFamily: 'var(--font-primary)' }}>
                        {order.orderNumber}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B6460', marginTop: '0.2rem', fontFamily: 'var(--font-primary)' }}>
                        {order.items?.length || 0} ITEMS
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
                <span style={{ fontWeight: 500, fontSize: '14px', color: 'var(--color-text)', fontFamily: 'var(--font-secondary)' }}>₹{order.totalAmount?.toFixed(0)}</span>
                <span style={getBadgeStyle(order.status)}>
                    {order.status}
                </span>
            </div>
        </div>
    );
};

// ─── Table donut visual ──────────────────────────────────
const TableDonut = ({ summary }) => {
    if (!summary) return <div className="loader" style={{ margin: '2rem auto' }} />;
    const total = (summary.available || 0) + (summary.occupied || 0) + (summary.reserved || 0) + (summary.cleaning || 0);
    const segments = [
        { label: 'Available', value: summary.available || 0, color: '#C8975A' },
        { label: 'Occupied', value: summary.occupied || 0, color: '#6B6460' },
        { label: 'Reserved', value: summary.reserved || 0, color: '#5a7ac8' },
        { label: 'Cleaning', value: summary.cleaning || 0, color: 'var(--color-text-muted)' },
    ];
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Ring */}
            <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: 80, height: 80, transform: 'rotate(-90deg)' }}>
                    {(() => {
                        let offset = 0;
                        return segments.map((seg, i) => {
                            const pct = total > 0 ? (seg.value / total) * 100 : 0;
                            const el = (
                                <circle key={i} cx="18" cy="18" r="15.9"
                                    fill="none" stroke={seg.color} strokeWidth="3.5"
                                    strokeDasharray={`${pct} ${100 - pct}`}
                                    strokeDashoffset={-offset}
                                    strokeLinecap="round"
                                />
                            );
                            offset += pct;
                            return el;
                        });
                    })()}
                </svg>
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ fontWeight: 700, fontSize: '22px', fontFamily: 'var(--font-secondary)', color: 'var(--color-text)', lineHeight: 1 }}>{total}</span>
                </div>
            </div>
            {/* Legend */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '0.75rem 0.25rem', flex: 1 }}>
                {segments.map(seg => (
                    <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '3px', background: seg.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', color: '#6B6460', fontFamily: 'var(--font-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{seg.label}</span>
                        <span style={{ fontWeight: 600, fontSize: '14px', fontFamily: 'var(--font-secondary)', marginLeft: 'auto', paddingRight: '0.5rem', color: '#F5EFE6' }}>{seg.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Role config ─────────────────────────────────────────
const roleConfig = {
    admin: { emoji: '', subtitle: "Full overview of your cafe operations.", title: 'Admin Dashboard' },
    waiter: { emoji: '', subtitle: "Your active tables and orders.", title: 'Waiter Dashboard' },
    chef: { emoji: '', subtitle: "What's cooking — orders waiting for you.", title: 'Kitchen Dashboard' },
    cashier: { emoji: '', subtitle: "Today's billing summary.", title: 'Billing Dashboard' },
    runner: { emoji: '', subtitle: "Orders ready for delivery.", title: 'Runner Dashboard' },
};

// ═══════════════════════════════════════════════════════════
//  ADMIN BENTO
// ═══════════════════════════════════════════════════════════
const FullTicketRow = ({ order }) => {
    const bgColors = { pending: 'rgba(107,100,96,0.1)', preparing: 'rgba(90,122,200,0.12)', ready: 'rgba(200,151,90,0.15)', partially_served: 'rgba(90,158,174,0.1)', served: 'rgba(107,100,96,0.1)', completed: 'rgba(90,158,90,0.1)', cancelled: 'rgba(107,100,96,0.08)' };
    const textColors = { pending: 'var(--color-text-muted)', preparing: '#3d5aa0', ready: '#a06a20', partially_served: '#3d7a8a', served: 'var(--color-text-muted)', completed: '#3d8a3d', cancelled: 'var(--color-text-muted)' };

    return (
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 0', borderBottom: '0.5px solid var(--color-border)' }}>
            <div style={{ width: '80px', fontFamily: 'var(--font-secondary)', fontSize: '28px', color: 'var(--color-text)', flexShrink: 0 }}>
                {order.tableNumber}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-primary)', fontSize: '11px', color: '#6B6460', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.orderNumber}</div>
                <div style={{ fontFamily: 'var(--font-primary)', fontSize: '13px', color: '#E8E0D8' }}>
                    {order.items?.length || 0} ITEMS
                </div>
            </div>
            <div style={{ width: '80px', textAlign: 'right', fontFamily: 'var(--font-primary)', fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', flexShrink: 0, letterSpacing: '0.02em' }}>
                ₹{order.totalAmount?.toFixed(0)}
            </div>
            <div style={{ width: '90px', textAlign: 'center', flexShrink: 0, paddingLeft: '16px' }}>
                <span style={{
                    padding: '3px 8px',
                    fontSize: '9px',
                    fontFamily: 'var(--font-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: textColors[order.status] || '#E8E0D8',
                    background: bgColors[order.status] || '#2E2B28',
                    borderRadius: '2px'
                }}>{order.status}</span>
            </div>
        </div>
    );
}

const AdminDashboard = ({ recentOrders, tableSummary, stats, onlineUsers, loading, navigate }) => {
    const tableKeys = ['occupied', 'reserved', 'cleaning', 'available'];
    const tablesList = [];
    let tableIndex = 1;
    tableKeys.forEach(key => {
        const count = tableSummary?.[key] || 0;
        for (let i=0; i<count; i++) {
            tablesList.push({ number: tableIndex++, status: key });
        }
    });

    // Pad empty tables up to some visual amount if none fetched yet
    while (tablesList.length < 15) {
        tablesList.push({ number: tableIndex++, status: 'available' });
    }

    const getTableBorder = (status) => {
        switch (status) {
            case 'occupied': return '#C8975A';
            case 'reserved': return '#5a7ac8';
            case 'cleaning': return '#6B6460';
            default: return 'var(--color-border)';
        }
    };

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            {/* Left Panel - Live Tickets */}
            <div style={{ flex: '0 0 55%', borderRight: '0.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '0 0 16px 0', fontFamily: 'var(--font-primary)', fontSize: '9px', textTransform: 'uppercase', color: '#6B6460', letterSpacing: '0.08em' }}>
                    TICKETS
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {recentOrders.map((order, i) => <FullTicketRow key={order._id} order={order} isActive={i===0} />)}
                </div>
            </div>

            {/* Right Panel */}
            <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Top Half */}
                <div style={{ flex: 1, borderBottom: '0.5px solid var(--color-border)', paddingLeft: '24px', display: 'flex', flexDirection: 'column', paddingBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '12px', fontFamily: 'var(--font-primary)', fontSize: '9px', textTransform: 'uppercase', color: '#6B6460', marginBottom: '16px' }}>
                        <span><span style={{color: '#C8975A'}}>●</span> OCCUPIED</span>
                        <span><span style={{color: '#5a7ac8'}}>●</span> RESERVED</span>
                        <span><span style={{color: '#6B6460'}}>●</span> CLEANING</span>
                        <span><span style={{color: '#DDD0C0'}}>●</span> AVAILABLE</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 64px)', gap: '12px', overflowY: 'auto', alignContent: 'start' }}>
                        {tablesList.map(t => (
                            <div key={t.number} style={{ width: 64, height: 64, background: '#fff', border: `1px solid ${getTableBorder(t.status)}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-secondary)', fontSize: '20px', color: 'var(--color-text)' }}>
                                {t.number}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Half */}
                <div style={{ height: '160px', paddingLeft: '24px', display: 'flex' }}>
                    <div style={{ flex: 1, borderRight: '0.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-secondary)', fontSize: '52px', color: 'var(--color-text)', lineHeight: 1 }}>
                            {recentOrders.filter(o => o.status === 'preparing').length}
                        </div>
                        <div style={{ fontFamily: 'var(--font-primary)', fontSize: '9px', color: '#6B6460', letterSpacing: '0.08em', marginTop: '8px' }}>
                            PREPARING
                        </div>
                    </div>
                    
                    <div style={{ flex: 1, borderRight: '0.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '24px' }}>
                        <div style={{ fontFamily: 'var(--font-secondary)', fontSize: '52px', color: 'var(--color-text)', lineHeight: 1 }}>
                            {tableSummary?.occupied || 0}
                        </div>
                        <div style={{ fontFamily: 'var(--font-primary)', fontSize: '9px', color: '#6B6460', letterSpacing: '0.08em', marginTop: '8px' }}>
                            OCCUPIED
                        </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '24px', gap: '16px' }}>
                        <div onClick={() => navigate('/orders')} style={{ cursor: 'pointer', fontFamily: 'var(--font-primary)', fontSize: '12px', color: '#C8975A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>NEW ORDER</div>
                        <div onClick={() => navigate('/kitchen')} style={{ cursor: 'pointer', fontFamily: 'var(--font-primary)', fontSize: '12px', color: '#6B6460', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#C8975A'} onMouseOut={e => e.target.style.color = '#6B6460'}>KITCHEN VIEW</div>
                        <div onClick={() => navigate('/billing')} style={{ cursor: 'pointer', fontFamily: 'var(--font-primary)', fontSize: '12px', color: '#6B6460', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#C8975A'} onMouseOut={e => e.target.style.color = '#6B6460'}>BILLING</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
//  WAITER BENTO
// ═══════════════════════════════════════════════════════════
const WaiterDashboard = ({ recentOrders, tableSummary, loading, navigate }) => {
    const activeOrders = recentOrders.filter(o => !['completed', 'cancelled'].includes(o.status));
    const readyOrders = recentOrders.filter(o => ['ready', 'partially_served'].includes(o.status));
    const pendingOrders = recentOrders.filter(o => ['pending', 'confirmed'].includes(o.status));

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'auto',
            gridTemplateAreas: `
                "active   ready    avail    pending"
                "serve    serve    tables   tables"
                "serve    serve    actions  actions"
            `,
            gap: 'var(--spacing-md)',
        }}>
            <BentoCell area="active" delay={0.05} className="bento-stat bento-accent-primary">
                <div className="stat-header"><ClipboardList size={24} strokeWidth={1.5} /></div>
                {activeOrders.length}
                Active Orders
            </BentoCell>
            <BentoCell area="ready" delay={0.1} className="bento-stat bento-accent-success">
                <div className="stat-header"><CheckCircle size={24} strokeWidth={1.5} /></div>
                {readyOrders.length}
                Ready to Serve
            </BentoCell>
            <BentoCell area="avail" delay={0.15} className="bento-stat bento-accent-warning">
                <div className="stat-header"><TableIcon size={24} strokeWidth={1.5} /></div>
                {tableSummary?.available || 0}
                Tables Free
            </BentoCell>
            <BentoCell area="pending" delay={0.2} className="bento-stat bento-accent-error">
                <div className="stat-header"><Clock size={24} strokeWidth={1.5} /></div>
                {pendingOrders.length}
                Pending
            </BentoCell>

            {/* Ready to serve list */}
            <BentoCell area="serve" delay={0.25}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Ready to Serve</h3>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/ready-orders')} style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
                        View All <ArrowRight size={12} />
                    </button>
                </div>
                {loading ? <PageLoader text="Loading..." /> : readyOrders.length > 0 ? (
                    readyOrders.slice(0, 5).map(order => <OrderRow key={order._id} order={order} />)
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
                        <CheckCircle size={40} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '0.9rem' }}>No orders ready right now</p>
                    </div>
                )}
            </BentoCell>

            {/* Tables */}
            <BentoCell area="tables" delay={0.3}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>My Tables</h3>
                <TableDonut summary={tableSummary} />
            </BentoCell>

            {/* Quick Actions */}
            <BentoCell area="actions" delay={0.35}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => navigate('/orders?new=true')}>
                        <ClipboardList size={15} /> New Order
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => navigate('/ready-orders')}>
                        <Package size={15} /> Ready Orders
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => navigate('/tables')}>
                        <TableIcon size={15} /> Tables
                    </button>
                </div>
            </BentoCell>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
//  CHEF BENTO
// ═══════════════════════════════════════════════════════════
const ChefDashboard = ({ recentOrders, loading, navigate }) => {
    const kitchenOrders = recentOrders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status));
    const pendingOrders = recentOrders.filter(o => ['pending', 'confirmed'].includes(o.status));
    const preparingOrders = recentOrders.filter(o => o.status === 'preparing');
    const readyOrders = recentOrders.filter(o => o.status === 'ready');

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'auto',
            gridTemplateAreas: `
                "fire     cooking  done     queue"
                "kitchen  kitchen  kitchen  kitchen"
            `,
            gap: 'var(--spacing-md)',
        }}>
            <BentoCell area="fire" delay={0.05} className="bento-stat bento-accent-error">
                <div className="stat-header"><Flame size={24} strokeWidth={1.5} /></div>
                {pendingOrders.length}
                Pending
            </BentoCell>
            <BentoCell area="cooking" delay={0.1} className="bento-stat bento-accent-warning">
                <div className="stat-header"><ChefHat size={24} strokeWidth={1.5} /></div>
                {preparingOrders.length}
                Preparing
            </BentoCell>
            <BentoCell area="done" delay={0.15} className="bento-stat bento-accent-success">
                <div className="stat-header"><CheckCircle size={24} strokeWidth={1.5} /></div>
                {readyOrders.length}
                Ready
            </BentoCell>
            <BentoCell area="queue" delay={0.2} className="bento-stat bento-accent-primary">
                <div className="stat-header"><Timer size={24} strokeWidth={1.5} /></div>
                {kitchenOrders.length}
                In Queue
            </BentoCell>

            {/* Kitchen queue */}
            <BentoCell area="kitchen" delay={0.25}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Kitchen Queue</h3>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/kitchen')} style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
                        Open Display <ArrowRight size={12} />
                    </button>
                </div>
                {loading ? <PageLoader text="Loading..." /> : kitchenOrders.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                        {kitchenOrders.slice(0, 6).map(order => (
                            <div key={order._id} style={{
                                padding: '0.85rem', borderRadius: 'var(--radius-md)',
                                background: order.status === 'preparing' ? 'rgba(184, 134, 46, 0.06)' : 'rgba(160, 64, 64, 0.04)',
                                border: `1px solid ${order.status === 'preparing' ? 'rgba(184, 134, 46, 0.15)' : 'rgba(160, 64, 64, 0.1)'}`,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 700 }}>Table {order.tableNumber}</span>
                                    <span className={`badge status-${order.status}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>{order.status}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    {order.items?.length || 0} items · {order.orderNumber}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--color-text-muted)' }}>
                        <ChefHat size={48} style={{ opacity: 0.15, marginBottom: '0.5rem' }} />
                        <p>Kitchen is clear!</p>
                    </div>
                )}
            </BentoCell>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
//  CASHIER BENTO
// ═══════════════════════════════════════════════════════════
const CashierDashboard = ({ recentOrders, loading, navigate }) => {
    const completedOrders = recentOrders.filter(o => ['completed', 'served'].includes(o.status));
    const readyToBill = recentOrders.filter(o => o.status === 'served');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'auto',
            gridTemplateAreas: `
                "tobill   revenue  done     total"
                "bills    bills    bills    bills"
            `,
            gap: 'var(--spacing-md)',
        }}>
            <BentoCell area="tobill" delay={0.05} className="bento-stat bento-accent-warning">
                <div className="stat-header"><CreditCard size={24} strokeWidth={1.5} /></div>
                {readyToBill.length}
                Ready to Bill
            </BentoCell>
            <BentoCell area="revenue" delay={0.1} className="bento-stat bento-accent-success">
                <div className="stat-header"><DollarSign size={24} strokeWidth={1.5} /></div>
                ₹{totalRevenue.toFixed(0)}
                Collected
            </BentoCell>
            <BentoCell area="done" delay={0.15} className="bento-stat bento-accent-primary">
                <div className="stat-header"><CheckCircle size={24} strokeWidth={1.5} /></div>
                {completedOrders.length}
                Completed
            </BentoCell>
            <BentoCell area="total" delay={0.2} className="bento-stat bento-accent-primary">
                <div className="stat-header"><Package size={24} strokeWidth={1.5} /></div>
                {recentOrders.length}
                Total Orders
            </BentoCell>

            <BentoCell area="bills" delay={0.25}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Pending Bills</h3>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/billing')} style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
                        Open Billing <ArrowRight size={12} />
                    </button>
                </div>
                {loading ? <PageLoader text="Loading..." /> : readyToBill.length > 0 ? (
                    readyToBill.map(order => <OrderRow key={order._id} order={order} />)
                ) : (
                    <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--color-text-muted)' }}>
                        <CreditCard size={48} style={{ opacity: 0.15, marginBottom: '0.5rem' }} />
                        <p>No pending bills right now.</p>
                    </div>
                )}
            </BentoCell>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
//  RUNNER BENTO
// ═══════════════════════════════════════════════════════════
const RunnerDashboard = ({ recentOrders, loading, navigate }) => {
    const readyOrders = recentOrders.filter(o => ['ready', 'partially_served'].includes(o.status));
    const preparingOrders = recentOrders.filter(o => o.status === 'preparing');

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'auto',
            gridTemplateAreas: `
                "deliver  deliver  waiting  waiting"
                "list     list     list     list"
            `,
            gap: 'var(--spacing-md)',
        }}>
            <BentoCell area="deliver" delay={0.05} className="bento-stat bento-accent-success" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
                <Package size={28} />
                <div>
                    <div className="bento-stat-value">{readyOrders.length}</div>
                    <div className="bento-stat-label">Ready to Deliver</div>
                </div>
            </BentoCell>
            <BentoCell area="waiting" delay={0.1} className="bento-stat bento-accent-warning" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
                <Clock size={28} />
                <div>
                    <div className="bento-stat-value">{preparingOrders.length}</div>
                    <div className="bento-stat-label">Being Prepared</div>
                </div>
            </BentoCell>

            <BentoCell area="list" delay={0.2}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Ready for Delivery</h3>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/ready-orders')} style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
                        View All <ArrowRight size={12} />
                    </button>
                </div>
                {loading ? <PageLoader text="Loading..." /> : readyOrders.length > 0 ? (
                    readyOrders.map(order => (
                        <div key={order._id} style={{
                            padding: '0.85rem', borderRadius: 'var(--radius-md)',
                            background: 'rgba(61, 107, 53, 0.05)',
                            border: '1px solid rgba(61, 107, 53, 0.12)',
                            marginBottom: '0.5rem',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Table {order.tableNumber}</span>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                    {order.items?.length || 0} items · {order.orderNumber}
                                </div>
                            </div>
                            <span className="badge status-ready">READY</span>
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--color-text-muted)' }}>
                        <CheckCircle size={48} style={{ opacity: 0.15, marginBottom: '0.5rem' }} />
                        <p>No orders ready for delivery.</p>
                    </div>
                )}
            </BentoCell>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════
const Dashboard = () => {
    const { user, hasRole } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);
    const [tableSummary, setTableSummary] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState({ total: 1 });
    const [loading, setLoading] = useState(true);

    const role = user?.role || 'waiter';
    const config = roleConfig[role] || roleConfig.waiter;

    const fetchData = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const promises = [orderAPI.getAll({ limit: 10 })];
            if (hasRole('admin')) promises.push(orderAPI.getStats('today'));
            if (hasRole(['admin', 'waiter'])) promises.push(tableAPI.getSummary());

            const results = await Promise.all(promises);
            setRecentOrders(results[0]?.data?.data || []);

            let idx = 1;
            if (hasRole('admin')) { setStats(results[idx]?.data?.data || null); idx++; }
            if (hasRole(['admin', 'waiter'])) setTableSummary(results[idx]?.data?.data || null);
        } catch (error) {
            console.error('Dashboard error:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [hasRole]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!socket?.on) return;
        const handleRefresh = () => fetchData(false);
        const events = ['order:new', 'order:updated', 'table:updated', 'payment:completed'];
        events.forEach(e => socket.on(e, handleRefresh));
        return () => events.forEach(e => socket.off(e, handleRefresh));
    }, [socket, fetchData]);

    useEffect(() => {
        if (!socket || !hasRole('admin')) return;
        const handleUserCount = (counts) => {
            const total = (counts.admin || 0) + (counts.waiter || 0) + (counts.chef || 0) + (counts.runner || 0) + (counts.cashier || 0);
            setOnlineUsers({ ...counts, total });
        };
        socket.emit('users:count');
        const interval = setInterval(() => socket.emit('users:count'), 30000);
        socket.on('users:count:response', handleUserCount);
        return () => { clearInterval(interval); socket.off('users:count:response', handleUserCount); };
    }, [socket, hasRole]);

    const renderDashboard = () => {
        switch (role) {
            case 'admin': return <AdminDashboard recentOrders={recentOrders} tableSummary={tableSummary} stats={stats} onlineUsers={onlineUsers} loading={loading} navigate={navigate} />;
            case 'waiter': return <WaiterDashboard recentOrders={recentOrders} tableSummary={tableSummary} loading={loading} navigate={navigate} />;
            case 'chef': return <ChefDashboard recentOrders={recentOrders} loading={loading} navigate={navigate} />;
            case 'cashier': return <CashierDashboard recentOrders={recentOrders} loading={loading} navigate={navigate} />;
            case 'runner': return <RunnerDashboard recentOrders={recentOrders} loading={loading} navigate={navigate} />;
            default: return <WaiterDashboard recentOrders={recentOrders} tableSummary={tableSummary} loading={loading} navigate={navigate} />;
        }
    };

    return (
        <Layout>
            {/* Split Panel */}
            {renderDashboard()}

            {/* Scoped styles */}
            <style>{`

                .bento-cell {
                    background: #fff;
                    border-radius: 6px;
                    border: 0.5px solid var(--color-border);
                    padding: 1.75rem;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
                }
                .bento-cell:hover {
                    border-color: var(--color-primary);
                    box-shadow: 0 4px 12px rgba(200,151,90,0.08);
                }
                .bento-hoverable:hover {
                    border-color: var(--accent);
                    transform: translateY(-2px);
                }

                /* Stat cells */
                .bento-stat {
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                
                .primary-card {
                    border-top: 2px solid #C8975A;
                }

                .bento-stat-value {
                    font-size: 28px;
                    font-family: var(--font-secondary);
                    color: var(--color-text);
                    font-weight: 400;
                    line-height: 1;
                    margin-top: auto;
                    padding-top: 1.5rem;
                }
                
                .bento-stat-label {
                    font-family: var(--font-primary);
                    font-size: 11px;
                    color: #6B6460;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }
                
                .stat-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .stat-header svg {
                    color: #6B6460;
                    width: 16px;
                    height: 16px;
                }
                
                .order-row-hover:hover {
                    background: var(--color-bg-hover) !important;
                }
                
                .dashboard-link {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    color: var(--color-text-muted) !important;
                }
                .dashboard-link:hover {
                    background: transparent !important;
                    border: none !important;
                    color: var(--color-text) !important;
                }

                @media (max-width: 900px) {
                    .dashboard-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
                    .dashboard-title { font-size: 2rem; }
                    .bento-cell { padding: 1.25rem; }
                    .bento-stat-value { font-size: 2.5rem; }
                    div[style*="gridTemplateAreas"] {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        grid-template-areas: none !important;
                        grid-template-rows: auto !important;
                    }
                    .bento-cell {
                        grid-area: auto !important;
                    }
                }
                @media (max-width: 480px) {
                    .bento-cell { padding: 1rem; }
                    .bento-stat-value { font-size: 2rem; }
                    div[style*="gridTemplateAreas"] {
                        grid-template-columns: 1fr !important;
                        grid-template-areas: none !important;
                        grid-template-rows: auto !important;
                    }
                }
            `}</style>
        </Layout>
    );
};

export default Dashboard;
