import { useEffect, useState } from "react";
import { useNex } from "../context/NexContext";
import { nexRequest } from "../lib/nex-api";
import {
  nexAreas,
  operationKinds,
  type NexOperation,
  type NexPanel,
} from "../lib/nex-tools";
import { navigate } from "../lib/router";
import { entityPath } from "../lib/navigation-state";
import { emitUI } from "../lib/ui-events";
type Preview = {
  operation: NexOperation;
  before: unknown;
  label: string;
  warning: string;
};
type Receipt = {
  applied: boolean;
  id: string;
  kind: string;
  area: keyof typeof nexAreas;
  href?: string;
  imported?: number;
  preserved?: number;
};
const fields: Record<string, string> = {
  name: "Nome",
  title: "Título",
  description: "Descrição",
  next_action: "Próxima ação",
  status: "Estado",
  priority: "Prioridade",
  id: "Registro",
  expected_updated_at: "Versão conferida",
  project_id: "Projeto",
  starts_at: "Início",
  ends_at: "Fim",
  note: "Nota",
  period: "Período",
  steps: "Etapas",
  subject: "Disciplina",
  weekday: "Dia (0 = domingo)",
  start_time: "Início",
  end_time: "Fim",
  energy: "Energia",
  focus: "Foco",
  mood: "Humor",
  next_week_focus: "Próxima semana",
  kind: "Tipo",
  amount: "Valor (R$)",
  entry_date: "Data",
  category: "Categoria",
  module: "Área",
  content: "Memória",
};
export function safeGoogleLink(value: unknown) {
  try {
    const u = new URL(String(value));
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      [
        "docs.google.com",
        "calendar.google.com",
        "tasks.google.com",
        "drive.google.com",
      ].includes(u.hostname)
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function NexOperationCard({
  operation,
  id,
}: {
  operation: NexOperation;
  id: string;
}) {
  const nex = useNex(),
    [preview, setPreview] = useState<Preview | null>(null),
    [receipt, setReceipt] = useState<Receipt | null>(null);
  const p = preview?.operation ?? operation;
  async function review() {
    await nex.run(async (signal) =>
      setPreview(
        await nexRequest<Preview>(
          "operations/preview",
          { operation },
          "POST",
          signal,
        ),
      ),
    );
  }
  async function confirm() {
    if (!preview) return;
    await nex.run(async (signal) => {
      const result = await nexRequest<Receipt>(
        "operations/execute",
        { operation: preview.operation, id, confirmed: true },
        "POST",
        signal,
      );
      if (!result.applied) throw Error("Operação não confirmada.");
      setReceipt(result);
      await nex.refreshWorkspace();
    }, "Executando ação confirmada");
  }
  const href = safeGoogleLink(receipt?.href);
  return (
    <section className="nex-proposal">
      <span className="eyebrow">{operationKinds[operation.kind]}</span>
      <dl className="nex-operation-fields">
        {Object.entries(p.payload)
          .filter(([k]) => k !== "expected_updated_at")
          .map(([k, v]) => (
            <div key={k}>
              <dt>{fields[k] ?? k}</dt>
              <dd>{Array.isArray(v) ? v.join(" → ") : String(v)}</dd>
            </div>
          ))}
      </dl>
      {preview?.before != null && (
        <details>
          <summary>Registro atual, antes da alteração</summary>
          <pre>{JSON.stringify(preview.before, null, 2)}</pre>
        </details>
      )}
      <p>
        {receipt
          ? "Operação confirmada no destino."
          : (preview?.warning ??
            "Confira a proposta e revise os dados atuais antes de confirmar.")}
      </p>
      {receipt?.imported !== undefined && (
        <p>
          {receipt.imported} importados · {receipt.preserved} preservados.
        </p>
      )}
      {receipt ? (
        href ? (
          <a
            className="primary-button"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir no Google
          </a>
        ) : (
          <button
            className="primary-button"
            onClick={() => {
              navigate(
                receipt.kind.startsWith("project.")
                  ? entityPath("project", receipt.id)
                  : receipt.kind.startsWith("mission.")
                    ? entityPath("mission", receipt.id)
                    : (nexAreas[receipt.area]?.path ?? "/nex"),
              );
              emitUI("inspect");
            }}
          >
            Abrir destino
          </button>
        )
      ) : (
        <div className="nex-compose__actions">
          {preview && (
            <button
              className="secondary-button"
              disabled={nex.busy}
              onClick={() => setPreview(null)}
            >
              Voltar à proposta
            </button>
          )}
          <button
            className="primary-button"
            disabled={nex.busy}
            onClick={preview ? confirm : review}
          >
            {preview ? "Confirmar operação" : "Revisar proposta"}
          </button>
        </div>
      )}
    </section>
  );
}
export function NexResponsePanel({
  panel,
  compact = false,
  onInspect,
}: {
  panel: NexPanel;
  compact?: boolean;
  onInspect: (title: string, data: unknown) => void;
}) {
  const [data, setData] = useState<{
      records?: Record<string, unknown>[];
      sectors?: unknown[];
    } | null>(null),
    [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    nexRequest<typeof data>("context", { module: panel.area }, "POST", c.signal)
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [panel.area]);
  const content = (
    <div className="nex-readout">
      {error ? (
        <p role="alert">{error}</p>
      ) : !data ? (
        <p role="status">Consultando…</p>
      ) : (
        <>
          <p>
            Consulta parcial · {(data.records ?? data.sectors ?? []).length}{" "}
            registros/setores retornados.
          </p>
          {data.records?.slice(0, expanded ? 12 : 2).map((r, i) => (
            <article key={i}>
              <strong>
                {String(
                  r.title ??
                    r.name ??
                    r.label ??
                    r.subject ??
                    r.checkin_date ??
                    "Registro",
                )}
              </strong>
              <p>{String(r.status ?? r.note ?? r.next_action ?? "")}</p>
            </article>
          ))}
          {data.sectors && <p>Agora · Calendário · Projetos · Hoje</p>}
        </>
      )}
    </div>
  );
  return (
    <section className="nex-response-panel">
      <span className="eyebrow">
        Instrumento / {nexAreas[panel.area].label}
      </span>
      {content}
      <div className="nex-compose__actions">
        <button
          className="secondary-button"
          onClick={() =>
            compact
              ? setExpanded(!expanded)
              : onInspect(nexAreas[panel.area].label, data)
          }
        >
          {expanded ? "Recolher" : "Expandir consulta"}
        </button>
        <button
          className="secondary-button"
          onClick={() => {
            navigate(nexAreas[panel.area].path);
            emitUI("inspect");
          }}
        >
          Abrir área
        </button>
      </div>
    </section>
  );
}
