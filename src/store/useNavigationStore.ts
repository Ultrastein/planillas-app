import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { getErrorMessage } from '../lib/errors';

export interface NavigationTab {
    id: string;
    label: string;
    path: string;
    order_index: number;
}

interface NavigationState {
    tabs: NavigationTab[];
    loading: boolean;
    error: string | null;
    fetchTabs: () => Promise<void>;
}

export const useNavigationStore = create<NavigationState>((set) => ({
    tabs: [],
    loading: false,
    error: null,

    fetchTabs: async () => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('navigation_tabs')
                .select('*')
                .order('order_index', { ascending: true });

            if (error) throw error;
            set({ tabs: data || [], loading: false });
        } catch (err: unknown) {
            console.error('Error fetching navigation tabs:', err);
            set({ error: getErrorMessage(err), loading: false });
        }
    }
}));
