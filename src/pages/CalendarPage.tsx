import { ArrowRight, CalendarDays, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Focus, Plus, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { navigate } from '../lib/router'
import { supabase } from '../lib/supabase'
import { emitUI } from '../lib/ui-events'
import { occurrencesForDay, upcomingOccurrences } from '../lib/routine-context'
import type { CalendarOccurrence } from '../lib/routine-context'

const weekday = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB']
const TZ = 'America/Sao_Paulo'
const iso = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone:TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(date)
const time = (date: Date) => new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:TZ}).format(date)
const fullDate = (date: Date) => new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric',timeZone:TZ}).format(date)
const compactDate = (date: Date) => new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'short',timeZone:TZ}).format(date).replace('.','')
const categoryTone: Record<string,string> = { school:'blue', class:'cyan', study:'violet', exam:'rose', health:'green', recovery:'slate', sleep:'slate', personal:'green', family:'green', social:'rose' }
const categoryName: Record<string,string> = { school:'Escola', class:'Aula', study:'Estudo', exam:'Prova', health:'Saúde', recovery:'Pausa', sleep:'Sono', personal:'Pessoal', family:'Família', social:'Social' }

function initialDate(){const value=new URLSearchParams(window.location.search).get('date');if(value&&/^\d{4}-\d{2}-\d{2}$/.test(value)){const parsed=new Date(`${value}T12:00:00-03:00`);if(!Number.isNaN(parsed.getTime()))return parsed}return new Date()}
function atLocal(date: Date, hhmm: string) { return new Date(`${iso(date)}T${hhmm}:00-03:00`) }
function isTimed(event: CalendarOccurrence) { return event.end.getTime()-event.start.getTime() < 20*60*60_000 }
function durationMinutes(start: Date, end: Date) { return Math.max(0,Math.round((end.getTime()-start.getTime())/60_000)) }
function focusPreset(minutes: number) { return minutes >= 90 ? 90 : minutes >= 60 ? 60 : minutes >= 45 ? 45 : 25 }

function freeWindows(date: Date, events: CalendarOccurrence[], now: Date) {
  const dayStart=atLocal(date,'07:00'); const dayEnd=atLocal(date,'22:00'); const isToday=iso(date)===iso(now)
  let cursor=isToday && now>dayStart ? now : dayStart
  if(iso(date)<iso(now)) return []
  const blocks=events.filter(event=>!event.isOptional&&isTimed(event)&&event.end>dayStart&&event.start<dayEnd).map(event=>({start:new Date(Math.max(event.start.getTime(),dayStart.getTime())),end:new Date(Math.min(event.end.getTime(),dayEnd.getTime()))})).sort((a,b)=>a.start.getTime()-b.start.getTime())
  const merged:{start:Date;end:Date}[]=[]
  blocks.forEach(block=>{const last=merged.at(-1);if(last&&block.start<=last.end){if(block.end>last.end)last.end=block.end}else merged.push({...block})})
  const gaps:{start:Date;end:Date;minutes:number}[]=[]
  merged.forEach(block=>{if(block.end<=cursor)return;if(block.start>cursor){const minutes=durationMinutes(cursor,block.start);if(minutes>=25)gaps.push({start:new Date(cursor),end:block.start,minutes})}if(block.end>cursor)cursor=block.end})
  if(cursor<dayEnd){const minutes=durationMinutes(cursor,dayEnd);if(minutes>=25)gaps.push({start:new Date(cursor),end:dayEnd,minutes})}
  return gaps
}

export function CalendarPage() {
  const { workspace, userId, refresh, completeMission } = useNexus()
  const now = new Date()
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [cursor, setCursor] = useState(()=>{const d=initialDate();return new Date(d.getFullYear(),d.getMonth(),1)})
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [updatingEvent, setUpdatingEvent] = useState<string | null>(null)
  const year = cursor.getFullYear(); const month = cursor.getMonth()
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month:'long', year:'numeric', timeZone:TZ }).format(cursor)
  const cells = useMemo(() => { const first = new Date(year, month, 1); const start = new Date(year, month, 1-first.getDay()); return Array.from({ length:42 },(_,i)=>{const date=new Date(start);date.setDate(start.getDate()+i);return date}) }, [year,month])
  const missionsByDate = useMemo(() => { const map=new Map<string,typeof workspace.missions>(); workspace.missions.forEach(mission=>{if(!mission.due_at)return;const key=iso(new Date(mission.due_at));map.set(key,[...(map.get(key)??[]),mission])});return map }, [workspace.missions])
  const selectedEvents = useMemo(()=>occurrencesForDay(workspace.calendarCommitments,selectedDate).filter(event=>!['sleep','recovery'].includes(event.category)),[workspace.calendarCommitments,selectedDate])
  const selectedMissions = missionsByDate.get(iso(selectedDate))??[]
  const windows = useMemo(()=>freeWindows(selectedDate,selectedEvents,now),[selectedDate,selectedEvents])
  const busyMinutes=selectedEvents.filter(event=>!event.isOptional&&isTimed(event)).reduce((sum,event)=>sum+durationMinutes(event.start,event.end),0)
  const upcomingCalendar = useMemo(()=>upcomingOccurrences(workspace.calendarCommitments,now,16).filter(event=>!['sleep','recovery'].includes(event.category)).slice(0,6),[workspace.calendarCommitments])
  const selectedIsToday=iso(selectedDate)===iso(now)

  function selectDay(date: Date) {
    const next=new Date(date);setSelectedDate(next);setExpandedEvent(null)
    if(next.getMonth()!==month||next.getFullYear()!==year)setCursor(new Date(next.getFullYear(),next.getMonth(),1))
    window.history.replaceState({},'',`/calendario?date=${iso(next)}`)
    if(window.matchMedia('(max-width:760px)').matches)window.setTimeout(()=>document.querySelector('.calendar-day-inspector')?.scrollIntoView({behavior:'smooth',block:'start'}),80)
  }
  function shiftSelected(days:number){const next=new Date(selectedDate);next.setDate(next.getDate()+days);selectDay(next)}
  function goToday(){const today=new Date();setCursor(new Date(today.getFullYear(),today.getMonth(),1));selectDay(today)}
  function addForSelected(){emitUI('quickAdd',{type:'mission',dueDate:iso(selectedDate)})}
  async function toggleConditional(event: CalendarOccurrence){if(!userId||updatingEvent)return;setUpdatingEvent(event.sourceId);const {error}=await supabase.from('calendar_commitments').update({is_optional:!event.isOptional,updated_at:new Date().toISOString()}).eq('id',event.sourceId).eq('user_id',userId);setUpdatingEvent(null);if(!error)await refresh()}
  const canToggle=(event:CalendarOccurrence)=>event.isOptional||/condicional|substitutiva/i.test(`${event.title} ${event.note??''}`)

  return <div className="page-stack calendar-page calendar-page--connected calendar-page--consultable"><section className="page-hero page-hero--cyan"><div><span className="eyebrow">Seu tempo</span><h1>Calendário</h1><p>Clique em qualquer dia para consultar o contexto completo. Horários, missões, janelas livres e ações ficam no mesmo lugar.</p></div><button className="primary-button" onClick={addForSelected}><CalendarPlus size={16}/>Missão em {selectedIsToday?'hoje':compactDate(selectedDate)}</button></section><section className="calendar-layout calendar-layout--consultable"><SurfaceCard className="calendar-card"><div className="calendar-toolbar"><strong>{monthLabel}</strong><div><button className="icon-button" onClick={()=>setCursor(new Date(year,month-1,1))}><ChevronLeft size={16}/></button><button className="text-button" onClick={goToday}>Hoje</button><button className="icon-button" onClick={()=>setCursor(new Date(year,month+1,1))}><ChevronRight size={16}/></button></div></div><div className="calendar-weekdays">{weekday.map(day=><span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map(date=>{const key=iso(date);const fixed=occurrencesForDay(workspace.calendarCommitments,date).filter(event=>!['sleep','recovery'].includes(event.category));const missions=missionsByDate.get(key)??[];const today=key===iso(now);const selected=key===iso(selectedDate);const muted=date.getMonth()!==month;const total=fixed.length+missions.length;return <button type="button" aria-pressed={selected} aria-label={`${fullDate(date)} · ${total} itens`} className={`calendar-day calendar-day--button ${today?'today':''} ${selected?'selected':''} ${muted?'muted':''}`} key={key} onClick={()=>selectDay(date)}><span className="calendar-number">{date.getDate()}</span><div className="calendar-events calendar-events--desktop">{fixed.slice(0,2).map(event=><span key={event.id} className={`calendar-event calendar-event--${categoryTone[event.category]??'slate'} ${event.isOptional?'is-optional':''}`}>{event.isOptional?'se necessário · ':`${time(event.start)} `}{event.title}</span>)}{missions.slice(0,1).map(mission=><span key={mission.id} className={`calendar-event rank-${mission.rank.toLowerCase()}`}>{mission.title}</span>)}{total>3&&<small>+{total-3}</small>}</div><div className="calendar-dots" aria-hidden="true">{fixed.slice(0,4).map(event=><i className={`tone-bg-${categoryTone[event.category]??'slate'} ${event.isOptional?'is-optional':''}`} key={event.id}/>)}{missions.slice(0,2).map(mission=><i className={`rank-${mission.rank.toLowerCase()}`} key={mission.id}/>)}</div></button>})}</div></SurfaceCard><aside className="calendar-agenda calendar-day-inspector"><SurfaceCard tone="blue" className="day-inspector-card"><div className="day-inspector__header"><div><span className="eyebrow">Dia selecionado</span><h2>{fullDate(selectedDate)}</h2></div><div><button className="icon-button" onClick={()=>shiftSelected(-1)}><ChevronLeft size={16}/></button><button className="icon-button" onClick={()=>shiftSelected(1)}><ChevronRight size={16}/></button></div></div><div className="day-inspector__metrics"><span><strong>{selectedEvents.filter(e=>!e.isOptional).length}</strong> compromissos</span><span><strong>{selectedMissions.length}</strong> missões</span><span><strong>{Math.round(busyMinutes/60*10)/10}h</strong> ocupadas</span></div><div className="day-inspector__actions"><button className="primary-button" onClick={addForSelected}><Plus size={15}/>Nova missão</button>{!selectedIsToday&&<button className="secondary-button" onClick={goToday}><RotateCcw size={15}/>Voltar a hoje</button>}</div></SurfaceCard><SurfaceCard eyebrow="Agenda" title={selectedEvents.length||selectedMissions.length?'Tudo deste dia':'Dia sem itens'}><div className="day-detail-list">{selectedEvents.map(event=>{const expanded=expandedEvent===event.id;return <article className={`day-detail-item ${event.isOptional?'is-optional':''}`} key={event.id}><button className="day-detail-item__main" onClick={()=>setExpandedEvent(expanded?null:event.id)}><span className={`agenda-category tone-${categoryTone[event.category]??'slate'}`}><Clock3 size={14}/></span><div><small>{isTimed(event)?`${time(event.start)}–${time(event.end)}`:'dia inteiro'} · {categoryName[event.category]??event.category}</small><strong>{event.title}</strong></div><ArrowRight className={expanded?'is-rotated':''} size={14}/></button>{expanded&&<div className="day-detail-item__expanded"><p>{event.note||'Sem observações adicionais.'}</p>{event.isOptional&&<span className="conditional-note">Este item é condicional e não ocupa sua rotina enquanto permanecer assim.</span>}{canToggle(event)&&<button className="text-button" disabled={updatingEvent===event.sourceId} onClick={()=>void toggleConditional(event)}>{event.isOptional?'Considerar como compromisso real':'Voltar a tratar como condicional'}</button>}</div>}</article>})}{selectedMissions.map(mission=><article className="day-mission-item" key={mission.id}><span className={`rank-chip rank-${mission.rank.toLowerCase()}`}>{mission.rank}</span><div><strong>{mission.title}</strong><small>{mission.duration_minutes?`${mission.duration_minutes} min · `:''}{mission.priority}</small></div><div className="day-mission-actions">{selectedIsToday&&<button className="icon-button" onClick={()=>navigate(`/foco?minutes=${mission.duration_minutes??45}&mission=${mission.id}`)}><Focus size={14}/></button>}<button className="icon-button" onClick={()=>void completeMission(mission.id)}><CheckCircle2 size={15}/></button></div></article>)}{!selectedEvents.length&&!selectedMissions.length&&<div className="empty-compact"><CalendarDays size={17}/>Nada marcado. Esse dia pode continuar livre.</div>}</div></SurfaceCard><SurfaceCard tone="green" eyebrow="Espaço disponível" title={windows.length?'Janelas livres':'Sem janela longa'}><div className="free-window-list">{windows.slice(0,4).map((window,index)=>{const preset=focusPreset(window.minutes);const current=selectedIsToday&&index===0&&window.start<=now&&window.end>now;return <div className="free-window" key={`${window.start.toISOString()}-${window.end.toISOString()}`}><div><strong>{time(window.start)}–{time(window.end)}</strong><span>{window.minutes} min livres</span></div>{current&&<button className="secondary-button" onClick={()=>navigate(`/foco?minutes=${preset}`)}><Focus size={14}/>Foco {preset}</button>}</div>})}{!windows.length&&<p className="panel-copy">Entre 7h e 22h não há um intervalo livre de pelo menos 25 minutos neste dia.</p>}</div></SurfaceCard><SurfaceCard tone="slate" eyebrow="Adiante" title="Próximos compromissos"><div className="agenda-list">{upcomingCalendar.map(event=><button className={`agenda-item agenda-item--calendar agenda-item--button ${event.isOptional?'agenda-item--optional':''}`} key={event.id} onClick={()=>selectDay(event.start)}><span className={`agenda-category tone-${categoryTone[event.category]??'slate'}`}><CalendarDays size={14}/></span><div><strong>{event.title}</strong><small>{compactDate(event.start)} · {event.isOptional?'se necessário':time(event.start)}</small></div></button>)}</div></SurfaceCard></aside></section></div>
}
