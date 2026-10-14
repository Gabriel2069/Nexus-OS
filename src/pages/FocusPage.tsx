import { PageLoading } from "../components/PageLoading";
import { WorkspaceFeedback } from "../components/WorkspaceFeedback";
import { StellarSpark } from "../components/CosmicEnvironment";
import {
  elapsedFocus,
  pauseFocus,
  validFocusMinutes,
  type FocusClock,
} from "../lib/focus-clock";
import { dateKey } from "../lib/dates";
import {
  CircleStop,
  Coffee,
  Focus,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { SurfaceCard } from "../components/SurfaceCard";
import { useNexus } from "../context/NexusContext";
import { entityPath } from "../lib/navigation-state";
import { navigate } from "../lib/router";
import type { FocusSession } from "../types/nexus";

function initialParams() {
  const params = new URLSearchParams(window.location.search);
  const parsed = Number(params.get("minutes") ?? 45);
  const minutes = validFocusMinutes(parsed) ? parsed : 45;
  return { minutes, missionId: params.get("mission") ?? "" };
}

export function FocusPage() {
  const {
    workspace,
    userId,
    beginFocus,
    endFocus,
    cancelFocus,
    loading,
    error: workspaceError,
    refresh,
  } = useNexus();
  const initial = useMemo(initialParams, []);
  const storageKey = `nexos:focus:${userId ?? "demo"}`;
  const restored = useMemo(() => {
    try {
      const data = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      if (
        data?.version === 1 &&
        validFocusMinutes(data.minutes) &&
        typeof data.clock?.elapsedMs === "number" &&
        data.clock.plannedMs === data.minutes * 60_000 &&
        (data.clock.resumedAt === null ||
          typeof data.clock.resumedAt === "number")
      )
        return data as {
          minutes: number;
          missionId: string;
          session: FocusSession | null;
          active: boolean;
          clock: FocusClock;
        };
    } catch {
      /* Discard an invalid local checkpoint. */
    }
    return null;
  }, [storageKey]);
  const [minutes, setMinutes] = useState(restored?.minutes ?? initial.minutes);
  const [session, setSession] = useState<FocusSession | null>(
    restored?.session ?? null,
  );
  const [active, setActive] = useState(restored?.active ?? false);
  const [missionId, setMissionId] = useState(
    restored?.missionId ?? initial.missionId,
  );
  const [clock, setClock] = useState<FocusClock>(
    restored?.clock ?? {
      elapsedMs: 0,
      resumedAt: null,
      plannedMs: initial.minutes * 60_000,
    },
  );
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const running = clock.resumedAt !== null;
  const secondsLeft = Math.max(
    0,
    Math.ceil((clock.plannedMs - elapsedFocus(clock, now)) / 1000),
  );
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (!active)
      setClock({ elapsedMs: 0, resumedAt: null, plannedMs: minutes * 60_000 });
  }, [minutes, active]);
  useEffect(() => {
    try {
      if (active)
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            version: 1,
            minutes,
            missionId,
            session,
            active,
            clock,
          }),
        );
      else sessionStorage.removeItem(storageKey);
      window.dispatchEvent(new Event("nexos:focus-checkpoint"));
    } catch {
      /* Storage availability does not block the timer. */
    }
  }, [storageKey, minutes, missionId, session, active, clock]);
  const todayMinutes = useMemo(
    () =>
      workspace.focusSessions
        .filter(
          (item) =>
            item.status === "completed" &&
            dateKey(new Date(item.started_at)) === dateKey(),
        )
        .reduce((sum, item) => sum + (item.actual_minutes ?? 0), 0),
    [workspace.focusSessions],
  );
  const formatted = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const progress = 1 - secondsLeft / (minutes * 60);
  const linkedMission = workspace.missions.find(
    (mission) => mission.id === missionId,
  );
  async function start() {
    if (running || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!active) {
        const next = await beginFocus(
          minutes,
          linkedMission?.title || "Sessão de foco",
          missionId || null,
        );
        setSession(next);
        setActive(true);
        try {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({
              version: 1,
              minutes,
              missionId,
              session: next,
              active: true,
              clock: { ...clock, resumedAt: Date.now() },
            }),
          );
        } catch {
          /* The live timer remains usable without storage. */
        }
      }
      const timestamp = Date.now();
      setNow(timestamp);
      setClock((value) => ({ ...value, resumedAt: timestamp }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível iniciar.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function pause() {
    const timestamp = Date.now();
    setNow(timestamp);
    setClock((value) => pauseFocus(value, timestamp));
  }
  async function finish(cancel = false) {
    if (!active || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    const stopped = pauseFocus(clock, Date.now());
    setClock(stopped);
    try {
      if (session) {
        if (cancel) await cancelFocus(session.id);
        else await endFocus(session.id, Math.round(stopped.elapsedMs / 60_000));
      }
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* No stored checkpoint. */
      }
      setSession(null);
      setActive(false);
      setClock({ elapsedMs: 0, resumedAt: null, plannedMs: minutes * 60_000 });
      if (!cancel) navigate("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível encerrar. Tente novamente.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (secondsLeft === 0 && active && running) void finish();
  }, [secondsLeft, active, running]);
  function reset() {
    if (active) void finish(true);
    else
      setClock({ elapsedMs: 0, resumedAt: null, plannedMs: minutes * 60_000 });
  }

  if (loading && !active) return <PageLoading />;
  return (
    <div className="page-stack focus-page">
      <section className="orbital-heading">
        <div>
          <span className="eyebrow">Um bloco por vez</span>
          <h1>
            Foco
            <StellarSpark />
          </h1>
          <p>
            {linkedMission
              ? `Este bloco está ligado a “${linkedMission.title}”. Quando terminar, você volta para o Agora e o NexOS recalcula o que vem depois.`
              : "Escolha quanto tempo quer dedicar e comece. Quando terminar, volte para o Agora."}
          </p>
        </div>
        <div className="orbital-heading__status">
          <Focus size={17} /> <span>{todayMinutes} min hoje</span>
        </div>
      </section>
      {workspaceError && (
        <WorkspaceFeedback error={workspaceError} retry={refresh} />
      )}
      <section className="focus-layout">
        <SurfaceCard tone="indigo" className="focus-console">
          <div className="focus-modes">
            {[...new Set([25, 45, 60, 90, minutes])]
              .sort((a, b) => a - b)
              .map((value) => (
                <button
                  key={value}
                  disabled={active || busy || Boolean(workspaceError)}
                  aria-pressed={minutes === value}
                  className={minutes === value ? "active" : ""}
                  onClick={() => setMinutes(value)}
                >
                  {value} min
                </button>
              ))}
          </div>
          <div className="focus-clock">
            <div
              className="focus-clock__ring"
              style={{ "--progress": `${progress * 360}deg` } as CSSProperties}
            >
              <div>
                <span>{formatted}</span>
                <small>
                  {running ? "EM FOCO" : active ? "PAUSADO" : "PRONTO"}
                </small>
              </div>
            </div>
          </div>
          <select
            aria-label="Missão vinculada"
            className="focus-mission-select"
            value={missionId}
            onChange={(e) => setMissionId(e.target.value)}
            disabled={active || busy || Boolean(workspaceError)}
          >
            <option value="">Sessão sem missão vinculada</option>
            {workspace.missions
              .filter(
                (m) =>
                  !["Inbox", "Feita", "Cancelada"].includes(m.status) ||
                  m.id === missionId,
              )
              .map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.title}
                </option>
              ))}
          </select>
          {error && (
            <p className="orbital-action-error" role="alert">
              {error}
            </p>
          )}
          <div className="focus-controls">
            <button
              className="icon-button focus-control"
              onClick={reset}
              disabled={running || busy}
              aria-label="Reiniciar"
            >
              <RotateCcw size={18} />
            </button>
            <button
              className="primary-button focus-main"
              disabled={busy || (!active && Boolean(workspaceError))}
              onClick={running ? pause : start}
            >
              {running ? (
                <>
                  <Pause size={18} /> Pausar
                </>
              ) : (
                <>
                  <Play size={18} /> {active ? "Continuar" : "Começar"}
                </>
              )}
            </button>
            <button
              className="icon-button focus-control"
              onClick={() => void finish()}
              disabled={!active || busy}
              aria-label="Encerrar sessão"
            >
              <CircleStop size={18} />
            </button>
          </div>
        </SurfaceCard>
        <div className="focus-side">
          {linkedMission && (
            <SurfaceCard
              tone="violet"
              eyebrow="Contexto"
              title={linkedMission.title}
            >
              <div className="button-row">
                <button
                  className="secondary-button"
                  onClick={() =>
                    navigate(entityPath("mission", linkedMission.id))
                  }
                >
                  Abrir missão
                </button>
                {linkedMission.project_id && (
                  <button
                    className="text-button"
                    onClick={() =>
                      navigate(entityPath("project", linkedMission.project_id!))
                    }
                  >
                    Ver projeto
                  </button>
                )}
              </div>
            </SurfaceCard>
          )}
          <SurfaceCard eyebrow="Hoje" title="Tempo em foco">
            <div className="focus-stat-big">
              <strong>{todayMinutes}</strong>
              <span>minutos registrados</span>
            </div>
          </SurfaceCard>
          <SurfaceCard tone="amber" eyebrow="Depois">
            <div className="recovery-card">
              <Coffee size={20} />
              <p>
                Ao terminar, o NexOS volta ao Agora. Se houver outro compromisso
                perto, ele vai sugerir transição ou pausa em vez de empilhar
                outro bloco.
              </p>
            </div>
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
