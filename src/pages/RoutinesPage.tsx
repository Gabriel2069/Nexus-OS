import { PageLoading } from "../components/PageLoading";
import { WorkspaceFeedback } from "../components/WorkspaceFeedback";
import { civilDate, dateKey } from "../lib/dates";
import { CosmicTexture, StellarSpark } from "../components/CosmicEnvironment";
import {
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Repeat2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "../lib/router";
import { UI_EVENTS } from "../lib/ui-events";
import { SurfaceCard } from "../components/SurfaceCard";
import { useNexus } from "../context/NexusContext";

export function RoutinesPage() {
  const { workspace, setRoutineItem, loading, error, refresh } = useNexus();
  const location = useLocation();
  const completed = new Set(
    workspace.routineCompletions
      .filter((item) => item.completion_date === dateKey())
      .map((item) => item.routine_item_id),
  );
  const weekday = civilDate(dateKey()).getUTCDay();
  const routines = workspace.routines.filter((r) => r.is_active);
  const todayRoutines = routines.filter(
    (r) => !r.days_of_week.length || r.days_of_week.includes(weekday),
  );
  const allItems = todayRoutines.flatMap(
    (routine) => routine.routine_items ?? [],
  );
  const total = allItems.length;
  const done = allItems.filter((item) => completed.has(item.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
  const relevantPeriod =
    hour < 12 ? "morning" : hour >= 20 ? "evening" : "afternoon";
  const relevant =
    todayRoutines.find(
      (routine) =>
        routine.period === relevantPeriod || routine.period === "anytime",
    ) ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(
    () =>
      new URLSearchParams(location.search).get("routine") ??
      relevant?.id ??
      routines[0]?.id ??
      null,
  );
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("routine");
    if (id && !pending.current) setSelectedId(id);
  }, [location.search]);
  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.kind === "routine" && typeof detail.id === "string")
        inspect(detail.id);
    };
    window.addEventListener(UI_EVENTS.inspect, open);
    return () => window.removeEventListener(UI_EVENTS.inspect, open);
  }, []);
  const selected =
    routines.find((routine) => routine.id === selectedId) ?? null;
  const selectedItems = useMemo(
    () =>
      selected
        ? [...(selected.routine_items ?? [])].sort(
            (a, b) => a.sort_order - b.sort_order,
          )
        : [],
    [selected],
  );
  const selectedDone = selectedItems.filter((item) =>
    completed.has(item.id),
  ).length;
  const nextItem = selectedItems.find((item) => !completed.has(item.id));

  const canComplete = Boolean(
    selected && todayRoutines.some((r) => r.id === selected.id),
  );
  async function mark(ids: { id: string; done: boolean }[]) {
    if (pending.current || !canComplete) return;
    pending.current = true;
    setBusy(true);
    setActionError(null);
    try {
      for (const item of ids) await setRoutineItem(item.id, item.done);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Não foi possível marcar. Etapas já registradas permanecem salvas.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function completeRemaining() {
    void mark(
      selectedItems
        .filter((i) => !completed.has(i.id))
        .map((i) => ({ id: i.id, done: true })),
    );
  }
  function inspect(id: string) {
    if (pending.current) return;
    setSelectedId(id);
    setActionError(null);
    if (window.matchMedia("(max-width:920px)").matches)
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(".routine-inspector")?.focus(),
      );
  }
  if (loading && !selected) return <PageLoading />;
  if (error && !selected)
    return <WorkspaceFeedback error={error} retry={refresh} />;

  return (
    <div className="page-stack routines-page routines-page--consultable">
      <section className="orbital-heading">
        <div>
          <span className="eyebrow">Passos recorrentes</span>
          <h1>
            Rotinas
            <StellarSpark />
          </h1>
          <p>
            Consulte os passos do dia, marque o que fez e siga no seu ritmo.
          </p>
        </div>
        <div className="orbital-heading__status">
          <Repeat2 size={17} />
          <span>{pct}% hoje</span>
        </div>
      </section>

      {error && <WorkspaceFeedback error={error} retry={refresh} />}
      {!loading && selectedId && !selected && (
        <p role="status">
          A rotina solicitada não está entre as rotinas ativas carregadas.
          Escolha outra abaixo.
        </p>
      )}
      {actionError && (
        <p className="orbital-action-error" role="alert">
          {actionError}
        </p>
      )}
      <SurfaceCard
        tone={relevant ? "green" : "slate"}
        className="routine-now-signal"
      >
        <div>
          <span className="eyebrow">Agora</span>
          <h2>
            {relevant
              ? `${relevant.icon ?? "◌"} ${relevant.name}`
              : "Nenhuma rotina precisa de atenção agora"}
          </h2>
          <p>
            {relevant?.description ??
              "O espaço entre abertura e fechamento do dia pertence à rotina real: escola, estudo, família, descanso e compromissos."}
          </p>
        </div>
        {relevant && (
          <button
            className="secondary-button"
            onClick={() => inspect(relevant.id)}
          >
            Consultar <ChevronRight size={14} />
          </button>
        )}
      </SurfaceCard>

      <section className="routine-summary">
        <SurfaceCard tone="green">
          <div className="routine-progress">
            <div>
              <span className="eyebrow">Hoje</span>
              <strong>
                {done}
                <em>/ {total}</em>
              </strong>
              <p>microetapas concluídas</p>
            </div>
            <div className="big-progress">
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section
        className={`routine-workspace ${selected ? "has-inspector" : ""}`}
      >
        <div className="routine-grid routine-grid--interactive">
          {routines.map((routine) => {
            const items = [...(routine.routine_items ?? [])].sort(
              (a, b) => a.sort_order - b.sort_order,
            );
            const routineDone = items.filter((item) =>
              completed.has(item.id),
            ).length;
            return (
              <button
                className={`routine-select-card ${selectedId === routine.id ? "selected" : ""}`}
                id={`routine-target-${routine.id}`}
                key={routine.id}
                aria-pressed={selectedId === routine.id}
                disabled={busy}
                onClick={() => inspect(routine.id)}
              >
                <CosmicTexture />
                <div>
                  <span className="routine-select-card__icon">
                    {routine.icon ?? "◌"}
                  </span>
                  <div>
                    <span className="eyebrow">
                      {routine.period === "morning"
                        ? "Manhã"
                        : routine.period === "evening"
                          ? "Noite"
                          : "Rotina"}
                    </span>
                    <strong>{routine.name}</strong>
                    <small>{routine.description}</small>
                  </div>
                </div>
                <footer>
                  <span>
                    {routineDone}/{items.length} ·{" "}
                    {todayRoutines.some((r) => r.id === routine.id)
                      ? "hoje"
                      : "outro dia"}
                  </span>
                  <ChevronRight size={15} />
                </footer>
              </button>
            );
          })}
        </div>

        {selected && (
          <aside
            className="routine-inspector"
            tabIndex={-1}
            aria-label="Etapas da rotina"
            aria-busy={busy}
          >
            <SurfaceCard
              tone={
                selected.period === "morning"
                  ? "amber"
                  : selected.period === "evening"
                    ? "violet"
                    : "green"
              }
              className="entity-inspector"
            >
              <div className="entity-inspector__header">
                <div>
                  <span className="eyebrow">Rotina selecionada</span>
                  <h2>
                    {selected.icon ?? "◌"} {selected.name}
                  </h2>
                </div>
                <button
                  aria-label="Fechar rotina"
                  disabled={busy}
                  className="icon-button"
                  onClick={() => {
                    const id = selectedId;
                    setSelectedId(null);
                    requestAnimationFrame(() =>
                      document.getElementById(`routine-target-${id}`)?.focus(),
                    );
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <p className="panel-copy">{selected.description}</p>
              <div className="entity-inspector__meta">
                <span>
                  {selectedDone}/{selectedItems.length} concluídas
                </span>
                <span>
                  {selectedItems.reduce(
                    (sum, item) => sum + (item.duration_minutes ?? 0),
                    0,
                  )}{" "}
                  min
                </span>
                <span>
                  +
                  {selectedItems.reduce((sum, item) => sum + item.xp_reward, 0)}{" "}
                  XP
                </span>
              </div>
              {canComplete && selectedDone < selectedItems.length && (
                <button
                  className="primary-button"
                  disabled={busy || Boolean(error)}
                  onClick={completeRemaining}
                >
                  <Check size={15} />
                  Concluir o que falta
                </button>
              )}
              {canComplete && nextItem && (
                <div className="routine-next-step">
                  <span className="eyebrow">Próxima etapa</span>
                  <strong>{nextItem.title}</strong>
                  <p>
                    Confira e marque na lista quando terminar
                    {nextItem.is_optional ? " · opcional" : ""}.
                  </p>
                </div>
              )}
            </SurfaceCard>

            <SurfaceCard eyebrow="Etapas" title="Etapas desta rotina">
              {!canComplete && (
                <p className="panel-copy">
                  Esta rotina não está prevista para hoje.
                </p>
              )}
              <div className="routine-items routine-items--inspector">
                {selectedItems.map((item) => {
                  const isDone = completed.has(item.id);
                  return (
                    <button
                      className={`routine-item ${isDone ? "done" : ""}`}
                      key={item.id}
                      disabled={busy || !canComplete || Boolean(error)}
                      aria-pressed={isDone}
                      onClick={() =>
                        void mark([{ id: item.id, done: !isDone }])
                      }
                    >
                      <span className="routine-check">
                        {isDone ? <Check size={14} /> : <Circle size={14} />}
                      </span>
                      <div>
                        <strong>
                          {item.title}
                          {item.is_optional ? " · opcional" : ""}
                        </strong>
                        <small>
                          {item.duration_minutes ? (
                            <>
                              <Clock3 size={11} />
                              {item.duration_minutes} min
                            </>
                          ) : null}
                          <span>+{item.xp_reward} XP</span>
                        </small>
                      </div>
                    </button>
                  );
                })}
              </div>
            </SurfaceCard>

            <SurfaceCard
              tone="slate"
              eyebrow="Regra"
              title="Quando esta rotina termina"
            >
              <div className="routine-boundary">
                <Sparkles size={17} />
                <p>
                  {selected.period === "morning"
                    ? "Depois do check-in, volte para Agora. Você não precisa abrir outras abas para “completar a manhã”."
                    : selected.period === "evening"
                      ? "Depois do fechamento, não comece outro bloco. O sistema encerra junto com você."
                      : "Marque apenas o que realmente precisa de recorrência."}
                </p>
              </div>
            </SurfaceCard>
          </aside>
        )}
      </section>

      {!routines.length && (
        <SurfaceCard>
          <div className="empty-state">
            <Sparkles size={24} />
            <h3>Nenhuma rotina ativa.</h3>
            <p>Isso também pode ser um estado válido.</p>
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}
