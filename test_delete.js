import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qyxfxkpzogetdgdrlala.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5eGZ4a3B6b2dldGRnZHJsYWxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyMzAyNywiZXhwIjoyMDg3Nzk5MDI3fQ.NcsuWVHhkhYd8gi92aNwfAMn48xwpK_5L7NB4xR9lAE';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testDelete() {
    const { data: docs } = await supabase.from('documents').select('id, title').eq('status', 'active').limit(1);
    if (!docs || docs.length === 0) { console.log("No docs available"); return; }
    const docId = docs[0].id;
    console.log("Testing soft-delete on doc: " + docs[0].title);

    const { error } = await supabase
        .from('documents')
        .update({ status: 'deleted', delete_reason: 'Testing delete button' })
        .eq('id', docId);

    if (error) {
        console.error("SOFT DELETE ERROR:", error);
    } else {
        console.log("SOFT DELETE SUCCESS");
        await supabase.from('documents').update({ status: 'active', delete_reason: null }).eq('id', docId);
        console.log("Restored");
    }
}
testDelete();
