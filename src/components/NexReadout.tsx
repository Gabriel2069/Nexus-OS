import { ArrowUpRight } from "lucide-react";
import { nexAreas } from "../lib/nex-tools";
import { navigate } from "../lib/router";
import { entityPath } from "../lib/navigation-state";
import { emitUI } from "../lib/ui-events";
import { safeGoogleLink } from "../lib/nex-links";
import { useNex } from "../context/NexContext";
const labels = Object.fromEntries(
  Object.entries(nexAreas).map(([k, v]) => [k, v.label]),
);
export function NexReadout({
  data,
  onFile,
}: {
  data: unknown;
  onFile?: (service: string, id: string) => void;
}) {
  const nex = useNex();
  onFile ??= (service, id) =>
    nex.openWindow(`file:${service}:${id}`, `Google · ${service}`, {
      kind: "google",
      service,
      resource: id,
    });
  const payload = (data ?? {}) as {
    service?: string;
    records?: unknown[];
    module?: string;
    sectors?: { module: string; error?: string; records?: unknown[] }[];
    place?: string;
    attribution?: string;
    data?: {
      items?: unknown[];
      files?: unknown[];
      title?: string;
      values?: unknown[][];
      slides?: unknown[];
      body?: unknown;
      current?: { temperature_2m: number; apparent_temperature: number };
      daily?: {
        time: string[];
        temperature_2m_min: number[];
        temperature_2m_max: number[];
      };
    };
  };
  const rows = payload.records ?? payload.data?.items ?? payload.data?.files;
  return (
    <div className="nex-readout">
      {payload.service === "calendar" && (
        <button
          className="secondary-button"
          disabled={nex.busy}
          onClick={() =>
            nex.prepareOperation({
              kind: "google.calendar.import",
              payload: {},
            })
          }
        >
          Revisar importação da agenda · até 20 eventos
        </button>
      )}
      {payload.sectors?.map((s) => (
        <section key={s.module}>
          <h3>{labels[s.module] ?? s.module}</h3>
          {s.error ? <p role="alert">{s.error}</p> : <NexReadout data={s} />}
        </section>
      ))}
      {payload.place && (
        <>
          <h3>{payload.place}</h3>
          <p>
            {payload.data?.current?.temperature_2m} °C · sensação{" "}
            {payload.data?.current?.apparent_temperature} °C
          </p>
          {payload.data?.daily?.time.map((day, i) => (
            <article key={day}>
              <strong>{day}</strong>
              <p>
                {payload.data!.daily!.temperature_2m_min[i]}–
                {payload.data!.daily!.temperature_2m_max[i]} °C
              </p>
            </article>
          ))}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {payload.attribution}
          </a>
        </>
      )}
      {payload.data?.values && (
        <div className="nex-table-scroll">
          <table>
            <caption>Consulta parcial · até 40 linhas / 10 colunas</caption>
            <tbody>
              {payload.data.values.slice(0, 40).map((row, i) => (
                <tr key={i}>
                  {row.slice(0, 10).map((v, j) => (
                    <td key={j}>{String(v ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(payload.data?.body || payload.data?.slides) && (
        <p className="nex-document-text">
          {extractText(payload.data?.body ?? payload.data?.slides).slice(
            0,
            6000,
          )}
        </p>
      )}
      {rows?.length === 0 && <p>Nenhum registro retornado nesta consulta.</p>}
      {rows?.map((item, i) => {
        const row = item as Record<string, unknown>;
        const title = String(
          row.title ??
            row.name ??
            row.summary ??
            row.subject ??
            row.label ??
            row.checkin_date ??
            "Registro",
        );
        const id = typeof row.id === "string" ? row.id : null;
        return (
          <article key={i}>
            <strong>{title}</strong>
            {safeGoogleLink(row.webViewLink ?? row.htmlLink) && (
              <a
                href={safeGoogleLink(row.webViewLink ?? row.htmlLink)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir no Google
              </a>
            )}
            {id &&
              onFile &&
              typeof row.mimeType === "string" &&
              (
                {
                  "application/vnd.google-apps.document": "docs",
                  "application/vnd.google-apps.spreadsheet": "sheets",
                  "application/vnd.google-apps.presentation": "slides",
                } as Record<string, string>
              )[row.mimeType] && (
                <button
                  className="secondary-button"
                  onClick={() =>
                    onFile(
                      (
                        {
                          "application/vnd.google-apps.document": "docs",
                          "application/vnd.google-apps.spreadsheet": "sheets",
                          "application/vnd.google-apps.presentation": "slides",
                        } as Record<string, string>
                      )[row.mimeType as string],
                      id,
                    )
                  }
                >
                  Ler no N.E.X
                </button>
              )}
            {Boolean(row.status) && <p>{String(row.status)}</p>}
            {Boolean(row.note) && <p>{String(row.note)}</p>}
            {Boolean(row.next_action) && (
              <p>Próxima ação: {String(row.next_action)}</p>
            )}
            {Boolean(row.due_at) && <p>Prazo: {String(row.due_at)}</p>}
            {payload.service === "tasks" && (
              <button
                className="secondary-button"
                disabled={nex.busy}
                onClick={() => nex.prepareProposal("inbox", title)}
              >
                Capturar no NexOS · cópia
              </button>
            )}
            {id &&
              ["missoes", "inbox"].includes(payload.module ?? "") &&
              !["Feita", "Cancelada"].includes(String(row.status)) && (
                <div className="nex-compose__actions">
                  <button
                    className="secondary-button"
                    onClick={() => {
                      navigate(
                        `/foco?${new URLSearchParams({ mission: id, minutes: "25" })}`,
                      );
                    }}
                  >
                    Preparar foco
                  </button>
                  <button
                    className="secondary-button"
                    disabled={nex.busy}
                    onClick={() =>
                      nex.prepareOperation({
                        kind: "mission.complete",
                        payload: { id },
                      })
                    }
                  >
                    Revisar conclusão
                  </button>
                </div>
              )}
            {id && payload.module === "projetos" && (
              <button
                className="secondary-button"
                onClick={() =>
                  emitUI("quickAdd", { type: "mission", projectId: id })
                }
              >
                Adicionar missão ao projeto
              </button>
            )}
            {id &&
              "records" in payload &&
              ["missoes", "agora", "inbox", "projetos"].includes(
                String((data as { module?: string }).module),
              ) && (
                <button
                  className="secondary-button"
                  onClick={() => {
                    navigate(
                      entityPath(
                        (data as { module?: string }).module === "projetos"
                          ? "project"
                          : "mission",
                        id,
                      ),
                    );
                    emitUI("inspect");
                  }}
                >
                  Abrir item
                  <ArrowUpRight size={15} />
                </button>
              )}
          </article>
        );
      })}
      {payload.data?.title && <h3>{payload.data.title}</h3>}
      <details>
        <summary>Detalhes da consulta</summary>
        <pre>{JSON.stringify(data, null, 2).slice(0, 20000)}</pre>
      </details>
    </div>
  );
}

function extractText(v: unknown): string {
  if (!v || typeof v !== "object") return "";
  if (Array.isArray(v)) return v.map(extractText).join("");
  const r = v as Record<string, unknown>;
  if (r.textRun && typeof r.textRun === "object")
    return String((r.textRun as { content?: unknown }).content ?? "");
  return Object.values(r).map(extractText).join("");
}
