import { CosmicTexture } from "./CosmicEnvironment";
import { ModalSurface } from "./ModalSurface";
import { useOverlay } from "../lib/use-overlay";
import {
  ChevronRight,
  MoreHorizontal,
  Sparkles,
  Search,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  isCurrentDestination,
  mobileNavigation,
  navigation,
} from "../data/navigation";
import { emitUI } from "../lib/ui-events";
import { navigate } from "../lib/router";

type Props = { pathname: string };
const primary = mobileNavigation;

export function MobileDock({ pathname }: Props) {
  const { open: more, setOpen: setMore, show } = useOverlay("navigation");
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ y: 0, time: 0 });
  function closeSheet() {
    setDragY(0);
    setDragging(false);
    setMore(false);
  }
  function onDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    dragStart.current = { y: event.clientY, time: performance.now() };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onDragMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragging) setDragY(Math.max(0, event.clientY - dragStart.current.y));
  }
  function onDragEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const elapsed = Math.max(1, performance.now() - dragStart.current.time);
    const velocity = dragY / elapsed;
    setDragging(false);
    if (dragY > 105 || velocity > 0.55) {
      setDragY(440);
      window.setTimeout(closeSheet, 180);
      return;
    }
    setDragY(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <>
      <nav
        className="mobile-dock"
        aria-label="Navegação móvel"
        data-motion-shell="dock"
      >
        {primary.map(({ path, label, shortLabel, icon: Icon }) => (
          <button
            key={path}
            className={pathname === path ? "active" : ""}
            onClick={() => navigate(path)}
            data-motion="dock-item"
            aria-current={pathname === path ? "page" : undefined}
          >
            <Icon size={19} />
            <span>{shortLabel ?? label}</span>
            <i aria-hidden="true" />
          </button>
        ))}
        <button
          className={
            more || !primary.some((item) => item.path === pathname)
              ? "active"
              : ""
          }
          onClick={() => {
            setDragY(0);
            show();
          }}
          data-motion="dock-item"
          aria-expanded={more}
          aria-haspopup="dialog"
        >
          <MoreHorizontal size={20} />
          <span>Mais</span>
          <i aria-hidden="true" />
        </button>
      </nav>
      {more && (
        <ModalSurface
          className="mobile-sheet-backdrop"
          label="Mais áreas do NexOS"
          onClose={closeSheet}
        >
          <section
            className={`mobile-sheet ${dragging ? "is-dragging" : ""}`}
            style={{ transform: `translateY(${dragY}px)` }}
            onClick={(event) => event.stopPropagation()}
            data-motion-surface="sheet"
          >
            <CosmicTexture />
            <div
              className="mobile-sheet__handle"
              aria-label="Arraste para fechar"
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={() => {
                setDragging(false);
                setDragY(0);
              }}
            />
            <div className="mobile-sheet__title">
              <div>
                <Sparkles size={17} />
                <strong>NexOS</strong>
              </div>
              <div className="mobile-sheet__tools">
                <button
                  className="icon-button"
                  aria-label="Pesquisar áreas"
                  onClick={() => {
                    closeSheet();
                    emitUI("command");
                  }}
                >
                  <Search size={18} />
                </button>
                <button
                  className="icon-button"
                  onClick={closeSheet}
                  aria-label="Fechar navegação"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="mobile-sheet__intro">
              <span className="eyebrow">Navegação</span>
              <h2>Explore seu espaço.</h2>
            </div>
            <div className="mobile-sheet__sections">
              {navigation.map((group) => {
                const items = group.items.filter(
                  (item) => !primary.some((p) => p.path === item.path),
                );
                if (!items.length) return null;
                return (
                  <section
                    className="mobile-sheet__group"
                    key={group.label}
                    aria-label={group.label}
                  >
                    <h3>{group.label}</h3>
                    <div className="mobile-sheet__grid">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const active = isCurrentDestination(
                          item.path,
                          pathname,
                        );
                        return (
                          <button
                            key={item.path}
                            className={active ? "is-current" : ""}
                            aria-current={active ? "page" : undefined}
                            onClick={() => {
                              closeSheet();
                              navigate(item.path);
                            }}
                            data-motion="sheet-item"
                          >
                            <span
                              className={`nav-item__icon tone-${item.tone}`}
                            >
                              <Icon size={18} />
                            </span>
                            <span>{item.label}</span>
                            <ChevronRight size={13} />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        </ModalSurface>
      )}
    </>
  );
}
