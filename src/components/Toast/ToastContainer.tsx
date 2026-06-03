import { useToast } from './useToast';
import { Toast } from './Toast';

export function ToastContainer() {
    const { toasts } = useToast();

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 9999,
            pointerEvents: 'none',
        }}>
            {toasts.map(t => (
                <div key={t.id} style={{ pointerEvents: 'auto' }}>
                    <Toast toast={t} />
                </div>
            ))}
        </div>
    );
}
