import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : null;
const key = keyMatch ? keyMatch[1].trim() : null;

const supabase = createClient(url, key);

async function fixPolicies() {
    const sql = `
        DROP POLICY IF EXISTS "Active documents viewable by all authenticated users" ON public.documents;
        CREATE POLICY "Active documents viewable by all authenticated users"
          ON public.documents FOR SELECT
          TO authenticated
          USING ( status = 'active' OR author_id = auth.uid() OR coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), public.get_user_role()) = 'admin' );
          
        DROP POLICY IF EXISTS "Authors can update their own documents (soft delete)" ON public.documents;
        CREATE POLICY "Authors can update their own documents (soft delete)"
          ON public.documents FOR UPDATE
          TO authenticated
          USING ( author_id = auth.uid() OR coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), public.get_user_role()) = 'admin' );
    `;

    // We can execute SQL by creating an RPC function temporarily, but using Supabase Dashboard is usually needed for raw SQL unless we use postgres connection.
    // Instead, I'll use postgres module or just output this to a file and tell the user, BUT since I have the service key, I can't just run SQL directly without the psql url. 
    // Wait, the project has 'supabase_schema.sql'. I can just update the schema file and inform the user.
}
fixPolicies();
