import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : null;
const key = keyMatch ? keyMatch[1].trim() : null;

const supabase = createClient(url, key);

async function fetchUsers() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error("Error fetching users:", error);
        return;
    }
    
    const { data: profiles, error: profileError } = await supabase.from('users').select('*');
    
    console.log("=== SUPABASE USERS ===");
    for (const u of users) {
        const profile = profiles?.find(p => p.id === u.id);
        console.log(`Email: ${u.email}`);
        console.log(`Role: ${profile ? profile.role : 'Unknown'}`);
        console.log(`Name: ${profile ? profile.name : 'Unknown'}`);
        console.log('---');
    }
}

fetchUsers();
