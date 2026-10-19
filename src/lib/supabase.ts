import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Without both values createClient throws on import and the whole app renders blank
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = createClient(
    supabaseUrl || 'http://localhost:54321',
    supabaseKey || 'missing-supabase-key'
);
