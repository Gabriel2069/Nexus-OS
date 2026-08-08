import { CheckCircle2, Circle, Filter, Inbox, ListChecks, Search, Sparkles, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { emitUI } from '../lib/ui-events'

export function MissionsPage(){
  const {workspace,completeMission}=useNexus(); const [query,setQuery]=useState(''); const [rank,setRank]=useState('Todos')
  const filtered=useMemo(()=>workspace.missions.filter(m=>(!query||m.title.toLowerCase().includes(query.toLowerCase()))&&(rank==='Todos'||m.rank===rank)),[workspace.missions,query,rank])
  const inbox=filtered.filter(m=>m.status==='Inbox'); const active=filtered.filter(m=>m.status==='A fazer'||m.status==='Em andamento'); const blocked=filtered.filter(m=>m.status==='Bloqueada')
  const totalXp=active.reduce((s,m)=>s+m.xp_base+m.xp_bonus,0)
  return <div className="page-stack missions-page"><section className="page-hero page-hero--rose"><div><span className="eyebrow">Mission control</span><h1>Missões</h1><p>A unidade mínima de execução do Nexus. Priorize, filtre, conclua e deixe o progresso reverberar pelo sistema inteiro.</p></div><button className="primary-button" onClick={()=>emitUI('quickAdd')}><Sparkles size={15}/> Nova missão</button></section><section className="mission-toolbar"><div className="mission-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar missão…"/></div><div className="rank-filter"><Filter size={14}/>{['Todos','D','C','B','A','S'].map(item=><button key={item} className={rank===item?'active':''} onClick={()=>setRank(item)}>{item}</button>)}</div><div className="mission-potential"><Zap size={14}/><span>{totalXp} XP disponíveis</span></div></section><section className="kanban-grid kanban-grid--advanced"><MissionColumn title="Inbox" icon={Inbox} missions={inbox} complete={completeMission} empty="Tudo processado."/><MissionColumn title="Em campo" icon={ListChecks} missions={active} complete={completeMission} empty="Nenhuma missão ativa." primary/><MissionColumn title="Bloqueadas" icon={Circle} missions={blocked} complete={completeMission} empty="Sem bloqueios."/></section></div>
}

function MissionColumn({title,icon:Icon,missions,complete,empty,primary=false}:{title:string;icon:typeof Inbox;missions:ReturnType<typeof useNexus>['workspace']['missions'];complete:(id:string)=>Promise<{xp:number;coins:number}>;empty:string;primary?:boolean}){
  return <SurfaceCard className={`mission-column-modern ${primary?'mission-column-modern--primary':''}`} title={title} action={<span className="column-count">{missions.length}</span>}><div className="mission-stack">{missions.map(m=><article className="mission-card-modern" key={m.id}><header><span className={`rank-chip rank-${m.rank.toLowerCase()}`}>{m.rank}</span><span>{m.priority}</span></header><strong>{m.title}</strong>{m.notes&&<p>{m.notes}</p>}<footer><div><span>{m.duration_minutes??45}m</span><span>+{m.xp_base+m.xp_bonus} XP</span><span>+{m.coins_base} ◈</span></div>{m.status!=='Inbox'&&<button onClick={()=>void complete(m.id)}><CheckCircle2 size={17}/></button>}</footer></article>)}{!missions.length&&<div className="empty-column"><Icon size={19}/><span>{empty}</span></div>}</div></SurfaceCard>
}
