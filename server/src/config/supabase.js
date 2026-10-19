import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export let supabase = null;

if (supabaseUrl && supabaseServiceKey && supabaseUrl !== 'https://your-project-id.supabase.co') {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  console.log('[PalmChain Server] Supabase client initialized.');
} else {
  console.warn(
    '[PalmChain Server] Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured. Database operations will be inactive.'
  );
}
