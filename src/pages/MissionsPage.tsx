import { CalendarDays, CheckCircle2, Circle, Crosshair, Filter, Inbox, LayoutGrid, List, ListChecks, Search, Sparkles, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { navigate } from '../lib/router'
import { emitUI } from '../lib/ui-events'
import type { NexusMission } from '../types/nexus'

type MissionView = 'board' | 'list' | 'focus'
const priorityWeight: Record<NexusMission['priority'], number> = { Baixa: 1, Média: 2, Alta: 3, Crítica: 4 }
const rankWeight: Record<NexusMission['rank'], number> = { D: 1, C: 2, B: 3, A: 4, S: 5 }
const isoDate=(value:string|null)=>value?value.slice(0,10):''

function dueLabel(value: string | null) {
  if (!value) return 'Sem prazo'
  const date = new Date(value); const today = new Date(); const diff = Math.ceil((date.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0) return `${Math.abs(diff)}d atrasada`; if (diff === 0) return 'Hoje'; if (diff === 1) return 'Amanhã'
  return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', timeZone:'America/Sao_Paulo' }).format(date).replace('.','')
}

export function MissionsPage() {
  const { workspace, completeMission, processMission } = useNexus()
  const [query, setQuery] = useState(''); const [rank, setRank] = useState('Todos')
  const [view, setView] = useState<MissionView>(() => window.matchMedia('(max-width:760px)').matches ? 'list' : 'board')
  const [selectedId,setSelectedId]=useState<string|null>(null); const [saving,setSaving]=useState(false)

  const filtered = useMemo(() => workspace.missions.filter((mission) => (!query || `${mission.title} ${mission.notes??''}`.toLowerCase().includes(query.toLowerCase())) && (rank==='Todos'||mission.rank===rank)), [workspace.missions,query,rank])
  const inbox=filtered.filter(m=>m.status==='Inbox'); const active=filtered.filter(m=>m.status==='A fazer'||m.status==='Em andamento'); const blocked=filtered.filter(m=>m.status==='Bloqueada')
  const totalXp=active.reduce((sum,m)=>sum+m.xp_base+m.xp_bonus,0)
  const focusQueue=useMemo(()=>[...active].sort((a,b)=>{const aUrgency=a.due_at?Math.max(0,14-Math.ceil((new Date(a.due_at).getTime()-Date.now())/86_400_000)):0;const bUrgency=b.due_at?Math.max(0,14-Math.ceil((new Date(b.due_at).getTime()-Date.now())/86_400_000)):0;return(priorityWeight[b.priority]*12+rankWeight[b.rank]*4+bUrgency)-(priorityWeight[a.priority]*12+rankWeight[a.rank]*4+aUrgency)}),[active])
  const focusTarget=focusQueue[0]
  const selected=workspace.missions.find(m=>m.id===selectedId)??null
  const project=selected?.project_id?workspace.projects.find(p=>p.id===selected.project_id):null
  const overdueCount=active.filter(m=>m.due_at&&new Date(m.due_at)<new Date()).length

  useEffect(()=>{if(selectedId&&!workspace.missions.some(m=>m.id===selectedId))setSelectedId(null)},[workspace.missions,selectedId])
  function inspect(id:string){setSelectedId(id);if(window.matchMedia('(max-width:760px)').matches)window.setTimeout(()=>document.querySelector('.mission-inspector')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}
  async function patch(patch:Partial<Pick<NexusMission,'status'|'priority'|'rank'|'due_at'|'project_id'>>){if(!selected)return;setSaving(true);try{await processMission(selected.id,patch)}finally{setSaving(false)}}

  return <div className="page-stack missions-page missions-page--consultable">
    <section className="page-hero page-hero--rose"><div><span className="eyebrow">Tarefas e ações</span><h1>Missões</h1><p>Consulte a fila por contexto, abra qualquer missão para decidir prazo, prioridade, projeto e próxima ação sem sair da tela.</p></div><button className="primary-button" onClick={()=>emitUI('quickAdd')}><Sparkles size={15}/>Nova missão</button></section>

    <section className="mission-context-strip">
      <button className={focusTarget?'has-action':''} onClick={()=>focusTarget&&inspect(focusTarget.id)}><span>Próxima recomendada</span><strong>{focusTarget?.title??'Nenhuma missão ativa'}</strong><small>{focusTarget?`${focusTarget.duration_minutes??45} min · ${dueLabel(focusTarget.due_at)}`:'A fila está limpa'}</small></button>
      <button onClick={()=>setView('list')}><span>Atrasadas</span><strong>{overdueCount}</strong><small>{overdueCount?'precisam de decisão':'nenhuma pendência vencida'}</small></button>
      <button onClick={()=>setView('board')}><span>Em aberto</span><strong>{active.length}</strong><small>{totalXp} XP possíveis</small></button>
    </section>

    <section className="mission-toolbar">
      <div className="mission-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar missão…"/></div>
      <div className="view-switcher" aria-label="Visualização das missões"><button className={view==='board'?'active':''} onClick={()=>setView('board')}><LayoutGrid size={14}/><span>Quadro</span></button><button className={view==='list'?'active':''} onClick={()=>setView('list')}><List size={14}/><span>Lista</span></button><button className={view==='focus'?'active':''} onClick={()=>setView('focus')}><Crosshair size={14}/><span>Foco</span></button></div>
      <div className="rank-filter"><Filter size={14}/>{['Todos','D','C','B','A','S'].map(item=><button key={item} className={rank===item?'active':''} onClick={()=>setRank(item)}>{item}</button>)}</div>
      <div className="mission-potential"><Zap size={14}/><span>{totalXp} XP em aberto</span></div>
    </section>

    <section className={`mission-workspace ${selected?'has-inspector':''}`}>
      <div className="mission-workspace__main">
        {view==='board'&&<section className="kanban-grid kanban-grid--advanced"><MissionColumn title="Inbox" icon={Inbox} missions={inbox} inspect={inspect} empty="Tudo processado."/><MissionColumn title="A fazer" icon={ListChecks} missions={active} inspect={inspect} empty="Nenhuma missão ativa." primary/><MissionColumn title="Bloqueadas" icon={Circle} missions={blocked} inspect={inspect} empty="Sem bloqueios."/></section>}

        {view==='list'&&<SurfaceCard eyebrow="Lista" title={`${filtered.length} missões`}><div className="mission-list-view">{filtered.map(m=><button className={`mission-list-row mission-list-row--button ${selectedId===m.id?'selected':''}`} key={m.id} onClick={()=>inspect(m.id)}><span className={`rank-chip rank-${m.rank.toLowerCase()}`}>{m.rank}</span><div className="mission-list-row__main"><strong>{m.title}</strong><small>{m.notes||m.status}</small></div><span className="mission-list-cell">{m.priority}</span><span className="mission-list-cell">{m.duration_minutes??45} min</span><span className="mission-list-cell">{dueLabel(m.due_at)}</span><Crosshair size={15}/></button>)}{!filtered.length&&<div className="empty-state-modern">Nenhuma missão corresponde aos filtros.</div>}</div></SurfaceCard>}

        {view==='focus'&&<section className="mission-focus-view"><article className="mission-focus-hero">{focusTarget?<><div><span className="eyebrow">Próxima missão</span><h2>{focusTarget.title}</h2><p>{focusTarget.notes||`${focusTarget.priority} · Rank ${focusTarget.rank} · ${dueLabel(focusTarget.due_at)}.`}</p></div><div><div className="mission-meta"><span className={`rank-chip rank-${focusTarget.rank.toLowerCase()}`}>{focusTarget.rank}</span><span>{focusTarget.duration_minutes??45} min</span><span>+{focusTarget.xp_base+focusTarget.xp_bonus} XP</span></div><div className="now-actions"><button className="primary-button" onClick={()=>navigate(`/foco?minutes=${focusTarget.duration_minutes??45}&mission=${focusTarget.id}`)}>Abrir foco</button><button className="secondary-button" onClick={()=>inspect(focusTarget.id)}>Consultar</button></div></div></>:<><div><span className="eyebrow">Sem missão ativa</span><h2>Nada pendente aqui.</h2><p>Você pode capturar uma nova ação ou revisar a Inbox.</p></div><button className="secondary-button" onClick={()=>emitUI('quickAdd')}>Criar missão</button></>}</article><SurfaceCard eyebrow="Depois" title="Próximas da fila"><div className="focus-queue">{focusQueue.slice(1,6).map((m,index)=><button key={m.id} onClick={()=>inspect(m.id)}><span className={`rank-chip rank-${m.rank.toLowerCase()}`}>{m.rank}</span><div><strong>{m.title}</strong><small>#{index+2} · {m.priority} · {m.duration_minutes??45} min · {dueLabel(m.due_at)}</small></div><Crosshair size={15}/></button>)}{focusQueue.length<=1&&<div className="empty-compact">Sem outras missões na fila.</div>}</div></SurfaceCard></section>}
      </div>

      {selected&&<aside className="mission-inspector">
        <SurfaceCard tone="rose" className="entity-inspector">
          <div className="entity-inspector__header"><div><span className="eyebrow">Missão selecionada</span><h2>{selected.title}</h2></div><button className="icon-button" onClick={()=>setSelectedId(null)} aria-label="Fechar"><X size={16}/></button></div>
          {selected.notes&&<p className="panel-copy">{selected.notes}</p>}
          <div className="entity-inspector__meta"><span className={`rank-chip rank-${selected.rank.toLowerCase()}`}>{selected.rank}</span><span>{selected.duration_minutes??45} min</span><span>+{selected.xp_base+selected.xp_bonus} XP</span><span>{dueLabel(selected.due_at)}</span></div>
          <div className="entity-inspector__actions"><button className="primary-button" onClick={()=>navigate(`/foco?minutes=${selected.duration_minutes??45}&mission=${selected.id}`)}><Crosshair size={15}/>Focar</button><button className="completion-button" onClick={()=>void completeMission(selected.id)}><CheckCircle2 size={15}/>Concluir</button></div>
        </SurfaceCard>

        <SurfaceCard eyebrow="Decisão" title="Organizar esta missão"><div className="inspector-form-grid">
          <label><span>Status</span><select disabled={saving} value={selected.status} onChange={e=>void patch({status:e.target.value as NexusMission['status']})}>{['Inbox','A fazer','Em andamento','Bloqueada','Cancelada'].map(v=><option key={v}>{v}</option>)}</select></label>
          <label><span>Prioridade</span><select disabled={saving} value={selected.priority} onChange={e=>void patch({priority:e.target.value as NexusMission['priority']})}>{['Baixa','Média','Alta','Crítica'].map(v=><option key={v}>{v}</option>)}</select></label>
          <label><span>Rank</span><select disabled={saving} value={selected.rank} onChange={e=>void patch({rank:e.target.value as NexusMission['rank']})}>{['D','C','B','A','S'].map(v=><option key={v}>{v}</option>)}</select></label>
          <label><span>Projeto</span><select disabled={saving} value={selected.project_id??''} onChange={e=>void patch({project_id:e.target.value||null})}><option value="">Sem projeto</option>{workspace.projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
          <label className="inspector-form-grid__wide"><span>Prazo</span><div className="native-date-wrap"><input type="date" value={isoDate(selected.due_at)} onChange={e=>void patch({due_at:e.target.value?`${e.target.value}T23:59:00-03:00`:null})}/></div></label>
        </div></SurfaceCard>

        <SurfaceCard tone="violet" eyebrow="Contexto" title={project?'Projeto relacionado':'Sem projeto relacionado'}>{project?<button className="context-linked-entity" onClick={()=>navigate('/projetos')}><div><strong>{project.name}</strong><span>{project.progress}% · {project.next_action||'sem próxima ação'}</span></div><ArrowRightIcon/></button>:<p className="panel-copy">Se esta ação pertence a um resultado maior, ligue-a a um projeto acima. Caso contrário, ela pode continuar independente.</p>}{selected.due_at&&<button className="text-button inspector-calendar-link" onClick={()=>navigate('/calendario')}><CalendarDays size={14}/>Ver no calendário</button>}</SurfaceCard>
      </aside>}
    </section>
  </div>
}

function ArrowRightIcon(){return <span aria-hidden="true">→</span>}
function MissionColumn({title,icon:Icon,missions,inspect,empty,primary=false}:{title:string;icon:typeof Inbox;missions:ReturnType<typeof useNexus>['workspace']['missions'];inspect:(id:string)=>void;empty:string;primary?:boolean}){
  return <SurfaceCard className={`mission-column-modern ${primary?'mission-column-modern--primary':''}`} title={title} action={<span className="column-count">{missions.length}</span>}><div className="mission-stack">{missions.map(m=><button className="mission-card-modern mission-card-modern--button" key={m.id} onClick={()=>inspect(m.id)}><header><span className={`rank-chip rank-${m.rank.toLowerCase()}`}>{m.rank}</span><span>{m.priority}</span></header><strong>{m.title}</strong>{m.notes&&<p>{m.notes}</p>}<footer><div><span>{m.duration_minutes??45}m</span><span>+{m.xp_base+m.xp_bonus} XP</span><span>{dueLabel(m.due_at)}</span></div><Crosshair size={16}/></footer></button>)}{!missions.length&&<div className="empty-column"><Icon size={19}/><span>{empty}</span></div>}</div></SurfaceCard>
}
