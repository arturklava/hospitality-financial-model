/**
 * Supabase Client (v4.0)
 * 
 * Initializes and exports the Supabase client instance for cloud connectivity.
 * Uses environment variables for configuration.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

/**
 * Supabase client instance.
 * 
 * This client is used for:
 * - Authentication (sign in, sign out, session management)
 * - Database operations (queries, inserts, updates)
 * - Real-time subscriptions
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

