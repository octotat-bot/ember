import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import socketService from '../services/socket';
import { useAuth } from './AuthContext';
import { notificationAPI } from '../services/api';
import OrderReadyPopup from '../components/OrderReadyPopup';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [orderReadyAlerts, setOrderReadyAlerts] = useState([]);
    const loadedRef = useRef(false);

    // Fetch persisted notifications from the database on login
    const loadNotifications = useCallback(async () => {
        try {
            const res = await notificationAPI.getAll();
            const items = (res.data?.data || []).map((n) => ({
                id: n._id,
                type: n.type,
                title: n.title,
                message: n.message,
                data: n.data,
                priority: n.priority,
                read: n.read,
                createdAt: n.createdAt,
                timestamp: n.createdAt,
            }));
            setNotifications(items);
        } catch (err) {
            console.error('Failed to load notifications:', err.message);
        }
    }, []);

    const playNotificationSound = useCallback((type) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            if (type === 'order_ready_personal') {
                // Two-tone ascending chime — more attention-grabbing
                const notes = [
                    { freq: 880, start: 0, dur: 0.15 },
                    { freq: 1100, start: 0.18, dur: 0.15 },
                    { freq: 1320, start: 0.36, dur: 0.25 },
                ];
                notes.forEach(({ freq, start, dur }) => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.3, audioContext.currentTime + start);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + start + dur);
                    osc.start(audioContext.currentTime + start);
                    osc.stop(audioContext.currentTime + start + dur);
                });
                return;
            }

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            switch (type) {
                case 'new_order':
                    oscillator.frequency.value = 800;
                    gainNode.gain.value = 0.3;
                    oscillator.type = 'sine';
                    break;
                case 'order_ready':
                    oscillator.frequency.value = 1000;
                    gainNode.gain.value = 0.3;
                    oscillator.type = 'triangle';
                    break;
                case 'payment_request':
                    oscillator.frequency.value = 600;
                    gainNode.gain.value = 0.2;
                    oscillator.type = 'square';
                    break;
                default:
                    oscillator.frequency.value = 700;
                    gainNode.gain.value = 0.2;
            }

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch {
            // Ignore audio errors (e.g. user hasn't interacted yet)
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && user) {
            // Load persisted notifications once on mount / login
            if (!loadedRef.current) {
                loadedRef.current = true;
                loadNotifications();
            }

            // Connect socket
            const socket = socketService.connect();

            // Authenticate with socket
            socketService.authenticate(user._id, user.role, user.name);

            // Setup connection status listener
            const handleConnect = () => setIsConnected(true);
            const handleDisconnect = () => setIsConnected(false);

            socket.on('connect', handleConnect);
            socket.on('disconnect', handleDisconnect);
            socket.on('authenticated', () => setIsConnected(true));

            // Setup notification listener — merge real-time into state
            socket.on('notification:received', (data) => {
                setNotifications((prev) => {
                    // Avoid duplicates if the API already returned this notification
                    if (prev.some((n) => n.id === data.id)) return prev;
                    return [
                        { ...data, id: data.id || Date.now(), read: false },
                        ...prev.slice(0, 49), // Keep last 50 notifications
                    ];
                });
            });

            // Setup sound notifications
            socket.on('notification:sound', (data) => {
                playNotificationSound(data.type);
            });

            // *** Targeted "Order Ready" popup for the waiter who owns the order ***
            const handleOrderReadyPersonal = (data) => {
                setOrderReadyAlerts((prev) => [
                    ...prev,
                    { ...data, id: `${data.orderId}-${Date.now()}` },
                ]);
                // Play a distinct two-tone chime
                playNotificationSound('order_ready_personal');
            };
            socket.on('order:ready:personal', handleOrderReadyPersonal);

            // *** Item-level ready POPUP for waiter / runner ***
            const handleItemReady = (data) => {
                if (['waiter', 'runner'].includes(user.role)) {
                    setOrderReadyAlerts((prev) => [
                        ...prev,
                        {
                            ...data,
                            id: `item-${data.orderId}-${data.itemId || ''}-${Date.now()}`,
                            type: 'item_ready',
                        },
                    ]);
                    playNotificationSound('order_ready_personal');
                }
            };
            socket.on('item:ready', handleItemReady);

            // Set initial connection status
            setIsConnected(socket.connected);

            return () => {
                socket.off('connect', handleConnect);
                socket.off('disconnect', handleDisconnect);
                socket.off('authenticated');
                socket.off('notification:received');
                socket.off('notification:sound');
                socket.off('order:ready:personal', handleOrderReadyPersonal);
                socket.off('item:ready', handleItemReady);
            };
        } else {
            socketService.disconnect();
            setIsConnected(false);
            setNotifications([]);
            loadedRef.current = false;
        }
    }, [isAuthenticated, user, loadNotifications, playNotificationSound]);

    const dismissOrderReadyAlert = useCallback((id) => {
        setOrderReadyAlerts((prev) => prev.filter((a) => a.id !== id));
    }, []);

    const markNotificationRead = useCallback(async (id) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        try {
            await notificationAPI.markAsRead(id);
        } catch {
            // Optimistic update; ignore API failures silently
        }
    }, []);

    const markAllRead = useCallback(async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        try {
            await notificationAPI.markAllAsRead();
        } catch {
            // Optimistic update
        }
    }, []);

    const clearNotifications = useCallback(async () => {
        setNotifications([]);
        try {
            await notificationAPI.clearAll();
        } catch {
            // Optimistic update
        }
    }, []);

    const value = {
        socket: socketService,
        isConnected,
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
        markNotificationRead,
        markAllRead,
        clearNotifications,
        playNotificationSound,
        orderReadyAlerts,
        dismissOrderReadyAlert,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
            {orderReadyAlerts.length > 0 && (
                <OrderReadyPopup alerts={orderReadyAlerts} onDismiss={dismissOrderReadyAlert} />
            )}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        // Return safe defaults instead of crashing — handles HMR edge cases
        // and components that render before the provider is ready
        return {
            socket: null,
            isConnected: false,
            notifications: [],
            unreadCount: 0,
            markNotificationRead: () => { },
            markAllRead: () => { },
            clearNotifications: () => { },
            playNotificationSound: () => { },
            orderReadyAlerts: [],
            dismissOrderReadyAlert: () => { },
        };
    }
    return context;
};

export default SocketContext;
