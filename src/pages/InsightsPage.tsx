import { BarChart3, Brain, CalendarRange, Clock3, Flame, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Sparkline } from '../components/charts/Sparkline'
import { MetricBars } from '../components/charts/MetricBars'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { getReadiness, pearson } from '../lib/decision-engine'
import { localDate } from '../lib/nexus-api'

function lastDays(count: number) { return Array.from({ length: count }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (count - 1 - index)); return date }) }
const key = (date: Date) => localDate(date)

type Range = 7 | 30

export function InsightsPage() {
  const { workspace } = useNexus()
  const [range, setRange] = useState<Range>(7)
  const days = useMemo(() => lastDays(range), [range])

  const xp = days.map((day) => ({
    label: range === 7 ? new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(day).replace('.', '') : new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(day),
    value: workspace.activity.filter((event) => event.created_at.slice(0, 10) === key(day)).reduce((sum, event) => sum + Math.max(0, event.xp_delta), 0),
  }))
  const focus = days.map((day) => ({
    label: range === 7 ? new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(day).replace('.', '') : new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(day),
    value: workspace.focusSessions.filter((session) => session.started_at.slice(0, 10) === key(day) && session.status === 'completed').reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0),
  }))

  const totalXp = xp.reduce((sum, day) => sum + day.value, 0)
  const totalFocus = focus.reduce((sum, day) => sum + day.value, 0)
  const readiness = getReadiness(workspace.checkin)
  const activeDays = xp.filter((day, index) => day.value > 0 || focus[index].value > 0).length
  const consistency = Math.round(activeDays / range * 100)
  const averageXp = Math.round(totalXp / Math.max(activeDays, 1))

  const xpByDate = new Map<string, number>()
  workspace.activity.forEach((event) => xpByDate.set(event.created_at.slice(0, 10), (xpByDate.get(event.created_at.slice(0, 10)) ?? 0) + Math.max(0, event.xp_delta)))
  const energyXpPairs = workspace.dailyCheckins.filter((checkin) => checkin.energy != null).map((checkin) => [checkin.energy as number, xpByDate.get(checkin.checkin_date) ?? 0] as [number, number])
  const energyXp = pearson(energyXpPairs)
  const energy = workspace.dailyCheckins.slice(-range).map((checkin) => ({
    label: new Date(`${checkin.checkin_date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: range === 7 ? 'short' : undefined, day: range === 30 ? '2-digit' : undefined }).replace('.', ''),
    value: checkin.energy ?? 0,
    detail: checkin.energy ? `${checkin.energy}/10` : '—',
  }))
  const validEnergy = workspace.dailyCheckins.slice(-range).filter((checkin) => checkin.energy != null)
  const averageEnergy = validEnergy.length ? (validEnergy.reduce((sum, checkin) => sum + (checkin.energy ?? 0), 0) / validEnergy.length).toFixed(1) : '—'

  const heatmap = days.map((day, index) => ({
    date: key(day),
    label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(day),
    xp: xp[index].value,
    focus: focus[index].value,
    intensity: Math.min(4, Math.ceil((xp[index].value + focus[index].value * 2) / 120)),
  }))

  return <div className="page-stack insights-page">
    <section className="page-hero page-hero--cyan">
      <div><span className="eyebrow">Seus dados</span><h1>Insights</h1><p>Gráficos de XP, foco e energia com base no que você registrou. Quanto mais histórico houver, mais úteis eles ficam.</p></div>
      <div className="view-switcher" aria-label="Período dos insights">
        <button className={range === 7 ? 'active' : ''} onClick={() => setRange(7)}>7 dias</button>
        <button className={range === 30 ? 'active' : ''} onClick={() => setRange(30)}>30 dias</button>
      </div>
    </section>

    <section className="metrics-grid">
      <SurfaceCard tone="violet" className="metric-card"><div className="metric-icon"><Zap size={18} /></div><div><span>XP registrado</span><strong>{totalXp}</strong><small>{range} dias</small></div></SurfaceCard>
      <SurfaceCard tone="blue" className="metric-card"><div className="metric-icon"><Clock3 size={18} /></div><div><span>Tempo em foco</span><strong>{totalFocus}m</strong><small>sessões concluídas</small></div></SurfaceCard>
      <SurfaceCard tone="green" className="metric-card"><div className="metric-icon"><Flame size={18} /></div><div><span>Dias com atividade</span><strong>{consistency}%</strong><small>{activeDays}/{range} dias</small></div></SurfaceCard>
      <SurfaceCard tone="cyan" className="metric-card"><div className="metric-icon"><Brain size={18} /></div><div><span>Energia média</span><strong>{averageEnergy}</strong><small>check-ins do período</small></div></SurfaceCard>
    </section>

    <section className="split-grid split-grid--wide">
      <SurfaceCard tone="violet" eyebrow="XP" title="Ao longo do período"><Sparkline data={xp} /></SurfaceCard>
      <SurfaceCard tone="blue" eyebrow="Foco" title="Minutos registrados"><Sparkline data={focus} suffix="m" /></SurfaceCard>
    </section>

    <SurfaceCard tone="cyan" eyebrow="Atividade" title="Dias com registro" action={<span className="page-hero__badge"><CalendarRange size={14} /> <span>{activeDays} dias</span></span>}>
      <div className="activity-heatmap" role="img" aria-label={`Mapa de atividade dos últimos ${range} dias`}>
        {heatmap.map((day) => <div className="heatmap-day" key={day.date} title={`${day.label}: ${day.xp} XP · ${day.focus} min de foco`}><span className={`heatmap-cell heatmap-cell--${day.intensity}`} /><small>{range === 7 ? day.label : new Date(`${day.date}T12:00:00`).getDate()}</small></div>)}
      </div>
      <div className="heatmap-summary"><span><strong>{averageXp}</strong> XP por dia ativo</span><span><strong>{readiness.score}</strong> disposição hoje</span><span><strong>{workspace.profile?.streak_current ?? 0}</strong> dias de sequência</span></div>
    </SurfaceCard>

    <section className="split-grid">
      <SurfaceCard tone="green" eyebrow="Energia" title="Check-ins registrados">{energy.length ? <MetricBars items={energy} max={10} /> : <div className="empty-compact">Faça check-ins em Hoje para começar a formar este gráfico.</div>}</SurfaceCard>
      <SurfaceCard eyebrow="Leitura" title="O que os dados sugerem"><div className="insight-list"><div><strong>Energia e XP</strong><span>{energyXp == null ? 'Ainda são necessários pelo menos 3 dias com check-in e atividade.' : `${energyXp > 0.35 ? 'Nos dias com mais energia, o XP também tende a subir' : energyXp < -0.35 ? 'Mais energia ainda não está aparecendo como mais XP' : 'Ainda não há uma relação clara'} (r = ${energyXp.toFixed(2)}).`}</span></div><div><strong>Frequência de uso</strong><span>{consistency >= 70 ? 'Há registros suficientes para começar a enxergar padrões.' : consistency >= 40 ? 'Já existem alguns sinais, mas ainda há lacunas no período.' : 'Ainda há poucos registros para tirar conclusões úteis.'}</span></div><div><strong>Tempo em foco</strong><span>{totalFocus > range * 90 ? 'O volume está alto; compare com sua energia antes de aumentar ainda mais.' : 'O volume ainda pode ser ajustado de acordo com sua energia e seus compromissos.'}</span></div></div></SurfaceCard>
    </section>
  </div>
}
