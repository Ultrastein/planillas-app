import type { ToastItem } from './useToast';
import { useToast } from './useToast';

const COLORS: Record<string, { bg: string; border: string; icon: string }> = {
    success: { bg: '#f0fdf4', border: '#86efac', icon: '✅' },
    error:   { bg: '#fef2f2', border: '#fca5a5', icon: '❌' },
    warning: { bg: '#fffbeb', border: '#fcd34d', icon: '⚠️' },
    info:    { bg: '#eff6ff', border: '#93c5fd', icon: 'ℹ️' },
};

export function Toast({ toast }: { toast: ToastItem }) {
    const { removeToast } = useToast();
    const colors = COLORS[toast.type] ?? COLORS.info;

    return (
        <div style={{
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: '280px',
            maxWidth: '420px',
        }}>
            <span style={{ fontSize: '1rem' }}>{colors.icon}</span>
            <span style={{ flex: 1, fontSize: '0.9rem', color: '#1e293b' }}>{toast.message}</span>
            <button
                onClick={() => removeToast(toast.id)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    fontSize: '1.1rem',
                    padding: '0 2px',
                    lineHeight: 1,
                }}
            >
                ×
            </button>
        </div>
    );
}
