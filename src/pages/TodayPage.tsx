import { BatteryMedium, Check, Clock3, Moon, Play, Sparkles, Sun } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { navigate } from '../lib/router'
import { getReadiness } from '../lib/decision-engine'
import { formatOccurrenceTime, getRoutineContext } from '../lib/routine-context'

const moods = ['Calmo','Focado','Animado','Neutro','Cansado']
const clock = (date: Date) => new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(date)

export function TodayPage(){
  const {workspace,saveCheckin,setRoutineItem}=useNexus()
  const [now,setNow]=useState(()=>new Date())
  const [energy,setEnergy]=useState(workspace.checkin?.energy??7)
  const [mood,setMood]=useState(workspace.checkin?.mood??'Neutro')
  const [saved,setSaved]=useState(Boolean(workspace.checkin))
  useEffect(()=>{const id=window.setInterval(()=>setNow(new Date()),30_000);return()=>window.clearInterval(id)},[])
  const context=useMemo(()=>getRoutineContext(workspace,now),[workspace,now])
  const readiness=getReadiness(workspace.checkin)
  const completed=new Set(workspace.routineCompletions.map(c=>c.routine_item_id))
  const morning=workspace.routines.find(r=>r.period==='morning')
  const evening=workspace.routines.find(r=>r.period==='evening')
  const xp=workspace.journey?.xp_earned??0
  const remainingToday=context.today.filter(event=>!event.isOptional&&event.end>now&&!['sleep','recovery'].includes(event.category)&&event.end.getTime()-event.start.getTime()<20*60*60_000)
  const studyNow=context.suggestion.kind==='focus'?context.suggestion:null
  async function persistCheckin(){await saveCheckin({energy,mood});setSaved(true)}

  return <div className="page-stack today-page today-page--context">
    <section className="today-header today-header--compact">
      <div><span className="eyebrow">Seu dia</span><h1>Hoje</h1><p>A agenda fixa primeiro. O Nexus usa os espaços entre ela para decidir quando vale estudar e quando vale simplesmente parar.</p></div>
      <div className="today-score"><span>XP hoje</span><strong>{xp}</strong><small>{context.load === 'cheio' ? 'dia cheio' : `${Math.round(context.loadMinutes/60)}h de fixos`}</small></div>
    </section>

    <section className="today-context-grid">
      <SurfaceCard tone="blue" className="today-now-card" eyebrow={context.current?'Agora':'Janela atual'} title={context.suggestion.title}>
        <p className="panel-copy">{context.suggestion.detail}</p>
        <div className="today-now-meta">
          {context.current && <span><Clock3 size={13}/>{formatOccurrenceTime(context.current)}</span>}
          {!context.current && context.freeMinutes>0 && <span><Clock3 size={13}/>{context.freeMinutes} min livres</span>}
          {context.next && <span>Próximo: <strong>{context.next.title}</strong> às {clock(context.next.start)}</span>}
        </div>
        {context.suggestion.actionPath && <button className="primary-button" onClick={()=>navigate(context.suggestion.actionPath!)}><Play size={15}/>{context.suggestion.actionLabel??'Começar'}</button>}
      </SurfaceCard>

      <SurfaceCard tone="amber" className="checkin-card checkin-card--compact">
        <div className="card-title-row"><div><span className="eyebrow">Check-in · {readiness.score}/100</span><h2>Como você está?</h2></div><BatteryMedium size={19}/></div>
        <div className="compact-energy"><strong>{energy}</strong><input aria-label="Energia" type="range" min="1" max="10" value={energy} onChange={(e)=>{setEnergy(Number(e.target.value));setSaved(false)}}/></div>
        <div className="mood-row mood-row--compact">{moods.map(item=><button key={item} className={mood===item?'active':''} onClick={()=>{setMood(item);setSaved(false)}}>{item}</button>)}</div>
        <button className={saved?'secondary-button':'primary-button'} onClick={()=>void persistCheckin()}>{saved?<><Check size={15}/> Salvo</>:<>Salvar check-in</>}</button>
      </SurfaceCard>
    </section>

    <section className="today-flow-grid">
      <SurfaceCard eyebrow="Horários" title="O que ainda vem hoje">
        <div className="today-timeline">
          {remainingToday.slice(0,6).map((event)=><div className={context.current?.id===event.id?'is-current':''} key={event.id}><span>{clock(event.start)}</span><i/><div><strong>{event.title}</strong><small>{clock(event.start)}–{clock(event.end)}</small></div></div>)}
          {!remainingToday.length&&<div className="empty-compact">Sem outros compromissos fixos hoje.</div>}
        </div>
      </SurfaceCard>

      <SurfaceCard tone="violet" eyebrow="Estudo" title={studyNow?'Este é o bloco que cabe agora':'Não precisa encaixar estudo agora'}>
        {studyNow?<div className="single-study-target"><div><strong>{studyNow.title}</strong><p>{studyNow.detail}</p></div><footer><span>{studyNow.durationMinutes??45} min</span><button className="secondary-button" onClick={()=>navigate(studyNow.actionPath??'/foco')}>Abrir foco</button></footer></div>:<p className="panel-copy">Quando surgir uma janela planejada — ou uma urgência real — o bloco aparece aqui e no Agora. Até lá, siga o compromisso atual ou preserve o intervalo.</p>}
      </SurfaceCard>
    </section>

    <section className="today-small-loop">
      <SurfaceCard tone="amber" eyebrow="Começo" title={`${morning?.icon??'☀️'} Abrir o dia`}><RoutineMini routine={morning} completed={completed} setRoutineItem={setRoutineItem}/></SurfaceCard>
      <SurfaceCard tone="violet" eyebrow="22h" title={`${evening?.icon??'🌙'} Fechar o dia`}><RoutineMini routine={evening} completed={completed} setRoutineItem={setRoutineItem}/></SurfaceCard>
      <SurfaceCard tone="green" eyebrow="Depois dos fixos" title="O resto da vida também cabe"><div className="life-space-note"><Sparkles size={17}/><p>{context.later?.detail??'Quando acabar o que é fixo, preserve espaço para amigos, família, cabelo, hobby ou descanso sem transformar tudo em obrigação.'}</p></div></SurfaceCard>
    </section>
  </div>
}

function RoutineMini({routine,completed,setRoutineItem}:{routine:ReturnType<typeof useNexus>['workspace']['routines'][number]|undefined;completed:Set<string>;setRoutineItem:(id:string,completed:boolean)=>Promise<void>}){
  if(!routine)return <div className="empty-compact"><Sparkles size={15}/> Rotina ainda não carregada.</div>
  return <div className="routine-mini">{(routine.routine_items??[]).sort((a,b)=>a.sort_order-b.sort_order).map(item=>{const done=completed.has(item.id);return <button className={done?'done':''} key={item.id} onClick={()=>void setRoutineItem(item.id,!done)}><span>{done?<Check size={13}/>:routine.period==='morning'?<Sun size={13}/>:<Moon size={13}/>}</span><div><strong>{item.title}</strong><small>{item.duration_minutes??2} min · +{item.xp_reward} XP</small></div></button>})}</div>
}
