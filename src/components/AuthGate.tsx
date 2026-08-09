import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Fingerprint,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { FormEvent, PropsWithChildren } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ensureProfile } from '../lib/nexus-api'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthGateProps = PropsWithChildren

const LAST_EMAIL_KEY = 'nexus-last-email'
const EMAIL_COOLDOWN_KEY = 'nexus-email-cooldown-until'
const PASSKEY_SKIP_KEY = 'nexus-passkey-skip-until'
const REQUEST_COOLDOWN_MS = 60_000
const RATE_LIMIT_COOLDOWN_MS = 60 * 60_000
const PASSKEY_SKIP_MS = 24 * 60 * 60_000

function maskEmail(value: string) {
  const [name, domain] = value.split('@')
  if (!name || !domain) return value
  const visible = name.slice(0, Math.min(2, name.length))
  return `${visible}${'•'.repeat(Math.min(5, Math.max(2, name.length - visible.length)))}@${domain}`
}

function getErrorCode(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error) {
    return String((error as { code?: unknown }).code ?? '')
  }
  return ''
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '')
  }
  return error instanceof Error ? error.message : String(error ?? '')
}

function friendlyAuthError(error: unknown) {
  const code = getErrorCode(error)
  const message = getErrorMessage(error).toLowerCase()

  if (code === 'over_email_send_rate_limit' || message.includes('rate limit')) {
    return 'O Supabase bloqueou novos e-mails por excesso de tentativas. O Nexus pausou novos envios por uma hora para não prolongar o bloqueio; prefira uma passkey.'
  }
  if (code === 'otp_disabled' || message.includes('signups not allowed for otp')) {
    return 'Esse e-mail não foi reconhecido como uma conta existente do Nexus. Confira o endereço usado no primeiro acesso.'
  }
  if (code === 'passkey_disabled') {
    return 'As passkeys ainda precisam ser habilitadas nas configurações de autenticação do Supabase deste projeto.'
  }
  if (code === 'webauthn_credential_not_found' || message.includes('credential') && message.includes('not found')) {
    return 'Nenhuma passkey do Nexus foi encontrada neste dispositivo. Use o e-mail uma vez e cadastre Face ID, Touch ID ou PIN depois de entrar.'
  }
  if (message.includes('notallowederror') || message.includes('the operation either timed out or was not allowed')) {
    return 'A autenticação biométrica foi cancelada ou não autorizada pelo dispositivo.'
  }
  return getErrorMessage(error) || 'Não foi possível entrar no Nexus.'
}

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [email, setEmail] = useState(() => localStorage.getItem(LAST_EMAIL_KEY) ?? '')
  const [editingEmail, setEditingEmail] = useState(() => !localStorage.getItem(LAST_EMAIL_KEY))
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [passkeySubmitting, setPasskeySubmitting] = useState(false)
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [passkeyEnrollment, setPasskeyEnrollment] = useState(false)
  const [passkeyEnrollmentChecking, setPasskeyEnrollmentChecking] = useState(false)
  const [passkeyEnrollmentSubmitting, setPasskeyEnrollmentSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldownUntil, setCooldownUntil] = useState(() => Number(localStorage.getItem(EMAIL_COOLDOWN_KEY) ?? '0'))
  const [now, setNow] = useState(Date.now())

  const remembered = useMemo(() => localStorage.getItem(LAST_EMAIL_KEY) ?? '', [])
  const isGmail = email.trim().toLowerCase().endsWith('@gmail.com')
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const emailBlocked = cooldownSeconds > 0

  useEffect(() => {
    setPasskeySupported(
      typeof window !== 'undefined' &&
      window.isSecureContext &&
      'PublicKeyCredential' in window,
    )
  }, [])

  useEffect(() => {
    if (!emailBlocked) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [emailBlocked])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let alive = true

    supabase.auth.getUser().then(async ({ data, error: authError }) => {
      if (!alive) return
      if (authError) setError(friendlyAuthError(authError))
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

  useEffect(() => {
    if (!supabase || !user || !passkeySupported) return
    const skipUntil = Number(localStorage.getItem(PASSKEY_SKIP_KEY) ?? '0')
    if (skipUntil > Date.now()) return

    let alive = true
    setPasskeyEnrollmentChecking(true)

    supabase.auth.passkey
      .list()
      .then(({ data, error: listError }) => {
        if (!alive) return
        if (!listError && (data?.length ?? 0) === 0) setPasskeyEnrollment(true)
      })
      .finally(() => {
        if (alive) setPasskeyEnrollmentChecking(false)
      })

    return () => {
      alive = false
    }
  }, [user, passkeySupported])

  function startCooldown(duration = REQUEST_COOLDOWN_MS) {
    const until = Date.now() + duration
    localStorage.setItem(EMAIL_COOLDOWN_KEY, String(until))
    setCooldownUntil(until)
    setNow(Date.now())
  }

  async function requestAccess(event?: FormEvent) {
    event?.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!supabase || !cleanEmail || emailBlocked) return

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
      const code = getErrorCode(signInError)
      if (code === 'over_email_send_rate_limit' || getErrorMessage(signInError).toLowerCase().includes('rate limit')) {
        startCooldown(RATE_LIMIT_COOLDOWN_MS)
      }
      setError(friendlyAuthError(signInError))
    } else {
      localStorage.setItem(LAST_EMAIL_KEY, cleanEmail)
      setEmail(cleanEmail)
      setSent(true)
      setEditingEmail(false)
      startCooldown()
    }
    setSubmitting(false)
  }

  async function enterWithPasskey() {
    if (!supabase || !passkeySupported) return
    setPasskeySubmitting(true)
    setError(null)

    try {
      const { error: passkeyError } = await supabase.auth.signInWithPasskey()
      if (passkeyError) setError(friendlyAuthError(passkeyError))
    } catch (passkeyError) {
      setError(friendlyAuthError(passkeyError))
    } finally {
      setPasskeySubmitting(false)
    }
  }

  async function registerPasskey() {
    if (!supabase || !user) return
    setPasskeyEnrollmentSubmitting(true)
    setError(null)

    try {
      const { error: registerError } = await supabase.auth.registerPasskey()
      if (registerError) {
        setError(friendlyAuthError(registerError))
      } else {
        setPasskeyEnrollment(false)
        localStorage.removeItem(PASSKEY_SKIP_KEY)
      }
    } catch (registerError) {
      setError(friendlyAuthError(registerError))
    } finally {
      setPasskeyEnrollmentSubmitting(false)
    }
  }

  function skipPasskeyForNow() {
    localStorage.setItem(PASSKEY_SKIP_KEY, String(Date.now() + PASSKEY_SKIP_MS))
    setPasskeyEnrollment(false)
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

  if (!isSupabaseConfigured) return children

  if (user && passkeyEnrollment && !passkeyEnrollmentChecking) {
    return (
      <main className="auth-screen auth-screen--simple">
        <div className="auth-backdrop" />
        <section className="auth-card auth-card--simple auth-passkey-card">
          <div className="auth-brand"><Sparkles size={18} /><span>NEXUS OS</span></div>
          <div className="auth-passkey-hero"><Fingerprint size={34} /></div>
          <span className="eyebrow">Entrada rápida</span>
          <h1>Ative a sua passkey.</h1>
          <p className="auth-intro">Depois disso, este dispositivo pode entrar no Nexus com Face ID, Touch ID, Windows Hello ou o PIN do aparelho — sem depender de e-mail.</p>
          <button className="primary-button auth-submit" onClick={() => void registerPasskey()} disabled={passkeyEnrollmentSubmitting}>
            {passkeyEnrollmentSubmitting ? <LoaderCircle className="spin" size={17} /> : <Fingerprint size={17} />}
            {passkeyEnrollmentSubmitting ? 'Ativando…' : 'Ativar passkey'}
          </button>
          <button className="text-button" onClick={skipPasskeyForNow}>Agora não</button>
          {error && <div className="auth-message auth-message--error">{error}</div>}
          <small className="auth-footnote"><ShieldCheck size={13} /> A chave privada permanece no seu dispositivo ou gerenciador de senhas.</small>
        </section>
      </main>
    )
  }

  if (user) return children

  return (
    <main className="auth-screen auth-screen--simple">
      <div className="auth-backdrop" />
      <section className="auth-card auth-card--simple">
        <div className="auth-brand"><Sparkles size={18} /><span>NEXUS OS</span></div>
        <div className="auth-passkey-hero"><Fingerprint size={32} /></div>
        <span className="eyebrow">Acesso privado</span>
        <h1>Entrar no Nexus.</h1>
        <p className="auth-intro">Use a biometria ou o PIN do dispositivo. O e-mail fica apenas como recuperação.</p>

        {passkeySupported && (
          <button className="primary-button auth-submit auth-passkey-primary" onClick={() => void enterWithPasskey()} disabled={passkeySubmitting}>
            {passkeySubmitting ? <LoaderCircle className="spin" size={17} /> : <Fingerprint size={18} />}
            {passkeySubmitting ? 'Verificando…' : 'Entrar com passkey'}
          </button>
        )}

        <div className="auth-divider"><span>ou recuperar pelo e-mail</span></div>

        {sent ? (
          <div className="auth-sent">
            <div className="auth-sent__icon"><CheckCircle2 size={27} /></div>
            <h2>Confira o e-mail.</h2>
            <p>Enviamos um acesso para <strong>{maskEmail(email)}</strong>. Abra apenas a mensagem mais recente.</p>
            <div className="auth-sent__actions">
              {isGmail && <a className="secondary-button auth-mail-button" href="https://mail.google.com/">Abrir Gmail <ArrowRight size={16} /></a>}
              <button className="secondary-button" onClick={() => void requestAccess()} disabled={submitting || emailBlocked}>
                {submitting ? <LoaderCircle className="spin" size={16} /> : emailBlocked ? <Clock3 size={16} /> : <Mail size={16} />}
                {emailBlocked ? `Reenviar em ${cooldownSeconds}s` : 'Reenviar'}
              </button>
            </div>
            <button className="text-button auth-change-email" onClick={changeEmail}><ArrowLeft size={14} /> Usar outro e-mail</button>
          </div>
        ) : !editingEmail && remembered ? (
          <div className="auth-return">
            <div className="auth-return__identity">
              <div className="auth-return__avatar"><Mail size={18} /></div>
              <div><small>Recuperar acesso de</small><strong>{maskEmail(remembered)}</strong></div>
            </div>
            <button className="secondary-button auth-submit" onClick={() => void requestAccess()} disabled={submitting || emailBlocked}>
              {submitting ? <LoaderCircle className="spin" size={16} /> : emailBlocked ? <Clock3 size={16} /> : <Mail size={16} />}
              {emailBlocked ? `Aguarde ${cooldownSeconds}s` : 'Enviar acesso por e-mail'}
            </button>
            <button className="text-button" onClick={() => setEditingEmail(true)}>Usar outro e-mail</button>
          </div>
        ) : (
          <form onSubmit={requestAccess} className="auth-form auth-form--simple">
            <label htmlFor="email">E-mail da conta</label>
            <div className="auth-input">
              <Mail size={16} />
              <input id="email" type="email" autoComplete="email" inputMode="email" placeholder="voce@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <button className="secondary-button auth-submit" disabled={submitting || emailBlocked}>
              {submitting ? <LoaderCircle className="spin" size={16} /> : emailBlocked ? <Clock3 size={16} /> : <ArrowRight size={16} />}
              {emailBlocked ? `Aguarde ${cooldownSeconds}s` : 'Enviar acesso'}
            </button>
            {remembered && <button type="button" className="text-button auth-back-account" onClick={() => { setEmail(remembered); setEditingEmail(false) }}><ArrowLeft size={14} /> Voltar</button>}
          </form>
        )}

        {error && <div className="auth-message auth-message--error">{error}</div>}
        {!passkeySupported && <div className="auth-message">Este navegador não oferece WebAuthn neste contexto. Use HTTPS ou localhost para passkeys.</div>}
        <small className="auth-footnote"><ShieldCheck size={13} /> Sessão persistente · RLS por usuário · passkey sem senha compartilhada</small>
      </section>
    </main>
  )
}
