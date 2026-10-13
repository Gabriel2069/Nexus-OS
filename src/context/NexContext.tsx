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
};
function useOwner() {
  const { refresh } = useNexus();
  const [messages, setMessages] = useState<Message[]>([]);
  const [module, setModule] = useState<NexModule>("geral");
  const [share, setShare] = useState(false);
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
  async function send(input: string) {
    if (!input.trim() || locked.current) return false;
    const result = await run(async (signal) => {
      const answer = await nexRequest<Reply>(
        "chat",
        {
          message: input,
          module,
          shareContext: share,
          history: messages
            .slice(-4)
            .map((m) => ({ role: m.role, content: m.content })),
        },
        "POST",
        signal,
      );
      setMessages((old) =>
        [
          ...old,
          { role: "user" as const, content: input },
          {
            role: "assistant" as const,
            content: answer.reply,
            provider: answer.provider,
            proposal: answer.proposal
              ? { ...answer.proposal, id: crypto.randomUUID() }
              : undefined,
          },
        ].slice(-40),
      );
      return true;
    }, "Organizando resposta");
    return result === true;
  }
  async function confirm(proposal: Proposal) {
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
      if (!result.revoked)
        setError(
          "Conexão local removida. Confira e revogue também em myaccount.google.com/permissions.",
        );
    });
  }
  return {
    messages,
    module,
    setModule,
    share,
    setShare,
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
