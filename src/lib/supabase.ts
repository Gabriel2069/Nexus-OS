import { createClient } from '@supabase/supabase-js'

export const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://emewxqxmgqybojibpbjt.supabase.co'

export const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  'sb_publishable_1NzZbLT558ssZxIrjkaz4A_2Fo0Otsy'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
