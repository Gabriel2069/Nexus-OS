import { ArrowRight, CheckCircle2, Clock3, Flame, Gauge, Save, Sparkles, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { localDate } from '../lib/nexus-api'
import { navigate } from '../lib/router'

function monday(date = new Date()) { const day = date.getDay() || 7; const copy = new Date(date); copy.setDate(copy.getDate() - day + 1); return localDate(copy) }
const lines = (value:string) => value.split('\n').map(v=>v.trim()).filter(Boolean)

export function WeeklyReviewPage() {
  const { workspace, saveReview } = useNexus()
  const weekStart = monday()
  const existing = workspace.weeklyReviews.find((review)=>review.week_start===weekStart)
  const [score,setScore]=useState(existing?.score??7)
  const [wins,setWins]=useState(existing?.wins.join('\n')??'')
  const [friction,setFriction]=useState(existing?.friction.join('\n')??'')
  const [adjustments,setAdjustments]=useState(existing?.adjustments.join('\n')??'')
  const [focus,setFocus]=useState(existing?.next_week_focus??'')
  const [saving,setSaving]=useState(false)
  const [saved,setSaved]=useState(false)
  const since=useMemo(()=>new Date(`${weekStart}T00:00:00-03:00`),[weekStart])
  const xp=workspace.activity.filter(e=>new Date(e.created_at)>=since).reduce((s,e)=>s+Math.max(0,e.xp_delta),0)
  const focusMinutes=workspace.focusSessions.filter(e=>e.status==='completed'&&new Date(e.started_at)>=since).reduce((s,e)=>s+(e.actual_minutes??0),0)
  const completed=workspace.activity.filter(e=>e.event_type==='mission.completed'&&new Date(e.created_at)>=since).length
  const overdue=workspace.missions.filter(m=>m.due_at&&new Date(m.due_at)<new Date()&&!['Feita','Cancelada'].includes(m.status)).length
  const stale=workspace.projects.filter(p=>p.status==='Ativo'&&!p.next_action).length

  async function submit(){setSaving(true);try{await saveReview({week_start:weekStart,score,wins:lines(wins),friction:lines(friction),adjustments:lines(adjustments),next_week_focus:focus||null,note:null});setSaved(true)}finally{setSaving(false)}}

  return <div className="page-stack review-page"><section className="page-hero page-hero--indigo"><div><span className="eyebrow">Weekly checkpoint</span><h1>Revisão</h1><p>Não reconstrua a semana de memória. O Nexus traz evidências, aponta atritos e transforma a revisão em decisões para o próximo ciclo.</p></div><div className="page-hero__badge"><Sparkles size={17}/> semana de {new Date(`${weekStart}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</div></section><section className="review-pulse-grid"><SurfaceCard tone="violet"><span>XP</span><strong>{xp}</strong><small>produzido na semana</small></SurfaceCard><SurfaceCard tone="blue"><span>Foco</span><strong>{focusMinutes}m</strong><small>tempo protegido</small></SurfaceCard><SurfaceCard tone="green"><span>Missões</span><strong>{completed}</strong><small>concluídas</small></SurfaceCard><SurfaceCard tone={overdue?'amber':'green'}><span>Atrasadas</span><strong>{overdue}</strong><small>pedem decisão</small></SurfaceCard></section><section className="review-layout"><div className="review-form-stack"><SurfaceCard tone="indigo" eyebrow="Leitura subjetiva" title="Como a semana realmente foi?"><div className="review-score"><input type="range" min="1" max="10" value={score} onChange={(e)=>{setScore(Number(e.target.value));setSaved(false)}}/><strong>{score}<small>/10</small></strong></div></SurfaceCard><SurfaceCard eyebrow="Evidências" title="O que merece permanecer?"><ReviewField label="Vitórias" value={wins} setValue={setWins} placeholder={'Uma entrega que avançou\nUma escolha que funcionou\nAlgo que quero repetir'}/><ReviewField label="Atritos" value={friction} setValue={setFriction} placeholder={'O que drenou energia?\nOnde o sistema falhou?\nO que ficou parado?'}/><ReviewField label="Ajustes" value={adjustments} setValue={setAdjustments} placeholder={'Diminuir escopo de…\nMover compromisso…\nCriar próxima ação para…'}/></SurfaceCard><SurfaceCard tone="violet" eyebrow="Próximo ciclo" title="Uma frase de foco"><input className="review-focus-input" value={focus} onChange={(e)=>{setFocus(e.target.value);setSaved(false)}} placeholder="Ex.: proteger as manhãs para estudo profundo"/><button className={saved?'secondary-button':'primary-button'} onClick={()=>void submit()} disabled={saving}><Save size={15}/>{saving?'Salvando…':saved?'Revisão salva':'Salvar checkpoint'}</button></SurfaceCard></div><aside className="review-diagnostics"><SurfaceCard tone={stale?'amber':'green'} eyebrow="Diagnóstico" title="Projetos sem próxima ação"><div className="diagnostic-number"><strong>{stale}</strong><span>{stale?'frentes podem estar consumindo atenção sem movimento':'portfólio com direção clara'}</span></div>{stale>0&&<button className="text-button" onClick={()=>navigate('/projetos')}>Resolver agora <ArrowRight size={13}/></button>}</SurfaceCard><SurfaceCard eyebrow="Perguntas do sistema" title="Antes de encerrar"><div className="review-questions"><div><Target size={15}/><span>O que realmente moveu as metas?</span></div><div><Gauge size={15}/><span>A carga coube na energia disponível?</span></div><div><Clock3 size={15}/><span>O calendário protegeu o importante?</span></div><div><Flame size={15}/><span>Qual ritmo merece continuar?</span></div></div></SurfaceCard><SurfaceCard tone="green" eyebrow="Fechamento" title="Critério de saída"><div className="review-exit"><CheckCircle2 size={20}/><p>A revisão termina quando os projetos ativos têm direção, os atrasos têm decisão e a próxima semana tem um foco explícito.</p></div></SurfaceCard></aside></section></div>
}

function ReviewField({label,value,setValue,placeholder}:{label:string;value:string;setValue:(v:string)=>void;placeholder:string}) { return <label className="review-field"><span>{label}</span><textarea rows={4} value={value} onChange={(e)=>setValue(e.target.value)} placeholder={placeholder}/><small>Uma linha por item</small></label> }
