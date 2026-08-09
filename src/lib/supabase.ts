import { createClient } from '@supabase/supabase-js'

const defaultSupabaseUrl = 'https://emewxqxmgqybojibpbjt.supabase.co'
const defaultSupabasePublishableKey = 'sb_publishable_1NzZbLT558ssZxIrjkaz4A_2Fo0Otsy'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || defaultSupabaseUrl
const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || defaultSupabasePublishableKey

const isLocalDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey) && !isLocalDevelopment

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
