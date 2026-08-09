import type { LucideIcon } from 'lucide-react'
import { Activity, ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Inbox, Plus, Sparkles, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { navigate } from '../lib/router'
import { upcomingOccurrences } from '../lib/routine-context'
import { emitUI } from '../lib/ui-events'

type SectionPageProps = {
  eyebrow: string
  title: string
  description: string
  tone: string
  icon: LucideIcon
  highlights: { label: string; value: string; detail: string }[]
  panels: { title: string; body: string; action?: string }[]
}

type LiveItem = { id: string; label: string; detail: string; meta?: string; action?: () => void }

type ContextModel = {
  headline: string
  detail: string
  primaryLabel: string
  primaryAction: () => void
  metrics: { label: string; value: string; detail: string }[]
  groups: { title: string; eyebrow: string; items: LiveItem[]; empty: string }[]
}

const priorityValue = { Baixa: 0, Média: 1, Alta: 2, Crítica: 3 }
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',timeZone:'America/Sao_Paulo'}).format(new Date(value)).replace('.','') : 'sem data'
const clock = (date: Date) => new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(date).replace('.','')

export function SectionPage({ eyebrow, title, description, tone, icon: Icon, highlights, panels }: SectionPageProps) {
  const { workspace } = useNexus()
  const [openPanel,setOpenPanel]=useState<string|null>(null)
  const context = useMemo(()=>buildContext(title,workspace),[title,workspace])
  const displayMetrics=context?.metrics??highlights

  return <div className="page-stack contextual-section-page">
    <section className={`page-hero page-hero--${tone}`}>
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{context?.detail??description}</p></div>
      {context&&<button className="primary-button" onClick={context.primaryAction}><Plus size={15}/>{context.primaryLabel}</button>}
    </section>

    {context&&<SurfaceCard tone={tone} className="context-signal-card">
      <div className="context-signal"><span className={`context-signal__icon tone-${tone}`}><Icon size={19}/></span><div><span className="eyebrow">O que merece atenção</span><h2>{context.headline}</h2></div></div>
    </SurfaceCard>}

    {displayMetrics.length>0&&<section className="metrics-grid contextual-metrics">{displayMetrics.map((item) => <SurfaceCard tone={tone} className="metric-card" key={item.label}><div className="metric-icon"><Icon size={18}/></div><div><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></div></SurfaceCard>)}</section>}

    {context?<section className="context-live-grid">{context.groups.map(group=><SurfaceCard tone={tone} key={group.title} eyebrow={group.eyebrow} title={group.title}><div className="context-live-list">{group.items.map(item=><button key={item.id} onClick={item.action} disabled={!item.action}><div><strong>{item.label}</strong><span>{item.detail}</span></div>{item.meta&&<small>{item.meta}</small>}{item.action&&<ArrowRight size={14}/>}</button>)}{!group.items.length&&<div className="empty-compact">{group.empty}</div>}</div></SurfaceCard>)}</section>:
    <section className="project-grid">{panels.map((panel) => {const expanded=openPanel===panel.title;return <SurfaceCard tone={tone} key={panel.title} title={panel.title} action={<button className="text-button" onClick={()=>setOpenPanel(expanded?null:panel.title)}>{expanded?'Fechar':'Consultar'} <ArrowUpRight size={13}/></button>}><p className="panel-copy">{panel.body}</p>{expanded&&<div className="context-panel-expanded"><Sparkles size={15}/><span>Use esta área quando esse contexto realmente aparecer na sua rotina. Ela não precisa ser alimentada por obrigação.</span></div>}</SurfaceCard>})}</section>}
  </div>
}

function buildContext(title:string,workspace:ReturnType<typeof useNexus>['workspace']):ContextModel|null{
  const now=new Date()
  const upcoming=upcomingOccurrences(workspace.calendarCommitments,now,30)
  const activeProjects=workspace.projects.filter(p=>p.status==='Ativo').sort((a,b)=>priorityValue[b.priority]-priorityValue[a.priority]||a.progress-b.progress)
  const activeMissions=workspace.missions.filter(m=>['A fazer','Em andamento'].includes(m.status))
  const overdue=activeMissions.filter(m=>m.due_at&&new Date(m.due_at)<now)
  const nextExam=upcoming.find(event=>event.category==='exam'&&!event.isOptional)
  const todayKey=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
  const todayFocus=workspace.focusSessions.filter(s=>s.status==='completed'&&s.started_at.slice(0,10)===todayKey).reduce((sum,s)=>sum+(s.actual_minutes??0),0)
  const recentActivity=workspace.activity.slice(0,12)

  if(title==='Metas'){
    const noAction=activeProjects.filter(p=>!p.next_action)
    const near=activeProjects.filter(p=>p.due_at).sort((a,b)=>(a.due_at??'').localeCompare(b.due_at??''))
    return {
      headline:noAction.length?`${noAction.length} projeto${noAction.length>1?'s':''} sem próxima ação`:(activeProjects[0]?`Seu projeto mais prioritário agora é ${activeProjects[0].name}`:'Nenhuma meta precisa ser criada só para preencher espaço'),
      detail:'Metas ganham valor quando viram projetos com direção e missões que cabem na semana. Esta tela mostra onde a direção está clara e onde ainda falta decisão.',
      primaryLabel:'Novo projeto',primaryAction:()=>navigate('/projetos'),
      metrics:[{label:'Projetos ativos',value:String(activeProjects.length),detail:'resultados em andamento'},{label:'Sem próxima ação',value:String(noAction.length),detail:'precisam de decisão'},{label:'Missões ligadas',value:String(activeMissions.filter(m=>m.project_id).length),detail:'ações em andamento'},{label:'Próximo prazo',value:near[0]?dateLabel(near[0].due_at):'—',detail:near[0]?.name??'sem prazo de projeto'}],
      groups:[
        {eyebrow:'Direção',title:'Projetos que puxam sua atenção',items:activeProjects.slice(0,5).map(p=>({id:p.id,label:p.name,detail:p.next_action||'Próxima ação ainda não definida',meta:`${p.progress}% · ${p.priority}`,action:()=>navigate('/projetos')})),empty:'Nenhum projeto ativo.'},
        {eyebrow:'Pressão',title:'Prazos e prova próxima',items:[...overdue.slice(0,2).map(m=>({id:m.id,label:m.title,detail:'Missão atrasada',meta:dateLabel(m.due_at),action:()=>navigate('/missoes')})),...(nextExam?[{id:nextExam.id,label:nextExam.title,detail:'Próxima pressão acadêmica',meta:clock(nextExam.start),action:()=>navigate('/calendario')}]:[])],empty:'Nenhuma pressão imediata.'},
      ],
    }
  }

  if(title==='Bem-estar'){
    const healthUpcoming=upcoming.filter(event=>event.category==='health').slice(0,4)
    const energy=workspace.checkin?.energy
    const sleep=workspace.checkin?.sleep_hours
    return {
      headline:energy!=null?(energy<=4?'Energia baixa: proteja o restante do dia':energy>=8?'Energia alta, mas não precisa preencher todos os espaços':`Energia ${energy}/10: siga o ritmo já planejado`):'Faça um check-in curto para o Nexus ajustar o ritmo',
      detail:'Bem-estar aqui é contexto para decidir carga, treino e descanso. O Nexus não transforma saúde em cobrança nem cria compensações quando um dia sai do plano.',
      primaryLabel:'Check-in de hoje',primaryAction:()=>navigate('/hoje'),
      metrics:[{label:'Energia',value:energy!=null?`${energy}/10`:'—',detail:'check-in de hoje'},{label:'Sono',value:sleep!=null?`${sleep}h`:'—',detail:'quando registrado'},{label:'Foco hoje',value:`${todayFocus}m`,detail:'tempo já exigido'},{label:'Próximo treino',value:healthUpcoming[0]?clock(healthUpcoming[0].start):'—',detail:healthUpcoming[0]?.title??'sem compromisso'}],
      groups:[
        {eyebrow:'Agenda física',title:'Próximos compromissos de saúde',items:healthUpcoming.map(e=>({id:e.id,label:e.title,detail:clock(e.start),meta:e.note??undefined,action:()=>navigate('/calendario')})),empty:'Nenhum compromisso de saúde próximo.'},
        {eyebrow:'Sinais',title:'O que seus registros mostram',items:workspace.dailyCheckins.slice(-4).reverse().map(c=>({id:c.id,label:new Date(`${c.checkin_date}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'long'}),detail:`Energia ${c.energy??'—'}/10 · ${c.mood??'humor não registrado'}`,meta:c.sleep_hours?`${c.sleep_hours}h de sono`:undefined,action:()=>navigate('/insights')})),empty:'Faça alguns check-ins para formar contexto.'},
      ],
    }
  }

  if(title==='Segundo Cérebro'){
    const inbox=workspace.missions.filter(m=>m.status==='Inbox')
    const noted=workspace.missions.filter(m=>m.notes).slice(0,5)
    return {
      headline:inbox.length?`${inbox.length} captura${inbox.length>1?'s':''} esperando decisão`:'Sua caixa de entrada está limpa',
      detail:'Conhecimento útil é o que você consegue reencontrar no contexto certo. Capture primeiro e só organize aquilo que realmente vai servir para estudo, projeto ou decisão.',
      primaryLabel:'Capturar',primaryAction:()=>emitUI('quickAdd',{type:'inbox'}),
      metrics:[{label:'Inbox',value:String(inbox.length),detail:'aguardando decisão'},{label:'Projetos',value:String(activeProjects.length),detail:'contextos ativos'},{label:'Notas em missões',value:String(workspace.missions.filter(m=>m.notes).length),detail:'ações com contexto'},{label:'Revisões',value:String(workspace.weeklyReviews.length),detail:'aprendizados registrados'}],
      groups:[
        {eyebrow:'Para decidir',title:'Capturas recentes',items:inbox.slice(0,6).map(m=>({id:m.id,label:m.title,detail:m.notes||'Entrada ainda não processada',meta:`Rank ${m.rank}`,action:()=>navigate('/inbox')})),empty:'Nada esperando processamento.'},
        {eyebrow:'Contexto vivo',title:'Notas que já estão ligadas a ações',items:noted.map(m=>({id:m.id,label:m.title,detail:m.notes||'',meta:m.project_id?'ligada a projeto':'missão',action:()=>navigate('/missoes')})),empty:'Nenhuma nota contextual recente.'},
      ],
    }
  }

  if(title==='Planos'){
    const coming=upcoming.filter(e=>!['sleep','recovery'].includes(e.category)).slice(0,6)
    const stale=activeProjects.filter(p=>!p.next_action)
    return {
      headline:overdue.length?`${overdue.length} atraso${overdue.length>1?'s':''} precisa${overdue.length===1?'':'m'} de uma decisão`:(stale.length?`${stale.length} projeto${stale.length>1?'s':''} sem próximo passo`:'A semana está suficientemente definida para executar'),
      detail:'Planejamento serve para resolver dependências e ordenar próximos passos. Quando isso já está claro, volte para Agora e execute.',
      primaryLabel:'Abrir calendário',primaryAction:()=>navigate('/calendario'),
      metrics:[{label:'Atrasos',value:String(overdue.length),detail:'missões vencidas'},{label:'Sem próxima ação',value:String(stale.length),detail:'projetos parados'},{label:'Próximos eventos',value:String(coming.length),detail:'janela de 30 dias'},{label:'Inbox',value:String(workspace.missions.filter(m=>m.status==='Inbox').length),detail:'ainda sem destino'}],
      groups:[
        {eyebrow:'Próximos',title:'Compromissos que moldam a execução',items:coming.map(e=>({id:e.id,label:e.title,detail:clock(e.start),meta:e.isOptional?'condicional':e.category,action:()=>navigate('/calendario')})),empty:'Nenhum compromisso próximo.'},
        {eyebrow:'Decisões',title:'O que falta destravar',items:[...overdue.slice(0,3).map(m=>({id:m.id,label:m.title,detail:'Atrasada — reagende, conclua ou cancele',meta:dateLabel(m.due_at),action:()=>navigate('/missoes')})),...stale.slice(0,3).map(p=>({id:p.id,label:p.name,detail:'Defina a próxima ação',meta:`${p.progress}%`,action:()=>navigate('/projetos')}))],empty:'Nenhuma pendência estrutural.'},
      ],
    }
  }

  if(title==='Histórico'){
    const reviews=workspace.weeklyReviews.slice(0,5)
    const completedCount=workspace.activity.filter(e=>e.event_type==='mission.completed').length
    return {
      headline:recentActivity[0]?`Último registro: ${recentActivity[0].label||recentActivity[0].event_type}`:'O histórico começa quando algo realmente acontece',
      detail:'Histórico é para recuperar decisões, entregas e mudanças reais. Ele não precisa virar diário obrigatório.',
      primaryLabel:'Revisão semanal',primaryAction:()=>navigate('/revisao'),
      metrics:[{label:'Eventos',value:String(workspace.activity.length),detail:'nos dados carregados'},{label:'Missões concluídas',value:String(completedCount),detail:'registros de conclusão'},{label:'Revisões',value:String(workspace.weeklyReviews.length),detail:'semanas registradas'},{label:'Sequência',value:String(workspace.profile?.streak_current??0),detail:'dias atuais'}],
      groups:[
        {eyebrow:'Linha do tempo',title:'Atividade recente',items:recentActivity.slice(0,8).map(e=>({id:e.id,label:e.label||e.event_type,detail:new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(e.created_at)).replace('.',''),meta:e.xp_delta?`${e.xp_delta>0?'+':''}${e.xp_delta} XP`:undefined})),empty:'Nenhum evento recente.'},
        {eyebrow:'Semanas',title:'Revisões salvas',items:reviews.map(r=>({id:r.id,label:`Semana de ${new Date(`${r.week_start}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','')}`,detail:r.next_week_focus||'Sem foco principal registrado',meta:r.score!=null?`${r.score}/10`:undefined,action:()=>navigate('/revisao')})),empty:'Nenhuma revisão semanal salva.'},
      ],
    }
  }
  return null
}
