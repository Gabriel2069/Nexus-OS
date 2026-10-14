import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Grip, Minus, Maximize2, Minimize2, X } from "lucide-react";
import { useNex } from "../context/NexContext";
import {
  fitWindow,
  layoutWindow,
  type WindowBounds,
  type WindowLayout,
  type NexWindow,
} from "../lib/nex-windows";

export type WindowArrangement = {
  sequence: number;
  bounds: Record<string, WindowBounds>;
};
const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const easing = "cubic-bezier(.22,.8,.24,1)";

/** One geometry/transform owner. Content stays mounted while instruments are tucked away. */
export function NexWindowFrame({
  item,
  index,
  arrangement,
  children,
}: {
  item: NexWindow;
  index: number;
  arrangement: WindowArrangement | null;
  children: ReactNode;
}) {
  const nex = useNex();
  const ref = useRef<HTMLElement>(null),
    move = useRef<HTMLButtonElement>(null);
  const [bounds, setBounds] = useState(() =>
    fitWindow(
      {
        x:
          index % 3 === 0
            ? 88
            : index % 3 === 1
              ? window.innerWidth - 468
              : window.innerWidth / 2 - 220,
        y: 110 + Math.floor(index / 3) * 58,
        width: 440,
        height: 510,
      },
      window.innerWidth,
      window.innerHeight,
    ),
  );
  const [layout, setLayout] = useState<WindowLayout>("free");
  const freeBounds = useRef(bounds),
    latest = useRef(bounds);
  latest.current = bounds;
  const animation = useRef<Animation | null>(null),
    before = useRef<DOMRect | null>(null);
  const drag = useRef<{
    mode: "move" | "resize";
    x: number;
    y: number;
    bounds: WindowBounds;
  } | null>(null);
  const top = nex.windows.filter((w) => !w.minimized).at(-1)?.id === item.id;
  function cancelMotion() {
    animation.current?.cancel();
    animation.current = null;
  }
  function animate(frames: Keyframe[], duration: number, done?: () => void) {
    cancelMotion();
    if (!ref.current || reduced()) {
      done?.();
      return;
    }
    const a = ref.current.animate(frames, { duration, easing });
    animation.current = a;
    a.finished
      .then(() => {
        if (animation.current === a) {
          animation.current = null;
          a.cancel();
          done?.();
        }
      })
      .catch(() => {});
  }
  function setGeometry(next: WindowBounds, motion = true) {
    if (motion) {
      const current = ref.current?.getBoundingClientRect() ?? null;
      cancelMotion();
      before.current = current;
    }
    setBounds(next);
  }
  function chooseLayout(next: WindowLayout) {
    if (window.innerWidth < 720) return;
    if (layout === "free") freeBounds.current = latest.current;
    setLayout(next);
    setGeometry(
      next === "free"
        ? fitWindow(freeBounds.current, window.innerWidth, window.innerHeight)
        : layoutWindow(next, window.innerWidth, window.innerHeight),
    );
  }
  useLayoutEffect(() => {
    const old = before.current;
    before.current = null;
    if (!old || item.minimized || window.innerWidth < 720) return;
    const next = ref.current?.getBoundingClientRect();
    if (next && old.width && old.height)
      animate(
        [
          {
            transformOrigin: "top left",
            transform: `translate(${old.x - next.x}px, ${old.y - next.y}px) scale(${old.width / next.width}, ${old.height / next.height})`,
          },
          { transformOrigin: "top left", transform: "none" },
        ],
        260,
      );
  }, [bounds]);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    cancelMotion();
    if (item.minimized) {
      const r = node.getBoundingClientRect();
      const dock = document
        .getElementById(`nex-restore-${item.id}`)
        ?.getBoundingClientRect();
      animate(
        [
          { opacity: 1, transform: "none" },
          {
            opacity: 0,
            transform: `translate(${dock ? dock.x + dock.width / 2 - r.x - r.width / 2 : 0}px, ${dock ? dock.y - r.y - r.height / 2 : 20}px) scale(.18)`,
          },
        ],
        180,
        () => {
          node.hidden = true;
        },
      );
    } else {
      node.hidden = false;
      animate(
        [
          { opacity: 0, transform: "translateY(10px) scale(.97)" },
          { opacity: 1, transform: "none" },
        ],
        220,
      );
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const settle = () => {
      cancelMotion();
      node.hidden = item.minimized;
    };
    media.addEventListener("change", settle);
    return () => {
      media.removeEventListener("change", settle);
      cancelMotion();
    };
  }, [item.minimized]);
  useEffect(() => {
    const next = arrangement?.bounds[item.id];
    if (!next) return;
    if (layout === "free") freeBounds.current = latest.current;
    setLayout("free");
    setGeometry(next);
  }, [arrangement]);
  useEffect(() => {
    const resize = () => {
      if (window.innerWidth < 720) return;
      cancelMotion();
      setBounds(
        layout === "free"
          ? fitWindow(latest.current, window.innerWidth, window.innerHeight)
          : layoutWindow(layout, window.innerWidth, window.innerHeight),
      );
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [layout]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      node = ref.current;
    return () => {
      queueMicrotask(() => {
        if (
          !node?.isConnected &&
          document.activeElement === document.body &&
          previous?.isConnected &&
          !document.getElementById("root")?.inert &&
          !previous.closest("[hidden], [inert]")
        )
          previous.focus({ preventScroll: true });
      });
    };
  }, []);
  useEffect(() => {
    if (
      top &&
      !item.minimized &&
      !document.getElementById("root")?.inert &&
      !ref.current?.contains(document.activeElement)
    )
      move.current?.focus({ preventScroll: true });
  }, [top, item.minimized]);
  function minimize() {
    nex.minimizeWindow(item.id);
    requestAnimationFrame(() =>
      document.getElementById(`nex-restore-${item.id}`)?.focus(),
    );
  }
  function begin(
    e: React.PointerEvent<HTMLButtonElement>,
    mode: "move" | "resize",
  ) {
    if (e.button !== 0 || window.innerWidth < 720 || layout !== "free") return;
    cancelMotion();
    drag.current = { mode, x: e.clientX, y: e.clientY, bounds: latest.current };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moving(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x,
      dy = e.clientY - d.y;
    setBounds(
      fitWindow(
        d.mode === "move"
          ? { ...d.bounds, x: d.bounds.x + dx, y: d.bounds.y + dy }
          : {
              ...d.bounds,
              width: Math.min(
                d.bounds.width + dx,
                window.innerWidth - d.bounds.x - 12,
              ),
              height: Math.min(
                d.bounds.height + dy,
                window.innerHeight - d.bounds.y - 76,
              ),
            },
        window.innerWidth,
        window.innerHeight,
      ),
    );
  }
  function arrows(e: React.KeyboardEvent<HTMLButtonElement>, resize = false) {
    if (
      layout !== "free" ||
      window.innerWidth < 720 ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    )
      return;
    e.preventDefault();
    cancelMotion();
    const dx = e.key === "ArrowRight" ? 24 : e.key === "ArrowLeft" ? -24 : 0;
    const dy = e.key === "ArrowDown" ? 24 : e.key === "ArrowUp" ? -24 : 0;
    const b = latest.current;
    setBounds(
      fitWindow(
        resize
          ? {
              ...b,
              width: Math.min(b.width + dx, window.innerWidth - b.x - 12),
              height: Math.min(b.height + dy, window.innerHeight - b.y - 76),
            }
          : { ...b, x: b.x + dx, y: b.y + dy },
        window.innerWidth,
        window.innerHeight,
      ),
    );
  }
  return (
    <section
      ref={ref}
      inert={item.minimized}
      role="dialog"
      aria-modal="false"
      aria-label={item.title}
      data-layout={layout}
      data-active={top}
      className="nex-floating-window"
      style={
        {
          "--window-x": `${bounds.x}px`,
          "--window-y": `${bounds.y}px`,
          "--window-width": `${bounds.width}px`,
          "--window-height": `${bounds.height}px`,
          zIndex: 20 + index,
        } as CSSProperties
      }
      onPointerDownCapture={() => {
        if (!top && !item.minimized) nex.focusWindow(item.id);
      }}
      onFocusCapture={() => {
        if (!top && !item.minimized) nex.focusWindow(item.id);
      }}
      onKeyDown={(e) => {
        if (e.altKey && e.key.toLowerCase() === "m") {
          e.preventDefault();
          minimize();
        }
      }}
    >
      <header className="nex-window-titlebar">
        <button
          ref={move}
          className="nex-window-grip"
          aria-label={`Mover janela ${item.title}`}
          title="Arraste ou use as setas para mover. Clique duas vezes para expandir."
          onDoubleClick={() =>
            chooseLayout(layout === "maximized" ? "free" : "maximized")
          }
          onPointerDown={(e) => begin(e, "move")}
          onPointerMove={moving}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onKeyDown={(e) => arrows(e)}
        >
          <Grip size={15} />
          <span>
            <small>
              N.E.X /{" "}
              {item.body.kind === "operation" || item.body.kind === "proposal"
                ? "Aprovação"
                : "Instrumento"}
            </small>
            <strong>{item.title}</strong>
          </span>
        </button>
        <button
          className="icon-button"
          aria-label={`Minimizar ${item.title}`}
          title="Recolher · Alt+M"
          onClick={minimize}
        >
          <Minus size={16} />
        </button>
        <button
          className="icon-button nex-window-expand"
          aria-label={`${layout === "maximized" ? "Restaurar tamanho de" : "Maximizar"} ${item.title}`}
          onClick={() =>
            chooseLayout(layout === "maximized" ? "free" : "maximized")
          }
        >
          {layout === "maximized" ? (
            <Minimize2 size={15} />
          ) : (
            <Maximize2 size={15} />
          )}
        </button>
        <button
          className="icon-button nex-window-close"
          aria-label={`Fechar ${item.title}`}
          onClick={() => nex.closeWindow(item.id)}
        >
          <X size={17} />
        </button>
      </header>
      <div className="nex-window-content">{children}</div>
      <footer className="nex-window-status">
        <span>
          {item.body.kind === "compose"
            ? "Rascunho nesta sessão"
            : item.body.kind === "operation" || item.body.kind === "proposal"
              ? "Ações com confirmação"
              : item.body.kind === "help"
                ? "Comandos locais"
                : "Consulta parcial"}
        </span>
        <select
          aria-label={`Disposição de ${item.title}`}
          value={layout}
          onChange={(e) => chooseLayout(e.target.value as WindowLayout)}
        >
          <option value="free">Livre</option>
          <option value="left">Esquerda</option>
          <option value="right">Direita</option>
          <option value="maximized">Expandida</option>
        </select>
        <button
          className="nex-window-resize"
          aria-label={`Redimensionar ${item.title}`}
          title="Arraste ou use as setas para redimensionar"
          disabled={layout !== "free"}
          onPointerDown={(e) => begin(e, "resize")}
          onPointerMove={moving}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onKeyDown={(e) => arrows(e, true)}
        >
          <Grip size={14} />
        </button>
      </footer>
    </section>
  );
}
