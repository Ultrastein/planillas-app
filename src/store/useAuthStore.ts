import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'titular' | 'colaborador';
    auth_provider: string;
    last_access?: string;
}

interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    setProfile: (profile: UserProfile | null) => void;
    setLoading: (loading: boolean) => void;
    fetchProfile: (userId: string) => Promise<void>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    isLoading: true,
    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setLoading: (isLoading) => set({ isLoading }),
    fetchProfile: async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            if (data) {
                set({ profile: data as UserProfile });
            }
        } catch (err) {
            console.error('Error fetching user profile:', err);
            set({ profile: null });
        }
    },
    logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
    },
}));
