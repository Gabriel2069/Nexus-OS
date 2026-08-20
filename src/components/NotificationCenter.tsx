import { Bell, CheckCircle2, Clock3, Trophy, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNexus } from '../context/NexusContext'
import { UI_EVENTS } from '../lib/ui-events'

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const { workspace } = useNexus()
  useEffect(() => { const show = () => setOpen(true); window.addEventListener(UI_EVENTS.notifications, show); return () => window.removeEventListener(UI_EVENTS.notifications, show) }, [])
  if (!open) return null
  const due = workspace.missions.filter((mission) => mission.due_at).slice(0, 3)
  return <div className="drawer-backdrop nexos-notification-overlay" onClick={() => setOpen(false)}>
    <aside className="notification-drawer" onClick={(e) => e.stopPropagation()} data-motion-surface="notification">
      <header data-motion="drawer-header"><div><span className="eyebrow">Central</span><h2>Notificações</h2></div><button className="icon-button" onClick={() => setOpen(false)}><X size={17} /></button></header>
      <div className="notification-list" data-motion="notification-list">
        <div className="notification-item" data-motion="notification-item"><span className="notification-icon tone-green"><CheckCircle2 size={16} /></span><div><strong>NexOS sincronizado</strong><p>Dados e progresso estão conectados ao seu perfil.</p></div></div>
        {due.map((mission) => <div className="notification-item" key={mission.id} data-motion="notification-item"><span className="notification-icon tone-blue"><Clock3 size={16} /></span><div><strong>{mission.title}</strong><p>Missão com prazo no seu horizonte atual.</p></div></div>)}
        <div className="notification-item" data-motion="notification-item"><span className="notification-icon tone-violet"><Trophy size={16} /></span><div><strong>Temporada ativa</strong><p>Seu progresso de missões alimenta XP, projetos e atributos automaticamente.</p></div></div>
      </div>
      <footer><Bell size={14} /> Lembretes push entrarão na próxima camada PWA.</footer>
    </aside>
  </div>
}
