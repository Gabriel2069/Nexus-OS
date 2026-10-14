import { useEntityDraft, useNavigation } from "../context/NavigationContext";
import { PageLoading } from "../components/PageLoading";
import { WorkspaceFeedback } from "../components/WorkspaceFeedback";
import { useNex } from "../context/NexContext";
import { projectSummary, executable } from "../lib/execution-plan";
import { normalizeSearch } from "../lib/navigation-state";
import { dateKey } from "../lib/dates";
import { CosmicTexture, StellarSpark } from "../components/CosmicEnvironment";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CirclePlus,
  Gauge,
  ListChecks,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SurfaceCard } from "../components/SurfaceCard";
import { useNexus } from "../context/NexusContext";
import { emitUI, UI_EVENTS } from "../lib/ui-events";
import { useLocation, navigate } from "../lib/router";
import { entityPath } from "../lib/navigation-state";
import type { NexusProject } from "../types/nexus";

const priorityWeight: Record<NexusProject["priority"], number> = {
  Baixa: 0,
  Média: 1,
  Alta: 2,
  Crítica: 3,
};
const isoDate = (value: string | null) =>
  value ? dateKey(new Date(value)) : "";

export function ProjectsPage() {
  const { drafts } = useNavigation();
  const nex = useNex(),
    location = useLocation();
  const [query, setQuery] = useState("");
  const [portfolioStatus, setPortfolioStatus] = useState("open");
  const [missingDirection, setMissingDirection] = useState(
    () => new URLSearchParams(location.search).get("direction") === "missing",
  );
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setMissingDirection(p.get("direction") === "missing");
    if (p.get("project")) setSelectedId(p.get("project"));
  }, [location.search]);
  const {
    workspace,
    addProject,
    editProject,
    completeMission,
    loading,
    error,
    refresh,
  } = useNexus();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("project"),
  );
  const pending = useRef(false);

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (
        detail?.kind === "project" &&
        typeof detail.id === "string" &&
        !pending.current
      )
        setSelectedId(detail.id);
    };
    window.addEventListener(UI_EVENTS.inspect, open);
    return () => window.removeEventListener(UI_EVENTS.inspect, open);
  }, []);
  const [actionError, setActionError] = useState<string | null>(null);
  const active = useMemo(
    () =>
      workspace.projects
        .filter((p) => !["Concluído", "Arquivado"].includes(p.status))
        .sort(
          (a, b) =>
            priorityWeight[b.priority] - priorityWeight[a.priority] ||
            a.progress - b.progress,
        ),
    [workspace.projects],
  );
  const portfolio = workspace.projects
    .filter(
      (p) =>
        normalizeSearch(query)
          .split(/\s+/)
          .filter(Boolean)
          .every((term) =>
            normalizeSearch(
              `${p.name} ${p.description ?? ""} ${p.next_action ?? ""}`,
            ).includes(term),
          ) &&
        (portfolioStatus === "all" ||
          (portfolioStatus === "open" &&
            !["Concluído", "Arquivado"].includes(p.status)) ||
          p.status === portfolioStatus) &&
        (!missingDirection || (p.status === "Ativo" && !p.next_action?.trim())),
    )
    .sort(
      (a, b) =>
        priorityWeight[b.priority] - priorityWeight[a.priority] ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  const avg = active.length
    ? Math.round(active.reduce((sum, p) => sum + p.progress, 0) / active.length)
    : 0;
  const withoutAction = active.filter((p) => !p.next_action).length;
  const selected = workspace.projects.find((p) => p.id === selectedId) ?? null;
  const summary = selected ? projectSummary(selected, workspace) : null;
  const linkedMissions = summary?.missions ?? [];
  const openLinked = summary?.open ?? [];

  useEffect(() => {
    if (!selected) return;
    const frame = requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(".project-inspector");
      element?.focus({ preventScroll: true });
      if (window.matchMedia("(max-width:920px)").matches)
        element?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
    });
    return () => cancelAnimationFrame(frame);
  }, [selected?.id]);
  async function submit() {
    if (!name.trim() || pending.current) return;
    pending.current = true;
    setActionError(null);
    setCreating(true);
    try {
      await addProject(name.trim());
      setName("");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar o projeto.",
      );
    } finally {
      pending.current = false;
      setCreating(false);
    }
  }
  async function patch(
    patch: Partial<
      Pick<
        NexusProject,
        "status" | "priority" | "progress" | "next_action" | "due_at"
      >
    >,
  ) {
    if (!selected || pending.current) return false;
    pending.current = true;
    setActionError(null);
    setBusy(selected.id);
    try {
      await editProject(selected.id, patch);
      return true;
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar. Suas escolhas foram preservadas.",
      );
      return false;
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }
  function inspect(project: NexusProject) {
    if (pending.current) return;
    setSelectedId(project.id);
    setActionError(null);
    if (window.matchMedia("(max-width:920px)").matches)
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(".project-inspector")?.focus(),
      );
  }
  async function finishLinked(id: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(id);
    setActionError(null);
    try {
      await completeMission(id);
      drafts.delete(JSON.stringify(["mission", id]));
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir a missão.",
      );
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }
  function addMission() {
    if (!selected) return;
    emitUI("quickAdd", {
      type: "mission",
      projectId: selected.id,
      title: selected.next_action ?? "",
    });
  }

  if (loading && !selected) return <PageLoading />;
  if (error && !selected)
    return <WorkspaceFeedback error={error} retry={refresh} />;
  return (
    <div className="page-stack projects-page projects-page--consultable">
      <section className="orbital-heading">
        <div>
          <span className="eyebrow">Resultados maiores</span>
          <h1>
            Projetos
            <StellarSpark />
          </h1>
          <p>
            Selecione um projeto para enxergar direção, missões ligadas, prazo e
            próximo passo. O objetivo aqui é destravar execução, não administrar
            porcentagens.
          </p>
        </div>
        <div className="orbital-heading__status">
          <BriefcaseBusiness size={17} />
          <span>{active.length} ativos</span>
        </div>
      </section>

      {error && <WorkspaceFeedback error={error} retry={refresh} />}
      {selectedId && !selected && !loading && !error && (
        <p className="orbital-action-error" role="status">
          O projeto solicitado não está nos dados carregados.
        </p>
      )}
      {actionError && (
        <p className="orbital-action-error" role="alert">
          {actionError}
        </p>
      )}
      <section className="projects-metrics">
        <SurfaceCard tone="violet">
          <span>Progresso médio</span>
          <strong>{active.length ? `${avg}%` : "—"}</strong>
          <small>projetos ativos</small>
        </SurfaceCard>
        <SurfaceCard tone={withoutAction ? "amber" : "green"}>
          <span>Sem próxima ação</span>
          <strong>{withoutAction}</strong>
          <small>
            {withoutAction ? "precisam de decisão" : "todos têm direção"}
          </small>
        </SurfaceCard>
        <SurfaceCard tone="blue">
          <span>Missões ligadas</span>
          <strong>
            {
              workspace.missions.filter(
                (m) =>
                  m.project_id && !["Feita", "Cancelada"].includes(m.status),
              ).length
            }
          </strong>
          <small>ações abertas</small>
        </SurfaceCard>
      </section>

      <SurfaceCard tone="violet" className="project-create">
        <div>
          <span className="eyebrow">Novo projeto</span>
          <h2>Que resultado precisa de várias ações para acontecer?</h2>
        </div>
        <div className="project-create__form">
          <input
            disabled={creating}
            aria-label="Nome do projeto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            placeholder="Nome do projeto…"
          />
          <button
            className="primary-button"
            disabled={
              creating || Boolean(busy) || Boolean(error) || !name.trim()
            }
            onClick={() => void submit()}
          >
            <CirclePlus size={16} />
            Criar
          </button>
        </div>
      </SurfaceCard>

      <section className="execution-filters" aria-label="Recorte dos projetos">
        <label>
          Buscar projeto
          <input
            type="search"
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, descrição ou próxima ação"
          />
        </label>
        <label>
          Estado
          <select
            aria-label="Estado dos projetos"
            value={portfolioStatus}
            onChange={(e) => setPortfolioStatus(e.target.value)}
          >
            <option value="open">Em aberto</option>
            <option value="all">Todos os estados</option>
            {["Ideia", "Ativo", "Em espera", "Concluído", "Arquivado"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        </label>
        <label className="execution-filter-toggle">
          <input
            type="checkbox"
            checked={missingDirection}
            onChange={(e) => setMissingDirection(e.target.checked)}
          />
          Somente ativos sem próxima ação
        </label>
        <button
          className="text-button"
          onClick={() => {
            setQuery("");
            setPortfolioStatus("open");
            setMissingDirection(false);
          }}
        >
          Limpar filtros
        </button>
        <span role="status">
          {portfolio.length} de {workspace.projects.length} projetos carregados
        </span>
      </section>

      <section
        className={`project-workspace ${selected ? "has-inspector" : ""}`}
      >
        <div className="project-portfolio-grid project-portfolio-grid--interactive">
          {portfolio.length ? (
            portfolio.map((project) => {
              const linked = workspace.missions.filter(
                (m) =>
                  m.project_id === project.id &&
                  !["Feita", "Cancelada"].includes(m.status),
              ).length;
              return (
                <button
                  disabled={Boolean(busy) || creating}
                  aria-pressed={selectedId === project.id}
                  className={`project-command-card project-command-card--button ${selectedId === project.id ? "selected" : ""}`}
                  id={`project-target-${project.id}`}
                  key={project.id}
                  onClick={() => inspect(project)}
                >
                  <CosmicTexture />
                  <div className="project-command-card__top">
                    <span
                      className={`rank-badge rank-${project.priority === "Crítica" ? "S" : project.priority === "Alta" ? "A" : project.priority === "Média" ? "B" : "C"}`}
                    >
                      {project.priority}
                    </span>
                    <span>Nv. {project.level}</span>
                  </div>
                  <h3>{project.name}</h3>
                  <p>
                    {project.description || "Resultado maior em andamento."}
                  </p>
                  <div className="project-progress-line">
                    <div>
                      <span>Progresso</span>
                      <strong>{project.progress}%</strong>
                    </div>
                    <div className="progress-bar">
                      <span style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                  <div className="project-next-action">
                    <ArrowRight size={14} />
                    <div>
                      <span>Próxima ação</span>
                      <strong>
                        {project.next_action || "Ainda não definida"}
                      </strong>
                    </div>
                  </div>
                  <div className="project-command-card__footer">
                    <span>
                      <ListChecks size={13} />
                      {linked} abertas
                    </span>
                    {project.due_at && (
                      <span>
                        <CalendarClock size={13} />
                        {new Date(project.due_at)
                          .toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            timeZone: "America/Sao_Paulo",
                          })
                          .replace(".", "")}
                      </span>
                    )}
                    <span>
                      <Sparkles size={13} />
                      {project.xp} XP
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <SurfaceCard className="project-empty">
              <BriefcaseBusiness size={28} />
              <h3>Nenhum projeto neste recorte.</h3>
              <p>
                Limpe os filtros ou crie um projeto quando uma intenção precisar
                de várias ações.
              </p>
            </SurfaceCard>
          )}
        </div>

        {selected && (
          <aside
            className="project-inspector"
            tabIndex={-1}
            aria-label="Detalhes do projeto"
            aria-busy={Boolean(busy)}
          >
            <SurfaceCard tone="violet" className="entity-inspector">
              <div className="entity-inspector__header">
                <div>
                  <span className="eyebrow">Projeto selecionado</span>
                  <h2>{selected.name}</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Fechar projeto"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    const id = selectedId;
                    setSelectedId(null);
                    requestAnimationFrame(() =>
                      document.getElementById(`project-target-${id}`)?.focus(),
                    );
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <p className="panel-copy">
                {selected.description ||
                  "Use este painel para manter o resultado e a próxima ação claros."}
              </p>
              <div className="project-inspector-progress">
                <div>
                  <strong>{selected.progress}%</strong>
                  <span>progresso atual</span>
                </div>
                <div className="progress-bar">
                  <span style={{ width: `${selected.progress}%` }} />
                </div>
              </div>
              {summary && (
                <div className="project-execution-summary">
                  <span>
                    <strong>{summary.done}</strong> concluídas
                  </span>
                  <span>
                    <strong>{summary.blocked}</strong> bloqueadas
                  </span>
                  <span>
                    <strong>{summary.focusMinutes}</strong> min de foco
                    registrado
                  </span>
                </div>
              )}
              <div className="project-execution-actions">
                <button
                  className="secondary-button"
                  onClick={() =>
                    nex.openWindow(
                      `plan:${selected.id}`,
                      `Plano · ${selected.name}`,
                      { kind: "plan", minutes: 45, projectId: selected.id },
                    )
                  }
                >
                  Planejar este projeto
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    navigate(
                      `/missoes?${new URLSearchParams({ project: selected.id })}`,
                    )
                  }
                >
                  Ver missões filtradas
                  <ArrowRight size={14} />
                </button>
              </div>
              {summary?.next && (
                <p className="panel-copy">
                  Próximo passo pelas regras do NexOS:{" "}
                  <button
                    className="text-button"
                    onClick={() =>
                      navigate(entityPath("mission", summary.next!.id))
                    }
                  >
                    {summary.next.title}
                  </button>
                </p>
              )}
              <button className="primary-button" onClick={addMission}>
                <Plus size={15} />
                Nova missão neste projeto
              </button>
            </SurfaceCard>

            <SurfaceCard eyebrow="Direção" title="Organizar este projeto">
              <ProjectDecision
                key={selected.id}
                project={selected}
                busy={Boolean(busy) || Boolean(error)}
                save={patch}
              />
            </SurfaceCard>
            <SurfaceCard
              tone="blue"
              eyebrow="Execução"
              title={`${openLinked.length} missões abertas`}
            >
              <label className="execution-filter-toggle">
                <input
                  type="checkbox"
                  checked={showHistory}
                  onChange={(e) => setShowHistory(e.target.checked)}
                />
                Incluir concluídas e canceladas
              </label>
              <div className="project-linked-missions">
                {(showHistory ? linkedMissions : openLinked).map((m) => (
                  <article key={m.id}>
                    <span className={`rank-chip rank-${m.rank.toLowerCase()}`}>
                      {m.rank}
                    </span>
                    <div>
                      <button
                        className="text-button project-mission-open"
                        onClick={() => navigate(entityPath("mission", m.id))}
                        aria-label={`Abrir missão ${m.title}`}
                      >
                        {m.title}
                      </button>
                      <small>
                        {m.status} · {m.duration_minutes ?? 45} min
                      </small>
                    </div>
                    <div className="project-linked-actions">
                      {executable(m) && (
                        <button
                          className="icon-button"
                          aria-label={`Preparar foco para ${m.title}`}
                          onClick={() =>
                            navigate(
                              `/foco?${new URLSearchParams({ mission: m.id, minutes: String(m.duration_minutes ?? 45) })}`,
                            )
                          }
                        >
                          <Gauge size={15} />
                        </button>
                      )}
                      <button
                        className="icon-button"
                        disabled={
                          Boolean(busy) ||
                          ["Inbox", "Feita", "Cancelada"].includes(m.status)
                        }
                        onClick={() => void finishLinked(m.id)}
                        aria-label={`Concluir ${m.title}`}
                      >
                        <CheckCircle2 size={15} />
                      </button>
                    </div>
                  </article>
                ))}
                {!(showHistory ? linkedMissions : openLinked).length && (
                  <div className="empty-compact">
                    Nenhuma missão aberta. Se o projeto ainda está ativo, defina
                    uma próxima ação e crie a missão daqui.
                  </div>
                )}
              </div>
            </SurfaceCard>
          </aside>
        )}
      </section>
    </div>
  );
}

function ProjectDecision({
  project,
  busy,
  save,
}: {
  project: NexusProject;
  busy: boolean;
  save: (
    patch: Partial<
      Pick<
        NexusProject,
        "status" | "priority" | "progress" | "next_action" | "due_at"
      >
    >,
  ) => Promise<boolean>;
}) {
  const [draft, setDraft, clearDraft] = useEntityDraft(
    ["project", project.id],
    {
      status: project.status,
      priority: project.priority,
      progress: project.progress,
      action: project.next_action ?? "",
      date: isoDate(project.due_at),
    },
  );
  const [saved, setSaved] = useState(false);
  const field = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  };
  return (
    <form
      className="stellar-decision"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const success = await save({
          status: draft.status,
          priority: draft.priority,
          progress: draft.progress,
          next_action: draft.action.trim() || null,
          due_at: draft.date ? `${draft.date}T23:59:00-03:00` : null,
        });
        if (success) clearDraft();
        setSaved(success);
      }}
    >
      <p className="entity-draft-hint">
        Troque de área sem perder o rascunho. Salve antes de atualizar a página.
      </p>
      <fieldset disabled={busy}>
        <label className="project-next-editor">
          <span>Próxima ação</span>
          <textarea
            rows={3}
            value={draft.action}
            onChange={(e) => field("action", e.target.value)}
            placeholder="O próximo passo concreto."
          />
        </label>
        <div className="inspector-form-grid">
          <label>
            <span>Prioridade</span>
            <select
              value={draft.priority}
              onChange={(e) =>
                field("priority", e.target.value as NexusProject["priority"])
              }
            >
              {["Baixa", "Média", "Alta", "Crítica"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select
              value={draft.status}
              onChange={(e) =>
                field("status", e.target.value as NexusProject["status"])
              }
            >
              {["Ideia", "Ativo", "Em espera", "Concluído", "Arquivado"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </label>
          <label className="inspector-form-grid__wide">
            <span>Progresso · {draft.progress}%</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={draft.progress}
              onChange={(e) => field("progress", Number(e.target.value))}
            />
          </label>
          <label className="inspector-form-grid__wide">
            <span>Prazo</span>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => field("date", e.target.value)}
            />
          </label>
        </div>
        <button className="primary-button" type="submit">
          {busy ? "Salvando…" : "Salvar projeto"}
        </button>
      </fieldset>
      {saved && <p role="status">Alterações salvas.</p>}
    </form>
  );
}
