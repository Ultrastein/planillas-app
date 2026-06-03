import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastState {
    toasts: ToastItem[];
    showToast: (message: string, type?: ToastType) => void;
    removeToast: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
    toasts: [],
    showToast: (message, type = 'info') => {
        const id = Math.random().toString(36).slice(2);
        set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => {
            set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
        }, 4000);
    },
    removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));
