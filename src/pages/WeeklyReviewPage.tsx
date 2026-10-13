import { entityPath } from "../lib/navigation-state";
import { StellarSpark } from "../components/CosmicEnvironment";
import { PageLoading } from "../components/PageLoading";
import { WorkspaceFeedback } from "../components/WorkspaceFeedback";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Gauge,
  Save,
  Sparkles,
  Target,
} from "lucide-react";
import { useMemo, useState, useRef, useEffect, useId } from "react";
import { SurfaceCard } from "../components/SurfaceCard";
import { useNexus } from "../context/NexusContext";
import { civilDate, dateKey, shiftDate } from "../lib/dates";
import { navigate } from "../lib/router";

function monday(date = new Date()) {
  const civil = civilDate(dateKey(date));
  return dateKey(shiftDate(civil, -((civil.getUTCDay() + 6) % 7)));
}
const lines = (value: string) =>
  value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
const tomorrow = () => dateKey(shiftDate(civilDate(dateKey()), 1));

export function WeeklyReviewPage() {
  const { workspace, saveReview, processMission, loading, error, refresh } =
    useNexus();
  const weekStart = monday();
  const existing = workspace.weeklyReviews.find(
    (r) => r.week_start === weekStart,
  );
  const [score, setScore] = useState(existing?.score ?? 7);
  const [wins, setWins] = useState(existing?.wins.join("\n") ?? "");
  const [friction, setFriction] = useState(existing?.friction.join("\n") ?? "");
  const [adjustments, setAdjustments] = useState(
    existing?.adjustments.join("\n") ?? "",
  );
  const [focus, setFocus] = useState(existing?.next_week_focus ?? "");
  const [saving, setSaving] = useState(false);
  const writeLock = useRef(false);
  const missionLock = useRef(false);
  const dirty = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => {
    if (!dirty.current && existing) {
      setScore(existing.score ?? 7);
      setWins(existing.wins.join("\n"));
      setFriction(existing.friction.join("\n"));
      setAdjustments(existing.adjustments.join("\n"));
      setFocus(existing.next_week_focus ?? "");
    }
  }, [existing]);
  const [saved, setSaved] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [busyMission, setBusyMission] = useState<string | null>(null);
  const since = useMemo(
    () => new Date(`${weekStart}T00:00:00-03:00`),
    [weekStart],
  );
  const xp = workspace.activity
    .filter((e) => new Date(e.created_at) >= since)
    .reduce((s, e) => s + Math.max(0, e.xp_delta), 0);
  const focusMinutes = workspace.focusSessions
    .filter((e) => e.status === "completed" && new Date(e.started_at) >= since)
    .reduce((s, e) => s + (e.actual_minutes ?? 0), 0);
  const completed = workspace.activity.filter(
    (e) =>
      e.event_type === "mission.completed" && new Date(e.created_at) >= since,
  ).length;
  const overdue = workspace.missions.filter(
    (m) =>
      m.due_at &&
      dateKey(new Date(m.due_at)) < dateKey() &&
      ["A fazer", "Em andamento", "Bloqueada"].includes(m.status),
  );
  const stale = workspace.projects.filter(
    (p) => p.status === "Ativo" && !p.next_action,
  );
  const selectedReview =
    workspace.weeklyReviews.find((r) => r.id === selectedReviewId) ?? null;
  const nextWeekSignal = overdue.length
    ? `Resolva ${overdue.length} atraso${overdue.length > 1 ? "s" : ""} antes de adicionar carga.`
    : stale.length
      ? `Dê próxima ação a ${stale.length} projeto${stale.length > 1 ? "s" : ""}.`
      : focusMinutes > 360
        ? "A semana teve bastante foco; proteja recuperação antes de aumentar o volume."
        : "A estrutura está limpa o suficiente para escolher um foco simples.";
  async function submit() {
    if (writeLock.current) return;
    writeLock.current = true;
    setActionError(null);
    setSaving(true);
    try {
      await saveReview({
        week_start: weekStart,
        score,
        wins: lines(wins),
        friction: lines(friction),
        adjustments: lines(adjustments),
        next_week_focus: focus || null,
        note: null,
      });
      setSaved(true);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a revisão.",
      );
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  }
  async function moveTomorrow(id: string) {
    if (missionLock.current) return;
    missionLock.current = true;
    setActionError(null);
    setBusyMission(id);
    try {
      await processMission(id, { due_at: `${tomorrow()}T23:59:00-03:00` });
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Não foi possível reagendar a missão.",
      );
    } finally {
      missionLock.current = false;
      setBusyMission(null);
    }
  }

  if (loading) return <PageLoading />;
  if (error) return <WorkspaceFeedback error={error} retry={refresh} />;

  return (
    <div className="page-stack review-page review-page--consultable">
      <section className="orbital-heading page-hero--indigo">
        <div>
          <span className="eyebrow">Fim da semana</span>
          <h1>
            <StellarSpark />
            Revisão semanal
          </h1>
          <p>
            Consulte o que aconteceu, abra os problemas detectados e saia daqui
            com poucas decisões concretas para a semana seguinte.
          </p>
        </div>
        <div className="page-hero__badge">
          <Sparkles size={17} />
          <span>
            desde{" "}
            {new Date(`${weekStart}T12:00:00`)
              .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
              .replace(".", "")}
          </span>
        </div>
      </section>

      <SurfaceCard
        tone={overdue.length || stale.length ? "amber" : "green"}
        className="review-context-signal"
      >
        <div>
          <span className="eyebrow">Diagnóstico automático</span>
          <h2>{nextWeekSignal}</h2>
        </div>
        <button
          className="secondary-button"
          onClick={() => navigate("/calendario")}
        >
          <CalendarDays size={14} />
          Ver próxima semana
        </button>
      </SurfaceCard>

      {actionError && (
        <p className="orbital-action-error" role="alert">
          {actionError}
        </p>
      )}
      {saved && <p role="status">Revisão salva.</p>}
      <section className="review-pulse-grid">
        <SurfaceCard tone="violet">
          <span>XP</span>
          <strong>{xp}</strong>
          <small>registrado</small>
        </SurfaceCard>
        <SurfaceCard tone="blue">
          <span>Foco</span>
          <strong>{focusMinutes}m</strong>
          <small>tempo registrado</small>
        </SurfaceCard>
        <SurfaceCard tone="green">
          <span>Missões</span>
          <strong>{completed}</strong>
          <small>concluídas</small>
        </SurfaceCard>
        <SurfaceCard tone={overdue.length ? "amber" : "green"}>
          <span>Atrasadas</span>
          <strong>{overdue.length}</strong>
          <small>precisam de decisão</small>
        </SurfaceCard>
      </section>

      <section className="review-layout">
        <div className="review-form-stack">
          <SurfaceCard
            tone="indigo"
            eyebrow="Sua avaliação"
            title="Como foi a semana?"
          >
            <div className="review-score">
              <input
                aria-label="Avaliação da semana"
                disabled={saving}
                type="range"
                min="1"
                max="10"
                value={score}
                onChange={(e) => {
                  setScore(Number(e.target.value));
                  dirty.current = true;
                  setSaved(false);
                }}
              />
              <strong>
                {score}
                <small>/10</small>
              </strong>
            </div>
          </SurfaceCard>
          <SurfaceCard eyebrow="Notas" title="Só o que muda alguma coisa">
            <ReviewField
              disabled={saving}
              label="Vitórias"
              value={wins}
              setValue={(v) => {
                dirty.current = true;
                setSaved(false);
                setWins(v);
              }}
              placeholder={
                "Algo que avançou\nUma escolha que funcionou\nAlgo que quero repetir"
              }
            />
            <ReviewField
              disabled={saving}
              label="Atritos"
              value={friction}
              setValue={(v) => {
                dirty.current = true;
                setSaved(false);
                setFriction(v);
              }}
              placeholder={
                "O que drenou energia?\nO que ficou parado?\nO que atrapalhou a rotina?"
              }
            />
            <ReviewField
              disabled={saving}
              label="Ajustes"
              value={adjustments}
              setValue={(v) => {
                dirty.current = true;
                setSaved(false);
                setAdjustments(v);
              }}
              placeholder={
                "Diminuir escopo de…\nMover compromisso…\nDefinir próxima ação para…"
              }
            />
          </SurfaceCard>
          <SurfaceCard
            tone="violet"
            eyebrow="Próxima semana"
            title="Qual é o foco principal?"
          >
            <input
              aria-label="Foco principal da próxima semana"
              disabled={saving}
              className="review-focus-input"
              value={focus}
              onChange={(e) => {
                setFocus(e.target.value);
                dirty.current = true;
                setSaved(false);
              }}
              placeholder="Ex.: chegar preparado às provas sem ocupar as noites"
            />
            <button
              className={saved ? "secondary-button" : "primary-button"}
              onClick={() => void submit()}
              disabled={saving}
            >
              <Save size={15} />
              {saving
                ? "Salvando…"
                : saved
                  ? "Revisão salva"
                  : "Salvar revisão"}
            </button>
          </SurfaceCard>
        </div>

        <aside className="review-diagnostics">
          <SurfaceCard
            tone={overdue.length ? "amber" : "green"}
            eyebrow="Atrasos"
            title={
              overdue.length ? "Decida, não acumule" : "Nenhuma missão vencida"
            }
          >
            <div className="review-action-list">
              {overdue.slice(0, 5).map((m) => (
                <article key={m.id}>
                  <div>
                    <strong>{m.title}</strong>
                    <small>
                      {new Date(m.due_at!)
                        .toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          timeZone: "America/Sao_Paulo",
                        })
                        .replace(".", "")}{" "}
                      · {m.priority}
                    </small>
                  </div>
                  <button
                    className="text-button"
                    disabled={busyMission !== null}
                    onClick={() => void moveTomorrow(m.id)}
                  >
                    Amanhã
                  </button>
                </article>
              ))}
              {!overdue.length && (
                <div className="empty-compact">
                  <CheckCircle2 size={16} />
                  Nada para reagendar.
                </div>
              )}
            </div>
            {overdue.length > 0 && (
              <button
                className="text-button"
                onClick={() => navigate("/missoes")}
              >
                Abrir Missões <ArrowRight size={13} />
              </button>
            )}
          </SurfaceCard>

          <SurfaceCard
            tone={stale.length ? "amber" : "green"}
            eyebrow="Projetos"
            title="Sem próxima ação"
          >
            <div className="review-action-list">
              {stale.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(entityPath("project", p.id))}
                >
                  <div>
                    <strong>{p.name}</strong>
                    <small>{p.progress}% · precisa de decisão</small>
                  </div>
                  <ArrowRight size={13} />
                </button>
              ))}
              {!stale.length && (
                <div className="empty-compact">
                  Todos os projetos ativos têm direção.
                </div>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard eyebrow="Histórico" title="Revisões anteriores">
            <div className="review-history-list">
              {workspace.weeklyReviews
                .filter((r) => r.week_start !== weekStart)
                .slice(0, 5)
                .map((r) => (
                  <button
                    className={selectedReviewId === r.id ? "selected" : ""}
                    key={r.id}
                    onClick={() =>
                      setSelectedReviewId(
                        selectedReviewId === r.id ? null : r.id,
                      )
                    }
                  >
                    <span>
                      {new Date(`${r.week_start}T12:00:00`)
                        .toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })
                        .replace(".", "")}
                    </span>
                    <strong>{r.score ?? "—"}/10</strong>
                    <ArrowRight size={12} />
                  </button>
                ))}
            </div>
            {selectedReview && (
              <div className="review-history-detail">
                <strong>
                  {selectedReview.next_week_focus || "Sem foco registrado"}
                </strong>
                {selectedReview.wins.length > 0 && (
                  <p>Vitórias: {selectedReview.wins.join(" · ")}</p>
                )}
                {selectedReview.adjustments.length > 0 && (
                  <p>Ajustes: {selectedReview.adjustments.join(" · ")}</p>
                )}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard tone="green" eyebrow="Pronto" title="Quando encerrar">
            <div className="review-exit">
              <CheckCircle2 size={20} />
              <p>
                Termine quando os atrasos tiverem uma decisão, os projetos
                tiverem direção e a próxima semana tiver um foco claro.
              </p>
            </div>
          </SurfaceCard>
        </aside>
      </section>
    </div>
  );
}

function ReviewField({
  disabled,
  label,
  value,
  setValue,
  placeholder,
}: {
  disabled: boolean;
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
}) {
  const fieldId = useId();
  return (
    <label className="review-field">
      <span id={`${fieldId}-label`}>{label}</span>
      <textarea
        aria-labelledby={`${fieldId}-label`}
        aria-describedby={`${fieldId}-help`}
        disabled={disabled}
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
      <small id={`${fieldId}-help`}>Uma linha por item</small>
    </label>
  );
}
