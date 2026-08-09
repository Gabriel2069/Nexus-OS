import { createClient } from '@supabase/supabase-js'

const defaultSupabaseUrl = 'https://emewxqxmgqybojibpbjt.supabase.co'
const defaultSupabasePublishableKey = 'sb_publishable_1NzZbLT558ssZxIrjkaz4A_2Fo0Otsy'
const recoveryToken = 'RJndK2qH3J_a8JAnYKi4-1hvEbwHpTYn'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || defaultSupabaseUrl
const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || defaultSupabasePublishableKey

const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const isLocalDevelopment = hostname === 'localhost' || hostname === '127.0.0.1'
export const isRecoveryMode =
  hostname === 'nexus-os.gtadeusz.workers.dev' &&
  search.get('recovery') === recoveryToken

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey) && !isLocalDevelopment && !isRecoveryMode

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    experimental: {
      passkey: true,
    },
  },
})
