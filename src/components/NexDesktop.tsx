import { useEffect, useRef, useState } from "react";
import {
  X,
  PanelsTopLeft,
  LayoutGrid,
  PanelBottomClose,
  PanelBottomOpen,
} from "lucide-react";
import { useNex } from "../context/NexContext";
import { useNexus } from "../context/NexusContext";
import { localExamples } from "../lib/nex-local";
import { nexRequest } from "../lib/nex-api";
import {
  nexAreas,
  operationKinds,
  operation,
  type NexArea,
  type NexOperation,
} from "../lib/nex-tools";
import { arrangeWindows, type NexWindow } from "../lib/nex-windows";
import { navigate } from "../lib/router";
import { entityPath } from "../lib/navigation-state";
import { emitUI } from "../lib/ui-events";
import { NexWindowFrame, type WindowArrangement } from "./NexWindowFrame";
import { ExecutionWorkbench } from "./ExecutionWorkbench";
import { NexReadout } from "./NexReadout";
import { NexOperationCard, NexResponsePanel } from "./NexInstruments";

/** Modeless instruments live inside root: existing ModalSurface still isolates them. */
export function NexDesktop() {
  const nex = useNex();
  const [arrangement, setArrangement] = useState<WindowArrangement | null>(
    null,
  );
  const [switcher, setSwitcher] = useState(false),
    [query, setQuery] = useState("");
  const picker = useRef<HTMLDivElement>(null),
    toggle = useRef<HTMLButtonElement>(null),
    search = useRef<HTMLInputElement>(null);
  const visible = nex.windows.filter((w) => !w.minimized);
  // Stacking changes on focus; the dock and keyboard traversal keep a stable order.
  const order = useRef<string[]>([]);
  order.current = [
    ...order.current.filter((id) => nex.windows.some((w) => w.id === id)),
    ...nex.windows
      .filter((w) => !order.current.includes(w.id))
      .map((w) => w.id),
  ];
  const orderedWindows = order.current.map(
    (id) => nex.windows.find((w) => w.id === id)!,
  );
  const activeId = visible.at(-1)?.id;
  function closeSwitcher() {
    setSwitcher(false);
    toggle.current?.focus();
  }
  useEffect(() => {
    if (!switcher) return;
    search.current?.focus();
    const outside = (e: globalThis.PointerEvent) => {
      if (
        !picker.current?.contains(e.target as Node) &&
        !toggle.current?.contains(e.target as Node)
      )
        setSwitcher(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [switcher]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || document.querySelector('[aria-modal="true"]'))
        return;
      const visible = nex.windows.filter((w) => !w.minimized);
      const active = visible.at(-1);
      if (e.key === "Escape" && switcher) {
        e.preventDefault();
        closeSwitcher();
        return;
      }
      if (
        e.altKey &&
        ["PageDown", "PageUp"].includes(e.key) &&
        visible.length > 1
      ) {
        e.preventDefault();
        const ordered = order.current
          .map((id) => visible.find((w) => w.id === id))
          .filter((w): w is NexWindow => !!w);
        const i = ordered.findIndex((w) => w.id === active?.id);
        const next =
          ordered[
            (i + (e.key === "PageDown" ? 1 : ordered.length - 1)) %
              ordered.length
          ];
        nex.focusWindow(next.id);
        return;
      }
      if (
        e.key === "Escape" &&
        active &&
        document.activeElement?.closest(".nex-floating-window")
      ) {
        e.preventDefault();
        nex.closeWindow(active.id);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [nex.windows, switcher]);
  if (!nex.windows.length) return null;
  return (
    <div className="nex-desktop" aria-label="Janelas do N.E.X">
      {orderedWindows.map((w) => (
        <NexWindowFrame
          key={w.id}
          item={w}
          index={nex.windows.findIndex((item) => item.id === w.id)}
          arrangement={arrangement}
        >
          <WindowBody item={w} />
        </NexWindowFrame>
      ))}
      <nav className="nex-window-dock" aria-label="Janelas abertas">
        <button
          ref={toggle}
          className="nex-dock-tool"
          aria-label="Seletor de janelas"
          aria-expanded={switcher}
          aria-controls="nex-window-switcher"
          onClick={() => setSwitcher((v) => !v)}
          title="Janelas abertas · Alt+PageUp/PageDown para alternar"
        >
          <PanelsTopLeft size={17} />
          <span>{nex.windows.length}</span>
        </button>
        <button
          className="nex-dock-tool nex-arrange"
          aria-label="Organizar janelas"
          disabled={!visible.length}
          onClick={() => {
            const bounds = arrangeWindows(
              visible.length,
              window.innerWidth,
              window.innerHeight,
            );
            setArrangement({
              sequence: Date.now(),
              bounds: Object.fromEntries(
                visible.map((w, i) => [w.id, bounds[i]]),
              ),
            });
          }}
          title="Organizar as janelas visíveis"
        >
          <LayoutGrid size={17} />
        </button>
        <button
          className="nex-dock-tool"
          aria-label={visible.length ? "Recolher janelas" : "Restaurar janelas"}
          onClick={() => nex.showWindows(!visible.length)}
          title="Preservar formulários e aprovações"
        >
          {visible.length ? (
            <PanelBottomClose size={17} />
          ) : (
            <PanelBottomOpen size={17} />
          )}
        </button>
        {orderedWindows.map((w) => (
          <button
            key={w.id}
            id={`nex-restore-${w.id}`}
            aria-label={`Restaurar ${w.title}`}
            aria-pressed={w.id === activeId}
            data-minimized={w.minimized}
            onClick={() => nex.focusWindow(w.id)}
          >
            {w.title}
          </button>
        ))}
      </nav>
      {switcher && (
        <div
          id="nex-window-switcher"
          ref={picker}
          className="nex-window-switcher"
          role="region"
          aria-label="Alternar janelas"
        >
          <header>
            <strong>Seu espaço de trabalho</strong>
            <button
              className="icon-button"
              aria-label="Fechar seletor de janelas"
              onClick={closeSwitcher}
            >
              <X size={16} />
            </button>
          </header>
          <label>
            Filtrar janelas
            <input
              ref={search}
              type="search"
              value={query}
              maxLength={100}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Título da janela"
            />
          </label>
          <div>
            {orderedWindows
              .filter((w) =>
                w.title
                  .toLocaleLowerCase("pt-BR")
                  .includes(query.toLocaleLowerCase("pt-BR")),
              )
              .map((w) => (
                <button
                  key={w.id}
                  aria-label={`Alternar para ${w.title}`}
                  onClick={() => {
                    setSwitcher(false);
                    nex.focusWindow(w.id);
                  }}
                >
                  <PanelsTopLeft size={16} />
                  <span>
                    <strong>{w.title}</strong>
                    <small>
                      {w.minimized
                        ? "Recolhida"
                        : w.id === activeId
                          ? "Em primeiro plano"
                          : "Aberta"}
                    </small>
                  </span>
                </button>
              ))}
          </div>
          {!nex.windows.some((w) =>
            w.title
              .toLocaleLowerCase("pt-BR")
              .includes(query.toLocaleLowerCase("pt-BR")),
          ) && <p>Nenhuma janela com esse título.</p>}
          <p>
            Alt + PageUp / PageDown · alternar
            <br />
            Alt + M na janela · recolher
          </p>
        </div>
      )}
      {nex.error && (
        <p role="alert" className="nex-window-error">
          {nex.error}
          <button
            className="icon-button"
            aria-label="Dispensar erro N.E.X"
            onClick={() => nex.setError("")}
          >
            <X size={16} />
          </button>
        </p>
      )}
    </div>
  );
}
function WindowBody({ item }: { item: NexWindow }) {
  const nex = useNex(),
    body = item.body;
  if (body.kind === "plan")
    return (
      <ExecutionWorkbench
        key={`${body.minutes}:${body.projectId ?? ""}`}
        initialMinutes={body.minutes}
        initialProject={body.projectId}
      />
    );
  if (body.kind === "data")
    return (
      <>
        <p className="muted">
          Dados carregados · consulta parcial. Abra novamente para atualizar.
        </p>
        <NexReadout data={body.data} />
      </>
    );
  if (body.kind === "help")
    return (
      <div className="nex-command-help">
        <h2>O essencial, sem IA.</h2>
        <p>
          Escolha um comando. Criar e concluir abre uma aprovação; consultar não
          altera os registros.
        </p>
        {localExamples.map((t) => (
          <button
            className="secondary-button"
            key={t}
            disabled={nex.busy}
            onClick={() => void nex.send(t)}
          >
            {t}
          </button>
        ))}
        <p>
          Para perguntas livres, ative Usar IA na conversa. Voz ainda usa a cota
          de transcrição da Groq. Não há escuta em segundo plano.
        </p>
      </div>
    );
  if (body.kind === "panel")
    return (
      <NexResponsePanel
        panel={body.panel}
        onConnect={() => {
          nex.setSettingsRequested(true);
          navigate("/nex");
        }}
      />
    );
  if (body.kind === "google")
    return <GoogleFile service={body.service} resource={body.resource} />;
  if (body.kind === "operation")
    return (
      <NexOperationCard operation={body.operation} id={body.operationId} />
    );
  if (body.kind === "proposal") {
    const p = nex.proposals[body.proposalId];
    return p ? (
      <section className="nex-proposal">
        <span className="eyebrow">
          {p.kind === "mission" ? "Criar missão" : "Capturar na entrada"}
        </span>
        <h2>{p.title}</h2>
        <p>
          {p.applied
            ? "Salvo no NexOS."
            : "Cria um registro editável no app. Nada foi salvo ainda."}
        </p>
        {p.applied ? (
          <button
            className="primary-button"
            onClick={() => {
              navigate(entityPath("mission", p.missionId!));
              emitUI("inspect");
            }}
          >
            Abrir registro
          </button>
        ) : (
          <button
            className="primary-button"
            disabled={nex.busy}
            onClick={() => void nex.confirm(p)}
          >
            Confirmar criação
          </button>
        )}
      </section>
    ) : (
      <p>Esta proposta não está mais disponível.</p>
    );
  }
  return <NexActionForm area={body.area as NexArea} />;
}
function GoogleFile({
  service,
  resource,
}: {
  service: string;
  resource: string;
}) {
  const [data, setData] = useState<unknown>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    nexRequest("google/read", { service, id: resource }, "POST", c.signal)
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [service, resource]);
  return error ? (
    <p role="alert">{error}</p>
  ) : data ? (
    <NexReadout data={data} />
  ) : (
    <p role="status">Consultando arquivo autorizado…</p>
  );
}

const createKinds: Partial<Record<NexArea, NexOperation["kind"][]>> = {
  calendario: ["calendar.create", "google.calendar.create"],
  projetos: ["project.create"],
  estudos: ["study.create"],
  rotinas: ["routine.create"],
  hoje: ["checkin.save"],
  revisao: ["review.save"],
  financas: ["finance.create"],
  biblioteca: [
    "google.docs.create",
    "google.sheets.create",
    "google.slides.create",
  ],
  inbox: ["google.task.create"],
};
export function NexActionForm({ area }: { area: NexArea }) {
  const nex = useNex(),
    workspace = useNexus(),
    options = createKinds[area] ?? ["project.create"];
  const [kind, setKind] = useState<NexOperation["kind"]>(options[0]),
    [values, setValues] = useState<Record<string, string>>({}),
    [error, setError] = useState("");
  const [prepared, setPrepared] = useState<{
    operation: NexOperation;
    id: string;
  } | null>(null);
  const field = (
    name: string,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label className="nex-field" key={name}>
      {label}
      <input
        type={type}
        step={name === "amount" ? "0.01" : undefined}
        min={name === "amount" ? "0.01" : undefined}
        maxLength={name === "note" ? 1000 : 200}
        required={required}
        value={values[name] ?? ""}
        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
      />
    </label>
  );
  if (prepared)
    return <NexOperationCard operation={prepared.operation} id={prepared.id} />;
  return (
    <form
      className="nex-action-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        const payload: Record<string, string | number | string[]> = {
          ...values,
        };
        if (kind === "study.create") payload.weekday = Number(values.weekday);
        if (kind === "routine.create") {
          payload.steps = (values.steps ?? "").split("\n").filter(Boolean);
          payload.period = "anytime";
        }
        if (kind === "checkin.save") {
          payload.energy = Number(values.energy);
          payload.focus = Number(values.focus);
        }
        if (kind === "finance.create") {
          payload.amount = Number(values.amount);
          payload.kind = "expense";
          payload.status = "planned";
        }
        if (kind.endsWith("calendar.create")) {
          payload.starts_at = values.starts_at + ":00-03:00";
          payload.ends_at = values.ends_at + ":00-03:00";
        }
        const parsed = operation({ kind, payload });
        if (!parsed) {
          setError("Confira os campos, datas e intervalos. Nada foi salvo.");
          return;
        }
        setPrepared({ operation: parsed, id: crypto.randomUUID() });
      }}
    >
      <p>Preencha, revise a prévia e confirme. Nenhuma chamada de IA.</p>
      <label className="nex-field">
        Destino
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as NexOperation["kind"]);
            setValues({});
          }}
        >
          {options.map((k) => (
            <option key={k} value={k}>
              {k.startsWith("google.") ? "Google · " : "NexOS · "}
              {operationKinds[k]}
            </option>
          ))}
        </select>
      </label>
      {!["checkin.save", "review.save"].includes(kind) &&
        field(
          kind === "project.create" || kind === "routine.create"
            ? "name"
            : kind === "study.create"
              ? "subject"
              : "title",
          kind === "study.create" ? "Disciplina" : "Título",
        )}
      {kind.endsWith("calendar.create") && (
        <>
          {field("starts_at", "Início · São Paulo", "datetime-local")}
          {field("ends_at", "Fim · São Paulo", "datetime-local")}
        </>
      )}
      {kind === "study.create" && (
        <>
          {field("weekday", "Dia da semana · 0 domingo a 6 sábado", "number")}
          {field("start_time", "Início", "time")}
          {field("end_time", "Fim", "time")}
        </>
      )}
      {kind === "routine.create" && (
        <label className="nex-field">
          Etapas · uma por linha
          <textarea
            required
            maxLength={1280}
            value={values.steps ?? ""}
            onChange={(e) =>
              setValues((v) => ({ ...v, steps: e.target.value }))
            }
          />
        </label>
      )}
      {kind === "checkin.save" && (
        <>
          {field("energy", "Energia · 1 a 10", "number")}
          {field("focus", "Foco · 1 a 10", "number")}
        </>
      )}
      {kind === "finance.create" && (
        <>
          {field("amount", "Despesa planejada · R$", "number")}
          {field("entry_date", "Data", "date")}
        </>
      )}
      {field(
        "note",
        kind === "review.save" ? "Revisão" : "Nota",
        "text",
        kind === "review.save",
      )}
      {error && <p role="alert">{error}</p>}
      {workspace.error && <p role="alert">{workspace.error}</p>}
      <button className="primary-button" disabled={nex.busy}>
        Preparar aprovação
      </button>
    </form>
  );
}
