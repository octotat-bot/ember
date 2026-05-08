import { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const isDev = true; // Show demo role buttons in all environments

const Login = () => {
    const { login, isAuthenticated, loading: authLoading, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [currentTime, setCurrentTime] = useState(new Date());
    const submittingRef = useRef(false);

    const location = useLocation();
    const navigate = useNavigate();
    const isAddMode = new URLSearchParams(location.search).get('add') === 'true';

    const defaultRoutes = {
        admin: '/dashboard',
        waiter: '/orders',
        chef: '/kitchen',
        cashier: '/billing',
        runner: '/ready-orders'
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    if (authLoading) return null;

    if (isAuthenticated && !isAddMode) {
        return <Navigate to={defaultRoutes[user?.role] || '/dashboard'} replace />;
    }

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submittingRef.current) return;
        submittingRef.current = true;
        setLoading(true);
        try {
            const res = await login(formData.email, formData.password);
            if (res.success && isAddMode) {
                navigate(defaultRoutes[res.user?.role] || '/dashboard', { replace: true });
            }
        } catch (error) {
            // handled by AuthContext toast
        } finally {
            setLoading(false);
            submittingRef.current = false;
        }
    };

    const formattedTime = currentTime.toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
    }).toUpperCase();

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#F8F4EF', overflow: 'hidden' }}>
            <style>{`
                @media (max-width: 768px) {
                    .login-left-panel { display: none !important; }
                    .login-right-panel { width: 100% !important; }
                    .login-mobile-brand { display: block !important; }
                }
                .auth-input::placeholder { color: #C8B8A0; transition: color 0.2s; }
                .auth-input:focus::placeholder { color: transparent; }
            `}</style>

            {/* Left Panel — warm cream branding */}
            <div className="login-left-panel" style={{
                width: '55%', height: '100%', position: 'relative',
                borderRight: '0.5px solid #DDD0C0',
                background: '#F0EAE0',
                backgroundImage: 'linear-gradient(#E8E0D4 1px, transparent 1px), linear-gradient(90deg, #E8E0D4 1px, transparent 1px)',
                backgroundSize: '40px 40px',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 64, fontWeight: 700, color: '#1C1A18', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        Ember
                    </div>
                    <div style={{ width: 48, height: 0, borderBottom: '0.5px solid #C8975A', margin: '20px 0' }}></div>
                    <div style={{ fontFamily: 'var(--font-primary)', fontSize: 11, color: '#9C8B7A', textTransform: 'uppercase', letterSpacing: '0.16em' }}>
                        Restaurant Management
                    </div>
                </div>
                <div style={{ position: 'absolute', bottom: 32, left: 32, fontFamily: 'var(--font-primary)', fontSize: 10, color: '#C8B8A0', letterSpacing: '0.04em' }}>
                    {formattedTime}
                </div>
            </div>

            {/* Right Panel — white form area */}
            <div className="login-right-panel" style={{ width: '45%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
                <div style={{ width: '100%', maxWidth: 400, padding: '0 48px' }}>
                    {/* Mobile brand (shown when left panel is hidden) */}
                    <div className="login-mobile-brand" style={{ display: 'none', fontFamily: 'var(--font-secondary)', fontSize: 28, color: '#1C1A18', marginBottom: 48 }}>
                        Ember
                    </div>

                    <div style={{ fontFamily: 'var(--font-primary)', fontSize: 13, color: '#9C8B7A', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 12 }}>
                        WELCOME BACK
                    </div>
                    <div style={{ fontFamily: 'var(--font-secondary)', fontSize: 36, color: '#1C1A18', fontWeight: 400, marginBottom: 48 }}>
                        Sign in to continue
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Email */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontFamily: 'var(--font-primary)', fontSize: 13, color: '#9C8B7A', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>
                                EMAIL
                            </label>
                            <input
                                className="auth-input"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="name@example.com"
                                required
                                aria-label="Email address"
                                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid #DDD0C0', borderRadius: 0, padding: '12px 0', fontFamily: 'var(--font-primary)', fontSize: 16, color: '#1C1A18', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                onFocus={e => { e.target.style.borderBottom = '1px solid #C8975A'; }}
                                onBlur={e => { e.target.style.borderBottom = '0.5px solid #DDD0C0'; }}
                            />
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: 36 }}>
                            <label style={{ display: 'block', fontFamily: 'var(--font-primary)', fontSize: 13, color: '#9C8B7A', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>
                                PASSWORD
                            </label>
                            <input
                                className="auth-input"
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter password"
                                required
                                aria-label="Password"
                                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid #DDD0C0', borderRadius: 0, padding: '12px 0', fontFamily: 'var(--font-primary)', fontSize: 16, color: '#1C1A18', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                onFocus={e => { e.target.style.borderBottom = '1px solid #C8975A'; }}
                                onBlur={e => { e.target.style.borderBottom = '0.5px solid #DDD0C0'; }}
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            aria-label="Sign in"
                            style={{ width: '100%', background: 'transparent', border: '0.5px solid #C8975A', color: '#C8975A', fontFamily: 'var(--font-primary)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.18em', borderRadius: 0, padding: '16px 0', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 200ms ease', opacity: loading ? 0.6 : 1 }}
                            onMouseOver={e => { if (!loading) { e.currentTarget.style.background = '#C8975A'; e.currentTarget.style.color = '#FFFFFF'; } }}
                            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#C8975A'; }}
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : 'SIGN IN'}
                        </button>

                        {/* Demo roles */}
                        {isDev && (
                            <div style={{ marginTop: 24 }}>
                                <div style={{ fontFamily: 'var(--font-primary)', fontSize: 11, color: '#C8B8A0', marginBottom: 6 }}>
                                    DEMO ROLES
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {['admin', 'waiter', 'chef', 'cashier', 'runner'].map((r, i, arr) => (
                                        <span key={r} style={{ fontFamily: 'var(--font-primary)', fontSize: 13, color: '#C8B8A0', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span
                                                onClick={() => setFormData({ email: `${r}@cafe.com`, password: `${r}123` })}
                                                style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                                                onMouseOver={e => e.currentTarget.style.color = '#C8975A'}
                                                onMouseOut={e => e.currentTarget.style.color = '#C8B8A0'}
                                            >{r}</span>
                                            {i < arr.length - 1 && <span>·</span>}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
