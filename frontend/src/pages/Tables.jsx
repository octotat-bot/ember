import { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { useTables } from '../hooks/useTables';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { PageLoader } from '../components/Loader';
import { tableAPI, reservationAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Users, MapPin, Edit, Trash2, X, Check, Search,
    CalendarClock, Clock, Phone, User, XCircle, UserCheck, Ban,
    ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════════════
//  ADD TABLE MODAL
// ═══════════════════════════════════════════════════════
const AddTableModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({ tableNumber: '', capacity: 4, location: 'indoor' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const tableNum = parseInt(formData.tableNumber);
        const cap = parseInt(formData.capacity);
        if (!tableNum || tableNum < 1) { toast.error('Table number must be positive'); return; }
        if (!cap || cap < 1) { toast.error('Capacity must be at least 1'); return; }
        setLoading(true);
        try {
            await onSubmit({ tableNumber: tableNum, capacity: cap, location: formData.location });
            onClose();
            setFormData({ tableNumber: '', capacity: 4, location: 'indoor' });
        } catch (err) {
            toast.error(err.message || 'Failed to create table');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div className="modal" onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="modal-header">
                    <h3 className="modal-title">Add New Table</h3>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <div className="input-group"><label className="input-label">Table Number</label><input type="number" className="input" value={formData.tableNumber} onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })} placeholder="e.g. 1" min="1" required /></div>
                        <div className="input-group"><label className="input-label">Capacity</label><input type="number" className="input" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} min="1" max="20" required /></div>
                        <div className="input-group"><label className="input-label">Location</label><select className="input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}><option value="indoor">Indoor</option><option value="outdoor">Outdoor</option><option value="private">Private</option><option value="bar">Bar</option></select></div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Table'}</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════
//  EDIT TABLE MODAL
// ═══════════════════════════════════════════════════════
const EditTableModal = ({ isOpen, onClose, table, onSubmit }) => {
    const [formData, setFormData] = useState({ tableNumber: '', capacity: 4, location: 'indoor' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (table) setFormData({ tableNumber: table.tableNumber || '', capacity: table.capacity || 4, location: table.location || 'indoor' });
    }, [table]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const tableNum = parseInt(formData.tableNumber);
        const cap = parseInt(formData.capacity);
        if (!tableNum || tableNum < 1) { toast.error('Table number must be positive'); return; }
        if (!cap || cap < 1) { toast.error('Capacity must be at least 1'); return; }
        setLoading(true);
        try { await onSubmit(table._id, { tableNumber: tableNum, capacity: cap, location: formData.location }); onClose(); } catch (err) { toast.error(err.message || 'Failed to update'); } finally { setLoading(false); }
    };

    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div className="modal" onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="modal-header"><h3 className="modal-title">Edit Table</h3><button className="modal-close" onClick={onClose}><X size={20} /></button></div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <div className="input-group"><label className="input-label">Table Number</label><input type="number" className="input" value={formData.tableNumber} onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })} min="1" required /></div>
                        <div className="input-group"><label className="input-label">Capacity</label><input type="number" className="input" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} min="1" max="20" required /></div>
                        <div className="input-group"><label className="input-label">Location</label><select className="input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}><option value="indoor">Indoor</option><option value="outdoor">Outdoor</option><option value="private">Private</option><option value="bar">Bar</option></select></div>
                    </div>
                    <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Updating...' : 'Update'}</button></div>
                </form>
            </motion.div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════
//  RESERVE TABLE MODAL
// ═══════════════════════════════════════════════════════
const ReserveTableModal = ({ isOpen, onClose, table, onSubmit }) => {
    const [form, setForm] = useState({ guestName: '', guestPhone: '', partySize: '', reservationTime: '', notes: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (table) {
            // Default to 1 hour from now, rounded to nearest 15 min
            const now = new Date();
            now.setHours(now.getHours() + 1);
            now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
            const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            setForm({ guestName: '', guestPhone: '', partySize: Math.min(table.capacity, 2), reservationTime: local, notes: '' });
        }
    }, [table]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.guestName.trim()) { toast.error('Guest name is required'); return; }
        if (!form.partySize || parseInt(form.partySize) < 1) { toast.error('Party size must be at least 1'); return; }
        if (!form.reservationTime) { toast.error('Reservation time is required'); return; }

        setLoading(true);
        try {
            await onSubmit({
                tableId: table._id,
                guestName: form.guestName.trim(),
                guestPhone: form.guestPhone.trim(),
                partySize: parseInt(form.partySize),
                reservationTime: new Date(form.reservationTime).toISOString(),
                notes: form.notes.trim(),
            });
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to create reservation');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !table) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div className="modal" onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ maxWidth: '480px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        <CalendarClock size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        Reserve Table {table.tableNumber}
                    </h3>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-sm) var(--spacing-md)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Table {table.tableNumber}</span>
                            <span>{table.capacity} seats · {table.location}</span>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Guest Name *</label>
                            <input className="input" value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} placeholder="e.g. John Smith" required />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Phone Number</label>
                            <input className="input" type="tel" value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} placeholder="e.g. 9876543210" />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label">Party Size *</label>
                                <input className="input" type="number" min="1" max={table.capacity} value={form.partySize} onChange={(e) => setForm({ ...form, partySize: e.target.value })} required />
                            </div>
                            <div className="input-group" style={{ flex: 2 }}>
                                <label className="input-label">Date & Time *</label>
                                <input className="input" type="datetime-local" value={form.reservationTime} onChange={(e) => setForm({ ...form, reservationTime: e.target.value })} required />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Notes</label>
                            <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Birthday, window seat preferred..." />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Reserving...</> : <><CalendarClock size={16} /> Reserve</>}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════
//  TABLE CARD
// ═══════════════════════════════════════════════════════
const TableCard = ({ table, onStatusChange, onEdit, onDelete, onReserve, hasAdminAccess }) => {
    const [showMenu, setShowMenu] = useState(false);
    const cardRef = useRef(null);

    // Close menu on outside click
    useEffect(() => {
        if (!showMenu) return;
        const handleClickOutside = (e) => {
            if (cardRef.current && !cardRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const statusColors = {
        available: { bg: 'rgba(16, 185, 129, 0.1)', border: 'var(--color-success)', text: 'var(--color-success)' },
        occupied: { bg: 'rgba(239, 68, 68, 0.1)', border: 'var(--color-error)', text: 'var(--color-error)' },
        reserved: { bg: 'rgba(245, 158, 11, 0.1)', border: 'var(--color-warning)', text: 'var(--color-warning)' },
        cleaning: { bg: 'rgba(59, 130, 246, 0.1)', border: 'var(--color-info)', text: 'var(--color-info)' },
    };

    const colors = statusColors[table.status] || statusColors.available;

    const statusActions = {
        available: [
            { status: 'occupied', label: 'Mark Occupied', icon: Users },
            { status: '__reserve__', label: 'Reserve', icon: CalendarClock },
        ],
        occupied: [
            { status: 'cleaning', label: 'Mark for Cleaning', icon: Check },
        ],
        reserved: [
            { status: 'occupied', label: 'Seat Guests', icon: UserCheck },
            { status: 'available', label: 'Cancel Reservation', icon: XCircle },
        ],
        cleaning: [
            { status: 'available', label: 'Mark Available', icon: Check },
        ],
    };

    return (
        <div ref={cardRef} style={{ position: 'relative' }}>
            <motion.div
                layout
                className={`table-card ${table.status}`}
                style={{ background: colors.bg, borderColor: colors.border }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setShowMenu(!showMenu)}
            >
                <div className="table-number" style={{ color: colors.text }}>{table.tableNumber}</div>
                <div className="table-capacity"><Users size={14} style={{ marginRight: '0.25rem' }} />{table.capacity} seats</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}><MapPin size={10} style={{ marginRight: '0.25rem' }} />{table.location}</div>
                <span className={`badge status-${table.status}`} style={{ marginTop: 'var(--spacing-sm)', textTransform: 'capitalize' }}>{table.status}</span>
                <div className="table-status-indicator" />

                {table.currentOrder && (
                    <div style={{ position: 'absolute', top: 8, right: 8, width: 12, height: 12, background: 'var(--color-primary)', borderRadius: '50%', animation: 'pulse-badge 2s infinite' }} />
                )}
            </motion.div>

            {/* Context Menu — rendered OUTSIDE the card so overflow:hidden doesn't clip it */}
            <AnimatePresence>
                {showMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        style={{
                            position: 'absolute',
                            ...(typeof window !== 'undefined' && (() => {
                                // Simple heuristic: if the card is in the top third of viewport, show menu below
                                return {};
                            })()),
                            bottom: 'auto', top: '105%', left: '50%', transform: 'translateX(-50%)',
                            background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)', padding: 'var(--spacing-sm)',
                            minWidth: '190px', zIndex: 50, boxShadow: 'var(--shadow-lg)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {statusActions[table.status]?.map((action) => {
                            const Icon = action.icon;
                            return (
                                <button key={action.status} className="btn btn-ghost btn-sm"
                                    style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 'var(--spacing-xs)', gap: '0.5rem' }}
                                    onClick={() => {
                                        if (action.status === '__reserve__') { onReserve(table); }
                                        else { onStatusChange(table._id, action.status); }
                                        setShowMenu(false);
                                    }}>
                                    <Icon size={14} />{action.label}
                                </button>
                            );
                        })}
                        {hasAdminAccess && (
                            <>
                                <div style={{ height: 1, background: 'var(--color-border-light)', margin: 'var(--spacing-sm) 0' }} />
                                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 'var(--spacing-xs)', gap: '0.5rem' }} onClick={() => { onEdit?.(table); setShowMenu(false); }}><Edit size={14} />Edit Table</button>
                                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--color-error)', gap: '0.5rem' }} onClick={() => { onDelete(table._id); setShowMenu(false); }}><Trash2 size={14} />Delete Table</button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ═══════════════════════════════════════════════════════
//  RESERVATION CARD
// ═══════════════════════════════════════════════════════
const ReservationCard = ({ reservation, onSeat, onCancel, onNoShow, loading }) => {
    const resTime = new Date(reservation.reservationTime);
    const now = new Date();
    const diffMin = Math.round((resTime - now) / 60000);
    const isOverdue = diffMin < -15;
    const isSoon = diffMin >= 0 && diffMin <= 30;

    const timeLabel = diffMin > 0
        ? `in ${diffMin < 60 ? `${diffMin}m` : `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`}`
        : diffMin === 0 ? 'now' : `${Math.abs(diffMin)}m ago`;

    return (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            style={{
                background: 'var(--color-bg-card)', border: `1px solid ${isOverdue ? 'var(--color-error)' : isSoon ? 'var(--color-warning)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-md)',
            }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{reservation.guestName}</span>
                    <span style={{ fontSize: '0.7rem', background: 'var(--color-bg-tertiary)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                        Table {reservation.table?.tableNumber}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: '0.75rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Users size={11} />{reservation.partySize} guests</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Clock size={11} />
                        {resTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span style={{ fontWeight: 600, color: isOverdue ? 'var(--color-error)' : isSoon ? 'var(--color-warning)' : 'inherit' }}>
                            ({timeLabel})
                        </span>
                    </span>
                    {reservation.guestPhone && <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Phone size={11} />{reservation.guestPhone}</span>}
                </div>
                {reservation.notes && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>{reservation.notes}</div>}
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexShrink: 0 }}>
                <button className="btn btn-primary btn-sm" onClick={() => onSeat(reservation._id)} disabled={loading} title="Seat guests">
                    <UserCheck size={14} />
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-warning)' }} onClick={() => onNoShow(reservation._id)} disabled={loading} title="No-show">
                    <Ban size={14} />
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }} onClick={() => onCancel(reservation._id)} disabled={loading} title="Cancel">
                    <XCircle size={14} />
                </button>
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════
//  TABLES PAGE
// ═══════════════════════════════════════════════════════
const Tables = () => {
    const { tables, summary, loading, createTable, updateStatus, deleteTable, refetch } = useTables();
    const { hasRole } = useAuth();
    const { socket } = useSocket();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTable, setEditingTable] = useState(null);
    const [reservingTable, setReservingTable] = useState(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

    // Reservations state
    const [reservations, setReservations] = useState([]);
    const [resLoading, setResLoading] = useState(false);
    const [showReservations, setShowReservations] = useState(true);

    const fetchReservations = useCallback(async () => {
        try {
            setResLoading(true);
            const res = await reservationAPI.getAll({ status: 'upcoming' });
            setReservations(res.data.data || []);
        } catch {
            // silent
        } finally {
            setResLoading(false);
        }
    }, []);

    // Initial fetch + socket listener
    useEffect(() => {
        fetchReservations();
    }, [fetchReservations]);

    useEffect(() => {
        if (!socket?.on) return;
        const handleRefresh = () => { refetch(); fetchReservations(); };
        socket.on('table:updated', handleRefresh);
        socket.on('table:changed', handleRefresh);
        return () => { socket.off('table:updated', handleRefresh); socket.off('table:changed', handleRefresh); };
    }, [socket, refetch, fetchReservations]);

    const handleEditTable = async (id, data) => {
        await tableAPI.update(id, data);
        refetch();
    };

    const handleCreateReservation = async (data) => {
        await reservationAPI.create(data);
        toast.success('Reservation created!');
        fetchReservations();
        refetch();
    };

    const handleReservationAction = async (id, status) => {
        try {
            await reservationAPI.updateStatus(id, status);
            toast.success(status === 'seated' ? 'Guests seated!' : status === 'no-show' ? 'Marked as no-show' : 'Reservation cancelled');
            fetchReservations();
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update reservation');
        }
    };

    const filteredTables = tables.filter((table) => {
        if (filter !== 'all' && table.status !== filter) return false;
        if (search) {
            const q = search.toLowerCase();
            const matchNumber = `table ${table.tableNumber}`.toLowerCase().includes(q) || `${table.tableNumber}`.includes(q);
            const matchLocation = table.location?.toLowerCase().includes(q);
            if (!matchNumber && !matchLocation) return false;
        }
        return true;
    });

    const handleDelete = (tableId) => {
        setConfirmDialog({
            open: true, title: 'Delete Table?',
            message: 'This will permanently remove the table. This action cannot be undone.',
            onConfirm: async () => { try { await deleteTable(tableId); } catch { /* hook */ } setConfirmDialog({ open: false }); },
        });
    };

    return (
        <Layout title="Table Management">
            {/* Summary Cards */}
            <div className="stats-grid" style={{ marginBottom: 'var(--spacing-xl)' }}>
                {[
                    { label: 'Total', value: summary.total, color: 'primary' },
                    { label: 'Available', value: summary.available, color: 'success' },
                    { label: 'Occupied', value: summary.occupied, color: 'error' },
                    { label: 'Reserved', value: summary.reserved, color: 'warning' },
                ].map((stat) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`stat-card ${stat.color}`}>
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* ── Upcoming Reservations Panel ────────────── */}
            {hasRole(['admin', 'waiter']) && (
                <div style={{
                    background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)', marginBottom: 'var(--spacing-xl)', overflow: 'hidden',
                }}>
                    <button
                        onClick={() => setShowReservations(!showReservations)}
                        style={{
                            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: 'var(--spacing-md) var(--spacing-lg)', border: 'none', background: 'transparent',
                            cursor: 'pointer', color: 'inherit', fontFamily: 'inherit',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <CalendarClock size={20} style={{ color: 'var(--color-warning)' }} />
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Upcoming Reservations</span>
                            {reservations.length > 0 && (
                                <span style={{
                                    background: 'var(--color-warning)', color: '#fff',
                                    padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                                    fontSize: '0.7rem', fontWeight: 700,
                                }}>
                                    {reservations.length}
                                </span>
                            )}
                        </div>
                        {showReservations ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    <AnimatePresence>
                        {showReservations && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={{ padding: '0 var(--spacing-lg) var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                    {resLoading ? (
                                        <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>Loading...</div>
                                    ) : reservations.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                            <CalendarClock size={32} style={{ opacity: 0.3, marginBottom: 'var(--spacing-sm)' }} />
                                            <p>No upcoming reservations</p>
                                        </div>
                                    ) : (
                                        <AnimatePresence>
                                            {reservations.map((r) => (
                                                <ReservationCard
                                                    key={r._id}
                                                    reservation={r}
                                                    onSeat={(id) => handleReservationAction(id, 'seated')}
                                                    onCancel={(id) => handleReservationAction(id, 'cancelled')}
                                                    onNoShow={(id) => handleReservationAction(id, 'no-show')}
                                                    loading={false}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                    {['all', 'available', 'occupied', 'reserved', 'cleaning'].map((f) => (
                        <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setFilter(f)}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '220px' }}>
                        <Search size={14} color="#6B6460" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input className="top-right-search" placeholder="Search tables..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    {hasRole('admin') && (
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Add Table</button>
                    )}
                </div>
            </div>

            {/* Tables Grid */}
            {loading ? (
                <PageLoader text="Loading tables..." />
            ) : (
                <div className="table-grid">
                    <AnimatePresence>
                        {filteredTables.length === 0 ? (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--spacing-2xl)', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
                                <Users size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: 'var(--spacing-md)' }} />
                                <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>{search || filter !== 'all' ? 'No matching tables' : 'No tables yet'}</h3>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{search || filter !== 'all' ? 'Try adjusting your search or filter' : 'Add your first table to get started'}</p>
                            </motion.div>
                        ) : (
                            filteredTables.map((table) => (
                                <TableCard
                                    key={table._id}
                                    table={table}
                                    onStatusChange={updateStatus}
                                    onEdit={setEditingTable}
                                    onDelete={handleDelete}
                                    onReserve={setReservingTable}
                                    hasAdminAccess={hasRole('admin')}
                                />
                            ))
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Modals */}
            <AddTableModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={createTable} />
            <EditTableModal isOpen={!!editingTable} onClose={() => setEditingTable(null)} table={editingTable} onSubmit={handleEditTable} />
            <ReserveTableModal isOpen={!!reservingTable} onClose={() => setReservingTable(null)} table={reservingTable} onSubmit={handleCreateReservation} />
            <ConfirmModal isOpen={confirmDialog.open} onClose={() => setConfirmDialog({ open: false })} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} confirmText="Delete" variant="danger" />
        </Layout>
    );
};

export default Tables;
