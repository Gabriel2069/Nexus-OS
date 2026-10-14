import { StellarSpark } from "../components/CosmicEnvironment";
import { ArrowRight, Inbox, Layers3, Sparkles, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { SurfaceCard } from "../components/SurfaceCard";
import { PageLoading } from "../components/PageLoading";
import { WorkspaceFeedback } from "../components/WorkspaceFeedback";
import { useNexus } from "../context/NexusContext";
import { civilDate, dateKey, shiftDate } from "../lib/dates";
import { emitUI } from "../lib/ui-events";
import type { NexusMission } from "../types/nexus";

export function InboxPage() {
  const { workspace, processMission, loading, error, refresh } = useNexus();
  const [busy, setBusy] = useState(false);
  const [continueProcessing, setContinueProcessing] = useState(false);
  const pending = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [priority, setPriority] = useState<NexusMission["priority"]>("Média");
  const [rank, setRank] = useState<NexusMission["rank"]>("C");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const inbox = useMemo(
    () => workspace.missions.filter((m) => m.status === "Inbox"),
    [workspace.missions],
  );
  const selected = inbox.find((m) => m.id === selectedId) ?? null;

  function inspect(item: NexusMission) {
    if (pending.current) return;
    chooseEntry(item);
  }
  function chooseEntry(item: NexusMission) {
    setSelectedId(item.id);
    setSaveError(null);
    setPriority(item.priority);
    setRank(item.rank);
    setDueDate(item.due_at ? dateKey(new Date(item.due_at)) : "");
    setProjectId(item.project_id ?? "");
    if (window.matchMedia("(max-width:920px)").matches) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(".inbox-inspector")?.focus(),
      );
    }
  }
  async function decide(discard: boolean) {
    if (!selected || pending.current) return;
    pending.current = true;
    setBusy(true);
    setSaveError(null);
    try {
      await processMission(
        selected.id,
        discard
          ? { status: "Cancelada" }
          : {
              status: "A fazer",
              priority,
              rank,
              due_at: dueDate ? `${dueDate}T23:59:00-03:00` : null,
              project_id: projectId || null,
            },
      );
      const next = continueProcessing
        ? inbox.find((m) => m.id !== selected.id)
        : null;
      if (next) {
        chooseEntry(next);
        requestAnimationFrame(() =>
          document.querySelector<HTMLElement>(".inbox-inspector")?.focus(),
        );
      } else {
        setSelectedId(null);
        requestAnimationFrame(() =>
          document.querySelector<HTMLElement>(".inbox-list-heading")?.focus(),
        );
      }
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Não foi possível processar. Suas escolhas foram preservadas.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (loading) return <PageLoading />;
  if (error) return <WorkspaceFeedback error={error} retry={refresh} />;

  return (
    <div className="page-stack inbox-page">
      <header className="orbital-heading">
        <div>
          <span className="eyebrow">Anote primeiro · decida depois</span>
          <h1>
            Caixa de entrada
            <StellarSpark />
          </h1>
          <p>
            Um lugar para capturar ideias e dar destino ao que merece sua
            atenção.
          </p>
        </div>
        <span className="orbital-heading__status">
          <Inbox size={16} />
          {inbox.length} pendência{inbox.length === 1 ? "" : "s"}
        </span>
      </header>
      <section className="inbox-command-grid">
        <SurfaceCard tone="amber" className="inbox-capture-card">
          <span className="eyebrow">Captura rápida</span>
          <h2>Libere espaço na cabeça.</h2>
          <p>Anote agora. O destino pode esperar pelo contexto certo.</p>
          <button
            className="primary-button"
            onClick={() => emitUI("quickAdd", { type: "inbox" })}
          >
            <Sparkles size={16} />
            Capturar uma ideia
          </button>
        </SurfaceCard>
        <SurfaceCard eyebrow="Processar bem" title="Três decisões, com calma">
          <ol className="inbox-rule-list">
            <li>Isso exige uma ação?</li>
            <li>Quando precisa voltar à sua atenção?</li>
            <li>É independente ou pertence a um projeto?</li>
          </ol>
        </SurfaceCard>
      </section>
      <section className={`inbox-workspace ${selected ? "has-inspector" : ""}`}>
        <SurfaceCard
          eyebrow="Pendências"
          action={<span className="surface-chip">{inbox.length}</span>}
        >
          <h2 className="inbox-list-heading" tabIndex={-1}>
            {inbox.length ? "Escolha uma entrada" : "Tudo processado"}
          </h2>
          {inbox.length ? (
            <div className="inbox-list">
              {inbox.map((item) => (
                <button
                  disabled={busy}
                  aria-pressed={selectedId === item.id}
                  aria-controls={
                    selectedId === item.id ? "inbox-inspector" : undefined
                  }
                  className={`inbox-item ${selectedId === item.id ? "selected" : ""}`}
                  key={item.id}
                  onClick={() => inspect(item)}
                >
                  <span className="inbox-item__icon">
                    <Layers3 size={16} />
                  </span>
                  <span className="inbox-item__copy">
                    <strong>{item.title}</strong>
                    <small>
                      {item.notes || `Entrada rápida · Rank ${item.rank}`}
                    </small>
                  </span>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          ) : (
            <div className="inbox-empty">
              <Inbox size={28} />
              <strong>Nada esperando decisão.</strong>
              <p>Suas próximas ideias têm um lugar para chegar.</p>
            </div>
          )}
        </SurfaceCard>
        {selected && (
          <aside
            className="inbox-inspector"
            id="inbox-inspector"
            tabIndex={-1}
            aria-label="Processar entrada"
            aria-busy={busy}
          >
            <SurfaceCard tone="amber">
              <div className="entity-inspector__header">
                <div>
                  <span className="eyebrow">Entrada selecionada</span>
                  <h2>{selected.title}</h2>
                </div>
                <button
                  className="icon-button"
                  disabled={busy}
                  aria-label="Fechar entrada"
                  onClick={() => {
                    setSelectedId(null);
                    requestAnimationFrame(() =>
                      document
                        .querySelector<HTMLElement>(".inbox-list-heading")
                        ?.focus(),
                    );
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              {selected.notes && <p className="panel-copy">{selected.notes}</p>}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void decide(false);
                }}
              >
                <fieldset disabled={busy} className="inbox-destination">
                  <legend>Dar contexto à missão</legend>
                  <div className="inspector-form-grid">
                    <label>
                      <span>Prioridade</span>
                      <select
                        value={priority}
                        onChange={(e) =>
                          setPriority(
                            e.target.value as NexusMission["priority"],
                          )
                        }
                      >
                        {["Baixa", "Média", "Alta", "Crítica"].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Rank</span>
                      <select
                        value={rank}
                        onChange={(e) =>
                          setRank(e.target.value as NexusMission["rank"])
                        }
                      >
                        {["D", "C", "B", "A", "S"].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <label className="inspector-form-grid__wide">
                      <span>Projeto</span>
                      <select
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                      >
                        <option value="">Sem projeto</option>
                        {workspace.projects
                          .filter(
                            (p) =>
                              !["Concluído", "Arquivado"].includes(p.status) ||
                              p.id === projectId,
                          )
                          .map((p) => (
                            <option value={p.id} key={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="inspector-form-grid__wide">
                      <span>Quando isso volta?</span>
                      <div className="native-date-wrap">
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                        />
                      </div>
                    </label>
                  </div>
                  <div className="inbox-date-shortcuts">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        setDueDate(dateKey(shiftDate(civilDate(dateKey()), 1)))
                      }
                    >
                      Amanhã
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setDueDate("")}
                    >
                      Sem prazo
                    </button>
                  </div>
                  <label className="execution-filter-toggle">
                    <input
                      type="checkbox"
                      checked={continueProcessing}
                      onChange={(e) => setContinueProcessing(e.target.checked)}
                    />
                    Selecionar a próxima entrada após salvar
                  </label>
                  <button className="primary-button" type="submit">
                    {busy ? "Processando…" : "Virar missão"}
                    <ArrowRight size={14} />
                  </button>
                </fieldset>
              </form>
              {saveError && (
                <p className="orbital-action-error" role="alert">
                  {saveError}
                </p>
              )}
              <div className="inbox-discard">
                <p>Não exige ação? Você pode descartar esta entrada.</p>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => void decide(true)}
                >
                  <Trash2 size={14} />
                  Descartar entrada
                </button>
              </div>
            </SurfaceCard>
          </aside>
        )}
      </section>
    </div>
  );
}
