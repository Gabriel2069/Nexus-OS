import { canonicalDestination } from "../data/navigation";
import { FocusBeacon } from "./FocusBeacon";
import { Compass, Pin, PinOff } from "lucide-react";
import { destinations, useNavigation } from "../context/NavigationContext";
import { navigate } from "../lib/router";
import { emitUI } from "../lib/ui-events";
export function WorkspaceRail({ pathname }: { pathname: string }) {
  pathname = canonicalDestination(pathname);
  const { pinned, togglePin, message } = useNavigation();
  const current = destinations.find((d) => d.path === pathname);
  const isPinned = pinned.includes(pathname);
  return (
    <div className="workspace-rail">
      <nav aria-label="Áreas fixadas" className="workspace-rail__links">
        <button
          onClick={() => navigate("/")}
          aria-current={pathname === "/" ? "page" : undefined}
          className={pathname === "/" ? "is-current" : ""}
        >
          <Compass size={16} />
          <span>Início</span>
        </button>
        {pinned
          .filter((p) => p !== "/")
          .map((path) => {
            const item = destinations.find((d) => d.path === path)!;
            const Icon = item.icon;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                aria-current={path === pathname ? "page" : undefined}
                className={path === pathname ? "is-current" : ""}
              >
                <Icon size={16} />
                <span>{item.shortLabel ?? item.label}</span>
              </button>
            );
          })}
      </nav>
      <div className="workspace-rail__tools">
        <FocusBeacon pathname={pathname} />
        {current && pathname !== "/" && (
          <button
            className="icon-button"
            onClick={() => togglePin(pathname)}
            aria-label={`${isPinned ? "Desfixar" : "Fixar"} ${current.label}`}
            aria-pressed={isPinned}
          >
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        )}
        <button className="workspace-explore" onClick={() => emitUI("command")}>
          <Compass size={16} />
          <span>Explorar</span>
          <kbd>⌘ K</kbd>
        </button>
      </div>
      <span className="workspace-rail__feedback" role="status">
        {message}
      </span>
    </div>
  );
}
