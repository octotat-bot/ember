import axios from 'axios';

// In development, use relative URL so Vite proxy handles CORS automatically.
// In production, use relative path (served behind reverse proxy) or explicit URL.
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Handle 401 Unauthorized — dispatch event so AuthContext can handle logout
            // M-24: Skip if already on login page to prevent redirect loops
            if (error.response.status === 401) {
                const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';
                const isLoginRequest = error.config?.url?.includes('/auth/login');
                if (!isLoginPage && !isLoginRequest) {
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                }
            }

            // Extract error message
            const message = error.response.data?.message || 'An error occurred';
            error.message = message;
        } else if (error.request) {
            error.message = 'Server not responding. Please try again.';
        }

        return Promise.reject(error);
    }
);

// ==================== AUTH API ====================
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/me', data),
    changePassword: (data) => api.put('/auth/change-password', data),
    getUsers: (params) => api.get('/auth/users', { params }),
    getUser: (id) => api.get(`/auth/users/${id}`),
    updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
    deleteUser: (id) => api.delete(`/auth/users/${id}`),
    resetPassword: (id, password) => api.put(`/auth/users/${id}/reset-password`, { newPassword: password }),
};

// ==================== MENU API ====================
export const menuAPI = {
    getAll: (params) => api.get('/menu', { params }),
    getById: (id) => api.get(`/menu/${id}`),
    getCategories: () => api.get('/menu/categories'),
    getPopular: (limit = 10) => api.get('/menu/popular', { params: { limit } }),
    create: (data) => api.post('/menu', data),
    update: (id, data) => api.put(`/menu/${id}`, data),
    delete: (id) => api.delete(`/menu/${id}`),
    toggleAvailability: (id) => api.patch(`/menu/${id}/toggle-availability`),
    bulkAvailability: (itemIds, isAvailable) => api.patch('/menu/bulk-availability', { itemIds, isAvailable }),
};

// ==================== TABLE API ====================
export const tableAPI = {
    getAll: (params) => api.get('/tables', { params }),
    getById: (id) => api.get(`/tables/${id}`),
    getByNumber: (num) => api.get(`/tables/number/${num}`),
    getByQR: (qrCode) => api.get(`/tables/qr/${qrCode}`),
    getSummary: () => api.get('/tables/summary'),
    getOrders: (id, params) => api.get(`/tables/${id}/orders`, { params }),
    create: (data) => api.post('/tables', data),
    bulkCreate: (data) => api.post('/tables/bulk', data),
    update: (id, data) => api.put(`/tables/${id}`, data),
    updateStatus: (id, status) => api.patch(`/tables/${id}/status`, { status }),
    delete: (id) => api.delete(`/tables/${id}`),
};

// ==================== ORDER API ====================
export const orderAPI = {
    getAll: (params) => api.get('/orders', { params }),
    getById: (id) => api.get(`/orders/${id}`),
    getMyOrders: (params) => api.get('/orders/my-orders', { params }),
    getKitchen: () => api.get('/orders/kitchen'),
    getReady: () => api.get('/orders/ready'),
    getUnpaid: () => api.get('/orders/unpaid'),
    getStats: (period) => api.get('/orders/stats', { params: { period } }),
    getInvoice: (id) => api.get(`/orders/${id}/invoice`),
    create: (data) => api.post('/orders', data),
    updateStatus: (id, status, notes) => api.patch(`/orders/${id}/status`, { status, notes }),
    updateItemStatus: (orderId, itemId, status) => api.patch(`/orders/${orderId}/items/${itemId}/status`, { status }),
    addItems: (id, items) => api.post(`/orders/${id}/items`, { items }),
    removeItem: (orderId, itemId) => api.delete(`/orders/${orderId}/items/${itemId}`),
    processPayment: (id, paymentData) => api.post(`/orders/${id}/payment`, paymentData),
    setPriority: (id, priority) => api.patch(`/orders/${id}/priority`, { priority }),
    transferTable: (id, tableId) => api.patch(`/orders/${id}/transfer`, { tableId }),
};

// ==================== NOTIFICATION API ====================
export const notificationAPI = {
    getAll: () => api.get('/notifications'),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markAsRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.post('/notifications/read-all'),
    clearAll: () => api.delete('/notifications/clear'),
};

// ==================== RESERVATION API ====================
export const reservationAPI = {
    getAll: (params) => api.get('/reservations', { params }),
    create: (data) => api.post('/reservations', data),
    update: (id, data) => api.put(`/reservations/${id}`, data),
    updateStatus: (id, status) => api.patch(`/reservations/${id}/status`, { status }),
    delete: (id) => api.delete(`/reservations/${id}`),
};

// ==================== SETTINGS API ====================
export const settingsAPI = {
    get: () => api.get('/settings'),
    update: (data) => api.put('/settings', data),
};

// ==================== SHIFT NOTES API ====================
export const shiftNotesAPI = {
    getAll: () => api.get('/shift-notes'),
    create: (content) => api.post('/shift-notes', { content }),
    togglePin: (id) => api.patch(`/shift-notes/${id}/pin`),
    delete: (id) => api.delete(`/shift-notes/${id}`),
};

export default api;
