import { useEffect, useState } from "react";
import { Focus, Pause } from "lucide-react";
import { useNexus } from "../context/NexusContext";
import { elapsedFocus, validFocusMinutes } from "../lib/focus-clock";
import { navigate } from "../lib/router";
import { isDemoMode } from "../lib/supabase";
type Summary = { seconds: number; running: boolean };
export function FocusBeacon({ pathname }: { pathname: string }) {
  const { userId } = useNexus();
  const scope = userId ?? (isDemoMode ? "demo" : null);
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    function read(): Summary | null {
      try {
        if (!scope) return null;
        const data = JSON.parse(
          sessionStorage.getItem(`nexos:focus:${scope}`) ?? "null",
        );
        const clock = data?.clock;
        if (
          data?.version !== 1 ||
          data.active !== true ||
          !validFocusMinutes(data.minutes) ||
          !clock ||
          !Number.isFinite(clock.elapsedMs) ||
          clock.elapsedMs < 0 ||
          clock.plannedMs !== data.minutes * 60000 ||
          !(clock.resumedAt === null || Number.isFinite(clock.resumedAt))
        )
          return null;
        return {
          seconds: Math.max(
            0,
            Math.ceil(
              (clock.plannedMs - elapsedFocus(clock, Date.now())) / 1000,
            ),
          ),
          running: clock.resumedAt !== null,
        };
      } catch {
        return null;
      }
    }
    const update = () => {
      if (timer !== undefined) clearInterval(timer);
      const next = read();
      setSummary(next);
      if (
        next?.running &&
        next.seconds > 0 &&
        pathname !== "/foco" &&
        !document.hidden
      )
        timer = window.setInterval(() => {
          const value = read();
          setSummary(value);
          if (!value || value.seconds === 0) {
            clearInterval(timer);
            timer = undefined;
          }
        }, 1000);
    };
    update();
    window.addEventListener("nexos:focus-checkpoint", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      if (timer !== undefined) clearInterval(timer);
      window.removeEventListener("nexos:focus-checkpoint", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [scope, pathname]);
  if (!summary || pathname === "/foco") return null;
  const time = `${String(Math.floor(summary.seconds / 60)).padStart(2, "0")}:${String(summary.seconds % 60).padStart(2, "0")}`;
  return (
    <button
      className={`focus-beacon ${summary.running ? "is-running" : ""}`}
      aria-label={`Voltar ao foco ${summary.seconds === 0 ? "com tempo atingido" : summary.running ? "ativo" : "pausado"}: ${time}`}
      onClick={() => navigate("/foco")}
    >
      {summary.running ? <Focus size={17} /> : <Pause size={17} />}
      <span>
        <small>
          {summary.seconds === 0
            ? "Tempo atingido"
            : summary.running
              ? "Foco ativo"
              : "Foco pausado"}
        </small>
        <strong>{time}</strong>
      </span>
    </button>
  );
}
