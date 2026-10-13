import { useId } from "react";
import { NexHologram } from "./NexHologram";
export function NexOrbitalCore({
  state,
  coreRef,
}: {
  state: string;
  coreRef: React.RefObject<HTMLDivElement | null>;
}) {
  const id = useId().replaceAll(":", "");
  return (
    <div
      ref={coreRef}
      className="nex-orbital-core"
      data-state={state}
      aria-hidden="true"
    >
      <NexHologram state={state} coreRef={coreRef} />
      <svg className="nex-orbital-map" viewBox="0 0 320 320">
        <defs>
          <radialGradient id={id}>
            <stop stopColor="currentColor" stopOpacity=".65" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle
          cx="160"
          cy="160"
          r="130"
          fill="none"
          stroke="currentColor"
          strokeOpacity=".2"
        />
        {Array.from({ length: 60 }, (_, i) => (
          <path
            key={i}
            d="M160 25v5"
            transform={"rotate(" + i * 6 + " 160 160)"}
            stroke="currentColor"
            strokeOpacity={i % 5 === 0 ? ".7" : ".18"}
          />
        ))}
        <g className="nex-orbital-map__rotation">
          <ellipse
            cx="160"
            cy="160"
            rx="124"
            ry="50"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".45"
            transform="rotate(-35 160 160)"
          />
          <ellipse
            cx="160"
            cy="160"
            rx="125"
            ry="60"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".25"
            transform="rotate(55 160 160)"
          />
          <circle cx="48" cy="105" r="3" fill="currentColor" />
          <circle cx="246" cy="238" r="2" fill="currentColor" />
        </g>
        <circle cx="160" cy="160" r="76" fill={"url(#" + id + ")"} />
      </svg>
      <div className="nex-orbital-sphere">
        <div className="nex-orbital-sphere__light">
          <svg viewBox="0 0 100 100">
            <path
              d="M50 7 59 41 93 50 59 59 50 93 41 59 7 50 41 41Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
      <span className="nex-orbital-caption">NEURAL EXPLORATION / N.E.X</span>
    </div>
  );
}
