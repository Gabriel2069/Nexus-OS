import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  Crosshair,
  ListFilter,
  Orbit,
} from "lucide-react";
import { SurfaceCard } from "./SurfaceCard";
import { WorkspaceFeedback } from "./WorkspaceFeedback";
import { useNexus } from "../context/NexusContext";
import { buildExecutionPlan } from "../lib/execution-plan";
import { navigate } from "../lib/router";
import { entityPath } from "../lib/navigation-state";
import { APP_TIMEZONE } from "../lib/dates";
const clock = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

/** Same planner in Hoje, Planejamento and N.E.X; it never writes or calls a model. */
export function ExecutionWorkbench({
  initialMinutes = 45,
  initialProject = "",
  compact = false,
}: {
  initialMinutes?: number;
  initialProject?: string;
  compact?: boolean;
}) {
  const { workspace, loading, error, refresh } = useNexus();
  const [minutes, setMinutes] = useState(initialMinutes),
    [project, setProject] = useState(initialProject),
    [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => {
      if (!document.hidden) setNow(new Date());
    };
    const timer = window.setInterval(update, 30000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const plan = useMemo(
    () => buildExecutionPlan(workspace, minutes, project || undefined, now),
    [workspace, minutes, project, now],
  );
  if (loading) return <p role="status">Preparando os dados do plano…</p>;
  if (error) return <WorkspaceFeedback error={error} retry={refresh} />;
  const projectMissing =
    project && !workspace.projects.some((p) => p.id === project);
  return (
    <SurfaceCard
      className={`execution-workbench ${compact ? "is-compact" : ""}`}
      tone="blue"
    >
      <header className="execution-heading">
        <div>
          <span className="eyebrow">
            <Orbit size={12} /> Execução conectada
          </span>
          <h2>O que cabe agora?</h2>
          <p>
            Escolha seu tempo. O plano cruza missões, projetos e horários
            carregados.
          </p>
        </div>
        <span className="surface-chip">Sem IA</span>
      </header>
      <div className="execution-controls">
        <label>
          Tempo disponível
          <select
            value={minutes}
            onChange={(e) => {
              setMinutes(Number(e.target.value));
              setNow(new Date());
            }}
          >
            {[...new Set([15, 25, 45, 60, 90, 120, 180, 240, initialMinutes])]
              .sort((a, b) => a - b)
              .map((v) => (
                <option key={v} value={v}>
                  {v} min
                </option>
              ))}
          </select>
        </label>
        <label>
          Projeto
          <select
            value={project}
            onChange={(e) => {
              setProject(e.target.value);
              setNow(new Date());
            }}
          >
            <option value="">Todos em execução</option>
            {workspace.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.status}
              </option>
            ))}
            {projectMissing && (
              <option value={project}>Projeto não carregado</option>
            )}
          </select>
        </label>
        <button className="secondary-button" onClick={() => setNow(new Date())}>
          Recalcular
        </button>
      </div>
      <div className="execution-summary" aria-live="polite">
        <strong>{plan.plannedMinutes} min planejados</strong>
        <small>{plan.readiness.label}</small>
        <span>
          {plan.available} min na janela consultada · {plan.remaining} min de
          margem
        </span>
      </div>
      {plan.blocker && (
        <p className="execution-constraint">
          <CalendarClock size={15} />
          {plan.blocker.start <= now
            ? "Horário em andamento"
            : "Próximo horário"}
          : {plan.blocker.title} · {clock(plan.blocker.start)}–
          {clock(plan.blocker.end)} · {plan.blocker.source}
        </p>
      )}
      {projectMissing && (
        <p role="status">
          Este projeto não está nos dados carregados. Selecione outro para
          planejar.
        </p>
      )}
      <ol className="execution-steps">
        {plan.steps.map((s, i) => (
          <li key={s.mission.id}>
            <span className="execution-step-index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="execution-step-copy">
              <small>
                {clock(s.start)}–{clock(s.end)} · {s.minutes} min
                {s.estimated ? " estimados" : ""}
                {s.project ? ` · ${s.project.name}` : ""}
              </small>
              <button
                className="text-button"
                onClick={() => navigate(entityPath("mission", s.mission.id))}
              >
                {s.mission.title}
                <ArrowUpRight size={13} />
              </button>
              <p>{s.reason}</p>
            </div>
            <button
              className="secondary-button"
              aria-label={`Preparar foco para ${s.mission.title}`}
              onClick={() =>
                navigate(
                  `/foco?${new URLSearchParams({ mission: s.mission.id, minutes: String(s.minutes) })}`,
                )
              }
            >
              <Crosshair size={15} />
              <span>Preparar foco</span>
            </button>
          </li>
        ))}
      </ol>
      {!plan.steps.length && (
        <div className="execution-empty">
          <strong>
            {plan.available === 0
              ? "Não há um bloco livre inteiro nesta janela."
              : plan.candidateCount
                ? "Nenhuma missão inteira cabe nessa janela."
                : "Nenhuma missão disponível neste recorte."}
          </strong>
          <p>
            {plan.available === 0
              ? "Recalcule depois do compromisso ou revise a agenda se o horário mudou."
              : "Ajuste o tempo, revise a duração das missões ou organize a entrada. O plano não divide tarefas automaticamente."}
          </p>
          <button
            className="text-button"
            onClick={() =>
              navigate(plan.available === 0 ? "/calendario" : "/missoes")
            }
          >
            Revisar {plan.available === 0 ? "agenda" : "missões"}
            <ArrowUpRight size={13} />
          </button>
        </div>
      )}
      {!compact && (
        <div className="execution-attention" aria-label="Pendências conectadas">
          <button onClick={() => navigate("/inbox")}>
            <strong>{plan.inbox}</strong>
            <span>na entrada</span>
          </button>
          <button
            onClick={() =>
              navigate(
                `/missoes?${new URLSearchParams({ status: "Bloqueada", ...(project ? { project } : {}) })}`,
              )
            }
          >
            <strong>{plan.blocked}</strong>
            <span>bloqueadas</span>
          </button>
          <button onClick={() => navigate("/projetos?direction=missing")}>
            <strong>{plan.undirected}</strong>
            <span>projetos sem direção</span>
          </button>
        </div>
      )}
      <footer className="execution-footnote">
        <ListFilter size={13} />
        <span>
          Plano sugerido às {clock(plan.generatedAt)} · até 5 ações. Duração
          ausente usa estimativa de 45 min. Não reserva horários; agenda parcial
          e sem tempo de deslocamento.
        </span>
      </footer>
    </SurfaceCard>
  );
}
