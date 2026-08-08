import { ArrowRight, LoaderCircle, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import type { FormEvent, PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ensureProfile } from '../lib/nexus-api'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthGateProps = PropsWithChildren

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let alive = true

    supabase.auth.getUser().then(async ({ data, error: authError }) => {
      if (!alive) return
      if (authError) setError(authError.message)
      if (data.user) {
        setUser(data.user)
        try {
          await ensureProfile(data.user)
        } catch (profileError) {
          console.error('Could not ensure Nexus profile', profileError)
        }
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) void ensureProfile(session.user)
    })

    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !email.trim()) return

    setSubmitting(true)
    setError(null)
    setMessage(null)

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        shouldCreateUser: true,
      },
    })

    if (signInError) setError(signInError.message)
    else setMessage('Link enviado. Abra o e-mail neste dispositivo para entrar no Nexus.')
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="auth-screen auth-screen--center">
        <LoaderCircle className="spin" size={28} />
        <span>Inicializando Nexus…</span>
      </div>
    )
  }

  if (!isSupabaseConfigured || user) return children

  return (
    <main className="auth-screen">
      <div className="auth-backdrop" />
      <section className="auth-card">
        <div className="auth-brand"><Sparkles size={18} /><span>NEXUS OS</span></div>
        <div className="auth-icon"><LockKeyhole size={24} /></div>
        <span className="eyebrow">Acesso privado</span>
        <h1>Entre no seu Nexus.</h1>
        <p>Seu sistema pessoal fica isolado por conta. Use seu e-mail e receba um link seguro de acesso.</p>

        <form onSubmit={sendMagicLink} className="auth-form">
          <label htmlFor="email">E-mail</label>
          <div className="auth-input">
            <Mail size={16} />
            <input id="email" type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <button className="primary-button auth-submit" disabled={submitting}>
            {submitting ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}
            {submitting ? 'Enviando…' : 'Enviar link de acesso'}
          </button>
        </form>

        {message && <div className="auth-message auth-message--success">{message}</div>}
        {error && <div className="auth-message auth-message--error">{error}</div>}
        <small className="auth-footnote">A autenticação é gerenciada pelo Supabase; nenhuma senha é armazenada pelo frontend.</small>
      </section>
    </main>
  )
}
