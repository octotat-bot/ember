import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../services/api';
import socketService from '../services/socket';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);
const AUTH_CHECK_TIMEOUT_MS = 8000;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const isMounted = useRef(true);

    // Listen for cross-app unauthorized events (fired by api.js interceptor)
    useEffect(() => {
        const handleUnauthorized = () => {
            if (isMounted.current) {
                setUser(null);
                setIsAuthenticated(false);
                setLoading(false);
                socketService.disconnect();
            }
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, []);

    // Check for existing token on mount
    useEffect(() => {
        isMounted.current = true;

        const safetyTimeout = setTimeout(() => {
            if (isMounted.current && loading) setLoading(false);
        }, AUTH_CHECK_TIMEOUT_MS);

        const checkAuth = async () => {
            const token = sessionStorage.getItem('token');
            const savedUserStr = sessionStorage.getItem('user');

            if (token && savedUserStr) {
                try {
                    const response = await authAPI.getMe();
                    if (isMounted.current) {
                        setUser(response.data.data);
                        setIsAuthenticated(true);

                        socketService.connect();
                        socketService.authenticate(
                            response.data.data._id,
                            response.data.data.role,
                            response.data.data.name
                        );
                    }
                } catch {
                    // Token invalid
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    if (isMounted.current) {
                        setUser(null);
                        setIsAuthenticated(false);
                    }
                }
            }
            if (isMounted.current) setLoading(false);
        };

        checkAuth();
        return () => {
            isMounted.current = false;
            clearTimeout(safetyTimeout);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = useCallback(async (email, password) => {
        try {
            const response = await authAPI.login({ email, password });
            const { user: userData, token } = response.data.data;

            sessionStorage.setItem('token', token);
            sessionStorage.setItem('user', JSON.stringify(userData));

            setUser(userData);
            setIsAuthenticated(true);

            socketService.connect();
            socketService.authenticate(userData._id, userData.role, userData.name);

            toast.success(`Welcome back, ${userData.name}!`);
            return { success: true, user: userData };
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed';
            toast.error(message);
            return { success: false, error: message };
        }
    }, []);

    const register = useCallback(async (userData) => {
        try {
            const response = await authAPI.register(userData);
            const { user: newUser, token } = response.data.data;
            if (token) {
                sessionStorage.setItem('token', token);
                sessionStorage.setItem('user', JSON.stringify(newUser));
                setUser(newUser);
                setIsAuthenticated(true);
                socketService.connect();
                socketService.authenticate(newUser._id, newUser.role, newUser.name);
            }
            toast.success('Account created successfully!');
            return { success: true, user: newUser };
        } catch (error) {
            const message = error.response?.data?.message || 'Registration failed';
            toast.error(message);
            return { success: false, error: message };
        }
    }, []);

    const logout = useCallback(() => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);

        socketService.disconnect();
        toast.success('Logged out successfully');
    }, []);

    const updateUser = useCallback((updates) => {
        setUser(prev => {
            const updated = { ...prev, ...updates };
            sessionStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const hasRole = useCallback((roles) => {
        if (!user) return false;
        if (typeof roles === 'string') return user.role === roles;
        return roles.includes(user.role);
    }, [user]);

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        updateUser,
        hasRole,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        return {
            user: null,
            loading: true,
            isAuthenticated: false,
            login: async () => ({ success: false }),
            register: async () => ({ success: false }),
            logout: () => { },
            updateUser: () => { },
            hasRole: () => false,
        };
    }
    return context;
};

export default AuthContext;
