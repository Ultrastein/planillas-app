import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error no controlado capturado por ErrorBoundary:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100vh',
                        padding: '24px',
                        textAlign: 'center',
                        backgroundColor: '#f8fafc',
                    }}
                >
                    <div
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '32px',
                            maxWidth: '440px',
                            width: '90%',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                        }}
                    >
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⚠️</div>
                        <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#1e293b' }}>
                            Algo salió mal
                        </h2>
                        <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: '#64748b' }}>
                            Ocurrió un error inesperado y la aplicación no puede continuar.
                            Podés intentar recargar la página; si el problema persiste, contactá al administrador.
                        </p>
                        <button
                            onClick={this.handleReload}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#2563eb',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                            }}
                        >
                            Recargar página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
