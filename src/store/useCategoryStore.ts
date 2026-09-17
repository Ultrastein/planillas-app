import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { getErrorMessage } from '../lib/errors';

export interface ThematicCategory {
    id: string;
    name: string;
}

interface CategoryState {
    categories: ThematicCategory[];
    loading: boolean;
    error: string | null;
    fetchCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
    categories: [],
    loading: false,
    error: null,

    fetchCategories: async () => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('thematic_categories')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            set({ categories: data || [], loading: false });
        } catch (err: unknown) {
            console.error('Error fetching categories:', err);
            set({ error: getErrorMessage(err), loading: false });
        }
    }
}));
