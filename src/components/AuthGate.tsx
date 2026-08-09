import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import type { FormEvent, PropsWithChildren } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ensureProfile } from '../lib/nexus-api'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthGateProps = PropsWithChildren
const LAST_EMAIL_KEY = 'nexus-last-email'

function maskEmail(value: string) {
  const [name, domain] = value.split('@')
  if (!name || !domain) return value
  const visible = name.slice(0, Math.min(2, name.length))
  return `${visible}${'•'.repeat(Math.min(5, Math.max(2, name.length - visible.length)))}@${domain}`
}

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [email, setEmail] = useState(() => localStorage.getItem(LAST_EMAIL_KEY) ?? '')
  const [editingEmail, setEditingEmail] = useState(() => !localStorage.getItem(LAST_EMAIL_KEY))
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remembered = useMemo(() => localStorage.getItem(LAST_EMAIL_KEY) ?? '', [])
  const isGmail = email.trim().toLowerCase().endsWith('@gmail.com')

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
        if (data.user.email) localStorage.setItem(LAST_EMAIL_KEY, data.user.email)
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
      if (session?.user?.email) localStorage.setItem(LAST_EMAIL_KEY, session.user.email)
      if (session?.user) void ensureProfile(session.user)
    })

    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function requestAccess(event?: FormEvent) {
    event?.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!supabase || !cleanEmail) return

    setSubmitting(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        shouldCreateUser: false,
      },
    })

    if (signInError) {
      setError(signInError.message)
    } else {
      localStorage.setItem(LAST_EMAIL_KEY, cleanEmail)
      setEmail(cleanEmail)
      setSent(true)
      setEditingEmail(false)
    }
    setSubmitting(false)
  }

  function changeEmail() {
    setSent(false)
    setEditingEmail(true)
    setError(null)
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
    <main className="auth-screen auth-screen--simple">
      <div className="auth-backdrop" />
      <section className="auth-card auth-card--simple">
        <div className="auth-brand"><Sparkles size={18} /><span>NEXUS OS</span></div>

        {sent ? (
          <div className="auth-sent">
            <div className="auth-sent__icon"><CheckCircle2 size={27} /></div>
            <span className="eyebrow">Quase lá</span>
            <h1>Abra o e-mail.</h1>
            <p>Enviamos um acesso para <strong>{maskEmail(email)}</strong>. Toque no botão do e-mail e você volta direto para o Nexus.</p>
            <div className="auth-sent__actions">
              {isGmail && <a className="primary-button auth-mail-button" href="https://mail.google.com/">Abrir Gmail <ArrowRight size={16} /></a>}
              <button className="secondary-button" onClick={() => void requestAccess()} disabled={submitting}>{submitting ? <LoaderCircle className="spin" size={16} /> : <Mail size={16} />} Reenviar</button>
            </div>
            <button className="text-button auth-change-email" onClick={changeEmail}><ArrowLeft size={14} /> Usar outro e-mail</button>
          </div>
        ) : (
          <>
            <div className="auth-icon"><LockKeyhole size={24} /></div>
            <span className="eyebrow">Acesso privado</span>
            <h1>Entrar no Nexus.</h1>
            <p className="auth-intro">Sem senha para lembrar. O acesso fica salvo neste dispositivo depois que você entrar.</p>

            {!editingEmail && remembered ? (
              <div className="auth-return">
                <div className="auth-return__identity">
                  <div className="auth-return__avatar"><Sparkles size={18} /></div>
                  <div><small>Continuar como</small><strong>{maskEmail(remembered)}</strong></div>
                </div>
                <button className="primary-button auth-submit" onClick={() => void requestAccess()} disabled={submitting}>
                  {submitting ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}
                  {submitting ? 'Enviando…' : 'Continuar'}
                </button>
                <button className="text-button" onClick={() => setEditingEmail(true)}>Usar outro e-mail</button>
              </div>
            ) : (
              <form onSubmit={requestAccess} className="auth-form auth-form--simple">
                <label htmlFor="email">Seu e-mail</label>
                <div className="auth-input">
                  <Mail size={16} />
                  <input id="email" type="email" autoComplete="email" inputMode="email" placeholder="voce@email.com" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus required />
                </div>
                <button className="primary-button auth-submit" disabled={submitting}>
                  {submitting ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}
                  {submitting ? 'Enviando…' : 'Continuar'}
                </button>
                {remembered && <button type="button" className="text-button auth-back-account" onClick={() => { setEmail(remembered); setEditingEmail(false) }}><ArrowLeft size={14} /> Voltar</button>}
              </form>
            )}
          </>
        )}

        {error && <div className="auth-message auth-message--error">{error}</div>}
        <small className="auth-footnote">Conta privada · sessão persistente · acesso protegido pelo Supabase</small>
      </section>
    </main>
  )
}
