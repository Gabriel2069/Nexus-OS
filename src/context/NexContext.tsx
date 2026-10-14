import { emitUI, UI_EVENTS } from "../lib/ui-events";
import type { NexOperation, NexPanel } from "../lib/nex-tools";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useNexus } from "./NexusContext";
import {
  parseLocalIntent,
  localReadout,
  dayReadout,
  nextReadout,
  localTime,
  searchReadout,
  overdueReadout,
} from "../lib/nex-local";
import {
  addNexWindow,
  type NexWindow,
  type NexWindowBody,
} from "../lib/nex-windows";
import { nexAreas, operationKinds } from "../lib/nex-tools";
import { navigate } from "../lib/router";
import {
  nexRequest,
  type NexModule,
  type Reply,
  type Proposal,
  type Memory,
  type NexStatus,
} from "../lib/nex-api";
type Message = {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  proposal?: Proposal;
  operation?: NexOperation;
  operationId?: string;
  panels?: NexPanel[];
};
function useOwner() {
  const workspace = useNexus();
  const { refresh } = workspace;
  const [useAI, setUseAI] = useState(false);
  const surfaceVersion = useRef(0);
  useEffect(() => {
    const events = Object.entries(UI_EVENTS)
      .filter(([key]) => key !== "nexWindow")
      .map(([, value]) => value);
    const changed = () => {
      surfaceVersion.current++;
    };
    events.forEach((event) => window.addEventListener(event, changed));
    return () =>
      events.forEach((event) => window.removeEventListener(event, changed));
  }, []);
  const [settingsRequested, setSettingsRequested] = useState(false);
  const [windows, setWindows] = useState<NexWindow[]>([]);
  const windowsRef = useRef<NexWindow[]>([]);
  const [proposals, setProposals] = useState<Record<string, Proposal>>({});
  const [operationStates, setOperationStates] = useState<
    Record<
      string,
      {
        preview?: {
          operation: NexOperation;
          before: unknown;
          label: string;
          warning: string;
        };
        receipt?: {
          applied: boolean;
          id: string;
          kind: string;
          area: keyof typeof nexAreas;
          href?: string;
          imported?: number;
          preserved?: number;
        };
      }
    >
  >({});
  function updateWindows(next: NexWindow[]) {
    windowsRef.current = next;
    setWindows(next);
  }
  function openWindow(
    key: string,
    title: string,
    body: NexWindowBody,
    reveal = true,
  ) {
    const old = windowsRef.current;
    const next = addNexWindow(old, {
      id: crypto.randomUUID(),
      key,
      title,
      body,
      minimized: false,
    });
    if (next === old) {
      setError(
        "Seis janelas abertas. Feche uma antes de abrir outra; aprovações e rascunhos foram preservados.",
      );
      return;
    }
    updateWindows(next);
    if (reveal) emitUI("nexWindow");
  }
  function closeWindow(id: string) {
    updateWindows(windowsRef.current.filter((w) => w.id !== id));
  }
  function focusWindow(id: string) {
    const w = windowsRef.current.find((w) => w.id === id);
    if (w)
      updateWindows([
        ...windowsRef.current.filter((w) => w.id !== id),
        { ...w, minimized: false },
      ]);
  }
  function minimizeWindow(id: string) {
    updateWindows(
      windowsRef.current.map((w) =>
        w.id === id ? { ...w, minimized: true } : w,
      ),
    );
  }
  function showWindows(visible: boolean) {
    updateWindows(
      windowsRef.current.map((w) => ({ ...w, minimized: !visible })),
    );
  }
  function openReply(
    answer: Reply,
    proposalId?: string,
    operationId?: string,
    reveal = true,
  ) {
    for (const p of answer.panels ?? [])
      openWindow(
        `panel:${p.google ?? "local"}:${p.area}`,
        `${p.google ? "Google · " : ""}${nexAreas[p.area].label}`,
        { kind: "panel", panel: p },
        reveal,
      );
    if (answer.operation && operationId)
      openWindow(
        `operation:${operationId}`,
        "Aprovação · " + operationKinds[answer.operation.kind],
        { kind: "operation", operation: answer.operation, operationId },
        reveal,
      );
    if (proposalId)
      openWindow(
        `proposal:${proposalId}`,
        "Aprovação · criação",
        {
          kind: "proposal",
          proposalId,
        },
        reveal,
      );
  }
  async function openArea(area: keyof typeof nexAreas) {
    if (workspace.loading || workspace.error) {
      setError(workspace.error ?? "Aguarde os dados do NexOS.");
      return;
    }
    const data = localReadout(area, workspace.workspace);
    if (data)
      openWindow(`local:${area}`, nexAreas[area].label, { kind: "data", data });
    else
      openWindow(`panel:local:${area}`, nexAreas[area].label, {
        kind: "panel",
        panel: { area },
      });
  }
  const [messages, setMessages] = useState<Message[]>([]);
  const [module, setModule] = useState<NexModule>("geral");
  const [share, setShare] = useState(false);
  const [googleContext, setGoogleContext] = useState<{
    service: string;
    id: string;
    range: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("Em espera");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<NexStatus | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  useEffect(
    () => () => {
      controller.current?.abort();
      controller.current = null;
      locked.current = false;
    },
    [],
  );
  async function run<T>(
    job: (signal: AbortSignal) => Promise<T>,
    phaseName = "Consultando",
  ): Promise<T | undefined> {
    if (locked.current) return;
    locked.current = true;
    const control = new AbortController();
    controller.current = control;
    setBusy(true);
    setPhase(phaseName);
    setError("");
    try {
      return await job(control.signal);
    } catch (e) {
      if (!control.signal.aborted)
        setError(e instanceof Error ? e.message : "Pedido não concluído.");
    } finally {
      if (controller.current === control) {
        setBusy(false);
        setPhase("Em espera");
        locked.current = false;
        controller.current = null;
      }
    }
  }
  async function load() {
    await run(async (signal) => {
      const data = await nexRequest<NexStatus>(
        "status",
        undefined,
        "GET",
        signal,
      );
      setStatus(data);
      setMemories(
        await nexRequest<Memory[]>("memories", undefined, "GET", signal),
      );
    });
  }
  useEffect(() => {
    void load();
  }, []);
  async function send(input: string) {
    if (!input.trim() || locked.current) return;
    setError("");
    const intent = parseLocalIntent(input);
    function appendLocal(answer: Reply) {
      const proposal = answer.proposal
        ? { ...answer.proposal, id: crypto.randomUUID() }
        : undefined;
      const operationId = answer.operation ? crypto.randomUUID() : undefined;
      if (proposal)
        setProposals((old) => ({ ...old, [proposal.id]: proposal }));
      setMessages((old) =>
        [
          ...old,
          { role: "user" as const, content: input, provider: "local" },
          {
            role: "assistant" as const,
            content: answer.reply,
            provider: "local",
            proposal,
            operation: answer.operation ?? undefined,
            operationId,
          },
        ].slice(-40),
      );
      openReply(answer, proposal?.id, operationId);
      return answer;
    }
    const local = (reply: string, extra: Partial<Reply> = {}) =>
      appendLocal({
        reply,
        provider: "local",
        model: "deterministic",
        proposal: null,
        contextShared: false,
        ...extra,
      });
    if (intent) {
      if (intent.kind === "navigate") {
        navigate(nexAreas[intent.area].path);
        return local(`Abrindo ${nexAreas[intent.area].label}.`);
      }
      if (intent.kind === "stop") return local("Conversa pausada.");
      if (intent.kind === "windows") {
        showWindows(intent.visible);
        return local(
          intent.visible
            ? "Restaurei as janelas desta sessão."
            : "Recolhi as janelas. Formulários e aprovações continuam preservados nesta sessão.",
        );
      }
      if (intent.kind === "greeting")
        return local(
          `Estou aqui${workspace.workspace.profile?.display_name ? ", " + workspace.workspace.profile.display_name : ""}. Posso consultar sua agenda, abrir dados e preparar ações sem usar IA. Diga “comandos” para ver exemplos.`,
        );
      if (intent.kind === "time") return local(localTime());
      if (intent.kind === "help") {
        openWindow("help", "Comandos sem IA", { kind: "help" });
        return local(
          "Abri os comandos locais. Consultas não usam inferência; escritas continuam exigindo confirmação.",
        );
      }
      if (intent.kind === "google") {
        openWindow(`panel:${intent.service}`, `Google · ${intent.service}`, {
          kind: "panel",
          panel: {
            area:
              intent.service === "calendar"
                ? "calendario"
                : intent.service === "tasks"
                  ? "inbox"
                  : "biblioteca",
            google: intent.service,
          },
        });
        return local(
          "Abri a consulta Google. Usa a API autorizada, sem inferência nem envio dos dados ao modelo.",
        );
      }
      if (intent.kind === "proposal")
        return local(
          "Confira a criação na janela de aprovação. Nenhum registro foi salvo ainda.",
          { proposal: { kind: intent.target, title: intent.title } },
        );
      if (intent.kind === "operation")
        return local(
          "Preparei a proposta. Revise os campos e confirme na janela; ainda não executei a ação.",
          { operation: intent.operation },
        );
      if (workspace.loading || workspace.error) {
        setError(workspace.error ?? "Aguarde os dados do NexOS.");
        return;
      }
      if (intent.kind === "complete") {
        const matches = workspace.workspace.missions.filter(
          (m) =>
            m.title.localeCompare(intent.title, "pt-BR", {
              sensitivity: "base",
            }) === 0 && !["Feita", "Cancelada"].includes(m.status),
        );
        if (matches.length !== 1) {
          openWindow("mission-choice", "Escolha a missão", {
            kind: "data",
            data: {
              module: "missoes",
              records: matches.length
                ? matches
                : workspace.workspace.missions
                    .filter((m) => !["Feita", "Cancelada"].includes(m.status))
                    .slice(0, 20),
            },
          });
          return local(
            "Não há uma única missão com esse título. Abra o item certo na janela; nenhuma conclusão foi executada.",
          );
        }
        return local(
          "Preparei a conclusão. Ela usa as recompensas existentes e precisa de revisão e confirmação.",
          {
            operation: {
              kind: "mission.complete",
              payload: { id: matches[0].id },
            },
          },
        );
      }
      if (intent.kind === "read") {
        await openArea(intent.area);
        return local(
          `Abri ${nexAreas[intent.area].label}. A consulta é parcial, sem IA.`,
        );
      }
      if (intent.kind === "search" || intent.kind === "overdue") {
        const result =
          intent.kind === "search"
            ? searchReadout(workspace.workspace, intent.query, intent.area)
            : overdueReadout(workspace.workspace);
        openWindow("local-search", result.title, {
          kind: "data",
          data: result.data,
        });
        return local(result.reply);
      }
      if (intent.kind === "agenda") {
        const result = dayReadout(workspace.workspace, intent.offset);
        openWindow(`agenda:${intent.offset}`, result.title, {
          kind: "data",
          data: result.data,
        });
        return local(result.reply);
      }
      if (intent.kind === "next") {
        const result = nextReadout(workspace.workspace);
        openWindow("next", "Próximo passo", {
          kind: "data",
          data: result.data,
        });
        return local(result.reply);
      }
    }
    if (!useAI) {
      openWindow("help", "Comandos sem IA", { kind: "help" });
      return local(
        "Não reconheci um comando local seguro. Não consumi IA. Veja os exemplos ou ative “Usar IA” para uma pergunta livre.",
      );
    }
    const requestSurface = surfaceVersion.current;
    const result = await run(async (signal) => {
      // Google context is authorized for this message only, including failed attempts.
      const sharedGoogle = googleContext;
      setGoogleContext(null);
      const answer = await nexRequest<Reply>(
        "chat",
        {
          message: input,
          module,
          shareContext: share,
          googleContext: sharedGoogle,
          history: messages
            .filter((m) => m.provider !== "local")
            .slice(-4)
            .map((m) => ({ role: m.role, content: m.content })),
        },
        "POST",
        signal,
      );
      if (signal.aborted) return;
      const proposal = answer.proposal
        ? { ...answer.proposal, id: crypto.randomUUID() }
        : undefined;
      const operationId = answer.operation ? crypto.randomUUID() : undefined;
      if (proposal)
        setProposals((old) => ({ ...old, [proposal.id]: proposal }));
      openReply(
        answer,
        proposal?.id,
        operationId,
        surfaceVersion.current === requestSurface,
      );
      setMessages((old) =>
        [
          ...old,
          { role: "user" as const, content: input },
          {
            role: "assistant" as const,
            content: answer.reply,
            provider: answer.provider,
            operation: answer.operation ?? undefined,
            operationId,
            panels: answer.panels,
            proposal,
          },
        ].slice(-40),
      );
      return answer;
    }, "Organizando resposta");
    return result;
  }
  async function confirm(proposal: Proposal) {
    if (proposals[proposal.id]?.applied) return;
    await run(async (signal) => {
      const result = await nexRequest<{ id: string; applied: boolean }>(
        "actions",
        { ...proposal, confirmed: true },
        "POST",
        signal,
      );
      if (!result.applied) throw Error("Ação não confirmada.");
      setMessages((old) =>
        old.map((m) =>
          m.proposal?.id === proposal.id
            ? {
                ...m,
                proposal: { ...proposal, applied: true, missionId: result.id },
              }
            : m,
        ),
      );
      setProposals((old) => ({
        ...old,
        [proposal.id]: { ...proposal, applied: true, missionId: result.id },
      }));
      await refresh();
    }, "Executando ação confirmada");
  }
  async function remember(content: string) {
    return run(async (signal) => {
      await nexRequest("memories", { module, content }, "POST", signal);
      setMemories(
        await nexRequest<Memory[]>("memories", undefined, "GET", signal),
      );
      return true;
    });
  }
  async function forget(id: string) {
    await run(async (signal) => {
      await nexRequest("memories", { id }, "DELETE", signal);
      setMemories((old) => old.filter((m) => m.id !== id));
    });
  }
  async function connect(service: string) {
    await run(async (signal) => {
      const result = await nexRequest<{ url: string }>(
        "google/start",
        { service },
        "POST",
        signal,
      );
      const url = new URL(result.url);
      if (url.origin !== "https://accounts.google.com")
        throw Error("Destino Google inválido.");
      window.location.assign(url.toString());
    });
  }
  async function disconnect() {
    await run(async (signal) => {
      const result = await nexRequest<{ revoked: boolean }>(
        "google/disconnect",
        {},
        "POST",
        signal,
      );
      setStatus((old) => (old ? { ...old, google: null } : old));
      setGoogleContext(null);
      updateWindows(
        windowsRef.current.filter(
          (w) =>
            w.body.kind !== "google" &&
            !(w.body.kind === "panel" && w.body.panel.google) &&
            !(
              w.body.kind === "data" &&
              !!(w.body.data as { service?: string })?.service
            ),
        ),
      );
      if (!result.revoked)
        setError(
          "Conexão local removida. Confira e revogue também em myaccount.google.com/permissions.",
        );
    });
  }
  return {
    messages,
    useAI,
    setUseAI,
    windows,
    proposals,
    operationStates,
    settingsRequested,
    setSettingsRequested,
    setOperationState: (id: string, value: (typeof operationStates)[string]) =>
      setOperationStates((old) => ({ ...old, [id]: value })),
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    showWindows,
    openReply,
    openArea,
    prepareProposal: (kind: "mission" | "inbox", title: string) => {
      if (!title.trim() || title.length > 200) {
        setError("Use um título de até 200 caracteres para capturar no NexOS.");
        return;
      }
      const p: Proposal = {
        id: crypto.randomUUID(),
        kind,
        title: title.trim(),
      };
      setProposals((old) => ({ ...old, [p.id]: p }));
      openWindow(`proposal:${p.id}`, "Aprovação · criação", {
        kind: "proposal",
        proposalId: p.id,
      });
    },
    prepareOperation: (operation: NexOperation) => {
      const id = crypto.randomUUID();
      openWindow(
        `operation:${id}`,
        "Aprovação · " + operationKinds[operation.kind],
        { kind: "operation", operation, operationId: id },
      );
    },
    module,
    setModule,
    share,
    setShare,
    googleContext,
    setGoogleContext,
    refreshWorkspace: refresh,
    busy,
    phase,
    error,
    setError,
    status,
    memories,
    load,
    send,
    confirm,
    remember,
    forget,
    connect,
    disconnect,
    run,
    cancel: () => controller.current?.abort(),
    clear: () => {
      if (!locked.current) setMessages([]);
    },
  };
}
const Context = createContext<ReturnType<typeof useOwner> | null>(null);
function NexOwner({ children }: PropsWithChildren) {
  const value = useOwner();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function NexProvider({ children }: PropsWithChildren) {
  const { userId } = useNexus();
  return <NexOwner key={userId ?? "demo"}>{children}</NexOwner>;
}
export function useNex() {
  const value = useContext(Context);
  if (!value) throw Error("NexProvider ausente");
  return value;
}
