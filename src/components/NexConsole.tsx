import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Brain,
  Check,
  Mic,
  Orbit,
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
const labels: Record<string, string> = {
  geral: "Geral",
  agora: "Agora",
  hoje: "Hoje",
  calendario: "Calendário",
  inbox: "Caixa de entrada",
  estudos: "Estudos",
  projetos: "Projetos",
  missoes: "Missões",
  rotinas: "Rotinas",
  foco: "Foco",
};
export function NexConsole({ compact = false }: { compact?: boolean }) {
  const nex = useNex();
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
      nexRequest("google/read", { service, id: resource }, "POST", signal),
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
        <SurfaceCard className="nex-core-card" tone="cyan">
          <div
            className={`nex-core ${listening || nex.busy || speaking ? "is-active" : ""}`}
            aria-hidden="true"
          >
            <div className="nex-core__orbit" />
            <div className="nex-core__lens">
              <Orbit size={56} />
            </div>
            <div className="nex-core__orbit nex-core__orbit--outer" />
          </div>
          <span className="eyebrow">Núcleo de assistência</span>
          <h2>{state}</h2>
          <p>
            Converse e decida o próximo passo. Ações exigem sua confirmação.
          </p>
          <div className="nex-state" role="status">
            {nex.status
              ? Object.entries(nex.status.providers)
                  .filter(([, v]) => v)
                  .map(([name]) => name)
                  .join(" · ") || "IA ainda não habilitada"
              : "Conexão ainda não verificada"}
          </div>
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
              Sua mensagem e até quatro falas recentes são enviadas ao provedor.
              Contexto limitado aos registros consultados. Planos gratuitos
              podem usar mensagens para melhorar modelos. Áudio só é enviado
              quando você encerra a gravação.
            </p>
          </details>
          <button
            className="secondary-button"
            disabled={nex.busy}
            onClick={showContext}
          >
            Inspecionar contexto
          </button>
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
            Autorize cada serviço quando precisar. Drive, Docs, Sheets e Slides
            acessam apenas arquivos autorizados ao app; esta fase consulta
            dados, sem alterações externas.
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
export function NexOverlay() {
  const overlay = useOverlay("nex");
  if (!overlay.open) return null;
  return (
    <ModalSurface
      className="overlay"
      label="N.E.X Intelligence"
      onClose={overlay.close}
    >
      <section className="nex-overlay">
        <button
          className="secondary-button nex-overlay__close"
          aria-label="Fechar N.E.X"
          onClick={overlay.close}
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
    data?: { items?: unknown[]; files?: unknown[]; title?: string };
  };
  const rows = payload.records ?? payload.data?.items ?? payload.data?.files;
  return (
    <div className="nex-readout">
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
