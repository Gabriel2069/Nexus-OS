import { useEffect, useRef } from "react";

/** Decorative only; pauses when outside the viewport and follows the global preference. */
export function CosmicLens() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (ref.current)
        ref.current.dataset.visible = String(entry.isIntersecting);
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="cosmic-lens-scene"
      aria-hidden="true"
      data-visible="true"
    >
      <div className="cosmic-lens">
        <span className="cosmic-lens__core" />
        <span className="cosmic-lens__meridian" />
        <span className="cosmic-lens__orbit" data-ambient>
          <i data-ambient />
        </span>
      </div>
      <svg className="cosmic-vessel" viewBox="0 0 100 100">
        <path d="M50 8 69 70 91 88 55 77 50 89 45 77 9 88 31 70Z" />
        <path d="M50 28 50 67M40 80 50 97 60 80" />
      </svg>
    </div>
  );
}
export function CosmicEnvironment() {
  return (
    <div className="nexos-environment" aria-hidden="true">
      <div className="nexos-environment__stars nexos-environment__stars--near" />
      <div className="nexos-environment__stars nexos-environment__stars--far" />
      <div
        className="nexos-environment__nebula nexos-environment__nebula--violet"
        data-ambient
      />
      <div
        className="nexos-environment__nebula nexos-environment__nebula--blue"
        data-ambient
      />
      <div className="nexos-environment__galaxy" />
      <svg className="nexos-star-chart" viewBox="0 0 1440 900" fill="none">
        <path d="M872 78 939 148 1052 117 1154 223 1290 181M37 636 94 701 198 670 263 764" />
        <g>
          <circle cx="872" cy="78" r="2" />
          <circle cx="1052" cy="117" r="2" />
          <circle cx="1290" cy="181" r="2" />
          <circle cx="37" cy="636" r="2" />
          <circle cx="198" cy="670" r="2" />
        </g>
        <path
          className="nexos-star-chart__beacon"
          d="m939 135 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z"
        />
        <path
          className="nexos-star-chart__beacon"
          d="m94 692 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z"
        />
      </svg>
    </div>
  );
}

export function OrbitalSignal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (ref.current)
        ref.current.dataset.visible = String(entry.isIntersecting);
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="orbital-signal"
      aria-hidden="true"
      data-visible="true"
    >
      <div className="orbital-signal__sphere">
        <span className="orbital-signal__star" />
      </div>
      <div className="orbital-signal__path">
        <i data-ambient />
      </div>
      <span className="orbital-signal__latitude" />
    </div>
  );
}

/** One shared, static star chart; details stay outside the reading column. */
export function CosmicTexture() {
  return (
    <span className="visor-texture" aria-hidden="true">
      <svg className="visor-constellation" viewBox="0 0 180 110" fill="none">
        <path d="M18 87 52 58 89 76 124 29 161 46" />
        <path
          className="visor-constellation__arc"
          d="M16 105C72 4 144-8 177 60M38 110C102 15 155 14 180 81"
        />
        <circle cx="18" cy="87" r="1.4" />
        <circle cx="89" cy="76" r="1.5" />
        <circle cx="124" cy="29" r="2" />
        <circle cx="161" cy="46" r="1.3" />
        <path
          className="visor-constellation__star"
          d="m52 48 2.5 7.5L62 58l-7.5 2.5L52 68l-2.5-7.5L42 58l7.5-2.5Z"
        />
      </svg>
    </span>
  );
}
export function StellarSpark() {
  return <span className="stellar-spark" aria-hidden="true" />;
}
