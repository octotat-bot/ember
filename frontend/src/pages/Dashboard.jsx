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

// ─── Helper: elapsed time ────────────────────────────
const useElapsed = (createdAt) => {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(t);
    }, []);
    return createdAt ? Math.floor((now - new Date(createdAt)) / 60000) : 0;
};

const WaitChip = ({ minutes }) => {
    const col = minutes > 20 ? '#dc2626' : minutes > 12 ? '#d97706' : minutes > 6 ? '#C8975A' : '#5a9e5a';
    const label = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
    return (
        <span style={{ fontSize: '10px', fontWeight: 700, color: col, background: `${col}18`, borderRadius: '3px', padding: '2px 6px', fontFamily: 'var(--font-primary)', whiteSpace: 'nowrap' }}>
            {label}
        </span>
    );
};

const priorityBorder = (order) => {
    if (order.priority === 'urgent') return '#dc2626';
    if (order.priority === 'high') return '#d97706';
    return 'transparent';
};

const itemsPreview = (items = []) => {
    const active = items.filter(i => i.itemStatus !== 'cancelled');
    if (!active.length) return 'No items';
    const names = active.slice(0, 2).map(i => `${i.quantity > 1 ? i.quantity + 'x ' : ''}${i.name}`);
    const extra = active.length - 2;
    return names.join(', ') + (extra > 0 ? ` +${extra}` : '');
};

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

    const elapsed = useElapsed(order.createdAt);
    return (
        <div style={{
            padding: '0.85rem 0.75rem',
            borderBottom: '0.5px solid var(--color-border)',
            borderLeft: `3px solid ${priorityBorder(order)}`,
            transition: 'background 0.2s',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }} className="order-row-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: '4px',
                    background: 'var(--color-bg-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '13px', flexShrink: 0,
                    color: 'var(--color-text)', fontFamily: 'var(--font-secondary)'
                }}>
                    {order.tableNumber}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text)', fontFamily: 'var(--font-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {itemsPreview(order.items)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-primary)' }}>{order.orderNumber}</span>
                        {order.waiter?.name && <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>· {order.waiter.name}</span>}
                        {order.specialRequests && <span title={order.specialRequests} style={{ fontSize: '11px' }}>🔥</span>}
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                <WaitChip minutes={elapsed} />
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)', fontFamily: 'var(--font-secondary)' }}>₹{order.totalAmount?.toFixed(0)}</span>
                <span style={getBadgeStyle(order.status)}>{order.status}</span>
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
    const elapsed = useElapsed(order.createdAt);
    const bgColors = { pending: 'rgba(107,100,96,0.1)', preparing: 'rgba(90,122,200,0.12)', ready: 'rgba(200,151,90,0.15)', partially_served: 'rgba(90,158,174,0.1)', served: 'rgba(107,100,96,0.1)', completed: 'rgba(90,158,90,0.1)', cancelled: 'rgba(107,100,96,0.08)' };
    const textColors = { pending: 'var(--color-text-muted)', preparing: '#3d5aa0', ready: '#a06a20', partially_served: '#3d7a8a', served: 'var(--color-text-muted)', completed: '#3d8a3d', cancelled: 'var(--color-text-muted)' };

    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', padding: '14px 0',
            borderBottom: '0.5px solid var(--color-border)',
            borderLeft: `3px solid ${priorityBorder(order)}`,
            paddingLeft: order.priority && order.priority !== 'normal' ? '10px' : '0',
            transition: 'background 0.18s',
        }} className="order-row-hover">
            {/* Table number */}
            <div style={{ width: '52px', fontFamily: 'var(--font-secondary)', fontSize: '26px', color: 'var(--color-text)', flexShrink: 0, lineHeight: 1 }}>
                {order.tableNumber}
            </div>
            {/* Details */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontFamily: 'var(--font-primary)', fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {itemsPreview(order.items)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'var(--font-primary)', fontSize: '10px', color: '#6B6460' }}>{order.orderNumber}</span>
                    {order.waiter?.name && <span style={{ fontSize: '10px', color: '#9C8B7A' }}>· {order.waiter.name}</span>}
                    {order.specialRequests && <span title={order.specialRequests} style={{ fontSize: '11px' }}>🔥</span>}
                </div>
            </div>
            {/* Right side */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0, paddingLeft: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <WaitChip minutes={elapsed} />
                    <span style={{ fontFamily: 'var(--font-primary)', fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>₹{order.totalAmount?.toFixed(0)}</span>
                </div>
                <span style={{
                    padding: '2px 7px', fontSize: '9px', fontFamily: 'var(--font-primary)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    color: textColors[order.status] || 'var(--color-text-muted)',
                    background: bgColors[order.status] || 'rgba(107,100,96,0.1)',
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

    // Stats derived from orders
    const todayRevenue = recentOrders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.totalAmount || 0), 0);
    const preparingCount = recentOrders.filter(o => o.status === 'preparing').length;
    const completedCount = recentOrders.filter(o => o.status === 'completed').length;

    // Activity feed: sort all orders by updatedAt desc
    const activityFeed = [...recentOrders]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5);

    const activityLabel = (o) => {
        if (o.status === 'completed') return `Table ${o.tableNumber} · Payment received · ₹${o.totalAmount?.toFixed(0)}`;
        if (o.status === 'ready') return `Table ${o.tableNumber} · Order ready to serve`;
        if (o.status === 'preparing') return `Table ${o.tableNumber} · Now preparing`;
        if (o.status === 'pending') return `Table ${o.tableNumber} · New order placed`;
        return `Table ${o.tableNumber} · ${o.status}`;
    };

    const activityColor = (o) => {
        if (o.status === 'completed') return '#5a9e5a';
        if (o.status === 'ready') return '#5a9e5a';
        if (o.status === 'preparing') return '#C8975A';
        if (o.status === 'pending') return '#dc2626';
        return 'var(--color-text-muted)';
    };

    const minutesAgo = (ts) => {
        const m = Math.floor((Date.now() - new Date(ts)) / 60000);
        return m < 1 ? 'just now' : `${m}m ago`;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: 0 }}>
            {/* Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                    { label: 'REVENUE TODAY', value: `₹${todayRevenue.toFixed(0)}`, color: '#5a9e5a' },
                    { label: 'TOTAL ORDERS', value: recentOrders.length, color: 'var(--color-text)' },
                    { label: 'PREPARING', value: preparingCount, color: '#C8975A' },
                    { label: 'COMPLETED', value: completedCount, color: '#5a9e5a' },
                ].map(s => (
                    <div key={s.label} style={{ background: '#fff', border: '0.5px solid var(--color-border)', borderRadius: '6px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontFamily: 'var(--font-primary)', fontSize: '9px', color: '#9C8B7A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
                        <div style={{ fontFamily: 'var(--font-secondary)', fontSize: '22px', color: s.color, lineHeight: 1, fontWeight: 400 }}>{s.value}</div>
                    </div>
                ))}
            </div>
            {/* Main Panel */}
        <div style={{ display: 'flex', width: '100%', flex: 1 }}>
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

                {/* Bottom Half — Activity Feed */}
                <div style={{ paddingLeft: '24px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                    <div style={{ fontFamily: 'var(--font-primary)', fontSize: '9px', textTransform: 'uppercase', color: '#9C8B7A', letterSpacing: '0.08em', marginBottom: '4px' }}>LIVE ACTIVITY</div>
                    {activityFeed.map(o => (
                        <div key={o._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: activityColor(o), flexShrink: 0 }} />
                                <span style={{ fontFamily: 'var(--font-primary)', fontSize: '11px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activityLabel(o)}</span>
                            </div>
                            <span style={{ fontFamily: 'var(--font-primary)', fontSize: '10px', color: '#9C8B7A', flexShrink: 0 }}>{minutesAgo(o.updatedAt)}</span>
                        </div>
                    ))}
                    <div style={{ borderTop: '0.5px solid var(--color-border)', marginTop: '8px', paddingTop: '12px', display: 'flex', gap: '16px' }}>
                        <div onClick={() => navigate('/orders')} style={{ cursor: 'pointer', fontFamily: 'var(--font-primary)', fontSize: '11px', color: '#C8975A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>NEW ORDER</div>
                        <div onClick={() => navigate('/kitchen')} style={{ cursor: 'pointer', fontFamily: 'var(--font-primary)', fontSize: '11px', color: '#9C8B7A', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#C8975A'} onMouseOut={e => e.target.style.color = '#9C8B7A'}>KITCHEN</div>
                        <div onClick={() => navigate('/billing')} style={{ cursor: 'pointer', fontFamily: 'var(--font-primary)', fontSize: '11px', color: '#9C8B7A', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#C8975A'} onMouseOut={e => e.target.style.color = '#9C8B7A'}>BILLING</div>
                    </div>
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

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <Layout>
            {/* Greeting Header */}
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontFamily: 'var(--font-primary)', fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>{greeting}, <strong style={{ color: 'var(--color-text)' }}>{user?.name?.split(' ')[0] || user?.username || 'there'}</strong> 👋</div>
                    <div style={{ fontFamily: 'var(--font-primary)', fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{config.subtitle}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#5a9e5a', animation: 'pulse-badge 2s infinite' }} />
                    <span style={{ fontFamily: 'var(--font-primary)', fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live</span>
                </div>
            </div>
            {/* Dashboard */}
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
