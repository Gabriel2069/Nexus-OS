import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { emitUI } from '../lib/ui-events'
import { occurrencesForDay, upcomingOccurrences } from '../lib/routine-context'

const weekday = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB']
const iso = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' }).format(date)
const time = (date: Date) => new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(date)
const categoryTone: Record<string,string> = { school:'blue', class:'cyan', study:'violet', exam:'rose', health:'green', recovery:'slate', sleep:'slate' }

export function CalendarPage() {
  const { workspace } = useNexus()
  const [cursor, setCursor] = useState(() => new Date())
  const year = cursor.getFullYear(); const month = cursor.getMonth()
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month:'long', year:'numeric', timeZone:'America/Sao_Paulo' }).format(cursor)
  const cells = useMemo(() => { const first = new Date(year, month, 1); const start = new Date(year, month, 1 - first.getDay()); return Array.from({ length: 42 }, (_, i) => { const date = new Date(start); date.setDate(start.getDate()+i); return date }) }, [year, month])
  const missionsByDate = useMemo(() => { const map = new Map<string, typeof workspace.missions>(); workspace.missions.forEach((mission) => { if (!mission.due_at) return; const key = mission.due_at.slice(0,10); map.set(key, [...(map.get(key) ?? []), mission]) }); return map }, [workspace.missions])
  const now = new Date()
  const upcomingFixed = useMemo(()=>upcomingOccurrences(workspace.calendarCommitments,now,16).filter(event=>!['sleep','recovery'].includes(event.category)).slice(0,9),[workspace.calendarCommitments])
  const upcomingMissions = workspace.missions.filter((mission)=>mission.due_at && new Date(mission.due_at)>now).sort((a,b)=>(a.due_at??'').localeCompare(b.due_at??'')).slice(0,6)

  return <div className="page-stack calendar-page calendar-page--connected">
    <section className="page-hero page-hero--cyan"><div><span className="eyebrow">Seu tempo</span><h1>Calendário</h1><p>Escola, aulas, academia, plantões, provas e prazos aparecem juntos. Os horários fixos são a base; as missões ocupam o que sobra.</p></div><button className="primary-button" onClick={() => emitUI('quickAdd')}><Plus size={16}/> Nova missão</button></section>
    <section className="calendar-layout">
      <SurfaceCard className="calendar-card">
        <div className="calendar-toolbar"><strong>{monthLabel}</strong><div><button className="icon-button" onClick={() => setCursor(new Date(year,month-1,1))} aria-label="Mês anterior"><ChevronLeft size={16}/></button><button className="text-button" onClick={() => setCursor(new Date())}>Hoje</button><button className="icon-button" onClick={() => setCursor(new Date(year,month+1,1))} aria-label="Próximo mês"><ChevronRight size={16}/></button></div></div>
        <div className="calendar-weekdays">{weekday.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">{cells.map((date) => {
          const key=iso(date); const fixed=occurrencesForDay(workspace.calendarCommitments,date).filter(event=>!['sleep','recovery'].includes(event.category)); const missions=missionsByDate.get(key)??[]; const today=key===iso(now); const muted=date.getMonth()!==month
          const total=fixed.length+missions.length
          return <div className={`calendar-day ${today?'today':''} ${muted?'muted':''}`} key={key}>
            <span className="calendar-number">{date.getDate()}</span>
            <div className="calendar-events calendar-events--desktop">
              {fixed.slice(0,2).map((event)=><span key={event.id} className={`calendar-event calendar-event--${categoryTone[event.category]??'slate'}`} title={`${event.title} · ${time(event.start)}`}>{time(event.start)} {event.title}</span>)}
              {missions.slice(0,1).map((mission)=><span key={mission.id} className={`calendar-event rank-${mission.rank.toLowerCase()}`} title={mission.title}>{mission.title}</span>)}
              {total>3&&<small>+{total-3}</small>}
            </div>
            <div className="calendar-dots" aria-label={`${total} itens no dia`}>{fixed.slice(0,4).map(event=><i className={`tone-bg-${categoryTone[event.category]??'slate'}`} key={event.id}/>)}{missions.slice(0,2).map(mission=><i className={`rank-${mission.rank.toLowerCase()}`} key={mission.id}/>)}</div>
          </div>
        })}</div>
      </SurfaceCard>
      <aside className="calendar-agenda">
        <SurfaceCard tone="blue" eyebrow="Próximos horários" title="Agenda fixa"><div className="agenda-list">{upcomingFixed.length ? upcomingFixed.map((event)=><div className="agenda-item agenda-item--calendar" key={event.id}><span className={`agenda-category tone-${categoryTone[event.category]??'slate'}`}><CalendarDays size={14}/></span><div><strong>{event.title}</strong><small><Clock3 size={11}/>{new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(event.start).replace('.','')}</small></div></div>):<div className="empty-compact"><CalendarDays size={18}/><span>Sem compromissos próximos.</span></div>}</div></SurfaceCard>
        <SurfaceCard tone="violet" eyebrow="Prazos" title="Missões com data"><div className="agenda-list">{upcomingMissions.length?upcomingMissions.map((mission)=><div className="agenda-item" key={mission.id}><span className={`rank-chip rank-${mission.rank.toLowerCase()}`}>{mission.rank}</span><div><strong>{mission.title}</strong><small><Clock3 size={11}/>{new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(mission.due_at!))}</small></div></div>):<div className="empty-compact">Nenhum prazo de missão próximo.</div>}</div></SurfaceCard>
      </aside>
    </section>
  </div>
}
