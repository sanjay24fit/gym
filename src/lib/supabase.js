import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
// A relative URL (e.g. "/supabase") goes through the Vite dev proxy
const url = rawUrl.startsWith('/') ? window.location.origin + rawUrl : rawUrl
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!rawUrl || !anonKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing. Copy .env.example to .env')
}

export const supabase = createClient(url, anonKey)

// Separate client that does not touch the logged-in admin session.
// Used by the admin panel to create new owner accounts.
export function createIsolatedClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: 'gm-isolated' },
  })
}
