import { ChevronsLeft, ChevronsRight, Sparkles } from 'lucide-react'
import { navigation } from '../data/navigation'
import { navigate } from '../lib/router'

type SidebarProps = { pathname: string; collapsed: boolean; onToggle: () => void }

export function Sidebar({ pathname, collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`} data-motion-shell="sidebar">
      <div className="sidebar__brand" data-motion="brand">
        <button className="brand-mark" onClick={() => navigate('/')} aria-label="Ir para o início" data-motion="magnetic"><Sparkles size={18} /></button>
        {!collapsed && <div className="sidebar__brand-copy"><strong>Nexus OS</strong><span>Rotina e organização</span></div>}
      </div>
      <nav className="sidebar__nav" aria-label="Navegação principal">
        {navigation.map((group) => <div className="nav-group" key={group.label} data-motion="nav-group">
          {!collapsed && <span className="nav-group__label">{group.label}</span>}
          {group.items.map((item) => {
            const active = pathname === item.path || (item.path === '/tutorial' && pathname === '/guia')
            const Icon = item.icon
            return <button key={item.path} className={`nav-item ${active ? 'nav-item--active' : ''}`} onClick={() => navigate(item.path)} title={collapsed ? item.label : undefined} data-motion="nav-item" aria-current={active ? 'page' : undefined}>
              <span className={`nav-item__icon tone-${item.tone}`}><Icon size={17} /></span><span>{!collapsed && item.label}</span><span className="nav-item__active-light" aria-hidden="true" />
            </button>
          })}
        </div>)}
      </nav>
      <button className="sidebar__collapse" onClick={onToggle} data-motion="collapse-control">{collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}{!collapsed && <span>Recolher</span>}</button>
    </aside>
  )
}
