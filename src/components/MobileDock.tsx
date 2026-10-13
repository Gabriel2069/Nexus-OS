import { Compass } from "lucide-react";
import { mobileNavigation, isCurrentDestination } from "../data/navigation";
import { navigate } from "../lib/router";
import { emitUI } from "../lib/ui-events";
export function MobileDock({ pathname }: { pathname: string }) {
  return (
    <nav className="mobile-dock" aria-label="Navegação móvel">
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
  );
}
