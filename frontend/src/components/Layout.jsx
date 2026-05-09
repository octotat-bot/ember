import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    LayoutDashboard,
    UtensilsCrossed,
    ClipboardList,
    ChefHat,
    CreditCard,
    Users,
    Settings,
    LogOut,
    TableIcon,
    BarChart3,
    Bell,
    ArrowLeft,
    ArrowRight
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const getPageName = (pathname) => {
    if (pathname.includes('/kitchen')) return 'KITCHEN DISPLAY';
    if (pathname.includes('/orders')) return 'ALL ORDERS';
    if (pathname.includes('/ready-orders')) return 'READY ORDERS';
    if (pathname.includes('/billing')) return 'BILLING';
    if (pathname.includes('/tables')) return 'TABLES';
    if (pathname.includes('/menu')) return 'MENU';
    if (pathname.includes('/staff')) return 'STAFF';
    if (pathname.includes('/analytics')) return 'ANALYTICS';
    if (pathname.includes('/login')) return 'LOGIN';
    return 'DASHBOARD';
};

const Dock = ({ activeRole }) => {
    const location = useLocation();
    
    const allItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'waiter', 'chef', 'cashier', 'runner'] },
        { to: '/orders', icon: ClipboardList, label: 'Orders', roles: ['admin', 'waiter', 'cashier'] },
        { to: '/kitchen', icon: ChefHat, label: 'Kitchen', roles: ['admin', 'chef'] },
        { to: '/tables', icon: TableIcon, label: 'Tables', roles: ['admin', 'waiter'] },
        { to: '/menu', icon: UtensilsCrossed, label: 'Menu', roles: ['admin', 'waiter', 'chef'] },
        { to: '/staff', icon: Users, label: 'Staff', roles: ['admin'] },
        { to: '/billing', icon: CreditCard, label: 'Billing', roles: ['admin', 'cashier'] },
        { to: '/ready-orders', icon: ClipboardList, label: 'Ready', roles: ['admin', 'chef', 'waiter', 'runner'] },
        { to: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin'] },
    ];

    const filteredItems = allItems.filter(item => item.roles.includes(activeRole || 'admin'));

    return (
        <nav aria-label="Main navigation" style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            height: 52,
            maxWidth: 'calc(100vw - 32px)',
            background: '#2A2523',
            border: '0.5px solid #3D3833',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            zIndex: 1000,
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
        }}>
            {filteredItems.map(item => {
                const isActive = location.pathname.startsWith(item.to);
                return (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        aria-label={item.label}
                        aria-current={isActive ? 'page' : undefined}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                            position: 'relative',
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                        className="dock-item"
                    >
                        {isActive && (
                            <div style={{
                                width: 2, height: 2, borderRadius: '50%', background: '#C8975A', position: 'absolute', top: -4
                            }} />
                        )}
                        <div style={{ transition: 'color 0.2s', marginTop: isActive ? '2px' : '0' }}>
                            <item.icon size={18} className="dock-icon" style={{ color: isActive ? '#C8975A' : '#6B6460' }} />
                        </div>
                        <span className="dock-label" style={{
                            fontFamily: 'var(--font-primary)',
                            fontSize: 9,
                            color: isActive ? '#E8E0D8' : '#6B6460',
                            marginTop: 4,
                            transition: 'color 0.2s',
                            whiteSpace: 'nowrap',
                        }}>
                            {item.label}
                        </span>
                    </NavLink>
                );
            })}
        </nav>
    );
};

const ROLE_COLORS = {
    admin: { color: '#C8975A', background: '#412402' },
    waiter: { color: '#5a7ac8', background: '#1a1a2e' },
    chef: { color: '#5a9e5a', background: '#1a2e1a' },
    cashier: { color: '#9e7a5a', background: '#2e1a0a' },
    runner: { color: '#6B6460', background: '#2E2B28' }
};

const ROLE_GREETING = (role) => {
    const hour = new Date().getHours();
    const time = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return time;
};

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const { unreadCount, notifications, markNotificationRead, markAllRead } = useSocket();
    const location = useLocation();
    const navigate = useNavigate();

    const pageName = getPageName(location.pathname);

    // Dynamic page title
    useEffect(() => {
        document.title = pageName === 'DASHBOARD' ? 'Ember' : `Ember — ${pageName.charAt(0) + pageName.slice(1).toLowerCase()}`;
    }, [pageName]);

    const [previewRole, setPreviewRole] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showRoles, setShowRoles] = useState(false);
    const [showNotificationsList, setShowNotificationsList] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const dropdownRef = useRef(null);
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
                setShowRoles(false);
                setShowNotificationsList(false);
            }
        };
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                setShowDropdown(false);
                setShowRoles(false);
                setShowNotificationsList(false);
            }
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', escHandler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', escHandler);
        };
    }, []);

    const handleLogout = () => {
        setShowDropdown(false);
        setIsLoggingOut(true);
        setTimeout(() => {
            logout();
        }, 800);
    };

    const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
    const activeRole = previewRole || user?.role || 'waiter';

    return (
        <div style={{ backgroundColor: 'var(--bg-canvas)', minHeight: '100vh', width: '100vw', margin: 0, padding: 0, overflow: 'hidden', position: 'relative' }}>
            <style>{`
                .dock-item:hover .dock-icon { color: #F5EFE6 !important; }
                .dock-item:hover .dock-label { color: #F5EFE6 !important; }
            `}</style>

            {previewRole && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 24, borderTop: '2px solid #C8975A', background: '#2A2523', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <span style={{ fontFamily: 'var(--font-primary)', fontSize: 10, color: '#C8975A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        VIEWING AS {previewRole}
                    </span>
                    <button onClick={() => setPreviewRole(null)} style={{ background: 'none', border: 'none', padding: 0, color: '#E8E0D8', fontFamily: 'var(--font-primary)', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}>
                        EXIT PREVIEW
                    </button>
                </div>
            )}
            
            {/* Branding Top-Left Stack */}
            <div style={{ position: 'fixed', top: previewRole ? 44 : 20, left: 24, zIndex: 100, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 4, transition: 'top 0.2s' }}>
                <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 22, color: 'var(--color-text)', fontWeight: 700, lineHeight: 1 }}>
                    Ember
                </div>
                {isDashboard && user ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'var(--font-primary)', fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
                                {ROLE_GREETING(user.role)}, <strong style={{ color: 'var(--color-text)', fontWeight: 600 }}>{user.name?.split(' ')[0] || user.username}</strong>
                            </span>
                            <span style={{ fontSize: 12 }}>👋</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                                fontFamily: 'var(--font-primary)', fontSize: 8,
                                background: 'var(--accent-bg)', color: 'var(--color-primary)',
                                padding: '1px 6px', borderRadius: 3,
                                textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
                            }}>{user.role}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#5a9e5a' }} />
                                <span style={{ fontFamily: 'var(--font-primary)', fontSize: 8, color: '#5a9e5a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ fontFamily: 'var(--font-primary)', fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                        {pageName}
                    </div>
                )}
            </div>
            {!isDashboard && (
                <button onClick={() => { const roleDefault = { admin: '/dashboard', waiter: '/orders', chef: '/kitchen', cashier: '/billing', runner: '/ready-orders' }; navigate(roleDefault[user?.role] || '/dashboard'); }} aria-label="Go back" style={{ position: 'fixed', top: previewRole ? 96 : 72, left: 24, zIndex: 100, pointerEvents: 'auto', background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontFamily: 'var(--font-primary)', fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textDecoration: 'none', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#C8975A'} onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                    <ArrowLeft size={10} /> BACK
                </button>
            )}

            {/* Admin Identity Top-Right */}
            {user && (
                <div ref={dropdownRef} style={{ position: 'fixed', top: previewRole ? 44 : 20, right: 24, display: 'flex', alignItems: 'center', gap: 16, zIndex: 1000, transition: 'top 0.2s' }}>
                    <div 
                        role="button"
                        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                        aria-expanded={showNotificationsList}
                        tabIndex={0}
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => { setShowNotificationsList(!showNotificationsList); setShowDropdown(false); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowNotificationsList(!showNotificationsList); setShowDropdown(false); } }}
                    >
                        <Bell size={18} color={showNotificationsList ? '#C8975A' : 'var(--color-text-muted)'} style={{ transition: 'color 0.2s' }} />
                        {unreadCount > 0 && (
                            <div style={{ position: 'absolute', top: -4, right: -4, background: '#C8975A', color: '#fff', fontSize: 8, fontFamily: 'var(--font-primary)', fontWeight: 700, padding: '0 4px', borderRadius: 8 }}>
                                {unreadCount}
                            </div>
                        )}

                        {showNotificationsList && (
                            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 32, right: 0, background: '#fff', border: '0.5px solid var(--color-border)', borderRadius: 6, minWidth: 280, maxHeight: 400, overflowY: 'auto', zIndex: 200, display: 'flex', flexDirection: 'column', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                                <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
                                    <span style={{ fontFamily: 'var(--font-primary)', fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Notifications</span>
                                    {notifications?.length > 0 && (
                                        <span onClick={() => markAllRead()} style={{ fontFamily: 'var(--font-primary)', fontSize: 9, color: '#C8975A', cursor: 'pointer', textTransform: 'uppercase' }}>Mark All Read</span>
                                    )}
                                </div>
                                {!notifications || notifications.length === 0 ? (
                                    <div style={{ padding: '32px 16px', textAlign: 'center', fontFamily: 'var(--font-primary)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                                        No notifications yet
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div 
                                            key={n.id} 
                                            onClick={() => markNotificationRead(n.id)} 
                                            style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border)', background: n.read ? 'transparent' : 'rgba(200,151,90,0.04)', cursor: 'pointer', transition: 'background 0.2s' }}
                                            onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                                            onMouseOut={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(200,151,90,0.04)'}
                                        >
                                            <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 13, color: 'var(--color-text)', marginBottom: 4 }}>{n.title}</div>
                                            <div style={{ fontFamily: 'var(--font-primary)', fontSize: 10, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                                            <div style={{ fontFamily: 'var(--font-primary)', fontSize: 8, color: 'var(--color-text-muted)', marginTop: 8 }}>
                                                {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div 
                        onClick={() => { setShowDropdown(!showDropdown); setShowNotificationsList(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <span style={{ fontFamily: 'var(--font-primary)', fontSize: 12, color: 'var(--color-text)' }}>
                                {user.name}
                            </span>
                            <span style={{ fontFamily: 'var(--font-primary)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 4px', borderRadius: 2, marginTop: 2, ...ROLE_COLORS[user.role] }}>
                                {user.role}
                            </span>
                        </div>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-primary)', fontSize: 13, fontWeight: 600 }}>
                            {user.name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                    </div>

                    {showDropdown && (
                        <div style={{ position: 'absolute', top: 44, right: 0, background: '#fff', border: '0.5px solid var(--color-border)', borderRadius: 6, minWidth: 200, zIndex: 200, display: 'flex', flexDirection: 'column', overflow: 'visible', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border)', display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-primary)', fontSize: 10, fontWeight: 600 }}>
                                    {user.name?.charAt(0).toUpperCase() || 'A'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontFamily: 'var(--font-primary)', fontSize: 12, color: 'var(--color-text)' }}>{user.name}</span>
                                    <span style={{ fontFamily: 'var(--font-primary)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: 2, color: ROLE_COLORS[user.role]?.color }}>{user.role}</span>
                                </div>
                            </div>
                            
                            {user.role === 'admin' && (
                                <>
                                    <div 
                                        onClick={() => { navigate('/settings'); setShowDropdown(false); }}
                                        style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border)', fontFamily: 'var(--font-primary)', fontSize: 12, color: 'var(--color-text)', cursor: 'pointer', transition: 'background 0.2s' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        Settings
                                    </div>
                                    <div 
                                        style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border)', fontFamily: 'var(--font-primary)', fontSize: 12, color: 'var(--color-text)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s', position: 'relative' }}
                                    onClick={(e) => { e.stopPropagation(); setShowRoles(!showRoles); }}
                                    onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    Switch Role <ArrowRight size={12} />
                                    
                                    {showRoles && (
                                        <div style={{ position: 'absolute', top: 0, right: '100%', marginRight: 4, background: '#fff', border: '0.5px solid var(--color-border)', borderRadius: 6, width: 140, display: 'flex', flexDirection: 'column', padding: '4px 0', zIndex: 201, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                            {['admin', 'waiter', 'chef', 'cashier', 'runner'].map(r => (
                                                <div 
                                                    key={r}
                                                    onClick={() => { setPreviewRole(r); setShowDropdown(false); setShowRoles(false); }}
                                                    style={{ padding: '8px 16px', color: 'var(--color-text)', fontFamily: 'var(--font-primary)', fontSize: 12, textTransform: 'capitalize' }}
                                                    onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    {r}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                </>
                            )}
                            
                            <div 
                                onClick={handleLogout}
                                style={{ padding: '12px 16px', fontFamily: 'var(--font-primary)', fontSize: 12, color: '#e05a5a', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(224,90,90,0.06)'; }}
                                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                ← Logout
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isLoggingOut && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-canvas)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 18, color: 'var(--color-text-muted)' }}>
                        Signing out...
                    </div>
                </div>
            )}

            {/* Main Canvas Area */}
            <div style={{ position: 'absolute', inset: 0, paddingTop: previewRole ? 134 : 110, paddingBottom: 96, paddingLeft: 24, paddingRight: 24, overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box', transition: 'padding-top 0.2s' }}>
                {children}
            </div>

            {/* The Dock Navigation */}
            {user && <Dock activeRole={activeRole} />}
        </div>
    );
};

export default Layout;
