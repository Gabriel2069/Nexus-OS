import { createClient } from '@supabase/supabase-js'

const defaultSupabaseUrl = 'https://emewxqxmgqybojibpbjt.supabase.co'
const defaultSupabasePublishableKey = 'sb_publishable_1NzZbLT558ssZxIrjkaz4A_2Fo0Otsy'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || defaultSupabaseUrl
const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || defaultSupabasePublishableKey

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

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
