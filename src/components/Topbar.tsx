import { Bell, Command, Download, Flame, Moon, Plus, Search, Sun } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNexus } from '../context/NexusContext'
import { navigation } from '../data/navigation'
import { emitUI } from '../lib/ui-events'

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
type TopbarProps = { pathname: string }

export function Topbar({ pathname }: TopbarProps) {
  const { workspace } = useNexus()
  const [dark, setDark] = useState(() => (localStorage.getItem('nexus-theme') || document.documentElement.dataset.theme) !== 'light')
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const route = useMemo(() => { for (const group of navigation) { const item = group.items.find((candidate) => candidate.path === pathname); if (item) return { group: group.label, label: item.label } } return { group: 'Nexus OS', label: 'Sistema' } }, [pathname])
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('nexus-theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent) }; window.addEventListener('beforeinstallprompt', handler); return () => window.removeEventListener('beforeinstallprompt', handler) }, [])
  async function install() { if (!installPrompt) return; await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null) }
  const name = workspace.profile?.display_name || 'Gabriel'
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const level = workspace.profile?.level ?? 1
  const streak = workspace.profile?.streak_current ?? 0
  const avatarUrl = workspace.profile?.avatar_url
  return (
    <header className="topbar" data-motion-shell="topbar">
      <div className="topbar__context">
        <div className="topbar__route" aria-label="Local atual" data-motion="route-context"><small>{route.group}</small><strong key={route.label} className="route-label-enter">{route.label}</strong></div>
        <button className="command-search" onClick={() => emitUI('command')} aria-label="Abrir central de comandos" data-motion="command-trigger"><Search size={16} /><span>Pesquisar, abrir ou executar…</span><span className="key-hint"><Command size={12} />K</span></button>
      </div>
      <div className="topbar__actions">
        <div className="topbar__status" title="Progressão atual" data-motion="status"><Flame size={13} /><b>Nv. {level}</b><span>{streak}d</span></div>
        <button className="quick-add-top" onClick={() => emitUI('quickAdd')} data-motion="primary-action"><Plus size={15} /><span>Novo</span></button>
        {installPrompt && <button className="icon-button install-button" onClick={install} aria-label="Instalar Nexus" data-motion="icon-action"><Download size={17} /></button>}
        <button className="icon-button theme-button" onClick={() => setDark((value) => !value)} aria-label="Alternar tema" data-motion="icon-action">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
        <button className="icon-button notification-button" onClick={() => emitUI('notifications')} aria-label="Notificações" data-motion="icon-action"><Bell size={17} /><span /></button>
        <button className="avatar avatar--button" title={`${name} · editar perfil`} onClick={() => emitUI('profile')} aria-label="Editar perfil" data-motion="avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials}</button>
      </div>
    </header>
  )
}
