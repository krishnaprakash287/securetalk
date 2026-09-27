// ==============================================================================
// SecureTalk Supabase Client Configuration
// Client uses public publishable key ONLY. Never exposes service-role keys.
// ==============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kpyuxeeefwyxlmsxepjv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_CuJrfXYwIbsQg3MBLaO70Q_MLM69mYg';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage, // Session token only (NO private keys!)
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
