import { ArrowRight, CalendarClock, Check, Clock3, Coins, GraduationCap, Sparkles, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { navigate } from '../lib/router'
import { formatOccurrenceTime, getRoutineContext } from '../lib/routine-context'

const dayLabel = (date: Date) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' }).format(date)
const timeLabel = (date: Date) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(date)
const categoryLabel: Record<string, string> = { school:'Escola', class:'Aula', study:'Estudo', exam:'Prova', health:'Saúde', recovery:'Pausa', sleep:'Sono' }

export function HomePage() {
  const { workspace, loading, error } = useNexus()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(id) }, [])

  const context = useMemo(() => getRoutineContext(workspace, now), [workspace, now])
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' }).format(now)
  const todayFocus = workspace.focusSessions.filter((session) => session.status === 'completed' && session.started_at.slice(0, 10) === todayKey).reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0)
  const checkinDone = Boolean(workspace.checkin)
  const routineItems = workspace.routines.flatMap((routine) => routine.routine_items ?? [])
  const completedIds = new Set(workspace.routineCompletions.map((item) => item.routine_item_id))
  const eveningDone = routineItems.filter((item) => /fechar|vitória|amanhã/i.test(item.title)).some((item) => completedIds.has(item.id))
  const xp = workspace.journey?.xp_earned ?? 0
  const focusPath = context.suggestion.actionPath?.startsWith('/foco') ? context.suggestion.actionPath : '/foco'
  const timedToday = context.today.filter((event) => !event.isOptional && !['sleep','recovery'].includes(event.category) && event.end.getTime() - event.start.getTime() < 20 * 60 * 60_000)

  return <div className="page-stack now-page">
    <section className={`now-stage now-stage--${context.suggestion.kind}`}>
      <div className="now-stage__top">
        <div><span className="eyebrow">{dayLabel(now)}</span><strong className="now-clock">{timeLabel(now)}</strong></div>
        <div className="now-stage__status"><span>{context.load === 'cheio' ? 'dia cheio' : context.load === 'leve' ? 'dia leve' : 'dia normal'}</span><b>{xp} XP</b></div>
      </div>
      <div className="now-stage__main">
        <div className="now-stage__icon"><Sparkles size={24}/></div>
        <div className="now-stage__copy">
          <span>{context.current ? 'Agora' : context.suggestion.optional ? 'Janela atual' : 'Próximo passo'}</span>
          <h1>{context.suggestion.title}</h1>
          <p>{context.suggestion.detail}</p>
          <div className="now-stage__meta">
            {!context.current && context.freeMinutes > 0 && <span><Clock3 size={13}/>{context.freeMinutes} min até o próximo limite</span>}
            {context.current && <span><Clock3 size={13}/>{formatOccurrenceTime(context.current)}</span>}
            {context.next && <span><CalendarClock size={13}/>depois: {context.next.title} · {timeLabel(context.next.start)}</span>}
          </div>
          {context.suggestion.actionPath && <button className="primary-button now-stage__action" onClick={() => navigate(context.suggestion.actionPath!)}>{context.suggestion.actionLabel ?? 'Abrir'}<ArrowRight size={15}/></button>}
        </div>
      </div>
      {error && <small className="system-error">{error}</small>}
    </section>

    <section className="now-support-grid">
      <SurfaceCard tone="blue" eyebrow="Hoje" title="O dia em ordem">
        <div className="day-route">
          {timedToday.map((event) => {
            const current = event.start <= now && event.end > now
            const past = event.end <= now
            return <div className={`day-route__item ${current ? 'is-current' : ''} ${past ? 'is-past' : ''}`} key={event.id}>
              <div className="day-route__time"><strong>{timeLabel(event.start)}</strong><small>{timeLabel(event.end)}</small></div>
              <span className="day-route__dot" />
              <div><span>{categoryLabel[event.category] ?? event.category}</span><strong>{event.title}</strong></div>
            </div>
          })}
          {!timedToday.length && <div className="empty-compact">Nenhum compromisso fixo hoje.</div>}
        </div>
      </SurfaceCard>

      <div className="now-side-stack">
        <SurfaceCard tone="violet" eyebrow="Rotina gamificada" title="Só o essencial">
          <div className="essential-loop">
            <button className={checkinDone ? 'done' : ''} onClick={() => navigate('/hoje')}><span>{checkinDone ? <Check size={14}/> : '1'}</span><div><strong>Check-in rápido</strong><small>{checkinDone ? 'feito hoje' : 'energia + humor'}</small></div></button>
            <button className={todayFocus > 0 ? 'done' : ''} onClick={() => navigate(focusPath)}><span>{todayFocus > 0 ? <Check size={14}/> : '2'}</span><div><strong>Um bloco que importa</strong><small>{todayFocus > 0 ? `${todayFocus} min registrados` : 'quando o calendário abrir espaço'}</small></div></button>
            <button className={eveningDone ? 'done' : ''} onClick={() => navigate('/rotinas')}><span>{eveningDone ? <Check size={14}/> : '3'}</span><div><strong>Fechar o dia</strong><small>2 minutos antes de desacelerar</small></div></button>
          </div>
        </SurfaceCard>

        <SurfaceCard tone="amber" eyebrow="Próxima pressão" title={context.nextExam?.title ?? 'Sem prova próxima'}>
          <div className="exam-glance"><GraduationCap size={20}/><div>{context.nextExam ? <><strong>{context.daysToExam === 0 ? 'Hoje' : context.daysToExam === 1 ? 'Amanhã' : `em ${context.daysToExam} dias`}</strong><span>{new Intl.DateTimeFormat('pt-BR', { weekday:'short', day:'2-digit', month:'short', timeZone:'America/Sao_Paulo' }).format(context.nextExam.start).replace('.', '')}</span></> : <><strong>Calendário respirando</strong><span>não invente urgência</span></>}</div></div>
        </SurfaceCard>
      </div>
    </section>

    <section className="now-bottom-grid">
      <SurfaceCard eyebrow="Depois" title={context.later?.title ?? 'O resto pode esperar'}><p className="panel-copy">{context.later?.detail ?? 'Quando este bloco terminar, volte ao Agora e o Nexus recalcula o próximo passo.'}</p></SurfaceCard>
      <SurfaceCard tone="green" eyebrow="Vida fora da lista" title="Tempo livre continua sendo tempo livre"><p className="panel-copy">Amigos, família, cabelo, hobby e descanso entram quando o calendário abre espaço. Eles não precisam virar uma fila diária de tarefas para contar.</p></SurfaceCard>
      <SurfaceCard tone="violet" eyebrow="Progressão" title={`Nível ${workspace.profile?.level ?? 1}`}><div className="now-progress"><Trophy size={18}/><div><strong>{workspace.profile?.xp_total ?? 0} XP</strong><span><Coins size={12}/>{workspace.profile?.nexus_coins ?? 0} coins</span></div></div></SurfaceCard>
    </section>
    {loading && <div className="loading-line" />}
  </div>
}
