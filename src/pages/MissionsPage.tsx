import { CheckCircle2, Circle, Crosshair, Filter, Inbox, LayoutGrid, List, ListChecks, Search, Sparkles, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { navigate } from '../lib/router'
import { emitUI } from '../lib/ui-events'
import type { NexusMission } from '../types/nexus'

type MissionView = 'board' | 'list' | 'focus'
const priorityWeight: Record<NexusMission['priority'], number> = { Baixa: 1, Média: 2, Alta: 3, Crítica: 4 }
const rankWeight: Record<NexusMission['rank'], number> = { D: 1, C: 2, B: 3, A: 4, S: 5 }

function dueLabel(value: string | null) {
  if (!value) return 'Sem prazo'
  const date = new Date(value)
  const today = new Date()
  const diff = Math.ceil((date.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0) return `${Math.abs(diff)}d atrasada`
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
}

export function MissionsPage() {
  const { workspace, completeMission } = useNexus()
  const [query, setQuery] = useState('')
  const [rank, setRank] = useState('Todos')
  const [view, setView] = useState<MissionView>(() => window.matchMedia('(max-width: 760px)').matches ? 'list' : 'board')

  const filtered = useMemo(() => workspace.missions.filter((mission) =>
    (!query || `${mission.title} ${mission.notes ?? ''}`.toLowerCase().includes(query.toLowerCase())) &&
    (rank === 'Todos' || mission.rank === rank)
  ), [workspace.missions, query, rank])

  const inbox = filtered.filter((mission) => mission.status === 'Inbox')
  const active = filtered.filter((mission) => mission.status === 'A fazer' || mission.status === 'Em andamento')
  const blocked = filtered.filter((mission) => mission.status === 'Bloqueada')
  const totalXp = active.reduce((sum, mission) => sum + mission.xp_base + mission.xp_bonus, 0)
  const focusQueue = useMemo(() => [...active].sort((a, b) => {
    const aUrgency = a.due_at ? Math.max(0, 14 - Math.ceil((new Date(a.due_at).getTime() - Date.now()) / 86_400_000)) : 0
    const bUrgency = b.due_at ? Math.max(0, 14 - Math.ceil((new Date(b.due_at).getTime() - Date.now()) / 86_400_000)) : 0
    return (priorityWeight[b.priority] * 12 + rankWeight[b.rank] * 4 + bUrgency) - (priorityWeight[a.priority] * 12 + rankWeight[a.rank] * 4 + aUrgency)
  }), [active])
  const focusTarget = focusQueue[0]

  return <div className="page-stack missions-page">
    <section className="page-hero page-hero--rose">
      <div><span className="eyebrow">Mission control</span><h1>Missões</h1><p>A unidade mínima de execução do Nexus. Alterne entre mapa, lista e foco sem perder contexto.</p></div>
      <button className="primary-button" onClick={() => emitUI('quickAdd')}><Sparkles size={15} /> Nova missão</button>
    </section>

    <section className="mission-toolbar">
      <div className="mission-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar missão…" /></div>
      <div className="view-switcher" aria-label="Visualização das missões">
        <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}><LayoutGrid size={14} /><span>Quadro</span></button>
        <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={14} /><span>Lista</span></button>
        <button className={view === 'focus' ? 'active' : ''} onClick={() => setView('focus')}><Crosshair size={14} /><span>Foco</span></button>
      </div>
      <div className="rank-filter"><Filter size={14} />{['Todos', 'D', 'C', 'B', 'A', 'S'].map((item) => <button key={item} className={rank === item ? 'active' : ''} onClick={() => setRank(item)}>{item}</button>)}</div>
      <div className="mission-potential"><Zap size={14} /><span>{totalXp} XP disponíveis</span></div>
    </section>

    {view === 'board' && <section className="kanban-grid kanban-grid--advanced">
      <MissionColumn title="Inbox" icon={Inbox} missions={inbox} complete={completeMission} empty="Tudo processado." />
      <MissionColumn title="Em campo" icon={ListChecks} missions={active} complete={completeMission} empty="Nenhuma missão ativa." primary />
      <MissionColumn title="Bloqueadas" icon={Circle} missions={blocked} complete={completeMission} empty="Sem bloqueios." />
    </section>}

    {view === 'list' && <SurfaceCard eyebrow="Visão operacional" title={`${filtered.length} missões`}>
      <div className="mission-list-view">
        {filtered.map((mission) => <article className="mission-list-row" key={mission.id}>
          <span className={`rank-chip rank-${mission.rank.toLowerCase()}`}>{mission.rank}</span>
          <div className="mission-list-row__main"><strong>{mission.title}</strong><small>{mission.notes || mission.status}</small></div>
          <span className="mission-list-cell">{mission.priority}</span>
          <span className="mission-list-cell">{mission.duration_minutes ?? 45} min</span>
          <span className="mission-list-cell">{dueLabel(mission.due_at)}</span>
          {mission.status !== 'Inbox' && mission.status !== 'Feita' ? <button className="mission-complete-round" onClick={() => void completeMission(mission.id)} aria-label={`Concluir ${mission.title}`}><CheckCircle2 size={16} /></button> : <span />}
        </article>)}
        {!filtered.length && <div className="empty-state-modern">Nenhuma missão corresponde aos filtros.</div>}
      </div>
    </SurfaceCard>}

    {view === 'focus' && <section className="mission-focus-view">
      <article className="mission-focus-hero">
        {focusTarget ? <>
          <div><span className="eyebrow">Próximo alvo</span><h2>{focusTarget.title}</h2><p>{focusTarget.notes || `Missão ${focusTarget.priority.toLowerCase()} · Rank ${focusTarget.rank} · ${dueLabel(focusTarget.due_at)}.`}</p></div>
          <div><div className="mission-meta"><span className={`rank-chip rank-${focusTarget.rank.toLowerCase()}`}>{focusTarget.rank}</span><span>{focusTarget.duration_minutes ?? 45} min</span><span>+{focusTarget.xp_base + focusTarget.xp_bonus} XP</span></div><div className="now-actions"><button className="primary-button" onClick={() => navigate('/foco')}>Abrir Focus Studio</button><button className="completion-button" onClick={() => void completeMission(focusTarget.id)}><CheckCircle2 size={16} /> Concluir</button></div></div>
        </> : <><div><span className="eyebrow">Campo livre</span><h2>Nenhum alvo ativo.</h2><p>Capture uma missão ou use o tempo para revisar o mapa.</p></div><button className="secondary-button" onClick={() => emitUI('quickAdd')}>Criar missão</button></>}
      </article>
      <SurfaceCard eyebrow="Fila inteligente" title="Depois deste alvo">
        <div className="focus-queue">{focusQueue.slice(1, 6).map((mission, index) => <button key={mission.id} onClick={() => navigate('/foco')}><span className={`rank-chip rank-${mission.rank.toLowerCase()}`}>{mission.rank}</span><div><strong>{mission.title}</strong><small>#{index + 2} · {mission.priority} · {mission.duration_minutes ?? 45} min · {dueLabel(mission.due_at)}</small></div><Crosshair size={15} /></button>)}{focusQueue.length <= 1 && <div className="empty-compact">Sem fila adicional.</div>}</div>
      </SurfaceCard>
    </section>}
  </div>
}

function MissionColumn({ title, icon: Icon, missions, complete, empty, primary = false }: { title: string; icon: typeof Inbox; missions: ReturnType<typeof useNexus>['workspace']['missions']; complete: (id: string) => Promise<{ xp: number; coins: number }>; empty: string; primary?: boolean }) {
  return <SurfaceCard className={`mission-column-modern ${primary ? 'mission-column-modern--primary' : ''}`} title={title} action={<span className="column-count">{missions.length}</span>}><div className="mission-stack">{missions.map((mission) => <article className="mission-card-modern" key={mission.id}><header><span className={`rank-chip rank-${mission.rank.toLowerCase()}`}>{mission.rank}</span><span>{mission.priority}</span></header><strong>{mission.title}</strong>{mission.notes && <p>{mission.notes}</p>}<footer><div><span>{mission.duration_minutes ?? 45}m</span><span>+{mission.xp_base + mission.xp_bonus} XP</span><span>+{mission.coins_base} ◈</span></div>{mission.status !== 'Inbox' && <button onClick={() => void complete(mission.id)} aria-label={`Concluir ${mission.title}`}><CheckCircle2 size={17} /></button>}</footer></article>)}{!missions.length && <div className="empty-column"><Icon size={19} /><span>{empty}</span></div>}</div></SurfaceCard>
}
