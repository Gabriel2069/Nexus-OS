import { CircleStop, Coffee, Focus, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import type { FocusSession } from '../types/nexus'

export function FocusPage() {
  const { workspace, beginFocus, endFocus } = useNexus()
  const [minutes, setMinutes] = useState(45)
  const [secondsLeft, setSecondsLeft] = useState(minutes*60)
  const [running, setRunning] = useState(false)
  const [session, setSession] = useState<FocusSession | null>(null)
  const [missionId, setMissionId] = useState<string>('')
  const startedAt = useRef<number | null>(null)
  useEffect(() => { if (!running) return; const id = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(id) }, [running])
  useEffect(() => { if (!session) setSecondsLeft(minutes*60) },[minutes,session])
  const todayMinutes = useMemo(() => workspace.focusSessions.filter((item)=>item.status==='completed' && item.started_at.slice(0,10)===new Date().toISOString().slice(0,10)).reduce((sum,item)=>sum+(item.actual_minutes??0),0),[workspace.focusSessions])
  const formatted = `${String(Math.floor(secondsLeft/60)).padStart(2,'0')}:${String(secondsLeft%60).padStart(2,'0')}`
  const progress = 1 - secondsLeft/(minutes*60)
  async function start() { if (running) return; if (!session) { const active=await beginFocus(minutes,'Sessão de foco',missionId||null); setSession(active); startedAt.current=Date.now() } setRunning(true) }
  async function finish() { const elapsed = startedAt.current ? Math.max(1,Math.round((Date.now()-startedAt.current)/60000)) : Math.max(1,minutes-Math.floor(secondsLeft/60)); if(session) await endFocus(session.id,elapsed); setSession(null); setRunning(false); setSecondsLeft(minutes*60); startedAt.current=null }
  useEffect(() => { if (secondsLeft === 0 && session) void finish() }, [secondsLeft, session])
  function reset(){setRunning(false);setSecondsLeft(minutes*60)}

  return <div className="page-stack focus-page"><section className="page-hero page-hero--indigo"><div><span className="eyebrow">Sessão de trabalho</span><h1>Foco</h1><p>Escolha quanto tempo quer dedicar, vincule uma missão se fizer sentido e comece.</p></div><div className="page-hero__badge"><Focus size={17}/> <span>{todayMinutes} min hoje</span></div></section><section className="focus-layout"><SurfaceCard tone="indigo" className="focus-console"><div className="focus-modes">{[25,45,60,90].map((value)=><button key={value} disabled={Boolean(session)} className={minutes===value?'active':''} onClick={()=>setMinutes(value)}>{value} min</button>)}</div><div className="focus-clock"><div className="focus-clock__ring" style={{'--progress':`${progress*360}deg`} as CSSProperties}><div><span>{formatted}</span><small>{running?'EM FOCO':session?'PAUSADO':'PRONTO'}</small></div></div></div><select className="focus-mission-select" value={missionId} onChange={(e)=>setMissionId(e.target.value)} disabled={Boolean(session)}><option value="">Sessão sem missão vinculada</option>{workspace.missions.slice(0,12).map((mission)=><option key={mission.id} value={mission.id}>{mission.title}</option>)}</select><div className="focus-controls"><button className="icon-button focus-control" onClick={reset} disabled={running} aria-label="Reiniciar"><RotateCcw size={18}/></button><button className="primary-button focus-main" onClick={running?()=>setRunning(false):start}>{running?<><Pause size={18}/> Pausar</>:<><Play size={18}/> {session?'Continuar':'Começar'}</>}</button><button className="icon-button focus-control" onClick={finish} disabled={!session} aria-label="Encerrar sessão"><CircleStop size={18}/></button></div></SurfaceCard><div className="focus-side"><SurfaceCard eyebrow="Hoje" title="Tempo em foco"><div className="focus-stat-big"><strong>{todayMinutes}</strong><span>minutos registrados</span></div></SurfaceCard><SurfaceCard tone="amber" eyebrow="Pausa" title="Entre blocos"><div className="recovery-card"><Coffee size={20}/><p>Depois de um bloco longo, faça uma pausa curta antes de começar outro.</p></div></SurfaceCard></div></section></div>
}
