import { CalendarDays, ChevronUp, Crosshair, Home, ListChecks, MoreHorizontal, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { navigation } from '../data/navigation'
import { navigate } from '../lib/router'

type Props = { pathname: string }
const primary = [
  { path: '/', label: 'Início', icon: Home },
  { path: '/hoje', label: 'Hoje', icon: Crosshair },
  { path: '/missoes', label: 'Missões', icon: ListChecks },
  { path: '/calendario', label: 'Agenda', icon: CalendarDays },
]

export function MobileDock({ pathname }: Props) {
  const [more, setMore] = useState(false)
  return <>
    <nav className="mobile-dock" aria-label="Navegação móvel">
      {primary.map(({ path, label, icon: Icon }) => <button key={path} className={pathname === path ? 'active' : ''} onClick={() => navigate(path)}><Icon size={19} /><span>{label}</span></button>)}
      <button className={more ? 'active' : ''} onClick={() => setMore(true)}><MoreHorizontal size={20} /><span>Mais</span></button>
    </nav>
    {more && <div className="mobile-sheet-backdrop" onClick={() => setMore(false)}><section className="mobile-sheet" onClick={(e) => e.stopPropagation()}><div className="mobile-sheet__handle" /><div className="mobile-sheet__title"><div><Sparkles size={17} /><strong>Nexus OS</strong></div><button onClick={() => setMore(false)}><X size={18} /></button></div><div className="mobile-sheet__grid">{navigation.flatMap((group) => group.items).filter((item) => !primary.some((p) => p.path === item.path)).map((item) => { const Icon = item.icon; return <button key={item.path} onClick={() => { setMore(false); navigate(item.path) }}><span className={`nav-item__icon tone-${item.tone}`}><Icon size={18} /></span><span>{item.label}</span><ChevronUp size={12} /></button> })}</div></section></div>}
  </>
}
