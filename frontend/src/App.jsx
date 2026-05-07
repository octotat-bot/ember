import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded pages (code splitting)
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Kitchen = lazy(() => import('./pages/Kitchen'));
const Tables = lazy(() => import('./pages/Tables'));
const Orders = lazy(() => import('./pages/Orders'));
const Menu = lazy(() => import('./pages/Menu'));
const Billing = lazy(() => import('./pages/Billing'));
const ReadyOrders = lazy(() => import('./pages/ReadyOrders'));
const Staff = lazy(() => import('./pages/Staff'));
const Settings = lazy(() => import('./pages/Settings'));
const Analytics = lazy(() => import('./pages/Analytics'));

// Premium Loading Screen (Updated Palette)
const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-bg-primary)',
    gap: '1.5rem',
  }}>
    <motion.div
      animate={{
        rotate: 360,
        scale: [1, 1.1, 1],
      }}
      transition={{
        rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
        scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
      }}
      style={{
        width: 72,
        height: 72,
        background: 'var(--color-primary)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-glow)',
      }}
    >
      <UtensilsCrossed size={36} color="#0A0A0A" />
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{
        color: 'var(--color-primary)',
        fontSize: '1.75rem',
        fontWeight: 700,
      }}
    >
      Ember
    </motion.div>
    {/* Simple loader bar using css var */}
    <div style={{
      width: '120px',
      height: '4px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '2px',
      overflow: 'hidden'
    }}>
      <motion.div
        animate={{ x: [-120, 120] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: '60%',
          height: '100%',
          background: 'var(--color-primary)',
          borderRadius: '2px'
        }}
      />
    </div>
  </div>
);

// Minimal Fallback for Route Transitions
const RouteFallback = () => (
  <div className="flex items-center justify-center p-12 w-full h-full">
    <div className="loader-premium"></div>
  </div>
);

// Protected Route Component
const getRoleDefaultRoute = (role) => {
  const map = {
    admin: '/dashboard',
    waiter: '/orders',
    chef: '/kitchen',
    cashier: '/billing',
    runner: '/ready-orders'
  };
  return map[role] || '/login';
};

const ProtectedRoute = ({ children, roles }) => {
  const { user, isAuthenticated, loading, hasRole } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles && roles.length > 0 && !hasRole(roles)) {
    return <Navigate to={getRoleDefaultRoute(user?.role)} replace />;
  }

  return children;
};

const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleDefaultRoute(user?.role)} replace />;
};

// App Routes with AnimatePresence for page transitions
const AppRoutes = () => {
  const location = useLocation();

  return (
    <Suspense fallback={<RouteFallback />}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Routes location={location}>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute roles={['admin', 'waiter', 'cashier']}><Orders /></ProtectedRoute>} />
            <Route path="/kitchen" element={<ProtectedRoute roles={['admin', 'chef']}><Kitchen /></ProtectedRoute>} />
            <Route path="/tables" element={<ProtectedRoute roles={['admin', 'waiter']}><Tables /></ProtectedRoute>} />
            <Route path="/menu" element={<ProtectedRoute roles={['admin', 'waiter', 'chef']}><Menu /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute roles={['admin', 'cashier']}><Billing /></ProtectedRoute>} />
            <Route path="/ready-orders" element={<ProtectedRoute roles={['admin', 'chef', 'waiter', 'runner']}><ReadyOrders /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute roles={['admin']}><Staff /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute roles={['admin']}><Analytics /></ProtectedRoute>} />

            {/* Redirects */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#141414',
                  color: '#FFFFFF',
                  border: '1px solid #333333',
                  borderRadius: '0px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                },
                success: {
                  iconTheme: { primary: '#FFFFFF', secondary: '#0A0A0A' },
                  style: {
                    borderLeft: '4px solid #FFFFFF',
                  },
                },
                error: {
                  iconTheme: { primary: '#525252', secondary: '#FFFFFF' },
                  style: {
                    borderLeft: '4px solid #525252',
                  },
                },
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
