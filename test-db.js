import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : null;
const key = keyMatch ? keyMatch[1].trim() : null;

const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase.from('documents').select('*').limit(1);
    console.log("Error:", error);
    if (data && data.length > 0) {
        console.log("Columns:", Object.keys(data[0]));

        // Try deleting pseudo
        const docId = data[0].id;
        const res = await supabase.from('documents').update({ status: 'deleted', delete_reason: 'Testing' }).eq('id', docId);
        console.log("Update res:", res.error);
    } else {
        console.log("No data found.");
    }
}
check();
