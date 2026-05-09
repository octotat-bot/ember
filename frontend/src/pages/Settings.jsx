import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authAPI, settingsAPI } from '../services/api';
import { motion } from 'framer-motion';
import {
    Settings as SettingsIcon,
    User,
    Lock,
    Building,
    Info,
    Save,
    Shield,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Animation config ─────────────────────────────────
const sectionVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
};

// ─── Section Card ─────────────────────────────────────
const SectionCard = ({ icon: SectionIcon, title, description, index, children }) => (
    <motion.div
        className="card"
        custom={index}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        style={{ marginBottom: 'var(--spacing-lg)', cursor: 'default' }}
    >
        <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(29, 45, 68,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-primary)',
                    }}
                >
                    <SectionIcon size={20} />
                </div>
                <div>
                    <h3 className="card-title">{title}</h3>
                    {description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </div>
        {children}
    </motion.div>
);

// ═══════════════════════════════════════════════════════
//  PROFILE SECTION
// ═══════════════════════════════════════════════════════
const ProfileSection = ({ user, onProfileUpdate }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.name || !form.email) {
            toast.error('Name and email are required');
            return;
        }
        setSaving(true);
        try {
            await authAPI.updateProfile(form);
            onProfileUpdate(form);
            setEditing(false);
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setForm({ name: user?.name || '', email: user?.email || '' });
        setEditing(false);
    };

    return (
        <SectionCard icon={User} title="Profile" description="Manage your personal information" index={0}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
                <div className="input-group">
                    <label className="input-label">Full Name</label>
                    {editing ? (
                        <input
                            className="input"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    ) : (
                        <div style={{
                            padding: '0.875rem 1rem',
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            fontSize: '0.9rem',
                        }}>
                            {user?.name}
                        </div>
                    )}
                </div>
                <div className="input-group">
                    <label className="input-label">Email</label>
                    {editing ? (
                        <input
                            type="email"
                            className="input"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    ) : (
                        <div style={{
                            padding: '0.875rem 1rem',
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            fontSize: '0.9rem',
                        }}>
                            {user?.email}
                        </div>
                    )}
                </div>
                <div className="input-group">
                    <label className="input-label">Role</label>
                    <div style={{
                        padding: '0.875rem 1rem',
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                    }}>
                        <Shield size={16} style={{ color: 'var(--color-primary)' }} />
                        <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
                {editing ? (
                    <>
                        <button className="btn btn-ghost btn-sm" onClick={handleCancel}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </>
                ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                        Edit Profile
                    </button>
                )}
            </div>
        </SectionCard>
    );
};

// ═══════════════════════════════════════════════════════
//  CHANGE PASSWORD SECTION
// ═══════════════════════════════════════════════════════
const ChangePasswordSection = () => {
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
            toast.error('Please fill in all password fields');
            return;
        }
        if (form.newPassword.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }
        if (form.newPassword !== form.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        setSaving(true);
        try {
            await authAPI.changePassword({
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            toast.success('Password changed successfully');
        } catch (error) {
            toast.error(error.message || 'Failed to change password');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SectionCard icon={Lock} title="Change Password" description="Update your account password" index={1}>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', maxWidth: '400px' }}>
                    <div className="input-group">
                        <label className="input-label">Current Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="Enter current password"
                            value={form.currentPassword}
                            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label">New Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="Enter new password"
                            value={form.newPassword}
                            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                            required
                            minLength={6}
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Confirm New Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="Confirm new password"
                            value={form.confirmPassword}
                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                            required
                            minLength={6}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                            <Lock size={15} /> {saving ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </div>
            </form>
        </SectionCard>
    );
};

// ═══════════════════════════════════════════════════════
//  APP SETTINGS SECTION  — database-backed, admin editable
// ═══════════════════════════════════════════════════════
const AppSettingsSection = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [settings, setSettings] = useState(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await settingsAPI.get();
                const data = res.data?.data || res.data;
                setSettings(data);
                setForm(data);
            } catch (err) {
                console.error('Failed to load settings:', err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await settingsAPI.update(form);
            const data = res.data?.data || res.data;
            setSettings(data);
            setForm(data);
            setEditing(false);
            toast.success('Settings updated successfully');
        } catch (err) {
            toast.error(err.message || 'Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setForm({ ...settings });
        setEditing(false);
    };

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <SectionCard icon={Building} title="App Settings" description="Application configuration" index={2}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
                    <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-text-muted)' }} />
                </div>
            </SectionCard>
        );
    }

    // Read-only display helper
    const ReadOnlyField = ({ label, value }) => (
        <div style={{
            padding: 'var(--spacing-md)',
            background: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
        }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-xs)' }}>
                {label}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {value}
            </div>
        </div>
    );

    return (
        <SectionCard icon={Building} title="App Settings" description="Application configuration" index={2}>
            {editing ? (
                /* ── Edit Mode ─────────────────────── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
                        <div className="input-group">
                            <label className="input-label">Tax Rate (%)</label>
                            <input type="number" className="input" min="0" max="100" step="0.5" value={form.taxRate ?? ''} onChange={(e) => updateField('taxRate', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Currency</label>
                            <input className="input" value={form.currency || ''} onChange={(e) => updateField('currency', e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Currency Symbol</label>
                            <input className="input" value={form.currencySymbol || ''} onChange={(e) => updateField('currencySymbol', e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Order Timeout (minutes)</label>
                            <input type="number" className="input" min="5" max="120" value={form.orderTimeout ?? ''} onChange={(e) => updateField('orderTimeout', parseInt(e.target.value, 10) || 30)} />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Business Hours Start</label>
                            <input type="time" className="input" value={form.businessHoursStart || '08:00'} onChange={(e) => updateField('businessHoursStart', e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Business Hours End</label>
                            <input type="time" className="input" value={form.businessHoursEnd || '23:00'} onChange={(e) => updateField('businessHoursEnd', e.target.value)} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
                        <div className="input-group">
                            <label className="input-label">Address</label>
                            <input className="input" value={form.address || ''} onChange={(e) => updateField('address', e.target.value)} placeholder="Restaurant address" />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Phone</label>
                            <input className="input" value={form.phone || ''} onChange={(e) => updateField('phone', e.target.value)} placeholder="Contact phone" />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Contact Email</label>
                            <input type="email" className="input" value={form.email || ''} onChange={(e) => updateField('email', e.target.value)} placeholder="Contact email" />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.autoConfirmOrders || false} onChange={(e) => updateField('autoConfirmOrders', e.target.checked)} />
                            Auto-confirm orders
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.enableNotificationSounds ?? true} onChange={(e) => updateField('enableNotificationSounds', e.target.checked)} />
                            Notification sounds
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)' }}>
                        <button className="btn btn-ghost btn-sm" onClick={handleCancel}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                            <Save size={15} /> {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            ) : (
                /* ── Read Mode ─────────────────────── */
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-md)' }}>
                        <ReadOnlyField label="Tax Rate" value={`${settings?.taxRate ?? 18}%`} />
                        <ReadOnlyField label="Currency" value={`${settings?.currency || 'INR'} (${settings?.currencySymbol || '₹'})`} />
                        <ReadOnlyField label="Order Timeout" value={`${settings?.orderTimeout ?? 30} minutes`} />
                        <ReadOnlyField label="Business Hours" value={`${settings?.businessHoursStart || '08:00'} – ${settings?.businessHoursEnd || '23:00'}`} />
                        {settings?.phone && <ReadOnlyField label="Phone" value={settings.phone} />}
                        {settings?.address && <ReadOnlyField label="Address" value={settings.address} />}
                    </div>
                    {isAdmin ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                                Edit Settings
                            </button>
                        </div>
                    ) : (
                        <p style={{
                            fontSize: '0.8rem',
                            color: 'var(--color-text-muted)',
                            marginTop: 'var(--spacing-md)',
                            fontStyle: 'italic',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-xs)',
                        }}>
                            <Info size={14} />
                            Only admins can change these settings.
                        </p>
                    )}
                </>
            )}
        </SectionCard>
    );
};

// ═══════════════════════════════════════════════════════
//  ABOUT SECTION
// ═══════════════════════════════════════════════════════
const AboutSection = () => (
    <SectionCard icon={Info} title="About" description="Application information" index={3}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
            <div
                style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                }}
            >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-xs)' }}>
                    App Version
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>1.0.0</div>
            </div>
            <div
                style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                }}
            >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-xs)' }}>
                    Platform
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>Ember</div>
            </div>
            <div
                style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                }}
            >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-xs)' }}>
                    Built With
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>React 19 + Node.js</div>
            </div>
        </div>
        <div style={{
            marginTop: 'var(--spacing-lg)',
            padding: 'var(--spacing-md)',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
        }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Cafe management made simple and efficient.
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)' }}>
                &copy; {new Date().getFullYear()} Ember. All rights reserved.
            </p>
        </div>
    </SectionCard>
);

// ═══════════════════════════════════════════════════════
//  SETTINGS PAGE
// ═══════════════════════════════════════════════════════
const Settings = () => {
    const { user, updateUser } = useAuth();

    const handleProfileUpdate = (updates) => {
        updateUser(updates);
    };

    return (
        <Layout title="Settings">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-xl)',
                }}
            >
                <div
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                    }}
                >
                    <SettingsIcon size={24} />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.2 }}>
                        Account & Settings
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        Manage your profile, security, and application preferences
                    </p>
                </div>
            </motion.div>

            {/* Sections */}
            <ProfileSection user={user} onProfileUpdate={handleProfileUpdate} />
            <ChangePasswordSection />
            <AppSettingsSection />
            <AboutSection />
        </Layout>
    );
};

export default Settings;
