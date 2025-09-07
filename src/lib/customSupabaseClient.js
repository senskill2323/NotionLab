import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing. Check .env (VITE_SUPABASE_URL/ANON_KEY).');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);