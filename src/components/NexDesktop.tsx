import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type CSSProperties,
} from "react";
import {
  Grip,
  Minus,
  Maximize2,
  Minimize2,
  X,
  PanelsTopLeft,
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
import { clampWindow, type NexWindow } from "../lib/nex-windows";
import { navigate } from "../lib/router";
import { entityPath } from "../lib/navigation-state";
import { emitUI } from "../lib/ui-events";
import { NexReadout } from "./NexReadout";
import { NexOperationCard, NexResponsePanel } from "./NexInstruments";

/** Modeless instruments live inside root: existing ModalSurface still isolates them. */
export function NexDesktop() {
  const nex = useNex();
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || document.querySelector('[aria-modal="true"]'))
        return;
      const visible = nex.windows.filter((w) => !w.minimized);
      const active = visible.at(-1);
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
  }, [nex.windows]);
  if (!nex.windows.length) return null;
  return (
    <div className="nex-desktop" aria-label="Janelas do N.E.X">
      {nex.windows.map((w, i) => (
        <FloatingWindow key={w.id} item={w} index={i} />
      ))}
      <nav className="nex-window-dock" aria-label="Janelas abertas">
        <PanelsTopLeft size={16} aria-hidden="true" />
        {nex.windows.map((w) => (
          <button
            key={w.id}
            id={`nex-restore-${w.id}`}
            aria-label={`Restaurar ${w.title}`}
            aria-pressed={!w.minimized}
            onClick={() => nex.focusWindow(w.id)}
          >
            {w.title}
          </button>
        ))}
      </nav>
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
function FloatingWindow({ item, index }: { item: NexWindow; index: number }) {
  const nex = useNex(),
    ref = useRef<HTMLElement>(null),
    move = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState(() => ({
    x:
      index % 3 === 0
        ? 88
        : index % 3 === 1
          ? window.innerWidth - 468
          : window.innerWidth / 2 - 220,
    y: 110 + Math.floor(index / 3) * 58,
  }));
  const [maximized, setMaximized] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const latestPosition = useRef(position);
  latestPosition.current = position;
  const keepVisible = (x = position.x, y = position.y) => {
    const r = ref.current?.getBoundingClientRect();
    if (r)
      setPosition(
        clampWindow(
          x,
          y,
          r.width,
          r.height,
          window.innerWidth,
          window.innerHeight,
        ),
      );
  };
  useEffect(() => {
    const r = ref.current;
    if (!r) return;
    keepVisible();
    const resize = () =>
      keepVisible(latestPosition.current.x, latestPosition.current.y);
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [maximized]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    return () => {
      // StrictMode reconnects effects without removing the window. Restoring
      // then would raise its opener underneath a pointer-down and lose clicks.
      queueMicrotask(() => {
        if (
          !node?.isConnected &&
          document.activeElement === document.body &&
          previous?.isConnected &&
          !document.getElementById("root")?.inert &&
          !previous.closest("[hidden]")
        )
          previous.focus({ preventScroll: true });
      });
    };
  }, []);
  const top = nex.windows.at(-1)?.id === item.id;
  useEffect(() => {
    if (
      top &&
      !item.minimized &&
      !document.getElementById("root")?.inert &&
      !ref.current?.contains(document.activeElement)
    )
      move.current?.focus({ preventScroll: true });
  }, [top, item.minimized]);
  function start(e: PointerEvent<HTMLButtonElement>) {
    if (maximized || window.innerWidth < 720) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      px: position.x,
      py: position.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  return (
    <section
      ref={ref}
      hidden={item.minimized}
      role="dialog"
      aria-modal="false"
      aria-label={item.title}
      className={`nex-floating-window ${maximized ? "is-maximized" : ""}`}
      style={
        {
          "--window-x": `${position.x}px`,
          "--window-y": `${position.y}px`,
          zIndex: 20 + index,
        } as CSSProperties
      }
      onPointerDownCapture={() => {
        if (nex.windows.at(-1)?.id !== item.id) nex.focusWindow(item.id);
      }}
      onFocusCapture={() => {
        if (nex.windows.at(-1)?.id !== item.id) nex.focusWindow(item.id);
      }}
    >
      <header className="nex-window-titlebar">
        <button
          ref={move}
          className="nex-window-grip"
          aria-label={`Mover janela ${item.title}`}
          title="Arraste ou use as setas para mover"
          onPointerDown={start}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d) keepVisible(d.px + e.clientX - d.x, d.py + e.clientY - d.y);
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onKeyDown={(e) => {
            if (
              !maximized &&
              ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                e.key,
              )
            ) {
              e.preventDefault();
              keepVisible(
                position.x +
                  (e.key === "ArrowRight"
                    ? 24
                    : e.key === "ArrowLeft"
                      ? -24
                      : 0),
                position.y +
                  (e.key === "ArrowDown" ? 24 : e.key === "ArrowUp" ? -24 : 0),
              );
            }
          }}
        >
          <Grip size={15} />
          <span>
            <small>
              N.E.X /{" "}
              {item.body.kind === "operation" || item.body.kind === "proposal"
                ? "Aprovação"
                : "Instrumento"}
            </small>
            <strong>{item.title}</strong>
          </span>
        </button>
        <button
          className="icon-button"
          aria-label={`Minimizar ${item.title}`}
          onClick={() => {
            nex.minimizeWindow(item.id);
            requestAnimationFrame(() =>
              document.getElementById(`nex-restore-${item.id}`)?.focus(),
            );
          }}
        >
          <Minus size={16} />
        </button>
        <button
          className="icon-button"
          aria-label={`${maximized ? "Restaurar tamanho de" : "Maximizar"} ${item.title}`}
          onClick={() => setMaximized((v) => !v)}
        >
          {maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
        <button
          className="icon-button"
          aria-label={`Fechar ${item.title}`}
          onClick={() => nex.closeWindow(item.id)}
        >
          <X size={17} />
        </button>
      </header>
      <div className="nex-window-content">
        <WindowBody item={item} />
      </div>
      <footer className="nex-window-status">
        <span>Consulta/execução sem inferência</span>
        <span>Esc · fechar</span>
      </footer>
    </section>
  );
}
function WindowBody({ item }: { item: NexWindow }) {
  const nex = useNex(),
    body = item.body;
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
