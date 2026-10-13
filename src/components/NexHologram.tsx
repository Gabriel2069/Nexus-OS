import { useEffect, useRef, type RefObject } from "react";
/** A bounded projected constellation. Decorative, never a fabricated device statistic. */
export function NexHologram({
  state,
  coreRef,
}: {
  state: string;
  coreRef: RefObject<HTMLDivElement | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current,
      host = coreRef.current;
    if (!el || !host) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const dots = Array.from({ length: 240 }, (_, i) => {
      const y = 1 - ((i + 0.5) * 2) / 240,
        r = Math.sqrt(1 - y * y),
        a = i * Math.PI * (3 - Math.sqrt(5));
      return { x: Math.cos(a) * r, y, z: Math.sin(a) * r };
    });
    const edges = dots.flatMap((a, i) =>
      dots
        .slice(i + 1)
        .flatMap((b, j) =>
          Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.35
            ? [[i, i + j + 1]]
            : [],
        ),
    );
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let size = 300,
      frame = 0,
      last = 0,
      angle = 0,
      visible = true,
      color = "#f0faff";
    const moving = () =>
      visible &&
      !document.hidden &&
      !reduced.matches &&
      document.documentElement.dataset.atmosphere !== "paused";
    const draw = () => {
      const energy = Number(host.style.getPropertyValue("--nex-energy")) || 0;
      const s = Math.sin(angle),
        c = Math.cos(angle),
        radius = size * 0.34;
      const points = dots.map((p, i) => {
        const wave =
          Math.sin(i * 0.23 + angle * 2.4) * Math.cos(i * 0.09 - angle);
        const response =
          state === "thinking" ? 0.16 : state === "speaking" ? 0.1 : 0.065;
        const ripple = 1 + wave * response + energy * 0.14;
        const tilt = 0.18 * Math.sin(angle * 0.4);
        const x = (p.x * c + p.z * s) * ripple,
          z = (-p.x * s + p.z * c) * ripple;
        const depth = 2.8 / (2.8 - z * 0.28);
        return {
          x: size / 2 + x * radius * depth,
          y:
            size / 2 +
            (p.y * Math.cos(tilt) - z * Math.sin(tilt)) *
              ripple *
              radius *
              depth,
          z,
        };
      });
      ctx.clearRect(0, 0, size, size);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 0.55;
      for (const [a, b] of edges) {
        ctx.globalAlpha = 0.035 + (points[a].z + points[b].z + 2) * 0.045;
        ctx.beginPath();
        ctx.moveTo(points[a].x, points[a].y);
        ctx.lineTo(points[b].x, points[b].y);
        ctx.stroke();
      }
      for (const p of points) {
        ctx.globalAlpha = 0.25 + (p.z + 1) * 0.34;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.7 + (p.z + 1) * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    const tick = (now: number) => {
      if (!moving()) {
        frame = 0;
        return;
      }
      if (now - last >= 33) {
        angle += state === "thinking" ? 0.014 : 0.004;
        draw();
        last = now;
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      color = getComputedStyle(host).color;
      draw();
      if (moving()) frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(([entry]) => {
      size = Math.max(100, entry.contentRect.width);
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      el.width = Math.round(size * dpr);
      el.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sync();
    });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const attrs = new MutationObserver(sync);
    resize.observe(el);
    intersection.observe(host);
    attrs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-atmosphere"],
    });
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      attrs.disconnect();
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [state, coreRef]);
  return <canvas ref={canvas} className="nex-hologram" aria-hidden="true" />;
}
