import { ArrowRight, CalendarDays, Inbox, Layers3, Sparkles, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { emitUI } from '../lib/ui-events'
import type { NexusMission } from '../types/nexus'

const tomorrow=()=>{const d=new Date();d.setDate(d.getDate()+1);return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}

export function InboxPage(){
  const {workspace,processMission}=useNexus();const [busy,setBusy]=useState<string|null>(null);const [selectedId,setSelectedId]=useState<string|null>(null);const [priority,setPriority]=useState<NexusMission['priority']>('Média');const [rank,setRank]=useState<NexusMission['rank']>('C');const [dueDate,setDueDate]=useState('');const [projectId,setProjectId]=useState('')
  const inbox=useMemo(()=>workspace.missions.filter(m=>m.status==='Inbox'),[workspace.missions]);const selected=inbox.find(m=>m.id===selectedId)??null
  function inspect(item:NexusMission){setSelectedId(item.id);setPriority(item.priority);setRank(item.rank);setDueDate(item.due_at?.slice(0,10)??'');setProjectId(item.project_id??'');if(window.matchMedia('(max-width:760px)').matches)window.setTimeout(()=>document.querySelector('.inbox-inspector')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}
  async function discard(id:string){setBusy(id);try{await processMission(id,{status:'Cancelada'});if(id===selectedId)setSelectedId(null)}finally{setBusy(null)}}
  async function promote(){if(!selected)return;setBusy(selected.id);try{await processMission(selected.id,{status:'A fazer',priority,rank,due_at:dueDate?`${dueDate}T23:59:00-03:00`:null,project_id:projectId||null});setSelectedId(null)}finally{setBusy(null)}}

  return <div className="page-stack inbox-page inbox-page--consultable">
    <section className="page-hero page-hero--amber"><div><span className="eyebrow">Anote primeiro</span><h1>Caixa de entrada</h1><p>Capture sem pensar demais. Quando for processar, abra uma entrada e decida ali mesmo se ela vira missão, quando entra e a qual projeto pertence.</p></div><div className="page-hero__badge"><Inbox size={17}/><span>{inbox.length} pendência{inbox.length===1?'':'s'}</span></div></section>

    <section className="inbox-command-grid"><SurfaceCard tone="amber" className="inbox-capture-card"><span className="eyebrow">Captura rápida</span><h2>Tem algo para lembrar?</h2><p>Anote agora. O destino pode ser decidido quando houver contexto.</p><button className="primary-button" onClick={()=>emitUI('quickAdd',{type:'inbox'})}><Sparkles size={16}/>Capturar</button></SurfaceCard><SurfaceCard eyebrow="Processar bem" title="Só três decisões"><div className="inbox-rule-list"><div><strong>1.</strong><span>Isso exige uma ação?</span></div><div><strong>2.</strong><span>Quando precisa voltar à sua atenção?</span></div><div><strong>3.</strong><span>É independente ou pertence a um projeto?</span></div></div></SurfaceCard></section>

    <section className={`inbox-workspace ${selected?'has-inspector':''}`}>
      <SurfaceCard eyebrow="Pendências" title={inbox.length?'Escolha uma entrada':'Tudo processado'} action={<span className="surface-chip">{inbox.length}</span>}>
        {inbox.length?<div className="inbox-list">{inbox.map(item=><button className={`inbox-item inbox-item--button ${selectedId===item.id?'selected':''}`} key={item.id} onClick={()=>inspect(item)}><div className="inbox-item__icon"><Layers3 size={16}/></div><div><strong>{item.title}</strong><span>{item.notes||`Entrada rápida · Rank ${item.rank}`}</span></div><ArrowRight size={15}/></button>)}</div>:<div className="empty-state-modern"><Inbox size={28}/><strong>Nada esperando decisão.</strong><span>Você não precisa manter essas coisas na cabeça.</span></div>}
      </SurfaceCard>

      {selected&&<aside className="inbox-inspector"><SurfaceCard tone="amber" className="entity-inspector"><div className="entity-inspector__header"><div><span className="eyebrow">Entrada selecionada</span><h2>{selected.title}</h2></div><button className="icon-button" onClick={()=>setSelectedId(null)}><X size={16}/></button></div>{selected.notes&&<p className="panel-copy">{selected.notes}</p>}<div className="inbox-decision-question"><strong>Isso exige uma ação?</strong><span>Se não, descarte. Se sim, dê contexto suficiente para ela reaparecer na hora certa.</span></div></SurfaceCard>

        <SurfaceCard eyebrow="Destino" title="Transformar em missão"><div className="inspector-form-grid"><label><span>Prioridade</span><select value={priority} onChange={e=>setPriority(e.target.value as NexusMission['priority'])}>{['Baixa','Média','Alta','Crítica'].map(v=><option key={v}>{v}</option>)}</select></label><label><span>Rank</span><select value={rank} onChange={e=>setRank(e.target.value as NexusMission['rank'])}>{['D','C','B','A','S'].map(v=><option key={v}>{v}</option>)}</select></label><label className="inspector-form-grid__wide"><span>Projeto</span><select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Sem projeto</option>{workspace.projects.filter(p=>!['Concluído','Arquivado'].includes(p.status)).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label className="inspector-form-grid__wide"><span>Quando isso volta?</span><div className="native-date-wrap"><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></div></label></div><div className="inbox-date-shortcuts"><button className="text-button" onClick={()=>setDueDate(tomorrow())}>Amanhã</button><button className="text-button" onClick={()=>setDueDate('')}>Sem prazo</button></div><button className="primary-button" disabled={busy===selected.id} onClick={()=>void promote()}>Virar missão <ArrowRight size={14}/></button></SurfaceCard>

        <SurfaceCard tone="slate" eyebrow="Não precisa continuar" title="Descartar é uma decisão válida"><p className="panel-copy">Se isso não exige ação nem precisa ser preservado, tire do sistema em vez de criar uma obrigação artificial.</p><button className="secondary-button danger-soft" disabled={busy===selected.id} onClick={()=>void discard(selected.id)}><Trash2 size={14}/>Descartar entrada</button></SurfaceCard>
      </aside>}
    </section>
  </div>
}
