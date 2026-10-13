import { useNexus } from "../context/NexusContext";
import { NexOrbitalCore } from "./NexOrbitalCore";
import {
  NexOperationCard,
  NexResponsePanel,
  safeGoogleLink,
} from "./NexInstruments";
import { nexAreas } from "../lib/nex-tools";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Brain,
  Check,
  Mic,
  Send,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { useNex } from "../context/NexContext";
import { nexModules, nexRequest, voiceWav } from "../lib/nex-api";
import { navigation } from "../data/navigation";
import { navigate } from "../lib/router";
import { entityPath } from "../lib/navigation-state";
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
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [inspected, setInspected] = useState<{
    title: string;
    data: unknown;
  } | null>(null);
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
  useEffect(() => {
    if (!listening || !stream.current || !window.AudioContext) return;
    const audio = new AudioContext(),
      analyser = audio.createAnalyser(),
      source = audio.createMediaStreamSource(stream.current);
    analyser.fftSize = 256;
    source.connect(analyser);
    const values = new Uint8Array(256);
    let frame = 0;
    const sample = () => {
      analyser.getByteTimeDomainData(values);
      let power = 0;
      for (const v of values) power += ((v - 128) / 128) ** 2;
      coreRef.current?.style.setProperty(
        "--nex-energy",
        String(Math.min(1, Math.sqrt(power / values.length) * 5)),
      );
      frame = requestAnimationFrame(sample);
    };
    sample();
    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void audio.close();
      coreRef.current?.style.removeProperty("--nex-energy");
    };
  }, [listening]);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const alive = useRef(true);
  const voicePending = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const inspect = useOverlay("nexInspect");
  useEffect(() => {
    alive.current = true;
    void nex.load();
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [nex.messages.length]);
  async function submit() {
    if (await nex.send(input)) setInput("");
  }
  async function record() {
    if (recorder.current?.state === "recording") {
      recorder.current.stop();
      return;
    }
    if (nex.busy || voicePending.current) return;
    voicePending.current = true;
    try {
      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia ||
        !window.MediaRecorder
      )
        throw Error("Microfone indisponível neste navegador. Use texto.");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const recording = new MediaRecorder(media);
      recorder.current = recording;
      const chunks: Blob[] = [];
      let failed = false;
      recording.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recording.onerror = () => {
        failed = true;
        clearTimeout(timer.current);
        media.getTracks().forEach((t) => t.stop());
        setListening(false);
        if (recording.state === "recording") recording.stop();
        nex.setError("Gravação interrompida. Use texto.");
      };
      recording.onstop = () => {
        clearTimeout(timer.current);
        media.getTracks().forEach((t) => t.stop());
        if (!alive.current || failed) return;
        setListening(false);
        void nex.run(async (signal) => {
          const audio = await voiceWav(
            new Blob(chunks, { type: recording.mimeType }),
          );
          const result = await nexRequest<{ text: string }>(
            "transcribe",
            { audio },
            "POST",
            signal,
          );
          if (alive.current)
            setInput((old) => (old ? `${old}\n${result.text}` : result.text));
        });
      };
      recording.start();
      setListening(true);
      nex.setError("");
      timer.current = window.setTimeout(() => {
        if (recording.state === "recording") recording.stop();
      }, 29000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      nex.setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Permissão de microfone negada. Libere nas configurações ou continue digitando."
          : e instanceof Error
            ? e.message
            : "Não foi possível abrir o microfone.",
      );
    } finally {
      voicePending.current = false;
    }
  }
  function speak(value: string) {
    if (!window.speechSynthesis) {
      nex.setError("Voz do dispositivo indisponível.");
      return;
    }
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.localService && v.lang === "pt-BR") ??
      voices.find((v) => v.localService && v.lang.startsWith("pt"));
    if (!voice) {
      nex.setError(
        "Nenhuma voz local em português disponível. Instale uma voz no dispositivo.",
      );
      return;
    }
    const speech = new SpeechSynthesisUtterance(value);
    speech.voice = voice;
    speech.lang = voice.lang;
    speech.onstart = () => setSpeaking(true);
    speech.onend = () => setSpeaking(false);
    speech.onerror = () => {
      setSpeaking(false);
      nex.setError("O dispositivo interrompeu a leitura.");
    };
    window.speechSynthesis.speak(speech);
  }
  async function showContext() {
    const result = await nex.run((signal) =>
      nexRequest("context", { module: nex.module }, "POST", signal),
    );
    if (result) {
      setInspected({ title: `Contexto · ${labels[nex.module]}`, data: result });
      if (!compact) inspect.show();
    }
  }
  async function read(service: string) {
    const result = await nex.run((signal) =>
      nexRequest(
        "google/read",
        { service, id: resource, range },
        "POST",
        signal,
      ),
    );
    if (result) {
      setInspected({ title: `Google · ${service}`, data: result });
      if (!compact) inspect.show();
    }
  }
  const state = listening
    ? "Escutando"
    : nex.busy
      ? nex.phase
      : speaking
        ? "Respondendo"
        : "Em espera";
  return (
    <div className={`nex-console ${compact ? "nex-console--compact" : ""}`}>
      <header className="nex-heading">
        <div>
          <span className="eyebrow">NexOS Intelligence</span>
          <h1>
            N.E.X<span>Seu universo, em diálogo.</span>
          </h1>
        </div>
        <div className="nex-flight-clock">
          <span className="eyebrow">Tempo local / São Paulo</span>
          <time dateTime={time.toISOString()}>
            {new Intl.DateTimeFormat("pt-BR", {
              timeZone: "America/Sao_Paulo",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }).format(time)}
          </time>
          <span>
            {new Intl.DateTimeFormat("pt-BR", {
              timeZone: "America/Sao_Paulo",
              day: "2-digit",
              month: "short",
            }).format(time)}
          </span>
        </div>
        <button
          className="secondary-button"
          disabled={nex.busy}
          onClick={nex.load}
        >
          Verificar conexões
        </button>
      </header>
      {new URLSearchParams(window.location.search).get("google") ===
        "denied" && (
        <p className="nex-error" role="status">
          Autorização Google interrompida. Sua conexão anterior, se houver, será
          verificada abaixo.
        </p>
      )}
      <div className="nex-workspace">
        <SurfaceCard
          className="nex-command-rail"
          title="Instrumentos"
          eyebrow="Controle do universo"
          tone="blue"
        >
          <div
            className="nex-telemetry"
            aria-label="Registros carregados do NexOS"
          >
            {workspace.loading ? (
              <p role="status">Carregando seus dados…</p>
            ) : workspace.error ? (
              <p role="alert">{workspace.error}</p>
            ) : (
              <>
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
                  <span>Projetos carregados</span>
                </div>
              </>
            )}
          </div>
          <div className="nex-command-areas">
            {Object.entries(nexAreas)
              .filter(([k]) => k !== "geral")
              .map(([k, v]) => (
                <button
                  className="secondary-button"
                  key={k}
                  aria-label={"Consultar " + v.label + " com N.E.X"}
                  disabled={nex.busy}
                  onClick={() => {
                    nex.setModule(k as typeof nex.module);
                    setInput(
                      "Ajude-me com " + v.label + ". Qual o próximo passo?",
                    );
                  }}
                >
                  {v.label}
                  <ArrowUpRight size={14} />
                </button>
              ))}
          </div>
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
        </SurfaceCard>
        <SurfaceCard className="nex-core-card" tone="cyan">
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
            <span className="eyebrow">Núcleo de assistência / NexOS</span>
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
          <details className="nex-privacy">
            <summary>Contexto e permissões · {labels[nex.module]}</summary>
            <label className="nex-field">
              Contexto
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
                Sua mensagem e até quatro falas recentes são enviadas ao
                provedor. Contexto limitado aos registros consultados. Planos
                gratuitos podem usar mensagens para melhorar modelos. Áudio só é
                enviado quando você encerra a gravação.
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
        </SurfaceCard>
        <SurfaceCard
          className="nex-dialogue"
          title="Canal de diálogo"
          eyebrow="N.E.X / você"
          action={
            <button
              className="secondary-button"
              disabled={nex.busy}
              onClick={nex.clear}
            >
              Limpar conversa
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
                <Brain size={30} />
                <h2>O que vamos organizar?</h2>
                <p>
                  Comece com uma pergunta. Você escolhe o módulo e se deseja
                  compartilhar contexto.
                </p>
                <div className="nex-starters">
                  {[
                    "Ajude a planejar meu dia",
                    "Quero capturar uma ideia",
                    "Qual é meu próximo passo?",
                  ].map((t) => (
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
                  <NexOperationCard
                    operation={m.operation}
                    id={m.operationId}
                  />
                )}
                {m.panels?.map((p) => (
                  <NexResponsePanel
                    key={p.area}
                    panel={p}
                    compact={compact}
                    onInspect={(title, data) => {
                      setInspected({ title, data });
                      if (!compact) inspect.show();
                    }}
                  />
                ))}
                {m.proposal && (
                  <div className="nex-proposal">
                    <span className="eyebrow">
                      {m.proposal.kind === "mission"
                        ? "Criar missão"
                        : "Capturar na entrada"}
                    </span>
                    <strong>{m.proposal.title}</strong>
                    <p>
                      {m.proposal.applied
                        ? "Salvo no NexOS."
                        : "Cria um registro. Você poderá editá-lo ou cancelá-lo no módulo."}
                    </p>
                    {m.proposal.applied ? (
                      <button
                        className="primary-button"
                        onClick={() => {
                          navigate(
                            entityPath("mission", m.proposal!.missionId!),
                          );
                          emitUI("inspect");
                        }}
                      >
                        Abrir registro
                        <ArrowUpRight size={16} />
                      </button>
                    ) : (
                      <button
                        className="primary-button"
                        disabled={nex.busy}
                        onClick={() => nex.confirm(m.proposal!)}
                      >
                        <Check size={16} />
                        Confirmar criação
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
            <div ref={end} />
          </div>
          {nex.error && (
            <p className="nex-error" role="alert">
              {nex.error}
            </p>
          )}
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
              rows={3}
            />
            <div className="nex-compose__actions">
              <button
                type="button"
                className="secondary-button"
                disabled={nex.busy || !nex.status?.providers.groq}
                onClick={record}
              >
                {listening ? <Square size={18} /> : <Mic size={18} />}{" "}
                {listening ? "Encerrar gravação" : "Gravar até 30 s"}
              </button>
              {speaking && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    window.speechSynthesis.cancel();
                    setSpeaking(false);
                  }}
                >
                  Parar voz
                </button>
              )}
              <button
                className="primary-button"
                disabled={nex.busy || listening || !input.trim()}
              >
                <Send size={17} />
                Enviar
              </button>
            </div>
          </form>
        </SurfaceCard>
      </div>
      <details className="nex-settings">
        <summary>Conexões, memória e instrumentos externos</summary>
        <div className="nex-support">
          <SurfaceCard
            title="Seu espaço conectado"
            eyebrow="Navegação"
            tone="blue"
          >
            <div className="nex-destinations">
              {navigation
                .flatMap((g) => g.items)
                .filter((x) => x.path !== "/nex")
                .map((x) => (
                  <button
                    key={x.path}
                    onClick={() => {
                      navigate(x.path);
                      emitUI("inspect");
                    }}
                  >
                    <x.icon size={17} />
                    {x.shortLabel ?? x.label}
                    <ArrowUpRight size={14} />
                  </button>
                ))}
            </div>
          </SurfaceCard>
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
              Uma autorização para agenda, tarefas e arquivos do app. O Google
              apresenta as permissões antes de conceder acesso.
            </p>
            <div className="nex-services">
              {["calendar", "tasks", "drive", "docs", "sheets", "slides"].map(
                (service) => (
                  <div key={service}>
                    <strong>{service}</strong>
                    <button
                      className="secondary-button"
                      disabled={nex.busy}
                      onClick={() => nex.connect(service)}
                    >
                      Autorizar
                    </button>
                    <button
                      className="secondary-button"
                      disabled={nex.busy || !nex.status?.google}
                      onClick={() => read(service)}
                    >
                      Consultar
                    </button>
                  </div>
                ),
              )}
            </div>
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
            <label className="nex-field">
              Serviço para compartilhar com a IA
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                {["calendar", "tasks", "drive", "docs", "sheets", "slides"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </label>
            <label className="nex-consent">
              <input
                type="checkbox"
                checked={!!nex.googleContext}
                disabled={nex.busy}
                onChange={(e) =>
                  nex.setGoogleContext(
                    e.target.checked ? { service, id: resource, range } : null,
                  )
                }
              />
              Compartilhar esta consulta Google na próxima mensagem
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
                    ? void nex.disconnect().then(() => setDisconnecting(false))
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
              Salve apenas o que quer que N.E.X lembre. A conversa não é gravada
              automaticamente. Memória atual: {labels[nex.module]}.
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
              setInspected({ title: "Previsão · " + city, data });
              if (!compact) inspect.show();
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
          Object.entries(nex.status.configuration).map(([provider, items]) => (
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
                      encryptionPresent: "Criptografia de tokens configurada",
                    }[k] ?? k}
                    : {v ? "Sim" : "Não"}
                  </li>
                ))}
              </ul>
            </article>
          ))}
      </details>
      {compact && inspected && (
        <section className="nex-inspector">
          <header>
            <h2>{inspected.title}</h2>
            <button
              className="secondary-button"
              onClick={() => setInspected(null)}
            >
              Fechar consulta
            </button>
          </header>
          <NexReadout data={inspected.data} />
        </section>
      )}
      {!compact && inspect.open && inspected && (
        <ModalSurface
          className="overlay"
          label={inspected.title}
          onClose={inspect.close}
        >
          <section className="nex-inspector">
            <header>
              <h2>{inspected.title}</h2>
              <button
                className="secondary-button"
                aria-label="Fechar consulta"
                onClick={inspect.close}
              >
                <X />
              </button>
            </header>
            <p>
              Consulta limitada. Estes dados só vão à IA se você ativar o
              compartilhamento.
            </p>
            <NexReadout data={inspected.data} />
          </section>
        </ModalSurface>
      )}
    </div>
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

function NexReadout({ data }: { data: unknown }) {
  const payload = data as {
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
            {Boolean(row.status) && <p>{String(row.status)}</p>}
            {Boolean(row.due_at) && <p>Prazo: {String(row.due_at)}</p>}
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
