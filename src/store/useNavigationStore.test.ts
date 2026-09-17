import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNavigationStore } from './useNavigationStore';
import { supabase } from '../lib/supabase';

describe('useNavigationStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useNavigationStore.setState({ tabs: [], loading: false, error: null });
    });

    it('fetchTabs populates tabs on success', async () => {
        const tabs = [
            { id: '1', label: 'Editor', path: '/editor', order_index: 0 },
            { id: '2', label: 'Admin', path: '/admin', order_index: 1 },
        ];
        supabase.from = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: tabs, error: null }),
        });

        await useNavigationStore.getState().fetchTabs();

        expect(supabase.from).toHaveBeenCalledWith('navigation_tabs');
        expect(useNavigationStore.getState().tabs).toEqual(tabs);
        expect(useNavigationStore.getState().loading).toBe(false);
    });

    it('fetchTabs sets error and empty list on failure', async () => {
        supabase.from = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('boom') }),
        });

        await useNavigationStore.getState().fetchTabs();

        expect(useNavigationStore.getState().tabs).toEqual([]);
        expect(useNavigationStore.getState().error).toBe('boom');
        expect(useNavigationStore.getState().loading).toBe(false);
    });
});
