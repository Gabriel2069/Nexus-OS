import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Compass, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { mobileNavigation, isCurrentDestination } from "../data/navigation";
import { navigate } from "../lib/router";
import { emitUI } from "../lib/ui-events";
export function MobileDock({ pathname }: { pathname: string }) {
  const nav = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const motion = useRef<Animation | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("nexos-mobile-dock") !== "open";
    } catch {
      return true;
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
  // Presence owns only opacity/transform. Semantics and hit testing change immediately.
  useLayoutEffect(() => {
    const node = nav.current;
    if (!node) return;
    const previous = motion.current;
    const from = previous ? getComputedStyle(node) : null;
    const opacity = from?.opacity;
    const transform = from?.transform;
    previous?.cancel();
    node.inert = collapsed;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.hidden = collapsed;
      return;
    }
    // No exit on the initial, already hidden render.
    if (node.hidden && collapsed) return;
    node.hidden = false;
    const animation = node.animate(
      [
        {
          opacity: opacity ?? (collapsed ? 1 : 0),
          transform: transform ?? (collapsed ? "none" : "translateY(12px)"),
        },
        {
          opacity: collapsed ? 0 : 1,
          transform: collapsed ? "translateY(12px)" : "none",
        },
      ],
      { duration: collapsed ? 150 : 210, easing: "cubic-bezier(.22,1,.36,1)" },
    );
    motion.current = animation;
    animation.onfinish = () => {
      if (motion.current !== animation) return;
      node.hidden = collapsed;
      motion.current = null;
    };
  }, [collapsed]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const settle = () => {
      if (media.matches && motion.current) {
        motion.current.finish();
        motion.current = null;
        if (nav.current) nav.current.hidden = nav.current.inert;
      }
    };
    media.addEventListener("change", settle);
    return () => {
      media.removeEventListener("change", settle);
      motion.current?.cancel();
    };
  }, []);
  useEffect(() => {
    if (collapsed) return;
    const key = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.key !== "Escape" ||
        !matchMedia("(max-width:920px)").matches ||
        document.querySelector('[aria-modal="true"]') ||
        document.activeElement?.closest(".nex-desktop")
      )
        return;
      event.preventDefault();
      setCollapsed(true);
      toggle.current?.focus();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [collapsed]);
  return (
    <div
      className={`mobile-dock-frame ${collapsed ? "is-collapsed" : "is-expanded"}`}
    >
      <button
        className="floating-add"
        onClick={() => emitUI("quickAdd")}
        aria-label="Captura rápida"
      >
        <Plus size={22} aria-hidden="true" />
      </button>
      <button
        ref={toggle}
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
        ref={nav}
        id="nex-mobile-dock"
        hidden
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
