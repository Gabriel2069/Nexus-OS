import { useEffect, useState } from "react";
import { emitUI } from "../lib/ui-events";
import { CosmicTexture } from "./CosmicEnvironment";
import { ChevronDown, Search, ChevronsLeft, ChevronsRight } from "lucide-react";
import { isCurrentDestination, navigation } from "../data/navigation";
import { navigate } from "../lib/router";

type SidebarProps = {
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ pathname, collapsed, onToggle }: SidebarProps) {
  const currentGroup = navigation.find((g) =>
    g.items.some((i) => isCurrentDestination(i.path, pathname)),
  )?.label;
  const [expanded, setExpanded] = useState<string[]>(() => [
    ...new Set(["Agora", "Fazer", ...(currentGroup ? [currentGroup] : [])]),
  ]);
  useEffect(() => {
    if (currentGroup)
      setExpanded((prev) =>
        prev.includes(currentGroup) ? prev : [...prev, currentGroup],
      );
  }, [currentGroup]);
  return (
    <aside
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}
      data-motion-shell="sidebar"
    >
      <CosmicTexture />
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
      <button
        className="sidebar-explore"
        onClick={() => emitUI("command")}
        aria-label="Encontrar e abrir áreas"
      >
        <Search size={16} />
        {!collapsed && (
          <>
            <span>Encontrar e abrir</span>
            <kbd>⌘ K</kbd>
          </>
        )}
      </button>
      <nav
        className="sidebar__nav"
        aria-label="Navegação principal"
        id="nexos-navigation"
      >
        {navigation
          .filter(
            (group) =>
              !collapsed ||
              ["Agora", "Fazer"].includes(group.label) ||
              group.label === currentGroup,
          )
          .map((group) => (
            <div
              className="nav-group"
              key={group.label}
              data-motion="nav-group"
            >
              {!collapsed && (
                <button
                  className="nav-group-toggle"
                  aria-expanded={expanded.includes(group.label)}
                  aria-controls={`nav-section-${group.label}`}
                  onClick={() =>
                    setExpanded((prev) =>
                      prev.includes(group.label)
                        ? prev.filter((label) => label !== group.label)
                        : [...prev, group.label],
                    )
                  }
                >
                  <span>{group.label}</span>
                  <ChevronDown size={13} />
                </button>
              )}
              <div
                id={`nav-section-${group.label}`}
                className="nav-group-items"
                hidden={!collapsed && !expanded.includes(group.label)}
              >
                {group.items
                  .filter(
                    (item) =>
                      !collapsed ||
                      ["Agora", "Fazer"].includes(group.label) ||
                      isCurrentDestination(item.path, pathname),
                  )
                  .map((item) => {
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
                        <span
                          className="nav-item__active-light"
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
              </div>
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
