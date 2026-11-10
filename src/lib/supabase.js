import { createClient } from '@supabase/supabase-js';

// These two values come from your Supabase project (see README). They are
// baked into the site when it is built. The anon/publishable key is meant to
// be public - the database's own security rules protect the data.
const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

export let supabase = isConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

// Used by automated tests to point the app at a test server.
export function _setClient(client) {
  supabase = client;
}
