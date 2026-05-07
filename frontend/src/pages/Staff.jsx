import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { PageLoader } from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Plus,
    Search,
    Edit,
    Trash2,
    X,
    Shield,
    UserCheck,
    UserX,
    Download,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Role config ──────────────────────────────────────
const ROLES = ['waiter', 'chef', 'cashier', 'runner'];
const ALL_ROLES = ['admin', ...ROLES];

const roleBadgeColor = {
    admin: 'badge-primary',
    waiter: 'badge-info',
    chef: 'badge-warning',
    cashier: 'badge-success',
    runner: 'badge-error',
};

// ─── Modal animation ──────────────────────────────────
const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
    exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } },
};

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ─── Add Staff Modal ──────────────────────────────────
const AddStaffModal = ({ isOpen, onClose, onSubmit }) => {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'waiter' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) {
            toast.error('Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            await onSubmit(form);
            setForm({ name: '', email: '', password: '', role: 'waiter' });
            onClose();
        } catch {
            // error handled in parent
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="modal-overlay"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={onClose}
                >
                    <motion.div
                        className="modal"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3 className="modal-title">Add Staff Member</h3>
                            <button className="modal-close" onClick={onClose}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                <div className="input-group">
                                    <label className="input-label">Full Name</label>
                                    <input
                                        className="input"
                                        placeholder="Enter full name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Email</label>
                                    <input
                                        type="email"
                                        className="input"
                                        placeholder="Enter email address"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Password</label>
                                    <input
                                        type="password"
                                        className="input"
                                        placeholder="Create a password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Role</label>
                                    <select
                                        className="input"
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    >
                                        {ROLES.map((role) => (
                                            <option key={role} value={role}>
                                                {role.charAt(0).toUpperCase() + role.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Adding...' : 'Add Staff'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ─── Edit Staff Modal ─────────────────────────────────
const EditStaffModal = ({ isOpen, onClose, onSubmit, staff, currentUserId }) => {
    const [form, setForm] = useState({ name: '', email: '', role: 'waiter', isActive: true });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (staff) {
            setForm({
                name: staff.name || '',
                email: staff.email || '',
                role: staff.role || 'waiter',
                isActive: staff.isActive !== false,
            });
        }
    }, [staff]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email) {
            toast.error('Name and email are required');
            return;
        }
        setLoading(true);
        try {
            await onSubmit(staff._id, form);
            onClose();
        } catch {
            // error handled in parent
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="modal-overlay"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={onClose}
                >
                    <motion.div
                        className="modal"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3 className="modal-title">Edit Staff Member</h3>
                            <button className="modal-close" onClick={onClose}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                <div className="input-group">
                                    <label className="input-label">Full Name</label>
                                    <input
                                        className="input"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Email</label>
                                    <input
                                        type="email"
                                        className="input"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                </div>
                                {staff?._id === currentUserId && (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                        Cannot change your own role or status
                                    </p>
                                )}
                                <div className="input-group">
                                    <label className="input-label">Role</label>
                                    <select
                                        className="input"
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                        disabled={staff?._id === currentUserId}
                                    >
                                        {ALL_ROLES.map((role) => (
                                            <option key={role} value={role}>
                                                {role.charAt(0).toUpperCase() + role.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Status</label>
                                    <label
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-sm)',
                                            cursor: staff?._id === currentUserId ? 'not-allowed' : 'pointer',
                                            padding: 'var(--spacing-sm) 0',
                                            opacity: staff?._id === currentUserId ? 0.6 : 1,
                                        }}
                                    >
                                        <div
                                            onClick={() => staff?._id !== currentUserId && setForm({ ...form, isActive: !form.isActive })}
                                            style={{
                                                width: 44,
                                                height: 24,
                                                borderRadius: 'var(--radius-full)',
                                                background: form.isActive ? 'var(--color-success)' : 'var(--color-border-hover)',
                                                position: 'relative',
                                                cursor: staff?._id === currentUserId ? 'not-allowed' : 'pointer',
                                                transition: 'background 0.2s ease',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: '50%',
                                                    background: '#fff',
                                                    position: 'absolute',
                                                    top: 3,
                                                    left: form.isActive ? 23 : 3,
                                                    transition: 'left 0.2s ease',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                }}
                                            />
                                        </div>
                                        <span style={{ fontSize: '0.9rem', color: form.isActive ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                                            {form.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ═══════════════════════════════════════════════════════
//  STAFF PAGE
// ═══════════════════════════════════════════════════════
const Staff = () => {
    const { user } = useAuth();
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

    const fetchStaff = useCallback(async () => {
        try {
            const response = await authAPI.getUsers();
            setStaffList(response.data?.data || []);
        } catch (error) {
            toast.error(error.message || 'Failed to fetch staff');
        } finally {
            setLoading(false);
        }
    }, []);

    const exportStaff = () => {
        if (!staffList.length) { toast.error('No staff data to export'); return; }
        const escape = (v) => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
        const headers = ['Name', 'Email', 'Role', 'Status', 'Last Login', 'Created'];
        const rows = staffList.map((s) => [
            s.name || '', s.email || '', s.role || '', s.isActive !== false ? 'Active' : 'Inactive',
            s.lastLogin ? new Date(s.lastLogin).toLocaleString() : 'Never',
            s.createdAt ? new Date(s.createdAt).toLocaleString() : '',
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `staff-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success('Staff data exported');
    };

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const handleAddStaff = async (formData) => {
        try {
            await authAPI.register(formData);
            toast.success('Staff member added successfully');
            fetchStaff();
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Failed to add staff member';
            toast.error(msg);
            throw error;
        }
    };

    const handleEditStaff = async (id, formData) => {
        try {
            await authAPI.updateUser(id, formData);
            toast.success('Staff member updated successfully');
            fetchStaff();
        } catch (error) {
            toast.error(error.message || 'Failed to update staff member');
            throw error;
        }
    };

    const handleDeleteStaff = (staffMember) => {
        if (staffMember._id === user?._id) {
            toast.error("You cannot delete your own account");
            return;
        }
        setConfirmDialog({
            open: true,
            title: 'Delete Staff Member?',
            message: `Are you sure you want to delete ${staffMember.name}? This action cannot be undone.`,
            onConfirm: async () => {
                try {
                    await authAPI.deleteUser(staffMember._id);
                    toast.success(`${staffMember.name} has been removed`);
                    fetchStaff();
                } catch (error) {
                    toast.error(error.message || 'Failed to delete staff member');
                }
                setConfirmDialog({ open: false });
            },
        });
    };

    const openEditModal = (staffMember) => {
        setEditingStaff(staffMember);
        setShowEditModal(true);
    };

    // ─── Filters ──────────────────────────────────────
    const filteredStaff = staffList.filter((s) => {
        const matchesSearch =
            s.name?.toLowerCase().includes(search.toLowerCase()) ||
            s.email?.toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === 'all' || s.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // ─── Stats ────────────────────────────────────────
    const totalStaff = staffList.length;
    const activeStaff = staffList.filter((s) => s.isActive !== false).length;
    const inactiveStaff = totalStaff - activeStaff;
    const adminCount = staffList.filter((s) => s.role === 'admin').length;

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <Layout title="Staff Management">
            {/* Stats */}
            <motion.div
                className="stats-grid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{ marginBottom: 'var(--spacing-xl)' }}
            >
                <div className="stat-card">
                    <div className="stat-icon"><Users size={22} /></div>
                    <div className="stat-value">{totalStaff}</div>
                    <div className="stat-label">Total Staff</div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon" style={{ background: 'rgba(61,107,53,0.1)', color: 'var(--color-success)' }}>
                        <UserCheck size={22} />
                    </div>
                    <div className="stat-value">{activeStaff}</div>
                    <div className="stat-label">Active</div>
                </div>
                <div className="stat-card error">
                    <div className="stat-icon" style={{ background: 'rgba(160,64,64,0.1)', color: 'var(--color-error)' }}>
                        <UserX size={22} />
                    </div>
                    <div className="stat-value">{inactiveStaff}</div>
                    <div className="stat-label">Inactive</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(29, 45, 68,0.1)', color: 'var(--color-primary)' }}>
                        <Shield size={22} />
                    </div>
                    <div className="stat-value">{adminCount}</div>
                    <div className="stat-label">Admins</div>
                </div>
            </motion.div>

            {/* Toolbar */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--spacing-lg)',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-md)',
                }}
            >
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                    {['all', ...ALL_ROLES].map((role) => (
                        <button
                            key={role}
                            className={`btn btn-sm ${roleFilter === role ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setRoleFilter(role)}
                        >
                            {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '220px' }}>
                        <Search size={14} color="#6B6460" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input className="top-right-search" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <button className="btn btn-ghost" onClick={exportStaff}>
                        <Download size={18} /> Export CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={18} /> Add Staff
                    </button>
                </div>
            </motion.div>

            {/* Table */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
            >
                {loading ? (
                    <PageLoader text="Loading staff..." />
                ) : filteredStaff.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-text-muted)' }}>
                        <Users size={48} style={{ opacity: 0.2, marginBottom: 'var(--spacing-md)' }} />
                        <p style={{ fontSize: '1rem', fontWeight: 500 }}>
                            {search || roleFilter !== 'all' ? 'No staff members match your filters' : 'No staff members yet'}
                        </p>
                        {!search && roleFilter === 'all' && (
                            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ marginTop: 'var(--spacing-md)' }}>
                                <Plus size={16} /> Add your first staff member
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Last Login</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStaff.map((s) => (
                                    <tr key={s._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                                <div
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 'var(--radius-full)',
                                                        background: 'var(--gradient-primary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#fff',
                                                        fontWeight: 600,
                                                        fontSize: '0.85rem',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {s.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 500 }}>{s.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{s.email}</td>
                                        <td>
                                            <span className={`badge ${roleBadgeColor[s.role] || 'badge-primary'}`}>
                                                {s.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${s.isActive !== false ? 'badge-success' : 'badge-error'}`}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                            >
                                                {s.isActive !== false ? <UserCheck size={12} /> : <UserX size={12} />}
                                                {s.isActive !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                            {formatDate(s.lastLogin)}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => openEditModal(s)}
                                                    title="Edit"
                                                >
                                                    <Edit size={15} />
                                                </button>
                                                {s._id !== user?._id && (
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => handleDeleteStaff(s)}
                                                        title="Delete"
                                                        style={{ color: 'var(--color-error)' }}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>

            {/* Modals */}
            <AddStaffModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSubmit={handleAddStaff}
            />
            <EditStaffModal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setEditingStaff(null); }}
                onSubmit={handleEditStaff}
                staff={editingStaff}
                currentUserId={user?._id}
            />
            <ConfirmModal
                isOpen={confirmDialog.open}
                onClose={() => setConfirmDialog({ open: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText="Delete"
                variant="danger"
            />
        </Layout>
    );
};

export default Staff;
