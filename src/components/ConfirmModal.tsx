interface ConfirmModalProps {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    title,
    message,
    confirmLabel = 'Confirmar',
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(14, 26, 36, 0.45)',
                zIndex: 1300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '18px',
                    padding: '28px',
                    maxWidth: '420px',
                    width: '90%',
                    boxShadow: 'var(--shadow-lg)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {title}
                </h3>
                <p style={{ margin: '0 0 24px', fontSize: '15px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            minHeight: '44px',
                            padding: '0 18px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-strong)',
                            background: 'white',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            minHeight: '44px',
                            padding: '0 18px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: 'var(--danger-color)',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
