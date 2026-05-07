import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#FFF4E4',
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        padding: '2rem',
                    }}
                >
                    <div
                        style={{
                            maxWidth: 520,
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.75)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            borderRadius: 16,
                            border: '1px solid rgba(29, 45, 68, 0.06)',
                            borderTop: '1px solid rgba(255, 255, 255, 0.8)',
                            borderLeft: '1px solid rgba(255, 255, 255, 0.8)',
                            boxShadow: '0 12px 24px -4px rgba(29, 45, 68, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
                            padding: '2.5rem',
                            textAlign: 'center',
                        }}
                    >
                        {/* Error Icon */}
                        <div
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: 16,
                                background: 'rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.5rem',
                            }}
                        >
                            <svg
                                width="36"
                                height="36"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#C0392B"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>

                        {/* Heading */}
                        <h1
                            style={{
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                color: '#0A0A0A',
                                marginBottom: '0.5rem',
                                lineHeight: 1.3,
                            }}
                        >
                            Something went wrong
                        </h1>

                        <p
                            style={{
                                fontSize: '0.9rem',
                                color: '#7A8DA0',
                                marginBottom: '1.5rem',
                                lineHeight: 1.6,
                            }}
                        >
                            An unexpected error occurred. Please try again or return to the dashboard.
                        </p>

                        {/* Error Message Code Block */}
                        {this.state.error && (
                            <div
                                style={{
                                    background: '#FFF9F0',
                                    borderRadius: 10,
                                    border: '1px solid rgba(29, 45, 68, 0.06)',
                                    padding: '1rem 1.25rem',
                                    marginBottom: '1.75rem',
                                    textAlign: 'left',
                                    overflowX: 'auto',
                                }}
                            >
                                <code
                                    style={{
                                        fontSize: '0.8rem',
                                        color: '#C0392B',
                                        fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace",
                                        lineHeight: 1.6,
                                        wordBreak: 'break-word',
                                        whiteSpace: 'pre-wrap',
                                    }}
                                >
                                    {this.state.error.toString()}
                                </code>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '0.75rem',
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                            }}
                        >
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                    borderRadius: 10,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: '#141414',
                                    color: '#FFFFFF',
                                    boxShadow: '0 4px 15px rgba(29, 45, 68, 0.4)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(29, 45, 68, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(29, 45, 68, 0.4)';
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="23 4 23 10 17 10" />
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </svg>
                                Try Again
                            </button>

                            <button
                                onClick={() => { window.location.href = '/dashboard'; }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                    borderRadius: 10,
                                    border: '1px solid rgba(29, 45, 68, 0.08)',
                                    cursor: 'pointer',
                                    background: 'transparent',
                                    color: '#3B526E',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(29, 45, 68, 0.04)';
                                    e.currentTarget.style.color = '#0A0A0A';
                                    e.currentTarget.style.borderColor = '#0A0A0A';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#3B526E';
                                    e.currentTarget.style.borderColor = 'rgba(29, 45, 68, 0.08)';
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                                Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
