import { motion } from 'framer-motion';
import { UtensilsCrossed } from 'lucide-react';

/**
 * Premium multi-variant loader component
 * @param {Object} props
 * @param {'spinner' | 'premium' | 'dots' | 'pulse' | 'bar' | 'cafe'} props.variant - Loader style
 * @param {'sm' | 'md' | 'lg'} props.size - Loader size
 * @param {string} props.text - Optional loading text
 * @param {boolean} props.fullScreen - Whether to show as full screen overlay
 */
const Loader = ({
    variant = 'spinner',
    size = 'md',
    text,
    fullScreen = false
}) => {
    const renderLoader = () => {
        switch (variant) {
            case 'premium':
                return <div className={`loader-premium ${size === 'sm' ? 'loader-sm' : size === 'lg' ? 'loader-lg' : ''}`} />;

            case 'dots':
                return (
                    <div className="loader-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                );

            case 'pulse':
                return <div className="loader-pulse" />;

            case 'bar':
                return <div className="loader-bar" />;

            case 'cafe':
                return (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem',
                        }}
                    >
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
                                width: 60,
                                height: 60,
                                background: 'var(--gradient-primary)',
                                borderRadius: 'var(--radius-lg)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 10px 30px rgba(29, 45, 68, 0.4)',
                            }}
                        >
                            <UtensilsCrossed size={28} color="white" />
                        </motion.div>
                        <div className="loader-bar" />
                    </motion.div>
                );

            default:
                return <div className={`loader ${size === 'sm' ? 'loader-sm' : size === 'lg' ? 'loader-lg' : ''}`} />;
        }
    };

    const loaderContent = (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
            }}
        >
            {renderLoader()}
            {text && (
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: '0.9rem',
                    }}
                >
                    {text}
                </motion.p>
            )}
        </motion.div>
    );

    if (fullScreen) {
        return (
            <motion.div
                className="loading-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {loaderContent}
            </motion.div>
        );
    }

    return loaderContent;
};

/**
 * Page loader wrapper - shows centered loader for page content
 */
export const PageLoader = ({ text = 'Loading...' }) => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'var(--spacing-2xl)',
        minHeight: '300px',
    }}>
        <Loader variant="cafe" text={text} />
    </div>
);

/**
 * Inline loader for buttons and small areas
 */
export const InlineLoader = ({ size = 'sm' }) => (
    <Loader variant="spinner" size={size} />
);

/**
 * Skeleton loader components
 */
export const Skeleton = {
    Text: ({ width = '100%', lines = 1 }) => (
        <div style={{ width }}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="skeleton skeleton-text"
                    style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
                />
            ))}
        </div>
    ),

    Circle: ({ size = 40 }) => (
        <div
            className="skeleton skeleton-circle"
            style={{ width: size, height: size }}
        />
    ),

    Card: ({ height = 200 }) => (
        <div
            className="skeleton skeleton-card"
            style={{ height }}
        />
    ),

    StatCard: () => (
        <div className="stat-card">
            <Skeleton.Circle size={48} />
            <div style={{ marginTop: 'var(--spacing-md)' }}>
                <Skeleton.Text width="60%" />
                <Skeleton.Text width="40%" />
            </div>
        </div>
    ),

    TableRow: ({ columns = 5 }) => (
        <tr>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i}>
                    <div className="skeleton skeleton-text" style={{ height: '1rem', width: '80%' }} />
                </td>
            ))}
        </tr>
    ),

    OrderCard: () => (
        <div className="order-card">
            <div className="order-header">
                <Skeleton.Text width="30%" />
                <Skeleton.Text width="20%" />
            </div>
            <div className="order-items" style={{ padding: 'var(--spacing-md)' }}>
                <Skeleton.Text lines={3} />
            </div>
            <div className="order-footer">
                <Skeleton.Text width="30%" />
                <Skeleton.Text width="20%" />
            </div>
        </div>
    ),

    MenuCard: () => (
        <div className="menu-card">
            <Skeleton.Card height={160} />
            <div className="menu-content">
                <Skeleton.Text width="70%" />
                <Skeleton.Text lines={2} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-md)' }}>
                    <Skeleton.Text width="30%" />
                    <Skeleton.Text width="25%" />
                </div>
            </div>
        </div>
    ),
};

export default Loader;
