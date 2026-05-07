import { motion } from 'framer-motion';

/**
 * Enhanced empty state component for when no data is available
 */
const EmptyState = ({
    icon: Icon,
    title,
    description,
    action,
    actionLabel,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="empty-state"
        >
            {Icon && (
                <div className="empty-state-icon">
                    <Icon size={40} />
                </div>
            )}
            <h3 className="empty-state-title">{title}</h3>
            {description && (
                <p className="empty-state-description">{description}</p>
            )}
            {action && actionLabel && (
                <button className="btn btn-primary" onClick={action}>
                    {actionLabel}
                </button>
            )}
        </motion.div>
    );
};

export default EmptyState;
