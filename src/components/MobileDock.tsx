import { useEffect, useState } from "react";
import { Compass, ChevronDown, ChevronUp } from "lucide-react";
import { mobileNavigation, isCurrentDestination } from "../data/navigation";
import { navigate } from "../lib/router";
import { emitUI } from "../lib/ui-events";
export function MobileDock({ pathname }: { pathname: string }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("nexos-mobile-dock") === "collapsed";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(
        "nexos-mobile-dock",
        collapsed ? "collapsed" : "open",
      );
    } catch {
      /* Navigation remains available without storage. */
    }
  }, [collapsed]);
  return (
    <div className="mobile-dock-frame">
      <button
        className={"mobile-dock-toggle " + (collapsed ? "is-collapsed" : "")}
        aria-controls="nex-mobile-dock"
        aria-expanded={!collapsed}
        aria-label={
          collapsed ? "Expandir menu inferior" : "Recolher menu inferior"
        }
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        <span>{collapsed ? "Menu" : "Recolher"}</span>
      </button>
      <nav
        id="nex-mobile-dock"
        hidden={collapsed}
        className="mobile-dock"
        aria-label="Navegação móvel"
      >
        {mobileNavigation.map(({ path, label, shortLabel, icon: Icon }) => (
          <button
            key={path}
            className={isCurrentDestination(path, pathname) ? "active" : ""}
            aria-current={
              isCurrentDestination(path, pathname) ? "page" : undefined
            }
            onClick={() => navigate(path)}
          >
            <Icon size={19} />
            <span>{shortLabel ?? label}</span>
            <i aria-hidden="true" />
          </button>
        ))}
        <button
          onClick={() => emitUI("command")}
          aria-haspopup="dialog"
          className={
            !mobileNavigation.some((item) => item.path === pathname)
              ? "active"
              : ""
          }
        >
          <Compass size={20} />
          <span>Explorar</span>
          <i aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
