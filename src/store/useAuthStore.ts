import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    role: 'admin' | 'titular' | 'colaborador';
}

interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    setProfile: (profile: UserProfile | null) => void;
    setLoading: (loading: boolean) => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    isLoading: true,
    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setLoading: (isLoading) => set({ isLoading }),
    logout: async () => {
        localStorage.removeItem('mock_auth');
        await supabase.auth.signOut().catch(() => { });
        set({ user: null, profile: null });
    },
}));
