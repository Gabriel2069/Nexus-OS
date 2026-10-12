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
