import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    confirmText = 'Delete',
    cancelText = 'Cancel',
    variant = 'danger', // 'danger' | 'warning' | 'info'
    loading = false,
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: { icon: Trash2, color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.1)', btnClass: 'btn-danger' },
        warning: { icon: AlertTriangle, color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.1)', btnClass: 'btn-warning' },
        info: { icon: AlertTriangle, color: 'var(--color-primary)', bg: 'rgba(29, 45, 68, 0.08)', btnClass: 'btn-primary' },
    };

    const v = variantStyles[variant] || variantStyles.danger;
    const Icon = v.icon;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{ zIndex: 1100 }}
                >
                    <motion.div
                        className="modal"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '400px', width: '90%' }}
                    >
                        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 'var(--radius-lg)',
                                background: v.bg, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto var(--spacing-lg)',
                                color: v.color,
                            }}>
                                <Icon size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--spacing-sm)' }}>
                                {title}
                            </h3>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                {message}
                            </p>
                        </div>
                        <div style={{
                            display: 'flex', gap: 'var(--spacing-sm)',
                            padding: '0 var(--spacing-xl) var(--spacing-xl)',
                        }}>
                            <button
                                className="btn btn-ghost"
                                onClick={onClose}
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                {cancelText}
                            </button>
                            <button
                                className={`btn ${v.btnClass}`}
                                onClick={onConfirm}
                                disabled={loading}
                                style={{ flex: 1, background: variant === 'danger' ? 'var(--color-error)' : undefined, color: variant === 'danger' ? '#fff' : undefined }}
                            >
                                {loading ? 'Please wait...' : confirmText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
