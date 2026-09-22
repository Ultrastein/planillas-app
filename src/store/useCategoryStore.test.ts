import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCategoryStore } from './useCategoryStore';
import { supabase } from '../lib/supabase';

describe('useCategoryStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCategoryStore.setState({ categories: [], loading: false, error: null });
    });

    it('fetchCategories populates categories on success', async () => {
        const categories = [{ id: '1', name: 'Robótica' }, { id: '2', name: 'Historia' }];
        supabase.from = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: categories, error: null }),
        });

        await useCategoryStore.getState().fetchCategories();

        expect(supabase.from).toHaveBeenCalledWith('thematic_categories');
        expect(useCategoryStore.getState().categories).toEqual(categories);
        expect(useCategoryStore.getState().loading).toBe(false);
        expect(useCategoryStore.getState().error).toBeNull();
    });

    it('fetchCategories sets error and empty list on failure', async () => {
        supabase.from = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('boom') }),
        });

        await useCategoryStore.getState().fetchCategories();

        expect(useCategoryStore.getState().categories).toEqual([]);
        expect(useCategoryStore.getState().error).toBe('boom');
        expect(useCategoryStore.getState().loading).toBe(false);
    });

    it('sets loading to true while fetching', () => {
        supabase.from = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn(() => new Promise(() => { })), // never resolves
        });

        useCategoryStore.getState().fetchCategories();

        expect(useCategoryStore.getState().loading).toBe(true);
    });
});
