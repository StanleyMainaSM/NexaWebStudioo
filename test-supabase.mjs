import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://uhbyruktnhktjeuqsqut.supabase.co';
const supabaseAnonKey = 'sb_publishable_Qh8k6f0pMdQfwNb4_nhWIA_rn1XVwkg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
supabase.auth.signInWithPassword({ email: 'test@example.com', password: 'password' })
  .then(({data, error}) => console.log('Error:', error?.message))
  .catch(console.error);
