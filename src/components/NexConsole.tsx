import { useNexus } from "../context/NexusContext";
import { NexOrbitalCore } from "./NexOrbitalCore";
import { NexOperationCard } from "./NexInstruments";
import { nexAreas } from "../lib/nex-tools";
import { useEffect, useRef, useState } from "react";
import { useNexVoice } from "../lib/use-nex-voice";
import {
  ArrowUpRight,
  Settings2,
  Radio,
  RefreshCw,
  Layers3,
  Mic,
  Send,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { useNex } from "../context/NexContext";
import { nexModules, nexRequest } from "../lib/nex-api";
import { navigate } from "../lib/router";
import { entityPath } from "../lib/navigation-state";
import { localExamples } from "../lib/nex-local";
import { useOverlay } from "../lib/use-overlay";
import { ModalSurface } from "./ModalSurface";
import { SurfaceCard } from "./SurfaceCard";
import { emitUI } from "../lib/ui-events";
const labels = Object.fromEntries(
  Object.entries(nexAreas).map(([k, v]) => [k, v.label]),
);
export function NexConsole({ compact = false }: { compact?: boolean }) {
  const nex = useNex();
  const workspace = useNexus();
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) setTime(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const [input, setInput] = useState("");
  const [memory, setMemory] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [resource, setResource] = useState("");
  const [range, setRange] = useState("");
  const [service, setService] = useState("calendar");
  const [city, setCity] = useState("");
  const [history, setHistory] = useState<
    { id: string; kind: string; state: string }[]
  >([]);
  const importId = useRef(crypto.randomUUID());
  const coreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (nex.googleContext)
      nex.setGoogleContext({ service, id: resource, range });
  }, [service, resource, range]);
  const end = useRef<HTMLDivElement>(null);
  const settingsOverlay = useOverlay("nexSettings");
  const [inlineSettings, setInlineSettings] = useState(false);
  const settings = compact
    ? {
        open: inlineSettings,
        show: () => setInlineSettings(true),
        close: () => setInlineSettings(false),
      }
    : settingsOverlay;
  useEffect(() => {
    if (nex.settingsRequested) {
      settings.show();
      nex.setSettingsRequested(false);
    }
  }, [nex.settingsRequested]);
  const voice = useNexVoice({
    coreRef,
    send: nex.send,
    run: nex.run,
    cancel: nex.cancel,
    error: nex.setError,
    draft: (value) => setInput((old) => (old ? `${old}\n${value}` : value)),
  });
  const { listening, speaking } = voice;
  const record = voice.record;
  const speak = voice.speak;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [nex.messages.length]);
  async function submit() {
    const result = await nex.send(input);
    if (result) {
      setInput("");
      if (voice.autoSpeak) void voice.speak(result.reply);
    }
  }
  async function showContext() {
    const result = await nex.run((signal) =>
      nexRequest("context", { module: nex.module }, "POST", signal),
    );
    if (result) {
      nex.openWindow(
        `context:${nex.module}`,
        `Contexto · ${labels[nex.module]}`,
        { kind: "data", data: result },
      );
    }
  }
  async function read(service: string, id = resource) {
    const result = await nex.run((signal) =>
      nexRequest("google/read", { service, id, range }, "POST", signal),
    );
    if (result) {
      nex.openWindow(
        `google:${service}:${id}:${range}`,
        `Google · ${service}`,
        { kind: "data", data: result },
      );
    }
  }
  const state =
    voice.phase ||
    (listening
      ? "Escutando"
      : nex.busy
        ? nex.phase
        : speaking
          ? "Respondendo"
          : "Em espera");
  return (
    <div className={`nex-console ${compact ? "nex-console--compact" : ""}`}>
      <header className="nex-heading">
        <div className="nex-heading__title">
          <span className="eyebrow">NexOS Intelligence</span>
          <h1>N.E.X</h1>
        </div>
        <div className="nex-flight-clock">
          <time dateTime={time.toISOString()}>
            {new Intl.DateTimeFormat("pt-BR", {
              timeZone: "America/Sao_Paulo",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }).format(time)}
          </time>
          <span>São Paulo</span>
        </div>
        <div className="nex-heading__actions">
          <button
            className="icon-button"
            disabled={nex.busy}
            onClick={nex.load}
            aria-label="Verificar conexões"
            title="Verificar conexões"
          >
            <RefreshCw size={16} />
          </button>
          <button className="secondary-button" onClick={settings.show}>
            <Settings2 size={16} />
            Conexões e ajustes
          </button>
        </div>
      </header>
      {new URLSearchParams(window.location.search).get("google") ===
        "denied" && (
        <p className="nex-error" role="status">
          Autorização Google interrompida. Sua conexão anterior, se houver, será
          verificada abaixo.
        </p>
      )}
      <div className="nex-workspace">
        <aside className="nex-command-rail" aria-label="Seu contexto no NexOS">
          <section className="nex-live-block">
            <span className="eyebrow">Agora / seu espaço</span>
            {workspace.loading ? (
              <p role="status">Carregando…</p>
            ) : workspace.error ? (
              <p role="alert">{workspace.error}</p>
            ) : (
              <>
                <div className="nex-telemetry">
                  <div>
                    <strong>
                      {
                        workspace.workspace.missions.filter(
                          (m) => !["Feita", "Cancelada"].includes(m.status),
                        ).length
                      }
                    </strong>
                    <span>Missões abertas</span>
                  </div>
                  <div>
                    <strong>{workspace.workspace.projects.length}</strong>
                    <span>Projetos</span>
                  </div>
                </div>
                {workspace.workspace.missions
                  .filter(
                    (m) => !["Feita", "Cancelada", "Inbox"].includes(m.status),
                  )
                  .slice(0, 2)
                  .map((m) => (
                    <button
                      className="nex-live-item"
                      key={m.id}
                      onClick={() => {
                        navigate(entityPath("mission", m.id));
                        emitUI("inspect");
                      }}
                    >
                      <span>{m.title}</span>
                      <small>{m.priority}</small>
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
              </>
            )}
          </section>
          <section className="nex-live-block">
            <span className="eyebrow">Contexto da conversa</span>
            <label className="nex-field">
              Área
              <select
                value={nex.module}
                disabled={nex.busy || voice.active || listening}
                onChange={(e) =>
                  nex.setModule(e.target.value as typeof nex.module)
                }
              >
                {nexModules.map((m) => (
                  <option key={m} value={m}>
                    {labels[m]}
                  </option>
                ))}
              </select>
            </label>
            <label className="nex-consent">
              <input
                type="checkbox"
                checked={nex.share}
                disabled={nex.busy || voice.active || listening}
                onChange={(e) => nex.setShare(e.target.checked)}
              />
              Usar contexto do NexOS
            </label>
            <p className="muted">
              {nex.share
                ? "Consulta parcial do módulo e suas memórias."
                : "Somente a mensagem e a conversa recente vão à IA."}
            </p>
            <button
              className="text-button"
              disabled={nex.busy}
              onClick={showContext}
            >
              Ver dados disponíveis
            </button>
          </section>
          <section className="nex-live-block">
            <span className="eyebrow">Conexões</span>
            <div className="nex-connection-line">
              <i data-connected={!!nex.status?.google} />
              <span>Google</span>
              <small>
                {nex.status?.google ? "Autorizado" : "Não conectado"}
              </small>
            </div>
            <button className="text-button" onClick={settings.show}>
              Gerenciar conexões
              <ArrowUpRight size={14} />
            </button>
          </section>
        </aside>
        <section className="nex-core-card" aria-label="Núcleo N.E.X">
          <NexOrbitalCore
            state={
              listening
                ? "listening"
                : speaking
                  ? "speaking"
                  : nex.busy
                    ? nex.phase.includes("Executando")
                      ? "acting"
                      : "thinking"
                    : "idle"
            }
            coreRef={coreRef}
          />
          <div className="nex-core-identity">
            <span className="eyebrow">Inteligência pessoal</span>
            <h2>N.E.X</h2>
            <p role="status">{state}</p>
          </div>

          <div className="nex-state" role="status">
            {nex.status
              ? Object.entries(nex.status.providers)
                  .filter(([, v]) => v)
                  .map(([name]) => name)
                  .join(" · ") || "IA desconectada · verifique conexões"
              : "Conexão ainda não verificada"}
          </div>
          <div className="nex-voice-controls">
            <button
              className={voice.active ? "primary-button" : "secondary-button"}
              aria-pressed={voice.active}
              disabled={
                !voice.active &&
                (nex.busy || listening || !nex.status?.providers.groq)
              }
              onClick={() => void voice.toggle()}
            >
              {voice.active ? <Square size={18} /> : <Mic size={18} />}{" "}
              {voice.active ? "Pausar conversa" : "Conversar por voz"}
            </button>
          </div>
          <p className="nex-voice-caption">
            {voice.active
              ? "Escuta ativa · pausa ao sair desta tela"
              : "Transcrição Groq · resposta por voz do dispositivo."}
          </p>
          <button
            className="text-button"
            onClick={() =>
              nex.openWindow("help", "Comandos sem IA", { kind: "help" })
            }
          >
            <Layers3 size={15} /> Comandos e janelas
          </button>
        </section>

        <SurfaceCard
          className="nex-dialogue"
          title="Conversa"
          action={
            <button
              className="icon-button"
              disabled={nex.busy}
              aria-label="Limpar conversa"
              title="Limpar conversa"
              onClick={nex.clear}
            >
              <X size={16} />
            </button>
          }
        >
          <div
            className="nex-messages"
            role="log"
            aria-label="Conversa com N.E.X"
            aria-live="polite"
          >
            {!nex.messages.length && (
              <div className="nex-empty">
                <Radio size={22} />
                <h2>Estou aqui.</h2>
                <p>
                  Fale comigo ou escreva. Os comandos locais abrem janelas;
                  ações pedem confirmação. IA é opcional.
                </p>
                <div className="nex-starters">
                  {localExamples.slice(0, 3).map((t) => (
                    <button key={t} onClick={() => setInput(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {nex.messages.map((m, i) => (
              <article className={`nex-message nex-message--${m.role}`} key={i}>
                <span className="eyebrow">
                  {m.role === "user" ? "Você" : `N.E.X · ${m.provider}`}
                </span>
                <p>{m.content}</p>
                {m.role === "assistant" && (
                  <button
                    className="secondary-button"
                    aria-label="Ouvir resposta com voz local"
                    onClick={() => speak(m.content)}
                  >
                    <Volume2 size={16} />
                    Ouvir
                  </button>
                )}
                {m.operation && m.operationId && (
                  <button
                    className="secondary-button"
                    onClick={() =>
                      nex.openReply(
                        {
                          reply: m.content,
                          provider: m.provider ?? "local",
                          model: "",
                          contextShared: false,
                          proposal: null,
                          operation: m.operation,
                        },
                        undefined,
                        m.operationId,
                      )
                    }
                  >
                    Abrir aprovação
                  </button>
                )}
                {!!m.panels?.length && (
                  <button
                    className="secondary-button"
                    onClick={() =>
                      nex.openReply({
                        reply: m.content,
                        provider: m.provider ?? "local",
                        model: "",
                        contextShared: false,
                        proposal: null,
                        panels: m.panels,
                      })
                    }
                  >
                    <Layers3 size={16} />
                    Ver resultados · {m.panels.length}
                  </button>
                )}
                {m.proposal && (
                  <button
                    className="secondary-button"
                    onClick={() =>
                      nex.openWindow(
                        `proposal:${m.proposal!.id}`,
                        "Aprovação · criação",
                        { kind: "proposal", proposalId: m.proposal!.id },
                      )
                    }
                  >
                    Abrir aprovação da criação
                  </button>
                )}
              </article>
            ))}
            <div ref={end} />
          </div>
          {nex.error && !nex.windows.length && (
            <p className="nex-error" role="alert">
              {nex.error}
            </p>
          )}
          <label className="nex-consent nex-mode">
            <input
              type="checkbox"
              checked={nex.useAI}
              disabled={nex.busy || voice.active}
              onChange={(e) => nex.setUseAI(e.target.checked)}
            />
            Usar IA em perguntas livres
          </label>
          <p className="nex-mode-caption">
            {nex.useAI
              ? "Comandos reconhecidos continuam locais; perguntas livres usam sua cota."
              : "Modo local · sem inferência. Consultas Google usam apenas a API autorizada."}
          </p>
          <form
            className="nex-compose"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label
              htmlFor={compact ? "nex-overlay-input" : "nex-input"}
              className="eyebrow"
            >
              Sua mensagem
            </label>
            <textarea
              id={compact ? "nex-overlay-input" : "nex-input"}
              maxLength={1200}
              value={input}
              disabled={nex.busy || listening}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Fale com N.E.X…"
              rows={2}
            />
            <div className="nex-compose__actions">
              <button
                type="button"
                className="secondary-button"
                disabled={
                  !voice.active && (nex.busy || !nex.status?.providers.groq)
                }
                onClick={voice.active ? voice.stop : record}
                aria-label={
                  voice.active
                    ? "Pausar conversa por voz"
                    : listening
                      ? "Encerrar gravação"
                      : "Ditar mensagem"
                }
              >
                {listening ? <Square size={18} /> : <Mic size={18} />}{" "}
                {voice.active
                  ? "Pausar"
                  : listening
                    ? "Concluir ditado"
                    : "Ditar"}
              </button>
              {speaking && !voice.active && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    voice.stop();
                  }}
                >
                  Parar voz
                </button>
              )}
              <button
                type="button"
                className="icon-button"
                aria-label="Respostas faladas"
                aria-pressed={voice.autoSpeak}
                onClick={() => voice.setAutoSpeak(!voice.autoSpeak)}
              >
                <Volume2 size={17} />
              </button>
              <button
                className="primary-button"
                disabled={
                  nex.busy || voice.active || listening || !input.trim()
                }
              >
                <Send size={17} />
                Enviar
              </button>
            </div>
          </form>
        </SurfaceCard>
      </div>
      {settings.open && (
        <NexSettingsSurface inline={compact} onClose={settings.close}>
          <header>
            <div>
              <span className="eyebrow">N.E.X</span>
              <h2>Conexões e ajustes</h2>
            </div>
            <button
              className="icon-button"
              aria-label="Fechar ajustes N.E.X"
              onClick={settings.close}
            >
              <X size={18} />
            </button>
          </header>
          {nex.error && !nex.windows.length && (
            <p className="nex-error" role="alert">
              {nex.error}
            </p>
          )}
          <details className="nex-privacy">
            <summary>Contexto e permissões · {labels[nex.module]}</summary>
            <label className="nex-field">
              Contexto avançado
              <select
                value={nex.module}
                disabled={nex.busy || listening}
                onChange={(e) =>
                  nex.setModule(e.target.value as typeof nex.module)
                }
              >
                {nexModules.map((m) => (
                  <option value={m} key={m}>
                    {labels[m]}
                  </option>
                ))}
              </select>
            </label>
            <label className="nex-consent">
              <input
                type="checkbox"
                checked={nex.share}
                disabled={nex.busy || listening}
                onChange={(e) => nex.setShare(e.target.checked)}
              />
              Compartilhar dados deste módulo e memórias com a IA
            </label>
            <details className="nex-privacy">
              <summary>Privacidade e voz</summary>
              <p className="muted">
                No modo IA, sua mensagem e até quatro falas não locais são
                enviadas ao provedor. Contexto limitado aos registros
                consultados. Planos gratuitos podem usar mensagens para melhorar
                modelos. Áudio vai à Groq ao concluir o ditado ou detectar uma
                pausa no modo Conversar. A resposta falada usa somente voz
                local.
              </p>
            </details>
            <button
              className="secondary-button"
              disabled={nex.busy}
              onClick={showContext}
            >
              Inspecionar contexto
            </button>
          </details>
          <details className="nex-privacy">
            <summary>Registro de operações</summary>
            <button
              className="secondary-button"
              disabled={nex.busy}
              onClick={() =>
                void nex.run(async (signal) =>
                  setHistory(
                    await nexRequest(
                      "operations/history",
                      undefined,
                      "GET",
                      signal,
                    ),
                  ),
                )
              }
            >
              Consultar histórico
            </button>
            {history.map((h) => (
              <p key={h.id}>
                {h.kind} ·{" "}
                {h.state === "applied"
                  ? "Confirmada"
                  : "Pendente: confira o destino"}
              </p>
            ))}
          </details>
          <details className="nex-settings">
            <summary>Conexões, memória e instrumentos externos</summary>
            <div className="nex-support">
              <SurfaceCard
                title="Conexões Google"
                eyebrow={
                  nex.status?.google
                    ? "Conta autorizada"
                    : "Conectar é uma escolha sua"
                }
                tone="violet"
              >
                <p>
                  Autorize cada serviço quando precisar. Drive, Docs, Sheets e
                  Slides acessam apenas arquivos autorizados ao app; as ações de
                  escrita exigem prévia e confirmação.
                </p>
                <button
                  className="primary-button"
                  disabled={nex.busy}
                  onClick={() => nex.connect("workspace")}
                >
                  {nex.status?.google
                    ? "Ampliar conexão Google"
                    : "Conectar Google ao N.E.X"}
                </button>
                <p className="muted">
                  Uma autorização para agenda, tarefas e arquivos do app. O
                  Google apresenta as permissões antes de conceder acesso.
                </p>
                <label className="nex-field">
                  Serviço Google
                  <select
                    value={service}
                    disabled={nex.busy}
                    onChange={(e) => setService(e.target.value)}
                  >
                    {[
                      "calendar",
                      "tasks",
                      "drive",
                      "docs",
                      "sheets",
                      "slides",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {(
                          {
                            calendar: "Calendário",
                            tasks: "Tarefas",
                            drive: "Arquivos",
                            docs: "Documentos",
                            sheets: "Planilhas",
                            slides: "Apresentações",
                          } as Record<string, string>
                        )[s] ?? s}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="secondary-button"
                  disabled={nex.busy || !nex.status?.google}
                  onClick={() => {
                    settings.close();
                    void read(service);
                  }}
                >
                  Consultar serviço
                  <ArrowUpRight size={15} />
                </button>
                <details className="nex-privacy">
                  <summary>Autorizações incrementais</summary>
                  <div className="nex-services">
                    {["calendar", "tasks", "drive"].map((s) => (
                      <button
                        className="secondary-button"
                        key={s}
                        disabled={nex.busy}
                        onClick={() => nex.connect(s)}
                      >
                        Autorizar {s}
                      </button>
                    ))}
                  </div>
                </details>
                <label className="nex-field">
                  ID de arquivo para Docs, Sheets ou Slides
                  <input
                    value={resource}
                    maxLength={200}
                    onChange={(e) => setResource(e.target.value)}
                  />
                </label>
                <label className="nex-field">
                  Intervalo A1 para Sheets (opcional)
                  <input
                    value={range}
                    maxLength={100}
                    onChange={(e) => setRange(e.target.value)}
                  />
                </label>
                <label className="nex-consent">
                  <input
                    type="checkbox"
                    checked={!!nex.googleContext}
                    disabled={nex.busy}
                    onChange={(e) =>
                      nex.setGoogleContext(
                        e.target.checked
                          ? { service, id: resource, range }
                          : null,
                      )
                    }
                  />
                  Compartilhar esta consulta Google na próxima mensagem com IA
                </label>
                <div className="nex-compose__actions">
                  {["calendar_write", "tasks_write"].map((s) => (
                    <button
                      className="secondary-button"
                      key={s}
                      disabled={nex.busy}
                      onClick={() => nex.connect(s)}
                    >
                      Autorizar escrita ·{" "}
                      {s.startsWith("calendar") ? "Calendário" : "Tasks"}
                    </button>
                  ))}
                </div>
                <NexOperationCard
                  id={importId.current}
                  operation={{ kind: "google.calendar.import", payload: {} }}
                />
                {nex.status?.google && (
                  <button
                    className="secondary-button"
                    disabled={nex.busy}
                    onClick={() =>
                      disconnecting
                        ? void nex
                            .disconnect()
                            .then(() => setDisconnecting(false))
                        : setDisconnecting(true)
                    }
                  >
                    {disconnecting
                      ? "Confirmar desconexão e apagar tokens"
                      : "Desconectar Google"}
                  </button>
                )}
                {disconnecting && (
                  <button
                    className="secondary-button"
                    onClick={() => setDisconnecting(false)}
                  >
                    Manter conexão
                  </button>
                )}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Revisar permissões no Google
                </a>
              </SurfaceCard>
              <SurfaceCard
                title="Memória sob seu controle"
                eyebrow="Perfil e módulos"
                tone="cyan"
              >
                <p>
                  Salve apenas o que quer que N.E.X lembre. A conversa não é
                  gravada automaticamente. Memória atual: {labels[nex.module]}.
                </p>
                <label className="nex-field">
                  Nova memória
                  <textarea
                    maxLength={1200}
                    value={memory}
                    onChange={(e) => setMemory(e.target.value)}
                    rows={3}
                  />
                </label>
                <button
                  className="primary-button"
                  disabled={nex.busy || !memory.trim()}
                  onClick={async () => {
                    if (await nex.remember(memory)) setMemory("");
                  }}
                >
                  Salvar memória
                </button>
                <div className="nex-memory-list">
                  {nex.memories.map((m) => (
                    <article key={m.id}>
                      <span className="eyebrow">
                        {labels[m.module] ?? m.module} · {m.agent}
                      </span>
                      <p>{m.content}</p>
                      <button
                        className="secondary-button"
                        disabled={nex.busy}
                        onClick={() =>
                          deleting === m.id
                            ? void nex.forget(m.id).then(() => setDeleting(""))
                            : setDeleting(m.id)
                        }
                      >
                        {deleting === m.id ? "Confirmar exclusão" : "Excluir"}
                      </button>
                      {deleting === m.id && (
                        <button
                          className="secondary-button"
                          onClick={() => setDeleting("")}
                        >
                          Manter
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </SurfaceCard>
            </div>
          </details>
          <details className="nex-settings">
            <summary>Clima e diagnóstico de conexões</summary>
            <form
              className="nex-compose"
              onSubmit={(e) => {
                e.preventDefault();
                void nex.run(async (signal) => {
                  const data = await nexRequest(
                    "weather",
                    { city },
                    "POST",
                    signal,
                  );
                  nex.openWindow(`weather:${city}`, "Previsão · " + city, {
                    kind: "data",
                    data,
                  });
                });
              }}
            >
              <label className="nex-field">
                Cidade (sem GPS)
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  maxLength={80}
                />
              </label>
              <button
                className="secondary-button"
                disabled={nex.busy || !city.trim()}
              >
                Consultar clima
              </button>
              <p className="muted">
                Open-Meteo · consulta gratuita para uso pessoal, sem localização
                automática.
              </p>
            </form>
            <p className="muted">
              Somente presença e habilitação; nenhum valor de chave é exibido.
            </p>
            {nex.status?.configuration &&
              Object.entries(nex.status.configuration).map(
                ([provider, items]) => (
                  <article key={provider}>
                    <strong>{provider}</strong>
                    <ul>
                      {Object.entries(items).map(([k, v]) => (
                        <li key={k}>
                          {{
                            keyPresent: "Chave disponível no Worker",
                            freeEnabled: "Uso gratuito habilitado",
                            bindingPresent: "Workers AI disponível",
                            clientPresent: "Cliente Google disponível",
                            secretPresent: "Segredo Google disponível",
                            redirectPresent: "Callback Google configurado",
                            encryptionPresent:
                              "Criptografia de tokens configurada",
                          }[k] ?? k}
                          : {v ? "Sim" : "Não"}
                        </li>
                      ))}
                    </ul>
                  </article>
                ),
              )}
          </details>
        </NexSettingsSurface>
      )}
    </div>
  );
}
function NexSettingsSurface({
  inline,
  onClose,
  children,
}: {
  inline: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const body = <section className="nex-settings-panel">{children}</section>;
  return inline ? (
    body
  ) : (
    <ModalSurface
      className="overlay"
      label="Conexões e ajustes N.E.X"
      onClose={onClose}
    >
      {body}
    </ModalSurface>
  );
}

export function NexOverlay({ onClose }: { onClose: () => void }) {
  return (
    <ModalSurface
      className="overlay"
      label="N.E.X Intelligence"
      onClose={onClose}
    >
      <section className="nex-overlay">
        <button
          className="secondary-button nex-overlay__close"
          aria-label="Fechar N.E.X"
          onClick={onClose}
        >
          <X />
        </button>
        <NexConsole compact />
      </section>
    </ModalSurface>
  );
}
