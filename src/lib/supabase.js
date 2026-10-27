import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
// A relative URL (e.g. "/supabase") goes through the Vite dev proxy
const url = rawUrl.startsWith('/') ? window.location.origin + rawUrl : rawUrl
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  anonKey &&
  !rawUrl.includes('YOUR-PROJECT') &&
  anonKey !== 'YOUR-ANON-KEY'
)

// Use fallback dummy values if not configured yet, so module evaluation doesn't crash React
const clientUrl = isSupabaseConfigured && url ? url : 'https://placeholder.supabase.co'
const clientKey = isSupabaseConfigured && anonKey ? anonKey : 'placeholder-anon-key'

export const supabase = createClient(clientUrl, clientKey)

// Separate client that does not touch the logged-in admin session.
// Used by the admin panel to create new owner accounts.
export function createIsolatedClient() {
  return createClient(clientUrl, clientKey, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: 'gm-isolated' },
  })
}
