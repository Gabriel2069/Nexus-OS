import { StellarSpark } from "../components/CosmicEnvironment";
import {
  BatteryMedium,
  Check,
  Clock3,
  Moon,
  ArrowRight,
  CalendarDays,
  LoaderCircle,
  Orbit,
  Sparkles,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceFeedback } from "../components/WorkspaceFeedback";
import { PageLoading } from "../components/PageLoading";
import { dateKey } from "../lib/dates";
import { SurfaceCard } from "../components/SurfaceCard";
import { useNexus } from "../context/NexusContext";
import { navigate } from "../lib/router";
import { getReadiness } from "../lib/decision-engine";
import {
  formatOccurrenceTime,
  getRoutineContext,
} from "../lib/routine-context";

const moods = ["Calmo", "Focado", "Animado", "Neutro", "Cansado"];
const clock = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);

export function TodayPage() {
  const {
    workspace,
    saveCheckin,
    setRoutineItem,
    loading,
    error: workspaceError,
    refresh,
  } = useNexus();
  const [now, setNow] = useState(() => new Date());
  const [energy, setEnergy] = useState(
    workspace.checkin?.checkin_date === dateKey(now)
      ? (workspace.checkin.energy ?? 7)
      : 7,
  );
  const [mood, setMood] = useState(
    workspace.checkin?.checkin_date === dateKey(now)
      ? (workspace.checkin.mood ?? "Neutro")
      : "Neutro",
  );
  const dirty = useRef(false);
  const savingRef = useRef(false);
  const todayKey = dateKey(now);
  const currentCheckin =
    workspace.checkin?.checkin_date === todayKey ? workspace.checkin : null;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(
    workspace.checkin?.checkin_date === dateKey(now),
  );
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!dirty.current) {
      setEnergy(currentCheckin?.energy ?? 7);
      setMood(currentCheckin?.mood ?? "Neutro");
      setSaved(Boolean(currentCheckin));
    }
  }, [currentCheckin, todayKey]);
  const context = useMemo(
    () => getRoutineContext(workspace, now),
    [workspace, now],
  );
  const readiness = getReadiness(currentCheckin);
  const completed = new Set(
    workspace.routineCompletions
      .filter((item) => item.completion_date === dateKey())
      .map((c) => c.routine_item_id),
  );
  const morning = workspace.routines.find((r) => r.period === "morning");
  const evening = workspace.routines.find((r) => r.period === "evening");
  const xp = workspace.journey?.xp_earned ?? 0;
  const remainingToday = context.today.filter(
    (event) =>
      !event.isOptional &&
      event.end > now &&
      !["sleep", "recovery"].includes(event.category) &&
      event.end.getTime() - event.start.getTime() < 20 * 60 * 60_000,
  );
  const studyNow =
    context.suggestion.kind === "focus" ? context.suggestion : null;
  async function persistCheckin() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await saveCheckin({ energy, mood });
      dirty.current = false;
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (loading && !dirty.current && !currentCheckin) return <PageLoading />;

  return (
    <div className="page-stack today-page today-page--context">
      {workspaceError && (
        <WorkspaceFeedback error={workspaceError} retry={refresh} />
      )}
      <section className="today-header today-header--compact">
        <div>
          <span className="eyebrow">
            {new Intl.DateTimeFormat("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              timeZone: "America/Sao_Paulo",
            }).format(now)}
          </span>
          <h1>
            Hoje
            <StellarSpark />
          </h1>
          <p>
            Compromissos, energia e espaço livre. Um dia que respeita seu ritmo.
          </p>
        </div>
        <div className="today-score">
          <span>XP hoje</span>
          <strong>{workspace.journey ? xp : "—"}</strong>
          <small>
            {context.load === "cheio"
              ? "dia cheio"
              : `${Math.round(context.loadMinutes / 60)}h de fixos`}
          </small>
        </div>
      </section>

      {!workspaceError && (
        <section className="today-context-grid">
          <SurfaceCard
            tone="blue"
            className="today-now-card"
            eyebrow={context.current ? "Agora" : "Janela atual"}
            title={context.suggestion.title}
          >
            <p className="panel-copy">{context.suggestion.detail}</p>
            <div className="today-now-meta">
              {context.current && (
                <span>
                  <Clock3 size={13} />
                  {formatOccurrenceTime(context.current)}
                </span>
              )}
              {!context.current && context.freeMinutes > 0 && (
                <span>
                  <Clock3 size={13} />
                  {context.freeMinutes} min livres
                </span>
              )}
              {context.next && (
                <span>
                  Próximo: <strong>{context.next.title}</strong> às{" "}
                  {clock(context.next.start)}
                </span>
              )}
            </div>
            {context.suggestion.actionPath && (
              <button
                className="primary-button"
                onClick={() => navigate(context.suggestion.actionPath!)}
              >
                <ArrowRight size={15} />
                {context.suggestion.actionLabel ?? "Começar"}
              </button>
            )}
          </SurfaceCard>

          <SurfaceCard
            tone="amber"
            className="checkin-card checkin-card--compact"
          >
            <div className="card-title-row">
              <div>
                <span className="eyebrow">Check-in pessoal</span>
                <h2>Como você está?</h2>
                {currentCheckin && saved && (
                  <small className="checkin-summary">{readiness.label}</small>
                )}
              </div>
              <BatteryMedium size={19} />
            </div>
            <div className="compact-energy">
              <strong>{energy}</strong>
              <input
                aria-label="Energia"
                type="range"
                min="1"
                max="10"
                value={energy}
                disabled={saving || loading}
                aria-valuetext={`${energy} de 10`}
                onChange={(e) => {
                  setEnergy(Number(e.target.value));
                  dirty.current = true;
                  setSaved(false);
                }}
              />
            </div>
            <div className="mood-row mood-row--compact">
              {moods.map((item) => (
                <button
                  key={item}
                  className={mood === item ? "active" : ""}
                  disabled={saving || loading}
                  aria-pressed={mood === item}
                  onClick={() => {
                    setMood(item);
                    dirty.current = true;
                    setSaved(false);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            {error && (
              <p role="alert" className="auth-message auth-message--error">
                {error}
              </p>
            )}
            <p className="checkin-save-status" role="status">
              {saving
                ? "Registrando seu check-in…"
                : saved
                  ? "Seu check-in está registrado."
                  : dirty.current
                    ? "Você tem alterações para salvar."
                    : "Leva só um instante."}
            </p>
            <button
              disabled={saving || loading || Boolean(workspaceError)}
              className={saved ? "secondary-button" : "primary-button"}
              onClick={() => void persistCheckin()}
            >
              {saving ? (
                <>
                  <LoaderCircle className="spin" size={15} /> Salvando…
                </>
              ) : saved ? (
                <>
                  <Check size={15} /> Salvo
                </>
              ) : (
                <>Salvar check-in</>
              )}
            </button>
          </SurfaceCard>
        </section>
      )}

      {!workspaceError && (
        <section className="today-flow-grid">
          <SurfaceCard
            eyebrow="Trajetória"
            title="O que ainda vem hoje"
            action={
              <button
                className="text-button"
                aria-label="Abrir Calendário"
                onClick={() => navigate("/calendario")}
              >
                <CalendarDays size={17} />
              </button>
            }
          >
            <div className="today-timeline">
              {remainingToday.slice(0, 6).map((event) => (
                <div
                  className={
                    context.current?.id === event.id ? "is-current" : ""
                  }
                  key={event.id}
                >
                  <span>{clock(event.start)}</span>
                  <i />
                  <div>
                    <strong>{event.title}</strong>
                    <small>
                      {clock(event.start)}–{clock(event.end)}
                    </small>
                  </div>
                </div>
              ))}
              {!remainingToday.length && (
                <div className="empty-compact">
                  Sem outros compromissos fixos hoje.
                </div>
              )}
            </div>
            {remainingToday.length > 6 && (
              <button
                className="text-button"
                onClick={() => navigate("/calendario")}
              >
                Ver agenda completa · {remainingToday.length} compromissos{" "}
                <ArrowRight size={14} />
              </button>
            )}
          </SurfaceCard>

          <SurfaceCard
            tone="violet"
            eyebrow="Estudo"
            title={
              studyNow
                ? "Este é o bloco que cabe agora"
                : "Não precisa encaixar estudo agora"
            }
          >
            {studyNow ? (
              <div className="single-study-target">
                <div>
                  <strong>{studyNow.title}</strong>
                  <p>{studyNow.detail}</p>
                </div>
                <footer>
                  <span>{studyNow.durationMinutes ?? 45} min</span>
                  <button
                    className="secondary-button"
                    onClick={() => navigate(studyNow.actionPath ?? "/foco")}
                  >
                    Abrir foco
                  </button>
                </footer>
              </div>
            ) : (
              <p className="panel-copy">
                Quando surgir uma janela planejada — ou uma urgência real — o
                bloco aparece aqui e no Agora. Até lá, siga o compromisso atual
                ou preserve o intervalo.
              </p>
            )}
          </SurfaceCard>
        </section>
      )}

      {!workspaceError && (
        <section className="today-small-loop">
          <SurfaceCard
            tone="amber"
            eyebrow="Começo"
            title="Abrir o dia"
            action={<Sun size={18} aria-hidden="true" />}
          >
            <RoutineMini
              routine={morning}
              completed={completed}
              setRoutineItem={setRoutineItem}
            />
          </SurfaceCard>
          <SurfaceCard
            tone="violet"
            eyebrow="22h"
            title="Fechar o dia"
            action={<Moon size={18} aria-hidden="true" />}
          >
            <RoutineMini
              routine={evening}
              completed={completed}
              setRoutineItem={setRoutineItem}
            />
          </SurfaceCard>
          <SurfaceCard
            tone="green"
            eyebrow="Depois dos fixos"
            title="O resto da vida também cabe"
          >
            <div className="life-space-note">
              <Sparkles size={17} />
              <p>
                Além dos compromissos, reserve espaço para família, amigos,
                hobby ou descanso. Nem todo intervalo precisa de uma tarefa.
              </p>
            </div>
          </SurfaceCard>
        </section>
      )}
    </div>
  );
}

function RoutineMini({
  routine,
  completed,
  setRoutineItem,
}: {
  routine:
    | ReturnType<typeof useNexus>["workspace"]["routines"][number]
    | undefined;
  completed: Set<string>;
  setRoutineItem: (id: string, completed: boolean) => Promise<void>;
}) {
  const [pending, setPending] = useState<string[]>([]);
  const pendingRef = useRef(new Set<string>());
  const [error, setError] = useState<string | null>(null);
  async function toggle(id: string, done: boolean) {
    if (pendingRef.current.has(id)) return;
    pendingRef.current.add(id);
    setPending([...pendingRef.current]);
    setError(null);
    try {
      await setRoutineItem(id, !done);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar. Tente novamente.",
      );
    } finally {
      pendingRef.current.delete(id);
      setPending([...pendingRef.current]);
    }
  }
  if (!routine || !(routine.routine_items ?? []).length)
    return (
      <div className="empty-compact">
        <Orbit size={20} /> Nenhuma rotina cadastrada para este período.
        <button className="text-button" onClick={() => navigate("/rotinas")}>
          Organizar rotinas <ArrowRight size={14} />
        </button>
      </div>
    );
  return (
    <div className="routine-mini">
      {error && (
        <p className="auth-message auth-message--error" role="alert">
          {error}
        </p>
      )}
      {[...(routine.routine_items ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => {
          const done = completed.has(item.id);
          return (
            <button
              className={done ? "done" : ""}
              key={item.id}
              onClick={() => void toggle(item.id, done)}
              disabled={pending.includes(item.id)}
              aria-pressed={done}
              aria-busy={pending.includes(item.id)}
            >
              <span>
                {pending.includes(item.id) ? (
                  <LoaderCircle className="spin" size={14} />
                ) : done ? (
                  <Check size={13} />
                ) : routine.period === "morning" ? (
                  <Sun size={13} />
                ) : (
                  <Moon size={13} />
                )}
              </span>
              <div>
                <strong>{item.title}</strong>
                <small>
                  {item.duration_minutes ?? 2} min · +{item.xp_reward} XP
                </small>
              </div>
            </button>
          );
        })}
    </div>
  );
}
