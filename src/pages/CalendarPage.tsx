import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { emitUI } from '../lib/ui-events'

const weekday = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB']
const iso = (date: Date) => new Intl.DateTimeFormat('en-CA', { year:'numeric', month:'2-digit', day:'2-digit' }).format(date)

export function CalendarPage() {
  const { workspace } = useNexus()
  const [cursor, setCursor] = useState(() => new Date())
  const year = cursor.getFullYear(); const month = cursor.getMonth()
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month:'long', year:'numeric' }).format(cursor)
  const cells = useMemo(() => {
    const first = new Date(year, month, 1); const start = new Date(year, month, 1 - first.getDay())
    return Array.from({ length: 42 }, (_, i) => { const date = new Date(start); date.setDate(start.getDate()+i); return date })
  }, [year, month])
  const missionsByDate = useMemo(() => {
    const map = new Map<string, typeof workspace.missions>()
    workspace.missions.forEach((mission) => { if (!mission.due_at) return; const key = mission.due_at.slice(0,10); map.set(key, [...(map.get(key) ?? []), mission]) })
    return map
  }, [workspace.missions])
  const upcoming = workspace.missions.filter((mission) => mission.due_at).sort((a,b) => (a.due_at ?? '').localeCompare(b.due_at ?? '')).slice(0,6)

  return <div className="page-stack calendar-page">
    <section className="page-hero page-hero--cyan"><div><span className="eyebrow">Temporal view</span><h1>Calendário</h1><p>Missões, prazos, rotinas e foco deixam de ser listas e passam a ocupar espaço no tempo.</p></div><button className="primary-button" onClick={() => emitUI('quickAdd')}><Plus size={16}/> Novo</button></section>
    <section className="calendar-layout">
      <SurfaceCard className="calendar-card">
        <div className="calendar-toolbar"><strong>{monthLabel}</strong><div><button className="icon-button" onClick={() => setCursor(new Date(year,month-1,1))} aria-label="Mês anterior"><ChevronLeft size={16}/></button><button className="text-button" onClick={() => setCursor(new Date())}>Hoje</button><button className="icon-button" onClick={() => setCursor(new Date(year,month+1,1))} aria-label="Próximo mês"><ChevronRight size={16}/></button></div></div>
        <div className="calendar-weekdays">{weekday.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">{cells.map((date) => { const key=iso(date); const items=missionsByDate.get(key) ?? []; const today=key===iso(new Date()); const muted=date.getMonth()!==month; return <div className={`calendar-day ${today?'today':''} ${muted?'muted':''}`} key={key}><span className="calendar-number">{date.getDate()}</span><div className="calendar-events">{items.slice(0,3).map((mission) => <span key={mission.id} className={`calendar-event rank-${mission.rank.toLowerCase()}`} title={mission.title}>{mission.title}</span>)}{items.length>3 && <small>+{items.length-3}</small>}</div></div> })}</div>
      </SurfaceCard>
      <aside className="calendar-agenda"><SurfaceCard tone="blue" eyebrow="Próximos" title="Agenda"><div className="agenda-list">{upcoming.length ? upcoming.map((mission) => <div className="agenda-item" key={mission.id}><span className={`rank-chip rank-${mission.rank.toLowerCase()}`}>{mission.rank}</span><div><strong>{mission.title}</strong><small><Clock3 size={11}/> {mission.due_at ? new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(mission.due_at)) : 'Sem prazo'}</small></div></div>) : <div className="empty-compact"><CalendarDays size={18}/><span>Nenhum prazo definido ainda.</span></div>}</div></SurfaceCard></aside>
    </section>
  </div>
}
