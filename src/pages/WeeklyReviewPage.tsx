import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Flame, Gauge, Save, Sparkles, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { localDate } from '../lib/nexus-api'
import { navigate } from '../lib/router'

function monday(date=new Date()){const day=date.getDay()||7;const copy=new Date(date);copy.setDate(copy.getDate()-day+1);return localDate(copy)}
const lines=(value:string)=>value.split('\n').map(v=>v.trim()).filter(Boolean)
const tomorrow=()=>{const d=new Date();d.setDate(d.getDate()+1);return localDate(d)}

export function WeeklyReviewPage(){
  const {workspace,saveReview,processMission}=useNexus();const weekStart=monday();const existing=workspace.weeklyReviews.find(r=>r.week_start===weekStart)
  const [score,setScore]=useState(existing?.score??7);const [wins,setWins]=useState(existing?.wins.join('\n')??'');const [friction,setFriction]=useState(existing?.friction.join('\n')??'');const [adjustments,setAdjustments]=useState(existing?.adjustments.join('\n')??'');const [focus,setFocus]=useState(existing?.next_week_focus??'');const [saving,setSaving]=useState(false);const [saved,setSaved]=useState(false);const [selectedReviewId,setSelectedReviewId]=useState<string|null>(null);const [busyMission,setBusyMission]=useState<string|null>(null)
  const since=useMemo(()=>new Date(`${weekStart}T00:00:00-03:00`),[weekStart]);const xp=workspace.activity.filter(e=>new Date(e.created_at)>=since).reduce((s,e)=>s+Math.max(0,e.xp_delta),0);const focusMinutes=workspace.focusSessions.filter(e=>e.status==='completed'&&new Date(e.started_at)>=since).reduce((s,e)=>s+(e.actual_minutes??0),0);const completed=workspace.activity.filter(e=>e.event_type==='mission.completed'&&new Date(e.created_at)>=since).length
  const overdue=workspace.missions.filter(m=>m.due_at&&new Date(m.due_at)<new Date()&&!['Feita','Cancelada'].includes(m.status));const stale=workspace.projects.filter(p=>p.status==='Ativo'&&!p.next_action);const selectedReview=workspace.weeklyReviews.find(r=>r.id===selectedReviewId)??null
  const nextWeekSignal=overdue.length?`Resolva ${overdue.length} atraso${overdue.length>1?'s':''} antes de adicionar carga.`:stale.length?`Dê próxima ação a ${stale.length} projeto${stale.length>1?'s':''}.`:focusMinutes>360?'A semana teve bastante foco; proteja recuperação antes de aumentar o volume.':'A estrutura está limpa o suficiente para escolher um foco simples.'
  async function submit(){setSaving(true);try{await saveReview({week_start:weekStart,score,wins:lines(wins),friction:lines(friction),adjustments:lines(adjustments),next_week_focus:focus||null,note:null});setSaved(true)}finally{setSaving(false)}}
  async function moveTomorrow(id:string){setBusyMission(id);try{await processMission(id,{due_at:`${tomorrow()}T23:59:00-03:00`})}finally{setBusyMission(null)}}

  return <div className="page-stack review-page review-page--consultable">
    <section className="page-hero page-hero--indigo"><div><span className="eyebrow">Fim da semana</span><h1>Revisão semanal</h1><p>Consulte o que aconteceu, abra os problemas detectados e saia daqui com poucas decisões concretas para a semana seguinte.</p></div><div className="page-hero__badge"><Sparkles size={17}/><span>desde {new Date(`${weekStart}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','')}</span></div></section>

    <SurfaceCard tone={overdue.length||stale.length?'amber':'green'} className="review-context-signal"><div><span className="eyebrow">Diagnóstico automático</span><h2>{nextWeekSignal}</h2></div><button className="secondary-button" onClick={()=>navigate('/calendario')}><CalendarDays size={14}/>Ver próxima semana</button></SurfaceCard>

    <section className="review-pulse-grid"><SurfaceCard tone="violet"><span>XP</span><strong>{xp}</strong><small>registrado</small></SurfaceCard><SurfaceCard tone="blue"><span>Foco</span><strong>{focusMinutes}m</strong><small>tempo registrado</small></SurfaceCard><SurfaceCard tone="green"><span>Missões</span><strong>{completed}</strong><small>concluídas</small></SurfaceCard><SurfaceCard tone={overdue.length?'amber':'green'}><span>Atrasadas</span><strong>{overdue.length}</strong><small>precisam de decisão</small></SurfaceCard></section>

    <section className="review-layout"><div className="review-form-stack">
      <SurfaceCard tone="indigo" eyebrow="Sua avaliação" title="Como foi a semana?"><div className="review-score"><input type="range" min="1" max="10" value={score} onChange={e=>{setScore(Number(e.target.value));setSaved(false)}}/><strong>{score}<small>/10</small></strong></div></SurfaceCard>
      <SurfaceCard eyebrow="Notas" title="Só o que muda alguma coisa"><ReviewField label="Vitórias" value={wins} setValue={setWins} placeholder={'Algo que avançou\nUma escolha que funcionou\nAlgo que quero repetir'}/><ReviewField label="Atritos" value={friction} setValue={setFriction} placeholder={'O que drenou energia?\nO que ficou parado?\nO que atrapalhou a rotina?'}/><ReviewField label="Ajustes" value={adjustments} setValue={setAdjustments} placeholder={'Diminuir escopo de…\nMover compromisso…\nDefinir próxima ação para…'}/></SurfaceCard>
      <SurfaceCard tone="violet" eyebrow="Próxima semana" title="Qual é o foco principal?"><input className="review-focus-input" value={focus} onChange={e=>{setFocus(e.target.value);setSaved(false)}} placeholder="Ex.: chegar preparado às provas sem ocupar as noites"/><button className={saved?'secondary-button':'primary-button'} onClick={()=>void submit()} disabled={saving}><Save size={15}/>{saving?'Salvando…':saved?'Revisão salva':'Salvar revisão'}</button></SurfaceCard>
    </div>

    <aside className="review-diagnostics">
      <SurfaceCard tone={overdue.length?'amber':'green'} eyebrow="Atrasos" title={overdue.length?'Decida, não acumule':'Nenhuma missão vencida'}><div className="review-action-list">{overdue.slice(0,5).map(m=><article key={m.id}><div><strong>{m.title}</strong><small>{new Date(m.due_at!).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',timeZone:'America/Sao_Paulo'}).replace('.','')} · {m.priority}</small></div><button className="text-button" disabled={busyMission===m.id} onClick={()=>void moveTomorrow(m.id)}>Amanhã</button></article>)}{!overdue.length&&<div className="empty-compact"><CheckCircle2 size={16}/>Nada para reagendar.</div>}</div>{overdue.length>0&&<button className="text-button" onClick={()=>navigate('/missoes')}>Abrir Missões <ArrowRight size={13}/></button>}</SurfaceCard>

      <SurfaceCard tone={stale.length?'amber':'green'} eyebrow="Projetos" title="Sem próxima ação"><div className="review-action-list">{stale.slice(0,5).map(p=><button key={p.id} onClick={()=>navigate('/projetos')}><div><strong>{p.name}</strong><small>{p.progress}% · precisa de decisão</small></div><ArrowRight size={13}/></button>)}{!stale.length&&<div className="empty-compact">Todos os projetos ativos têm direção.</div>}</div></SurfaceCard>

      <SurfaceCard eyebrow="Histórico" title="Revisões anteriores"><div className="review-history-list">{workspace.weeklyReviews.filter(r=>r.week_start!==weekStart).slice(0,5).map(r=><button className={selectedReviewId===r.id?'selected':''} key={r.id} onClick={()=>setSelectedReviewId(selectedReviewId===r.id?null:r.id)}><span>{new Date(`${r.week_start}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','')}</span><strong>{r.score??'—'}/10</strong><ArrowRight size={12}/></button>)}</div>{selectedReview&&<div className="review-history-detail"><strong>{selectedReview.next_week_focus||'Sem foco registrado'}</strong>{selectedReview.wins.length>0&&<p>Vitórias: {selectedReview.wins.join(' · ')}</p>}{selectedReview.adjustments.length>0&&<p>Ajustes: {selectedReview.adjustments.join(' · ')}</p>}</div>}</SurfaceCard>

      <SurfaceCard tone="green" eyebrow="Pronto" title="Quando encerrar"><div className="review-exit"><CheckCircle2 size={20}/><p>Termine quando os atrasos tiverem uma decisão, os projetos tiverem direção e a próxima semana tiver um foco claro.</p></div></SurfaceCard>
    </aside></section>
  </div>
}

function ReviewField({label,value,setValue,placeholder}:{label:string;value:string;setValue:(v:string)=>void;placeholder:string}){return <label className="review-field"><span>{label}</span><textarea rows={4} value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/><small>Uma linha por item</small></label>}
