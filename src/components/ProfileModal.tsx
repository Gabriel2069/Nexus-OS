import { Camera, Check, LoaderCircle, Save, Sparkles, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNexus } from '../context/NexusContext'
import { UI_EVENTS } from '../lib/ui-events'

export function ProfileModal() {
  const { workspace, editProfile } = useNexus()
  const profile = workspace.profile
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [className, setClassName] = useState('Tecelão')
  const [title, setTitle] = useState('Iniciado da Trama')
  const [motto, setMotto] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [dailyXpGoal, setDailyXpGoal] = useState(300)

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(UI_EVENTS.profile, show)
    return () => window.removeEventListener(UI_EVENTS.profile, show)
  }, [])

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name ?? '')
    setClassName(profile.class_name ?? 'Tecelão')
    setTitle(profile.title ?? 'Iniciado da Trama')
    setMotto(profile.motto ?? '')
    setAvatarUrl(profile.avatar_url ?? '')
    setDailyXpGoal(profile.daily_xp_goal ?? 300)
  }, [profile, open])

  const initials = useMemo(() => (displayName || 'Nexus').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(), [displayName])

  if (!open || !profile) return null

  async function submit() {
    if (!displayName.trim() || saving) return
    setSaving(true)
    setSaved(false)
    try {
      await editProfile({
        display_name: displayName,
        class_name: className,
        title,
        motto,
        avatar_url: avatarUrl,
        daily_xp_goal: Math.max(50, Math.min(5000, Number(dailyXpGoal) || 300)),
      })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay profile-overlay" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className="profile-modal" role="dialog" aria-modal="true" aria-label="Editar perfil">
        <header className="profile-modal__header">
          <div>
            <span className="eyebrow">Identidade do Nexus</span>
            <h2>Editar perfil</h2>
          </div>
          <button className="icon-button" onClick={() => setOpen(false)} aria-label="Fechar"><X size={17} /></button>
        </header>

        <div className="profile-preview">
          <div className="profile-preview__avatar">
            {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : <span>{initials}</span>}
          </div>
          <div className="profile-preview__copy">
            <span className="eyebrow">{className || 'Tecelão'}</span>
            <strong>{displayName || 'Jogador'}</strong>
            <small>{title || 'Iniciado da Trama'}</small>
          </div>
          <div className="profile-preview__level"><span>Nível</span><strong>{profile.level}</strong></div>
        </div>

        <div className="profile-form-grid">
          <label className="profile-field profile-field--wide">
            <span>Nome exibido</span>
            <div className="profile-input"><UserRound size={15} /><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={64} /></div>
          </label>

          <label className="profile-field">
            <span>Classe</span>
            <select value={className} onChange={(event) => setClassName(event.target.value)}>
              <option>Tecelão</option>
              <option>Arquiteto</option>
              <option>Estrategista</option>
              <option>Explorador</option>
            </select>
          </label>

          <label className="profile-field">
            <span>Título</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} />
          </label>

          <label className="profile-field profile-field--wide">
            <span>Lema</span>
            <textarea value={motto} onChange={(event) => setMotto(event.target.value)} rows={3} maxLength={240} placeholder="Uma frase que resume como você quer operar." />
          </label>

          <label className="profile-field profile-field--wide">
            <span>Avatar por URL</span>
            <div className="profile-input"><Camera size={15} /><input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://…" /></div>
          </label>

          <label className="profile-field">
            <span>Meta diária de XP</span>
            <input type="number" min="50" max="5000" step="25" value={dailyXpGoal} onChange={(event) => setDailyXpGoal(Number(event.target.value))} />
          </label>

          <div className="profile-static-card">
            <Sparkles size={16} />
            <div><span>Progressão</span><strong>{profile.xp_total.toLocaleString('pt-BR')} XP · {profile.nexus_coins} coins</strong></div>
          </div>
        </div>

        <footer className="profile-modal__footer">
          <span>{profile.streak_current}d de sequência · melhor {profile.streak_best}d</span>
          <button className={saved ? 'secondary-button' : 'primary-button'} disabled={saving || !displayName.trim()} onClick={() => void submit()}>
            {saving ? <LoaderCircle className="spin" size={16} /> : saved ? <Check size={16} /> : <Save size={16} />}
            {saving ? 'Salvando…' : saved ? 'Salvo' : 'Salvar perfil'}
          </button>
        </footer>
      </section>
    </div>
  )
}
