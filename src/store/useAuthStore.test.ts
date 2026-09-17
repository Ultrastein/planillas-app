import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './useAuthStore';
import { supabase } from '../lib/supabase';

describe('useAuthStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.setState({ user: null, profile: null, isLoading: true });
    });

    it('sets user correctly', () => {
        const fakeUser = { id: 'u1' } as ReturnType<typeof useAuthStore.getState>['user'];
        useAuthStore.getState().setUser(fakeUser);
        expect(useAuthStore.getState().user).toEqual(fakeUser);
    });

    it('sets profile correctly', () => {
        const profile = { id: '1', email: 'test@edu.ar', name: 'Docente', role: 'titular' as const, auth_provider: 'local' };
        useAuthStore.getState().setProfile(profile);
        expect(useAuthStore.getState().profile).toEqual(profile);
    });

    it('sets loading correctly', () => {
        useAuthStore.getState().setLoading(false);
        expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('fetchProfile populates profile on success', async () => {
        const profile = { id: '1', email: 'admin@edu.ar', name: 'Admin', role: 'admin', auth_provider: 'local' };
        supabase.from = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: profile, error: null }),
        });

        await useAuthStore.getState().fetchProfile('1');

        expect(supabase.from).toHaveBeenCalledWith('users');
        expect(useAuthStore.getState().profile).toEqual(profile);
    });

    it('fetchProfile sets profile to null on error', async () => {
        supabase.from = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
        });

        useAuthStore.setState({ profile: { id: '1', email: 'a@a.com', name: 'A', role: 'admin', auth_provider: 'local' } });
        await useAuthStore.getState().fetchProfile('1');

        expect(useAuthStore.getState().profile).toBeNull();
    });

    it('logout calls supabase signOut and clears user/profile', async () => {
        supabase.auth.signOut = vi.fn().mockResolvedValue({ error: null });
        useAuthStore.setState({
            user: { id: 'u1' } as ReturnType<typeof useAuthStore.getState>['user'],
            profile: { id: '1', email: 'a@a.com', name: 'A', role: 'admin', auth_provider: 'local' },
        });

        await useAuthStore.getState().logout();

        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(useAuthStore.getState().user).toBeNull();
        expect(useAuthStore.getState().profile).toBeNull();
    });
});
