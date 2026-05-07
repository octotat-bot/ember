import { useState } from 'react';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { useMenu } from '../hooks/useMenu';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Search, X, Check, Leaf, Flame } from 'lucide-react';
import toast from 'react-hot-toast';

const MenuItemCard = ({ item, onToggle, onDelete, isAdmin, canToggle }) => (
    <motion.div layout className={`menu-card ${!item.isAvailable ? 'unavailable' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="menu-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1F1F1F', borderBottom: '1px solid rgba(29,45,68,0.06)' }}>
            <span style={{ fontSize: '3rem' }}>🍽️</span>
        </div>
        <div className="menu-content">
            <div className="menu-name">{item.name}</div>
            <div className="menu-description">{item.description || 'Delicious item from our kitchen'}</div>
            <div className="menu-meta">
                {item.isVegetarian && <span className="menu-tag veg"><Leaf size={10} /> Veg</span>}
                {item.spiceLevel > 2 && <span className="menu-tag spicy"><Flame size={10} /> Spicy</span>}
                <span className="menu-tag">{item.category}</span>
            </div>
            <div className="menu-footer">
                <div>
                    <span className="menu-price">₹{item.discountedPrice || item.price}</span>
                    {item.discount > 0 && <span className="menu-price-original">₹{item.price}</span>}
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                    {canToggle && (
                        <button className={`btn btn-sm ${item.isAvailable ? 'btn-success' : 'btn-error'}`} onClick={() => onToggle(item._id)}>
                            {item.isAvailable ? 'Available' : 'Sold Out'}
                        </button>
                    )}
                    {isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => onDelete(item._id)}><Trash2 size={14} /></button>}
                </div>
            </div>
        </div>
    </motion.div>
);

const AddItemModal = ({ isOpen, onClose, onSubmit }) => {
    const [form, setForm] = useState({ name: '', price: '', category: 'main-course', description: '', isVegetarian: false });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (!form.name.trim()) { toast.error('Item name is required'); setLoading(false); return; }
        const price = parseFloat(form.price);
        if (!price || price <= 0) { toast.error('Price must be a positive number'); setLoading(false); return; }
        try {
            await onSubmit({ ...form, price });
            onClose();
            setForm({ name: '', price: '', category: 'main-course', description: '', isVegetarian: false });
        } catch (error) {
            toast.error(error.message || 'Failed to add menu item');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // H-03: Reset form on close
    const handleClose = () => {
        setForm({ name: '', price: '', category: 'main-course', description: '', isVegetarian: false });
        setLoading(false);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <motion.div className="modal" onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                onKeyDown={(e) => { if (e.key === 'Escape') handleClose(); }}>
                <div className="modal-header"><h3 className="modal-title">Add Menu Item</h3><button className="modal-close" onClick={handleClose} aria-label="Close dialog"><X size={20} /></button></div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <div className="input-group"><label className="input-label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                        <div className="input-group"><label className="input-label">Price (₹)</label><input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required min="0" /></div>
                        <div className="input-group"><label className="input-label">Category</label>
                            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                <option value="appetizers">Appetizers</option><option value="main-course">Main Course</option><option value="beverages">Beverages</option><option value="desserts">Desserts</option><option value="snacks">Snacks</option><option value="breakfast">Breakfast</option><option value="specials">Specials</option>
                            </select>
                        </div>
                        <div className="input-group"><label className="input-label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <input type="checkbox" checked={form.isVegetarian} onChange={(e) => setForm({ ...form, isVegetarian: e.target.checked })} /> Vegetarian
                        </label>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding...' : 'Add Item'}</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const Menu = () => {
    const { items, categories, loading, createItem, toggleAvailability, deleteItem } = useMenu();
    const { hasRole } = useAuth();
    const [showAddModal, setShowAddModal] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

    const filteredItems = items.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const handleDelete = (id) => {
        setConfirmDialog({
            open: true,
            title: 'Delete Menu Item?',
            message: 'This will permanently remove this item from the menu. This action cannot be undone.',
            onConfirm: async () => {
                try { await deleteItem(id); } catch { /* handled by hook */ }
                setConfirmDialog({ open: false });
            },
        });
    };

    return (
        <Layout title="Menu Management">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <select className="input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ width: 'auto' }}>
                        <option value="all">All Categories</option>
                        {categories.map((cat) => <option key={cat.category} value={cat.category}>{(cat.category || '').replace(/-/g, ' ')}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '220px' }}>
                        <Search size={14} color="#6B6460" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input className="top-right-search" placeholder="Search menu..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    {hasRole('admin') && <button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Add Item</button>}
                </div>
            </div>

            {loading ? (
                <PageLoader text="Loading menu..." />
            ) : (
                <div className="menu-grid">
                    <AnimatePresence>
                        {filteredItems.length === 0 ? (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--spacing-2xl)', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
                                <span style={{ fontSize: '3rem', opacity: 0.3, marginBottom: 'var(--spacing-md)', display: 'block' }}>🍽️</span>
                                <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>{search || categoryFilter !== 'all' ? 'No items match your search' : 'No menu items'}</h3>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{search || categoryFilter !== 'all' ? 'Try adjusting your search or filter' : 'Add your first menu item to get started'}</p>
                            </motion.div>
                        ) : (
                            filteredItems.map((item) => <MenuItemCard key={item._id} item={item} onToggle={toggleAvailability} onDelete={handleDelete} isAdmin={hasRole('admin')} canToggle={hasRole(['admin', 'chef'])} />)
                        )}
                    </AnimatePresence>
                </div>
            )}

            <AddItemModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={createItem} />
            <ConfirmModal
                isOpen={confirmDialog.open}
                onClose={() => setConfirmDialog({ open: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText="Delete"
                variant="danger"
            />
        </Layout>
    );
};

export default Menu;
