import { describe, it, expect, beforeEach } from 'vitest';
import { useToast } from './useToast';

describe('useToast', () => {
    beforeEach(() => {
        useToast.setState({ toasts: [] });
    });

    it('adds a toast with correct properties', () => {
        useToast.getState().showToast('Guardado correctamente', 'success');
        const toasts = useToast.getState().toasts;
        expect(toasts).toHaveLength(1);
        expect(toasts[0].message).toBe('Guardado correctamente');
        expect(toasts[0].type).toBe('success');
        expect(toasts[0].id).toBeTruthy();
    });

    it('removes a toast by id', () => {
        useToast.getState().showToast('Test', 'info');
        const id = useToast.getState().toasts[0].id;
        useToast.getState().removeToast(id);
        expect(useToast.getState().toasts).toHaveLength(0);
    });

    it('defaults type to info when not specified', () => {
        useToast.getState().showToast('Hello');
        expect(useToast.getState().toasts[0].type).toBe('info');
    });
});
