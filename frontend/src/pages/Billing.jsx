import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useOrders } from '../hooks/useOrders';
import { useSocket } from '../context/SocketContext';

import { PageLoader } from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, DollarSign, Receipt, X, Check, Clock, Printer, Download } from 'lucide-react';
import toast from 'react-hot-toast';

// Generate and download invoice as PDF (using browser print API)
// H-02: Uses iframe fallback when popup is blocked
const exportInvoicePDF = (order) => {
    const items = order.items || [];
    const subtotal = order.subtotal || order.totalAmount || 0;
    const tax = order.taxAmount || 0;
    const total = order.totalAmount || subtotal + tax;

    const itemsHTML = items.map((item) =>
        `<tr>
            <td style="padding:6px 0;border-bottom:1px dashed #ddd;">${item.quantity}x ${item.name}</td>
            <td style="padding:6px 0;border-bottom:1px dashed #ddd;text-align:right;">₹${(item.price * item.quantity).toFixed(0)}</td>
        </tr>`
    ).join('');

    const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice - ${order.orderNumber}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Courier New', monospace; padding: 20px; max-width: 350px; margin: 0 auto; color: #0A0A0A; }
                .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #0A0A0A; }
                .header h1 { font-size: 24px; letter-spacing: 2px; }
                .header p { font-size: 11px; color: #666; margin-top: 4px; }
                .info { margin-bottom: 15px; font-size: 12px; }
                .info div { display: flex; justify-content: space-between; padding: 3px 0; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
                .totals { border-top: 2px solid #0A0A0A; padding-top: 10px; margin-top: 10px; font-size: 12px; }
                .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
                .totals .grand-total { font-size: 18px; font-weight: bold; margin-top: 8px; padding-top: 8px; border-top: 1px solid #0A0A0A; }
                .footer { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px dashed #999; font-size: 11px; color: #666; }
                @media print {
                    body { padding: 0; }
                    @page { margin: 10mm; size: 80mm auto; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Ember</h1>
                <p>Restaurant Management</p>
            </div>
            <div class="info">
                <div><span>Invoice:</span><span>${order.orderNumber}</span></div>
                <div><span>Table:</span><span>Table ${order.tableNumber}</span></div>
                <div><span>Date:</span><span>${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}</span></div>
                <div><span>Time:</span><span>${order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span></div>
            </div>
            <table>${itemsHTML}</table>
            <div class="totals">
                <div><span>Subtotal</span><span>₹${subtotal.toFixed(0)}</span></div>
                <div><span>Tax (${order.taxRate || 18}%)</span><span>₹${tax.toFixed(0)}</span></div>
                <div class="grand-total"><span>TOTAL</span><span>₹${total.toFixed(0)}</span></div>
            </div>
            <div class="footer">
                <p>Thank you for dining with us!</p>
                <p style="margin-top:4px;">Powered by Ember</p>
            </div>
            <script>
                window.onload = function() { window.print(); };
            </script>
        </body>
        </html>
    `;

    // Try popup first; fall back to hidden iframe
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
    } else {
        // Iframe fallback — works even when popups are blocked
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '400px';
        iframe.style.height = '600px';
        document.body.appendChild(iframe);
        iframe.contentDocument.write(invoiceHTML);
        iframe.contentDocument.close();
        iframe.onload = () => {
            try {
                iframe.contentWindow.print();
            } catch {
                toast.error('Unable to print. Please try again.');
            }
            setTimeout(() => document.body.removeChild(iframe), 5000);
        };
    }
};

const InvoiceModal = ({ order, isOpen, onClose, onPayment }) => {
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [discount, setDiscount] = useState(0);
    const [discountReason, setDiscountReason] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !order) return null;

    const subtotal = order.subtotal || 0;
    const tax = order.taxAmount || 0;
    const maxDiscount = subtotal * 0.5; // C-03: Max 50% of subtotal (matches backend)
    const discountAmt = Math.min(Math.max(parseFloat(discount) || 0, 0), maxDiscount);
    const total = Math.max(subtotal + tax - discountAmt, 0);

    const handlePayment = async () => {
        setLoading(true);
        try {
            await onPayment(order._id, { paymentMethod, paidAmount: total, discountAmount: discountAmt, discountReason });
            onClose();
        } catch (error) {
            toast.error(error.message || 'Payment failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div className="modal" onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">Invoice #{order.orderNumber}</h3>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="modal-body">
                    <div style={{ background: 'var(--color-bg-tertiary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Table</span>
                            <span style={{ fontWeight: 600 }}>{order.tableNumber}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Date</span>
                            <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}</span>
                        </div>
                    </div>

                    <h4 style={{ marginBottom: 'var(--spacing-md)' }}>Items</h4>
                    {order.items?.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-border-light)' }}>
                            <span>{item.quantity}x {item.name}</span>
                            <span>₹{(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                    ))}

                    <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                            <span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                            <span>Tax ({order.taxRate || 18}%)</span><span>₹{tax.toFixed(0)}</span>
                        </div>
                        {discountAmt > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)', color: 'var(--color-success)' }}>
                                <span>Discount</span><span>-₹{discountAmt.toFixed(0)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--spacing-md)', borderTop: '2px solid var(--color-border)', fontWeight: 700, fontSize: '1.25rem' }}>
                            <span>Total</span><span style={{ color: 'var(--color-success)' }}>₹{total.toFixed(0)}</span>
                        </div>
                    </div>

                    <div style={{ marginTop: 'var(--spacing-lg)' }}>
                        <label className="input-label">Discount (₹)</label>
                        <input type="number" className="input" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" min="0" max={maxDiscount} />
                        {parseFloat(discount) > maxDiscount && (
                            <div style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Max discount: ₹{maxDiscount.toFixed(0)} (50% of subtotal)</div>
                        )}
                        {discount > 0 && (
                            <input type="text" className="input" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="Discount reason" style={{ marginTop: 'var(--spacing-sm)' }} />
                        )}
                    </div>

                    <div style={{ marginTop: 'var(--spacing-lg)' }}>
                        <label className="input-label">Payment Method</label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                            {['cash', 'card', 'upi'].map((method) => (
                                <button key={method} className={`btn ${paymentMethod === method ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPaymentMethod(method)}>
                                    {method.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={() => exportInvoicePDF(order)}><Printer size={18} /> Print Invoice</button>
                    <button className="btn btn-success" onClick={handlePayment} disabled={loading}>
                        {loading ? 'Processing...' : <><Check size={18} /> Complete Payment</>}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const Billing = () => {
    const { orders, loading, processPayment, refetch } = useOrders({ type: 'unpaid' });
    const { socket } = useSocket();
    const [selectedOrder, setSelectedOrder] = useState(null);


    useEffect(() => {
        if (!socket?.on) return;
        const handleRefresh = () => refetch();
        socket.on('order:updated', handleRefresh);
        socket.on('payment:completed', handleRefresh);
        return () => { socket.off('order:updated', handleRefresh); socket.off('payment:completed', handleRefresh); };
    }, [socket, refetch]);

    return (
        <Layout title="Billing">
            <div className="stats-grid" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div className="stat-card">
                    <div className="stat-icon"><Receipt size={24} /></div>
                    <div className="stat-value">{orders.length}</div>
                    <div className="stat-label">Pending Bills</div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}><DollarSign size={24} /></div>
                    <div className="stat-value">₹{orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(0)}</div>
                    <div className="stat-label">Total Pending</div>
                </div>
            </div>

            {loading ? (
                <PageLoader text="Loading bills..." />
            ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
                    <CreditCard size={64} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }} />
                    <h3>No Pending Bills</h3>
                    <p style={{ color: 'var(--color-text-muted)' }}>All orders have been paid</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
                    {orders.map((order) => (
                        <motion.div key={order._id} className="card" whileHover={{ scale: 1.02 }} style={{ cursor: 'pointer' }} onClick={() => setSelectedOrder(order)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{order.orderNumber}</span>
                                <span className={`badge status-${order.status}`}>{order.status}</span>
                            </div>
                            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 700 }}>Table {order.tableNumber}</div>
                                <div style={{ color: 'var(--color-text-muted)' }}>{order.items?.length} items</div>
                                {order.waiter?.name && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                        Waiter: <span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>{order.waiter.name}</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border-light)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-text-muted)' }}>
                                        <Clock size={14} />
                                        {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </span>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        style={{ padding: '0.3rem' }}
                                        onClick={(e) => { e.stopPropagation(); exportInvoicePDF(order); }}
                                        title="Export Invoice"
                                    >
                                        <Download size={14} />
                                    </button>
                                </div>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>₹{order.totalAmount?.toFixed(0)}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <InvoiceModal order={selectedOrder} isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} onPayment={processPayment} />
        </Layout>
    );
};

export default Billing;
