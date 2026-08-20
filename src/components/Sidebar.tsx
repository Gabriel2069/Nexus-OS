import { ChevronsLeft, ChevronsRight, Sparkles } from 'lucide-react'
import { navigation } from '../data/navigation'
import { navigate } from '../lib/router'

type SidebarProps = { pathname: string; collapsed: boolean; onToggle: () => void }

export function Sidebar({ pathname, collapsed, onToggle }: SidebarProps) {
  return <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}><div className="sidebar__brand"><button className="brand-mark" onClick={() => navigate('/')} aria-label="Ir para o início"><Sparkles size={18} /></button>{!collapsed && <div><strong>Nexus OS</strong><span>Rotina e organização</span></div>}</div><nav className="sidebar__nav" aria-label="Navegação principal">{navigation.map((group) => <div className="nav-group" key={group.label}>{!collapsed && <span className="nav-group__label">{group.label}</span>}{group.items.map((item) => { const active = pathname === item.path || (item.path === '/tutorial' && pathname === '/guia'); const Icon = item.icon; return <button key={item.path} className={`nav-item nav-item--${item.tone} ${active ? 'nav-item--active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => navigate(item.path)} title={collapsed ? item.label : undefined}><span className={`nav-item__icon tone-${item.tone}`}><Icon size={17} /></span>{!collapsed && <span>{item.label}</span>}</button> })}</div>)}</nav><button className="sidebar__collapse" onClick={onToggle}>{collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}{!collapsed && <span>Recolher</span>}</button></aside>
}
