import type { PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'
import { CommandPalette } from './CommandPalette'
import { MobileDock } from './MobileDock'
import { NotificationCenter } from './NotificationCenter'
import { ProfileModal } from './ProfileModal'
import { QuickCaptureModal } from './QuickCaptureModal'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { emitUI } from '../lib/ui-events'

type AppShellProps = PropsWithChildren<{ pathname: string }>
type IOSNavigator = Navigator & { standalone?: boolean }

function CosmicEnvironment() {
  return <div className="nexos-environment" aria-hidden="true">
    <div className="nexos-environment__stars nexos-environment__stars--near" />
    <div className="nexos-environment__stars nexos-environment__stars--far" />
    <div className="nexos-environment__nebula nexos-environment__nebula--violet" />
    <div className="nexos-environment__nebula nexos-environment__nebula--blue" />
    <div className="nexos-environment__galaxy" />
    <div className="nexos-environment__orbit nexos-environment__orbit--one"><span /></div>
    <div className="nexos-environment__orbit nexos-environment__orbit--two"><span /></div>
    <div className="nexos-environment__constellation" />
  </div>
}

export function AppShell({ pathname, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('nexus-sidebar') === 'collapsed')
  useEffect(() => { localStorage.setItem('nexus-sidebar', collapsed ? 'collapsed' : 'open') }, [collapsed])
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as IOSNavigator).standalone)
    document.documentElement.classList.toggle('nexus-standalone', standalone)
    return () => document.documentElement.classList.remove('nexus-standalone')
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key.toLowerCase() === 'n') emitUI('quickAdd')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
    <CosmicEnvironment />
    <Sidebar pathname={pathname} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
    <div className="app-shell__content">
      <Topbar pathname={pathname} />
      <main className="page-content" key={pathname}>{children}</main>
    </div>
    <button className="floating-add" onClick={() => emitUI('quickAdd')} aria-label="Captura rápida"><span>＋</span></button>
    <MobileDock pathname={pathname} />
    <CommandPalette />
    <QuickCaptureModal />
    <ProfileModal />
    <NotificationCenter />
  </div>
}
