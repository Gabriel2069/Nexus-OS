import { CosmicTexture } from "./CosmicEnvironment";
import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { useEffect, useRef } from "react";
type SurfaceCardProps = PropsWithChildren<{
  className?: string;
  tone?: string;
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  style?: CSSProperties;
}>;
export function SurfaceCard({
  children,
  className = "",
  tone = "slate",
  eyebrow,
  title,
  action,
  style,
}: SurfaceCardProps) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const transparency = matchMedia("(prefers-reduced-transparency: reduce)");
    let frame = 0,
      x = 0,
      y = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      node.removeAttribute("data-refraction");
      node.style.removeProperty("--refraction-x");
      node.style.removeProperty("--refraction-y");
    };
    const move = (event: PointerEvent) => {
      if (
        event.pointerType !== "mouse" ||
        motion.matches ||
        transparency.matches ||
        document.hidden ||
        document.documentElement.dataset.atmosphere === "paused" ||
        (event.target as Element).closest(".surface-card") !== node
      )
        return;
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (
          motion.matches ||
          transparency.matches ||
          document.hidden ||
          document.documentElement.dataset.atmosphere === "paused"
        ) {
          reset();
          return;
        }
        const rect = node.getBoundingClientRect();
        node.style.setProperty("--refraction-x", `${x - rect.left}px`);
        node.style.setProperty("--refraction-y", `${y - rect.top}px`);
        node.dataset.refraction = "active";
      });
    };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", reset);
    motion.addEventListener("change", reset);
    transparency.addEventListener("change", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      reset();
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", reset);
      motion.removeEventListener("change", reset);
      transparency.removeEventListener("change", reset);
      document.removeEventListener("visibilitychange", reset);
    };
  }, []);
  return (
    <section
      ref={ref}
      className={`surface-card tone-${tone} ${className}`}
      style={style}
    >
      <CosmicTexture />
      {(eyebrow || title || action) && (
        <header className="surface-card__header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h3>{title}</h3>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
