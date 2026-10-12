import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { isCurrentDestination, navigation } from "../data/navigation";
import { navigate } from "../lib/router";

type SidebarProps = {
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ pathname, collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}
      data-motion-shell="sidebar"
    >
      <span className="visor-texture" aria-hidden="true" />
      <div className="sidebar__brand" data-motion="brand">
        <button
          className="brand-mark"
          onClick={() => navigate("/")}
          aria-label="Ir para o início"
          data-motion="magnetic"
        >
          <img src="/nexos-mark.svg" alt="" />
        </button>
        {!collapsed && (
          <div className="sidebar__brand-copy">
            <strong>NexOS</strong>
            <span>Observatório pessoal</span>
          </div>
        )}
      </div>
      <nav
        className="sidebar__nav"
        aria-label="Navegação principal"
        id="nexos-navigation"
      >
        {navigation.map((group) => (
          <div className="nav-group" key={group.label} data-motion="nav-group">
            {!collapsed && (
              <span className="nav-group__label">{group.label}</span>
            )}
            {group.items.map((item) => {
              const active = isCurrentDestination(item.path, pathname);
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  className={`nav-item ${active ? "nav-item--active" : ""}`}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  data-motion="nav-item"
                  aria-current={active ? "page" : undefined}
                  aria-label={collapsed ? item.label : undefined}
                >
                  <span className={`nav-item__icon tone-${item.tone}`}>
                    <Icon size={17} />
                  </span>
                  <span>{!collapsed && item.label}</span>
                  <span className="nav-item__active-light" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <button
        className="sidebar__collapse"
        aria-label={
          collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
        }
        aria-expanded={!collapsed}
        aria-controls="nexos-navigation"
        onClick={onToggle}
        data-motion="collapse-control"
      >
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        {!collapsed && <span>Recolher</span>}
      </button>
    </aside>
  );
}
