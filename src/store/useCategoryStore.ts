import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
        } catch (err: any) {
            console.error('Error fetching categories:', err);
            set({ error: err.message, loading: false });
        }
    }
}));
