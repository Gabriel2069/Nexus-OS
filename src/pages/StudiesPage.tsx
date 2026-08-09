import { Beaker, BookOpen, CalendarClock, CheckCircle2, Clock3, GraduationCap, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import type { AcademicEvent } from '../types/nexus'

const days = [
  { id: 1, short: 'SEG', label: 'Segunda' },
  { id: 2, short: 'TER', label: 'Terça' },
  { id: 3, short: 'QUA', label: 'Quarta' },
  { id: 4, short: 'QUI', label: 'Quinta' },
  { id: 5, short: 'SEX', label: 'Sexta' },
  { id: 6, short: 'SÁB', label: 'Sábado' },
]

function displayTime(value: string) {
  return value.slice(0, 5)
}

function eventDate(event: AcademicEvent) {
  if (event.starts_at) return new Date(event.starts_at)
  if (event.event_date) return new Date(`${event.event_date}T12:00:00-03:00`)
  return null
}

function eventWhen(event: AcademicEvent) {
  const date = eventDate(event)
  if (!date) return 'Data não definida'
  const hasTime = Boolean(event.starts_at)
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
    ...(hasTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'America/Sao_Paulo',
  }).format(date).replace('.', '')
}

export function StudiesPage() {
  const { workspace } = useNexus()
  const currentWeekday = new Date().getDay()
  const [selectedDay, setSelectedDay] = useState(() => currentWeekday >= 1 && currentWeekday <= 6 ? currentWeekday : 1)
  const schedule = workspace.academicSchedule
  const events = workspace.academicEvents

  const selectedSchedule = useMemo(() => schedule.filter((item) => item.weekday === selectedDay), [schedule, selectedDay])
  const classes = selectedSchedule.filter((item) => item.schedule_type === 'class')
  const extras = selectedSchedule.filter((item) => item.schedule_type !== 'class')
  const upcoming = useMemo(() => events.filter((event) => {
    const date = eventDate(event)
    return date ? date.getTime() >= Date.now() - 60 * 60 * 1000 : false
  }).sort((a, b) => (eventDate(a)?.getTime() ?? Infinity) - (eventDate(b)?.getTime() ?? Infinity)).slice(0, 8), [events])
  const nextEvent = upcoming[0]
  const completedEvents = events.filter((event) => event.status === 'Concluído').length

  return <div className="page-stack studies-page">
    <section className="page-hero page-hero--blue academic-hero">
      <div><span className="eyebrow">Academic hub · Notion sincronizado</span><h1>Estudos</h1><p>Sua grade, plantões, blocos protegidos e calendário de simulados agora vivem como dados reais dentro do Nexus.</p></div>
      <div className="academic-hero__summary"><GraduationCap size={18}/><div><span>Próximo marco</span><strong>{nextEvent?.title ?? 'Calendário livre'}</strong><small>{nextEvent ? eventWhen(nextEvent) : 'nenhum evento futuro'}</small></div></div>
    </section>

    <section className="academic-metrics">
      <SurfaceCard tone="blue"><span>Aulas na semana</span><strong>{schedule.filter(item => item.schedule_type === 'class').length}</strong><small>slots importados</small></SurfaceCard>
      <SurfaceCard tone="violet"><span>Plantões e blocos</span><strong>{schedule.filter(item => item.schedule_type !== 'class').length}</strong><small>horários protegidos</small></SurfaceCard>
      <SurfaceCard tone="green"><span>Simulados feitos</span><strong>{completedEvents}</strong><small>histórico 2026</small></SurfaceCard>
      <SurfaceCard tone="amber"><span>Próximos eventos</span><strong>{upcoming.length}</strong><small>na fila visível</small></SurfaceCard>
    </section>

    <section className="academic-layout">
      <SurfaceCard className="academic-timetable" tone="blue" eyebrow="Grade real" title="Semana acadêmica">
        <div className="academic-day-tabs" role="tablist" aria-label="Dia da semana">
          {days.map(day => <button key={day.id} className={selectedDay === day.id ? 'active' : ''} onClick={() => setSelectedDay(day.id)}><span>{day.short}</span><small>{day.label}</small></button>)}
        </div>
        <div className="academic-day-heading"><div><span className="eyebrow">{days.find(day => day.id === selectedDay)?.label}</span><h3>{classes.length} aulas</h3></div>{selectedDay === currentWeekday && <span className="academic-today-chip">Hoje</span>}</div>
        <div className="academic-class-list">
          {classes.map((item, index) => <article className="academic-class-row" key={item.id}>
            <div className="academic-time"><strong>{displayTime(item.start_time)}</strong><small>{item.end_time ? displayTime(item.end_time) : ''}</small></div>
            <span className="academic-line" aria-hidden="true"><i />{index < classes.length - 1 && <b />}</span>
            <div className="academic-class-copy"><strong>{item.subject}</strong><small>Aula regular</small></div>
          </article>)}
          {!classes.length && <div className="empty-compact"><BookOpen size={16}/> Sem aulas regulares neste dia.</div>}
        </div>
        {extras.length > 0 && <div className="academic-extras"><span className="eyebrow">Depois das aulas</span>{extras.map(item => <article key={item.id}><span className={`academic-extra-icon academic-extra-icon--${item.schedule_type}`}><Beaker size={14}/></span><div><strong>{item.subject}</strong><small><Clock3 size={11}/>{displayTime(item.start_time)}{item.end_time ? `–${displayTime(item.end_time)}` : ''}{item.note ? ` · ${item.note}` : ''}</small></div></article>)}</div>}
      </SurfaceCard>

      <aside className="academic-side">
        <SurfaceCard tone="violet" eyebrow="Protocolo 2026" title="Rotina acadêmica">
          <div className="academic-rules">
            <div><span>Terça</span><strong>Matemática · História · Química</strong><small>ordem flexível por urgência e dificuldade</small></div>
            <div><span>Quarta</span><strong>Bio Vest · 15h30</strong><small>bloco fixo protegido</small></div>
            <div><span>Quinta</span><strong>Física + plantões</strong><small>dúvidas concretas → consolidação</small></div>
            <div><span>Sexta</span><strong>Produzir uma redação</strong><small>outras matérias só se houver energia</small></div>
            <div><span>Domingo</span><strong>Matemática · História · Química</strong><small>bloco principal, preservando o resto do dia</small></div>
          </div>
          <div className="academic-cutoff"><Clock3 size={15}/><span>Encerrar atividades às <strong>22h</strong> · dormir às <strong>23h</strong></span></div>
        </SurfaceCard>
      </aside>
    </section>

    <SurfaceCard tone="cyan" eyebrow="Calendário acadêmico" title="Próximos marcos" action={<span className="surface-chip"><CalendarClock size={12}/>{upcoming.length}</span>}>
      <div className="academic-event-list">
        {upcoming.map((event, index) => <article className={`academic-event ${index === 0 ? 'academic-event--next' : ''}`} key={event.id}>
          <div className="academic-event__date"><strong>{eventDate(event)?.getDate().toString().padStart(2, '0')}</strong><span>{eventDate(event)?.toLocaleDateString('pt-BR',{month:'short',timeZone:'America/Sao_Paulo'}).replace('.','')}</span></div>
          <div className="academic-event__body"><div><span className={`academic-status academic-status--${event.status.toLowerCase()}`}>{event.status}</span>{event.format && <span className="academic-format">{event.format}</span>}</div><strong>{event.title}</strong><small>{eventWhen(event)}{event.note ? ` · ${event.note}` : ''}</small></div>
          {event.status === 'Concluído' ? <CheckCircle2 size={17}/> : index === 0 ? <Sparkles size={17}/> : <CalendarClock size={16}/>} 
        </article>)}
        {!upcoming.length && <div className="empty-compact">Nenhum compromisso acadêmico futuro importado.</div>}
      </div>
    </SurfaceCard>
  </div>
}
