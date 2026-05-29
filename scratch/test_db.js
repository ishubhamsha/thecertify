import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = ['profiles', 'certificates', 'leetcode_questions', 'leetcode_user_stats'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table} check failed:`, error.message);
    } else {
      console.log(`Table ${table} check successful. Row count check:`, data.length);
    }
  }
}

checkTables();
