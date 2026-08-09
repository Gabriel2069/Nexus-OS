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

  return (
    <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
      <Sidebar pathname={pathname} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <div className="app-shell__content">
        <Topbar pathname={pathname} />
        <main className="page-content">{children}</main>
      </div>
      <button className="floating-add" onClick={() => emitUI('quickAdd')} aria-label="Captura rápida"><span>＋</span></button>
      <MobileDock pathname={pathname} />
      <CommandPalette />
      <QuickCaptureModal />
      <ProfileModal />
      <NotificationCenter />
    </div>
  )
}
