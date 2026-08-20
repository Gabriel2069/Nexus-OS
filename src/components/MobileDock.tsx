import { CalendarDays, ChevronRight, Crosshair, ListChecks, MoreHorizontal, Sparkles, SunMedium, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { navigation } from '../data/navigation'
import { navigate } from '../lib/router'

type Props = { pathname: string }
const primary = [
  { path: '/', label: 'Agora', icon: Crosshair, tone: 'blue' },
  { path: '/hoje', label: 'Hoje', icon: SunMedium, tone: 'cyan' },
  { path: '/missoes', label: 'Missões', icon: ListChecks, tone: 'rose' },
  { path: '/calendario', label: 'Agenda', icon: CalendarDays, tone: 'cyan' },
]

export function MobileDock({ pathname }: Props) {
  const [more, setMore] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ y: 0, time: 0 })

  function closeSheet() { setDragY(0); setDragging(false); setMore(false) }
  function onDragStart(event: ReactPointerEvent<HTMLDivElement>) { dragStart.current = { y: event.clientY, time: performance.now() }; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId) }
  function onDragMove(event: ReactPointerEvent<HTMLDivElement>) { if (!dragging) return; setDragY(Math.max(0, event.clientY - dragStart.current.y)) }
  function onDragEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return
    const elapsed = Math.max(1, performance.now() - dragStart.current.time); const velocity = dragY / elapsed; setDragging(false)
    if (dragY > 105 || velocity > 0.55) { setDragY(440); window.setTimeout(closeSheet, 180); return }
    setDragY(0); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const backdropOpacity = Math.max(0.18, 1 - dragY / 420)

  return <>
    <nav className="mobile-dock" aria-label="Navegação móvel">
      {primary.map(({ path, label, icon: Icon, tone }) => <button key={path} className={`mobile-dock__button mobile-dock__button--${tone} ${pathname === path ? 'active' : ''}`} onClick={() => navigate(path)}><Icon size={19} /><span>{label}</span></button>)}
      <button className={`mobile-dock__button mobile-dock__button--neutral ${more ? 'active' : ''}`} onClick={() => { setDragY(0); setMore(true) }}><MoreHorizontal size={20} /><span>Mais</span></button>
    </nav>
    {more && <div className="mobile-sheet-backdrop" style={{ backgroundColor: `rgb(0 0 0 / ${0.62 * backdropOpacity})` }} onClick={closeSheet}>
      <section className={`mobile-sheet ${dragging ? 'is-dragging' : ''}`} style={{ transform: `translateY(${dragY}px)` }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Mais áreas do Nexus">
        <div className="mobile-sheet__handle" aria-label="Arraste para fechar" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={() => { setDragging(false); setDragY(0) }} />
        <div className="mobile-sheet__title"><div><Sparkles size={17} /><strong>Nexus OS</strong></div><button onClick={closeSheet} aria-label="Fechar navegação"><X size={18} /></button></div>
        <div className="mobile-sheet__grid">{navigation.flatMap((group) => group.items).filter((item) => !primary.some((p) => p.path === item.path)).map((item) => { const Icon = item.icon; return <button key={item.path} className={`mobile-sheet__item mobile-sheet__item--${item.tone}`} onClick={() => { closeSheet(); navigate(item.path) }}><span className={`nav-item__icon tone-${item.tone}`}><Icon size={18} /></span><span>{item.label}</span><ChevronRight size={13} /></button> })}</div>
      </section>
    </div>}
  </>
}
