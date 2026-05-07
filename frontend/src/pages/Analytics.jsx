import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { orderAPI, menuAPI } from '../services/api';
import { PageLoader } from '../components/Loader';
import { motion } from 'framer-motion';
import {
    DollarSign,
    ShoppingCart,
    TrendingUp,
    Clock,
    BarChart3,
    Star,
    PieChart,
    Activity,
    AlertTriangle,
    Download,
} from 'lucide-react';

// ─── Animation helpers ────────────────────────────────────
const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
});

// ─── Helpers ──────────────────────────────────────────────
const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

// ─── CSV Export helper ───────────────────────────────────
const downloadCSV = (filename, headers, rows) => {
    const escape = (v) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded`);
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS = {
    pending: { bg: 'var(--color-warning)', label: 'Pending' },
    confirmed: { bg: 'var(--color-info)', label: 'Confirmed' },
    preparing: { bg: 'var(--color-primary)', label: 'Preparing' },
    ready: { bg: 'var(--color-success)', label: 'Ready' },
    served: { bg: 'var(--color-gold)', label: 'Served' },
    completed: { bg: 'var(--color-text-muted)', label: 'Completed' },
    cancelled: { bg: 'var(--color-error)', label: 'Cancelled' },
};

const HOUR_LABELS = [];
for (let h = 8; h <= 23; h++) {
    const suffix = h >= 12 ? 'pm' : 'am';
    const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
    HOUR_LABELS.push({ hour: h, label: `${display}${suffix}` });
}

// ─── Stat Card ────────────────────────────────────────────
const StatCard = ({ icon: StatIcon, label, value, accent = 'primary', delay = 0 }) => (
    <motion.div {...fadeUp(delay)} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `var(--gradient-${accent})`,
            }}
        />
        <div className="stat-icon" style={{ background: `color-mix(in srgb, var(--color-${accent === 'primary' ? 'primary' : accent}) 10%, transparent)`, color: `var(--color-${accent === 'primary' ? 'primary' : accent})` }}>
            <StatIcon size={22} />
        </div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
    </motion.div>
);

// ═══════════════════════════════════════════════════════════
//  ANALYTICS PAGE
// ═══════════════════════════════════════════════════════════
const Analytics = () => {
    useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [todayStats, setTodayStats] = useState(null);
    const [, setWeeklyStats] = useState(null);
    const [orders, setOrders] = useState([]);
    const [popularItems, setPopularItems] = useState([]);

    // ── Fetch data ────────────────────────────────────────
    const fetchAnalytics = async () => {
        setError(false);
        setLoading(true);
        try {
            const [todayRes, weekRes, ordersRes, popularRes] = await Promise.all([
                orderAPI.getStats('today'),
                orderAPI.getStats('week'),
                orderAPI.getAll({ limit: 50 }),
                menuAPI.getPopular(10),
            ]);

            setTodayStats(todayRes?.data?.data || null);
            setWeeklyStats(weekRes?.data?.data || null);
            setOrders(ordersRes?.data?.data || []);
            setPopularItems(popularRes?.data?.data || []);
        } catch (err) {
            console.error('Analytics fetch error:', err);
            setError(true);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    // ── CSV Export functions ───────────────────────────────
    const exportOrders = () => {
        if (!orders.length) { toast.error('No order data to export'); return; }
        const headers = ['Order #', 'Table', 'Status', 'Payment', 'Items', 'Subtotal', 'Tax', 'Total', 'Date'];
        const rows = orders.map((o) => [
            o.orderNumber || '', o.tableNumber || '', o.status || '', o.paymentStatus || '',
            (o.items || []).map((i) => `${i.quantity}x ${i.name}`).join('; '),
            o.subtotal || 0, o.taxAmount || 0, o.totalAmount || 0,
            o.createdAt ? new Date(o.createdAt).toLocaleString() : '',
        ]);
        downloadCSV(`orders-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    const exportRevenue = () => {
        if (!dailyRevenue.length) { toast.error('No revenue data to export'); return; }
        const headers = ['Date', 'Day', 'Revenue', 'Orders'];
        const rows = dailyRevenue.map((d) => [d.date, d.day, d.total, d.count || 0]);
        downloadCSV(`revenue-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    const exportPopularItems = () => {
        if (!popularItems.length) { toast.error('No popular items data'); return; }
        const headers = ['Item', 'Category', 'Price', 'Orders'];
        const rows = popularItems.map((item) => [
            item.name || '', item.category || '', item.price || 0,
            item.orderCount || item.totalOrdered || 0,
        ]);
        downloadCSV(`popular-items-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    // ── Computed analytics ────────────────────────────────
    const { dailyRevenue, maxDailyRevenue } = useMemo(() => {
        const map = {};
        const today = new Date();

        // Initialise last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            map[key] = { date: key, dayName: DAY_NAMES[d.getDay()], total: 0 };
        }

        // Accumulate from orders
        orders.forEach((order) => {
            if (!order.createdAt) return;
            const key = new Date(order.createdAt).toISOString().split('T')[0];
            if (map[key]) {
                map[key].total += order.totalAmount || 0;
            }
        });

        const arr = Object.values(map);
        const maxVal = Math.max(...arr.map((d) => d.total), 1);
        return { dailyRevenue: arr, maxDailyRevenue: maxVal };
    }, [orders]);

    const statusBreakdown = useMemo(() => {
        const counts = {};
        orders.forEach((o) => {
            counts[o.status] = (counts[o.status] || 0) + 1;
        });
        const total = orders.length || 1;
        return Object.entries(counts).map(([status, count]) => ({
            status,
            count,
            pct: ((count / total) * 100).toFixed(1),
            ...(STATUS_COLORS[status] || { bg: 'var(--color-text-muted)', label: status }),
        }));
    }, [orders]);

    const peakHoursData = useMemo(() => {
        const hourCounts = {};
        HOUR_LABELS.forEach(({ hour }) => {
            hourCounts[hour] = 0;
        });
        orders.forEach((order) => {
            if (!order.createdAt) return;
            const h = new Date(order.createdAt).getHours();
            if (hourCounts[h] !== undefined) hourCounts[h]++;
        });
        const maxCount = Math.max(...Object.values(hourCounts), 1);
        return HOUR_LABELS.map(({ hour, label }) => ({
            hour,
            label,
            count: hourCounts[hour],
            intensity: hourCounts[hour] / maxCount,
        }));
    }, [orders]);

    const peakHour = useMemo(() => {
        const best = peakHoursData.reduce((a, b) => (b.count > a.count ? b : a), peakHoursData[0] || { label: '-', count: 0 });
        return best?.label || '-';
    }, [peakHoursData]);

    const totalRevenue = todayStats?.summary?.totalRevenue || 0;
    const totalOrders = todayStats?.summary?.totalOrders || orders.length || 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // ── Render ────────────────────────────────────────────
    if (loading) {
        return (
            <Layout title="Analytics">
                <PageLoader text="Loading analytics..." />
            </Layout>
        );
    }

    return (
        <Layout title="Analytics">
            {error ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        textAlign: 'center',
                        padding: 'var(--spacing-2xl)',
                        background: 'var(--color-bg-card)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    <AlertTriangle size={48} style={{ color: 'var(--color-warning)', marginBottom: 'var(--spacing-md)' }} />
                    <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Failed to load analytics</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--spacing-lg)' }}>
                        Please check your connection and try again.
                    </p>
                    <button className="btn btn-primary btn-sm" onClick={fetchAnalytics}>
                        Retry
                    </button>
                </motion.div>
            ) : (
                <>
                    {/* ── Export Buttons ─────────────────────────── */}
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={exportOrders}><Download size={15} /> Export Orders</button>
                        <button className="btn btn-ghost btn-sm" onClick={exportRevenue}><Download size={15} /> Export Revenue</button>
                        <button className="btn btn-ghost btn-sm" onClick={exportPopularItems}><Download size={15} /> Export Popular Items</button>
                    </div>

                    {/* ── Summary Cards ──────────────────────────── */}
                    <div className="stats-grid" style={{ marginBottom: 'var(--spacing-xl)' }}>
                        <StatCard icon={DollarSign} label="Total Revenue" value={formatCurrency(totalRevenue)} accent="success" delay={0.05} />
                        <StatCard icon={ShoppingCart} label="Total Orders" value={totalOrders} accent="primary" delay={0.1} />
                        <StatCard icon={TrendingUp} label="Avg Order Value" value={formatCurrency(avgOrderValue.toFixed(0))} accent="warning" delay={0.15} />
                        <StatCard icon={Clock} label="Peak Hour" value={peakHour} accent="primary" delay={0.2} />
                    </div>

                    {/* ── Revenue Chart (CSS bar chart) ──────────── */}
                    <motion.div
                        {...fadeUp(0.25)}
                        style={{
                            background: 'var(--color-bg-card)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-border)',
                            padding: 'var(--spacing-lg)',
                            marginBottom: 'var(--spacing-xl)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--spacing-lg)' }}>
                            <BarChart3 size={20} style={{ color: 'var(--color-primary)' }} />
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Revenue — Last 7 Days</h3>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                                height: 220,
                                padding: '0 0.5rem',
                                position: 'relative',
                            }}
                        >
                            {(!dailyRevenue.length || dailyRevenue.every((d) => !d.total)) ? (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--color-text-muted)',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    No revenue data
                                </div>
                            ) : null}
                            {dailyRevenue.map((day, i) => {
                                const heightPct = (day.total / maxDailyRevenue) * 100;
                                return (
                                    <div
                                        key={day.date}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            height: '100%',
                                            justifyContent: 'flex-end',
                                        }}
                                    >
                                        {/* Value label */}
                                        <span
                                            style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                color: 'var(--color-text-muted)',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {day.total > 0 ? formatCurrency(day.total.toFixed(0)) : ''}
                                        </span>

                                        {/* Bar */}
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.max(heightPct, 2)}%` }}
                                            transition={{ delay: 0.3 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                                            style={{
                                                width: '100%',
                                                maxWidth: 56,
                                                borderRadius: '8px 8px 4px 4px',
                                                background: day.total > 0
                                                    ? '#1F1F1F'
                                                    : 'var(--color-bg-secondary)',
                                                minHeight: 4,
                                                position: 'relative',
                                                cursor: 'pointer',
                                                transition: 'box-shadow 0.2s ease',
                                            }}
                                            whileHover={{
                                                boxShadow: '0 4px 16px rgba(29, 45, 68,0.25)',
                                                scale: 1.04,
                                            }}
                                        />

                                        {/* Day label */}
                                        <span
                                            style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                color: 'var(--color-text-muted)',
                                            }}
                                        >
                                            {day.dayName}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* ── Two-column: Popular Items + Status Breakdown ── */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1.2fr 0.8fr',
                            gap: 'var(--spacing-xl)',
                            marginBottom: 'var(--spacing-xl)',
                        }}
                    >
                        {/* Popular Items */}
                        <motion.div
                            {...fadeUp(0.35)}
                            style={{
                                background: 'var(--color-bg-card)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--color-border)',
                                padding: 'var(--spacing-lg)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--spacing-lg)' }}>
                                <Star size={20} style={{ color: 'var(--color-gold)' }} />
                                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Popular Items</h3>
                            </div>

                            {popularItems.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>No data yet</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {(() => {
                                        const maxOrders = Math.max(...popularItems.map((item) => item.orderCount || item.totalOrdered || 1), 1);
                                        return popularItems.slice(0, 10).map((item, idx) => {
                                            const count = item.orderCount || item.totalOrdered || 0;
                                            const widthPct = (count / maxOrders) * 100;
                                            return (
                                                <motion.div
                                                    key={item._id || idx}
                                                    initial={{ opacity: 0, x: -12 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.4 + idx * 0.04, duration: 0.35 }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                                            <span style={{ color: 'var(--color-text-muted)', marginRight: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                                                #{idx + 1}
                                                            </span>
                                                            {item.name}
                                                        </span>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                                            {count} orders
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{
                                                            width: '100%',
                                                            height: 8,
                                                            background: 'var(--color-bg-tertiary)',
                                                            borderRadius: 'var(--radius-full)',
                                                            overflow: 'hidden',
                                                        }}
                                                    >
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${widthPct}%` }}
                                                            transition={{ delay: 0.45 + idx * 0.04, duration: 0.5, ease: 'easeOut' }}
                                                            style={{
                                                                height: '100%',
                                                                borderRadius: 'var(--radius-full)',
                                                                background: idx === 0
                                                                    ? 'var(--gradient-gold)'
                                                                    : idx < 3
                                                                        ? 'var(--gradient-primary)'
                                                                        : 'var(--gradient-secondary)',
                                                            }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                        </motion.div>

                        {/* Order Status Breakdown */}
                        <motion.div
                            {...fadeUp(0.4)}
                            style={{
                                background: 'var(--color-bg-card)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--color-border)',
                                padding: 'var(--spacing-lg)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--spacing-lg)' }}>
                                <PieChart size={20} style={{ color: 'var(--color-primary)' }} />
                                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Order Status</h3>
                            </div>

                            {statusBreakdown.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>No data yet</p>
                            ) : (
                                <>
                                    {/* Stacked horizontal bar */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            width: '100%',
                                            height: 32,
                                            borderRadius: 'var(--radius-full)',
                                            overflow: 'hidden',
                                            marginBottom: 'var(--spacing-lg)',
                                        }}
                                    >
                                        {statusBreakdown.map((seg) => (
                                            <motion.div
                                                key={seg.status}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${seg.pct}%` }}
                                                transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
                                                title={`${seg.label}: ${seg.count} (${seg.pct}%)`}
                                                style={{
                                                    background: seg.bg,
                                                    height: '100%',
                                                    minWidth: seg.pct > 0 ? 4 : 0,
                                                    cursor: 'pointer',
                                                    transition: 'opacity 0.2s',
                                                }}
                                                whileHover={{ opacity: 0.8 }}
                                            />
                                        ))}
                                    </div>

                                    {/* Legend */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {statusBreakdown.map((seg) => (
                                            <div key={seg.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div
                                                        style={{
                                                            width: 12,
                                                            height: 12,
                                                            borderRadius: 4,
                                                            background: seg.bg,
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                                                        {seg.label}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{seg.count}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: 40, textAlign: 'right' }}>
                                                        {seg.pct}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>

                    {/* ── Peak Hours Heatmap ─────────────────────── */}
                    <motion.div
                        {...fadeUp(0.45)}
                        style={{
                            background: 'var(--color-bg-card)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-border)',
                            padding: 'var(--spacing-lg)',
                            marginBottom: 'var(--spacing-xl)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--spacing-lg)' }}>
                            <Activity size={20} style={{ color: 'var(--color-primary)' }} />
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Peak Hours</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                                Orders by hour of day
                            </span>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                                gap: '0.5rem',
                            }}
                        >
                            {peakHoursData.map((slot, i) => (
                                <motion.div
                                    key={slot.hour}
                                    initial={{ opacity: 0, scale: 0.85 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 + i * 0.025, duration: 0.3 }}
                                    title={`${slot.label}: ${slot.count} orders`}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0.75rem 0.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        background: slot.intensity > 0
                                            ? `rgba(29, 45, 68, ${0.04 + slot.intensity * 0.55})`
                                            : 'var(--color-bg-tertiary)',
                                        color: slot.intensity > 0.5 ? '#FFFFFF' : 'var(--color-text-primary)',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        border: '1px solid transparent',
                                    }}
                                    whileHover={{
                                        scale: 1.08,
                                        boxShadow: '0 4px 12px rgba(29, 45, 68,0.12)',
                                    }}
                                >
                                    <span style={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.8 }}>
                                        {slot.label}
                                    </span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.2, marginTop: '0.15rem' }}>
                                        {slot.count}
                                    </span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Intensity legend */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '0.5rem',
                                marginTop: 'var(--spacing-md)',
                            }}
                        >
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Less</span>
                            {[0, 0.15, 0.35, 0.55, 0.75].map((intensity, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: 4,
                                        background: `rgba(29, 45, 68, ${0.04 + intensity * 0.55})`,
                                        border: '1px solid rgba(29, 45, 68,0.04)',
                                    }}
                                />
                            ))}
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>More</span>
                        </div>
                    </motion.div>

                    {/* Responsive helper styles */}
                    <style>{`
                @media (max-width: 768px) {
                    div[style*="gridTemplateColumns: '1.2fr 0.8fr'"],
                    div[style*="grid-template-columns"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
                </>
            )}
        </Layout>
    );
};

export default Analytics;
