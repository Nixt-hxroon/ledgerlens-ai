import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

let supabaseClient = null;

if (config.supabase.isConfigured) {
  const key = config.supabase.serviceRoleKey || config.supabase.anonKey;
  supabaseClient = createClient(config.supabase.url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabase = supabaseClient;
