import { useEffect, useRef, useState, type RefObject } from "react";
import { nexRequest, voiceWav, type Reply } from "./nex-api";
import { UI_EVENTS } from "./ui-events";
import { localNexCommand } from "./nex-tools";
import { voiceBoundary, type VoiceBoundary } from "./voice-boundary";

type Options = {
  coreRef: RefObject<HTMLDivElement | null>;
  send: (value: string) => Promise<Reply | undefined>;
  run: <T>(
    job: (signal: AbortSignal) => Promise<T>,
    phase?: string,
  ) => Promise<T | undefined>;
  cancel: () => void;
  error: (value: string) => void;
  draft: (value: string) => void;
};
/** One owner for capture, turn detection and device speech. No hotword/background listener. */
export function useNexVoice(options: Options) {
  const current = useRef(options);
  current.current = options;
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [phase, setPhase] = useState("");
  const session = useRef(false),
    generation = useRef(0),
    alive = useRef(true);
  const warming = useRef(false);
  const pending = useRef(false),
    ownsRequest = useRef(false),
    turns = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null),
    media = useRef<MediaStream | null>(null);
  const cleanupAudio = useRef<(() => void) | null>(null);
  const maxRecording = useRef<number | undefined>(undefined),
    maxSession = useRef<number | undefined>(undefined),
    speechTimer = useRef<number | undefined>(undefined);

  function stop() {
    generation.current++;
    session.current = false;
    clearTimeout(maxRecording.current);
    clearTimeout(maxSession.current);
    clearTimeout(speechTimer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    media.current?.getTracks().forEach((track) => track.stop());
    media.current = null;
    cleanupAudio.current?.();
    cleanupAudio.current = null;
    window.speechSynthesis?.cancel();
    if (ownsRequest.current) current.current.cancel();
    ownsRequest.current = false;
    if (alive.current) {
      setActive(false);
      setListening(false);
      setSpeaking(false);
      setPhase("");
    }
  }
  async function localVoice() {
    const synth = window.speechSynthesis;
    if (!synth || !window.SpeechSynthesisUtterance)
      throw Error(
        "Voz do dispositivo indisponível. Continue por texto ou ditado.",
      );
    const choose = () =>
      synth.getVoices().find((v) => v.localService && v.lang === "pt-BR") ??
      synth.getVoices().find((v) => v.localService && v.lang.startsWith("pt"));
    let voice = choose();
    if (!voice) {
      await new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timeout);
          synth.removeEventListener("voiceschanged", done);
          resolve();
        };
        const timeout = window.setTimeout(done, 2000);
        synth.addEventListener("voiceschanged", done, { once: true });
      });
      voice = choose();
    }
    if (!voice)
      throw Error(
        "Nenhuma voz local em português disponível. O ditado continua disponível; habilite uma voz em português no dispositivo.",
      );
    return voice;
  }
  async function speak(
    value: string,
    resume = false,
    expected = generation.current,
  ) {
    try {
      const voice = await localVoice();
      if (!alive.current || generation.current !== expected) return;
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(value);
      speech.voice = voice;
      speech.lang = voice.lang;
      speech.rate = 1.03;
      const timeout = window.setTimeout(() => {
        if (generation.current === expected) {
          stop();
          current.current.error(
            "A voz do dispositivo não terminou. A escuta foi pausada; retome quando quiser.",
          );
        }
      }, 90000);
      speechTimer.current = timeout;
      speech.onstart = () => {
        if (generation.current === expected) {
          setSpeaking(true);
          setPhase("Respondendo");
        }
      };
      speech.onend = () => {
        clearTimeout(timeout);
        if (generation.current !== expected || !alive.current) return;
        setSpeaking(false);
        setPhase("");
        if (resume && session.current) void capture(true);
      };
      speech.onerror = () => {
        clearTimeout(timeout);
        if (generation.current !== expected || !alive.current) return;
        stop();
        current.current.error(
          "O dispositivo interrompeu a voz. Escuta pausada; continue por texto ou retome.",
        );
      };
      window.speechSynthesis.speak(speech);
    } catch (error) {
      if (generation.current !== expected || !alive.current) return;
      stop();
      current.current.error(
        error instanceof Error ? error.message : "Voz indisponível.",
      );
    }
  }
  async function capture(automatic: boolean) {
    if (pending.current) return;
    if (!automatic && recorder.current?.state === "recording") {
      recorder.current.stop();
      return;
    }
    const expected = generation.current;
    pending.current = true;
    try {
      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia ||
        !window.MediaRecorder ||
        (automatic && !window.AudioContext)
      )
        throw Error(
          "Microfone ou detecção de fala indisponível neste navegador. Use texto.",
        );
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (
        !alive.current ||
        generation.current !== expected ||
        (automatic && !session.current)
      ) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      media.current = stream;
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      const recording = new MediaRecorder(stream);
      recorder.current = recording;
      const chunks: Blob[] = [];
      let failed = false,
        boundary: VoiceBoundary = {
          started: performance.now(),
          lastFrame: performance.now(),
          lastSound: performance.now(),
          heard: false,
          voiced: 0,
        };
      if (window.AudioContext) {
        const audio = new AudioContext(),
          source = audio.createMediaStreamSource(stream),
          analyser = audio.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        await audio.resume();
        if (generation.current !== expected || !alive.current) {
          source.disconnect();
          void audio.close();
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        let frame = 0;
        const values = new Uint8Array(256);
        const sample = () => {
          if (recording.state !== "recording") return;
          analyser.getByteTimeDomainData(values);
          const rms = Math.sqrt(
            values.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) /
              values.length,
          );
          current.current.coreRef.current?.style.setProperty(
            "--nex-energy",
            String(Math.min(1, rms * 5)),
          );
          const result = voiceBoundary(boundary, rms, performance.now());
          boundary = result.next;
          if (automatic && result.stop) {
            recording.stop();
            return;
          }
          frame = requestAnimationFrame(sample);
        };
        cleanupAudio.current = () => {
          cancelAnimationFrame(frame);
          source.disconnect();
          void audio.close();
          current.current.coreRef.current?.style.removeProperty("--nex-energy");
        };
        recording.addEventListener("start", sample, { once: true });
      }
      recording.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recording.onerror = () => {
        failed = true;
        stop();
        current.current.error("Gravação interrompida. Continue por texto.");
      };
      recording.onstop = () => {
        clearTimeout(maxRecording.current);
        stream.getTracks().forEach((t) => t.stop());
        media.current = null;
        cleanupAudio.current?.();
        cleanupAudio.current = null;
        if (failed || generation.current !== expected || !alive.current) return;
        setListening(false);
        if (automatic && !boundary.heard) {
          stop();
          current.current.error(
            "Não detectei uma fala. A escuta foi pausada sem enviar áudio; retome para conversar.",
          );
          return;
        }
        void (async () => {
          ownsRequest.current = true;
          setPhase("Transcrevendo");
          const result = await current.current.run(
            async (signal) =>
              nexRequest<{ text: string }>(
                "transcribe",
                {
                  audio: await voiceWav(
                    new Blob(chunks, { type: recording.mimeType }),
                  ),
                },
                "POST",
                signal,
              ),
            "Transcrevendo",
          );
          ownsRequest.current = false;
          if (generation.current !== expected || !alive.current) return;
          if (!result?.text?.trim()) {
            stop();
            return;
          }
          if (!automatic) {
            current.current.draft(result.text);
            setPhase("");
            return;
          }
          if (localNexCommand(result.text)?.kind === "stop") {
            stop();
            return;
          }
          if (result.text.length > 1200) {
            stop();
            current.current.draft(result.text.slice(0, 1200));
            current.current.error(
              "Fala muito longa. Revise o trecho transcrito antes de enviar.",
            );
            return;
          }
          ownsRequest.current = true;
          setPhase("Organizando resposta");
          const reply = await current.current.send(result.text);
          ownsRequest.current = false;
          if (generation.current !== expected || !alive.current) return;
          if (!reply) {
            stop();
            current.current.draft(result.text);
            return;
          }
          turns.current++;
          if (turns.current >= 8) {
            stop();
            current.current.error(
              "Sessão de oito falas concluída. Ative novamente se quiser continuar; as cotas gratuitas permanecem válidas.",
            );
            void speak(reply.reply);
            return;
          }
          await speak(reply.reply, true, expected);
        })().catch(() => {
          if (generation.current === expected && alive.current) {
            stop();
            current.current.error(
              "Áudio interrompido. Continue por texto; nenhuma chamada foi repetida.",
            );
          }
        });
      };
      recording.start();
      setListening(true);
      setPhase("Escutando");
      current.current.error("");
      maxRecording.current = window.setTimeout(() => {
        if (recording.state === "recording") recording.stop();
      }, 29000);
    } catch (error) {
      if (generation.current !== expected || !alive.current) return;
      stop();
      current.current.error(
        error instanceof Error && error.name === "NotAllowedError"
          ? "Permissão de microfone negada. Libere nas configurações ou continue digitando."
          : error instanceof Error
            ? error.message
            : "Microfone indisponível.",
      );
    } finally {
      pending.current = false;
    }
  }
  async function toggle() {
    if (session.current) {
      stop();
      return;
    }
    if (pending.current || warming.current) return;
    const expected = generation.current;
    warming.current = true;
    try {
      await localVoice();
    } catch (error) {
      current.current.error(
        error instanceof Error ? error.message : "Voz indisponível.",
      );
      return;
    } finally {
      warming.current = false;
    }
    if (!alive.current || expected !== generation.current || document.hidden)
      return;
    session.current = true;
    turns.current = 0;
    setActive(true);
    maxSession.current = window.setTimeout(() => {
      stop();
      current.current.error(
        "Sessão de voz pausada após cinco minutos. Retome quando quiser.",
      );
    }, 300000);
    await capture(true);
  }
  useEffect(() => {
    alive.current = true;
    const pause = () => {
      if (document.hidden) stop();
    };
    const overlay = () => stop();
    const events = Object.entries(UI_EVENTS)
      .filter(([key]) => key !== "nexWindow")
      .map(([, value]) => value);
    events.forEach((event) => window.addEventListener(event, overlay));
    document.addEventListener("visibilitychange", pause);
    return () => {
      alive.current = false;
      stop();
      document.removeEventListener("visibilitychange", pause);
      events.forEach((event) => window.removeEventListener(event, overlay));
    };
  }, []);
  return {
    active,
    listening,
    speaking,
    autoSpeak,
    setAutoSpeak,
    phase,
    stop,
    toggle,
    record: () => capture(false),
    speak: (text: string) => {
      stop();
      return speak(text);
    },
  };
}
