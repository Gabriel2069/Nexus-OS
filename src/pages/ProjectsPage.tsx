import { ArrowRight, BriefcaseBusiness, CalendarClock, CheckCircle2, CirclePlus, Gauge, ListChecks, Plus, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { emitUI } from '../lib/ui-events'
import type { NexusProject } from '../types/nexus'

const priorityWeight:Record<NexusProject['priority'],number>={Baixa:0,Média:1,Alta:2,Crítica:3}
const isoDate=(value:string|null)=>value?value.slice(0,10):''

export function ProjectsPage() {
  const { workspace, addProject, editProject, completeMission } = useNexus()
  const [creating,setCreating]=useState(false); const [name,setName]=useState(''); const [busy,setBusy]=useState<string|null>(null); const [selectedId,setSelectedId]=useState<string|null>(null); const [draftAction,setDraftAction]=useState('')
  const active=useMemo(()=>workspace.projects.filter(p=>!['Concluído','Arquivado'].includes(p.status)).sort((a,b)=>priorityWeight[b.priority]-priorityWeight[a.priority]||a.progress-b.progress),[workspace.projects])
  const avg=active.length?Math.round(active.reduce((sum,p)=>sum+p.progress,0)/active.length):0; const withoutAction=active.filter(p=>!p.next_action).length
  const selected=active.find(p=>p.id===selectedId)??null
  const linkedMissions=selected?workspace.missions.filter(m=>m.project_id===selected.id):[]
  const openLinked=linkedMissions.filter(m=>!['Feita','Cancelada'].includes(m.status))

  async function submit(){if(!name.trim())return;setCreating(true);try{await addProject(name.trim());setName('')}finally{setCreating(false)}}
  async function patch(patch:Partial<Pick<NexusProject,'status'|'priority'|'progress'|'next_action'|'due_at'>>){if(!selected)return;setBusy(selected.id);try{await editProject(selected.id,patch)}finally{setBusy(null)}}
  function inspect(project:NexusProject){setSelectedId(project.id);setDraftAction(project.next_action??'');if(window.matchMedia('(max-width:760px)').matches)window.setTimeout(()=>document.querySelector('.project-inspector')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}
  function addMission(){if(!selected)return;emitUI('quickAdd',{type:'mission',projectId:selected.id,title:selected.next_action??''})}

  return <div className="page-stack projects-page projects-page--consultable">
    <section className="page-hero page-hero--violet"><div><span className="eyebrow">Resultados maiores</span><h1>Projetos</h1><p>Selecione um projeto para enxergar direção, missões ligadas, prazo e próximo passo. O objetivo aqui é destravar execução, não administrar porcentagens.</p></div><div className="page-hero__badge"><BriefcaseBusiness size={17}/><span>{active.length} ativos</span></div></section>

    <section className="projects-metrics"><SurfaceCard tone="violet"><span>Progresso médio</span><strong>{avg}%</strong><small>projetos ativos</small></SurfaceCard><SurfaceCard tone={withoutAction?'amber':'green'}><span>Sem próxima ação</span><strong>{withoutAction}</strong><small>{withoutAction?'precisam de decisão':'todos têm direção'}</small></SurfaceCard><SurfaceCard tone="blue"><span>Missões ligadas</span><strong>{workspace.missions.filter(m=>m.project_id&& !['Feita','Cancelada'].includes(m.status)).length}</strong><small>ações abertas</small></SurfaceCard></section>

    <SurfaceCard tone="violet" className="project-create"><div><span className="eyebrow">Novo projeto</span><h2>Que resultado precisa de várias ações para acontecer?</h2></div><div className="project-create__form"><input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void submit()} placeholder="Nome do projeto…"/><button className="primary-button" disabled={creating||!name.trim()} onClick={()=>void submit()}><CirclePlus size={16}/>Criar</button></div></SurfaceCard>

    <section className={`project-workspace ${selected?'has-inspector':''}`}>
      <div className="project-portfolio-grid project-portfolio-grid--interactive">{active.length?active.map(project=>{
        const linked=workspace.missions.filter(m=>m.project_id===project.id&&!['Feita','Cancelada'].includes(m.status)).length
        return <button className={`project-command-card project-command-card--button ${selectedId===project.id?'selected':''}`} key={project.id} onClick={()=>inspect(project)}><div className="project-command-card__top"><span className={`rank-badge rank-${project.priority==='Crítica'?'S':project.priority==='Alta'?'A':project.priority==='Média'?'B':'C'}`}>{project.priority}</span><span>Nv. {project.level}</span></div><h3>{project.name}</h3><p>{project.description||'Resultado maior em andamento.'}</p><div className="project-progress-line"><div><span>Progresso</span><strong>{project.progress}%</strong></div><div className="progress-bar"><span style={{width:`${project.progress}%`}}/></div></div><div className="project-next-action"><ArrowRight size={14}/><div><span>Próxima ação</span><strong>{project.next_action||'Ainda não definida'}</strong></div></div><div className="project-command-card__footer"><span><ListChecks size={13}/>{linked} abertas</span>{project.due_at&&<span><CalendarClock size={13}/>{new Date(project.due_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',timeZone:'America/Sao_Paulo'}).replace('.','')}</span>}<span><Sparkles size={13}/>{project.xp} XP</span></div></button>
      }):<SurfaceCard className="project-empty"><BriefcaseBusiness size={28}/><h3>Nenhum projeto ativo.</h3><p>Crie um projeto quando uma intenção não couber em uma única missão.</p></SurfaceCard>}</div>

      {selected&&<aside className="project-inspector">
        <SurfaceCard tone="violet" className="entity-inspector"><div className="entity-inspector__header"><div><span className="eyebrow">Projeto selecionado</span><h2>{selected.name}</h2></div><button className="icon-button" onClick={()=>setSelectedId(null)}><X size={16}/></button></div><p className="panel-copy">{selected.description||'Use este painel para manter o resultado e a próxima ação claros.'}</p><div className="project-inspector-progress"><div><strong>{selected.progress}%</strong><span>progresso atual</span></div><div className="progress-bar"><span style={{width:`${selected.progress}%`}}/></div></div><button className="primary-button" onClick={addMission}><Plus size={15}/>Nova missão neste projeto</button></SurfaceCard>

        <SurfaceCard eyebrow="Direção" title="Próxima ação"><div className="project-next-editor"><textarea rows={3} value={draftAction} onChange={e=>setDraftAction(e.target.value)} placeholder="Qual é a próxima ação física e concreta?"/><button className="secondary-button" disabled={busy===selected.id||draftAction.trim()===(selected.next_action??'')} onClick={()=>void patch({next_action:draftAction.trim()||null})}>Salvar próxima ação</button></div></SurfaceCard>

        <SurfaceCard eyebrow="Controle" title="Estado do projeto"><div className="inspector-form-grid"><label><span>Prioridade</span><select value={selected.priority} onChange={e=>void patch({priority:e.target.value as NexusProject['priority']})}>{['Baixa','Média','Alta','Crítica'].map(v=><option key={v}>{v}</option>)}</select></label><label><span>Status</span><select value={selected.status} onChange={e=>void patch({status:e.target.value as NexusProject['status']})}>{['Ideia','Ativo','Em espera','Concluído','Arquivado'].map(v=><option key={v}>{v}</option>)}</select></label><label className="inspector-form-grid__wide"><span>Progresso · {selected.progress}%</span><input type="range" min="0" max="100" step="5" value={selected.progress} onChange={e=>void patch({progress:Number(e.target.value)})}/></label><label className="inspector-form-grid__wide"><span>Prazo</span><div className="native-date-wrap"><input type="date" value={isoDate(selected.due_at)} onChange={e=>void patch({due_at:e.target.value?`${e.target.value}T23:59:00-03:00`:null})}/></div></label></div></SurfaceCard>

        <SurfaceCard tone="blue" eyebrow="Execução" title={`${openLinked.length} missões abertas`}><div className="project-linked-missions">{openLinked.map(m=><article key={m.id}><span className={`rank-chip rank-${m.rank.toLowerCase()}`}>{m.rank}</span><div><strong>{m.title}</strong><small>{m.status} · {m.duration_minutes??45} min</small></div><button className="icon-button" onClick={()=>void completeMission(m.id)} aria-label={`Concluir ${m.title}`}><CheckCircle2 size={15}/></button></article>)}{!openLinked.length&&<div className="empty-compact">Nenhuma missão aberta. Se o projeto ainda está ativo, defina uma próxima ação e crie a missão daqui.</div>}</div></SurfaceCard>
      </aside>}
    </section>
  </div>
}
