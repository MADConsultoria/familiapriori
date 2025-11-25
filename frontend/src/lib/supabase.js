import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

const url = window.__ENV?.SUPABASE_URL || '';
const key = window.__ENV?.SUPABASE_ANON_KEY || '';

let client = window.__supabaseClient || null;
if (!client && url && key) {
  client = createClient(url, key);
  window.__supabaseClient = client;
}

export default client;
