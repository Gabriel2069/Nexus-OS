import { supabase, isDemoMode } from "./supabase";
export const nexModules = [
  "geral",
  "agora",
  "hoje",
  "calendario",
  "inbox",
  "estudos",
  "projetos",
  "missoes",
  "rotinas",
  "foco",
] as const;
export type NexModule = (typeof nexModules)[number];
export type Proposal = {
  id: string;
  kind: "mission" | "inbox";
  title: string;
  applied?: boolean;
  missionId?: string;
};
export type Reply = {
  reply: string;
  provider: string;
  model: string;
  proposal: Omit<Proposal, "id"> | null;
  contextShared: boolean;
};
export type Memory = {
  id: string;
  module: string;
  agent: string;
  content: string;
};
export type NexStatus = {
  providers: { groq: boolean; gemini: boolean; workers: boolean };
  google: { scopes: string[] } | null;
  dailyPerProvider: number;
};
export async function nexRequest<T>(
  path: string,
  input?: unknown,
  method = input === undefined ? "GET" : "POST",
  signal?: AbortSignal,
): Promise<T> {
  if (isDemoMode)
    throw Error(
      "N.E.X precisa de uma sessão real. A demonstração não chama provedores.",
    );
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw Error("Entre no NexOS para usar o N.E.X.");
  const r = await fetch(`/api/nex/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(input === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: input === undefined ? undefined : JSON.stringify(input),
    signal,
    credentials: "same-origin",
  });
  let value: unknown;
  try {
    value = await r.json();
  } catch {
    throw Error("Resposta indisponível. Confira sua conexão.");
  }
  if (!r.ok)
    throw Error(
      (value as { error?: string }).error ?? "O pedido não foi concluído.",
    );
  return value as T;
}
/** Recordings are re-encoded locally: bounded mono PCM, rather than trusting
 * a client-reported duration of an arbitrary compressed file. */
export async function voiceWav(blob: Blob): Promise<string> {
  if (!window.AudioContext || !window.OfflineAudioContext)
    throw Error("Conversão de áudio indisponível neste navegador. Use texto.");
  const audio = new AudioContext();
  try {
    const decoded = await audio.decodeAudioData(await blob.arrayBuffer());
    if (decoded.duration > 30.2)
      throw Error("Limite de 30 segundos por gravação.");
    const length = Math.min(480000, Math.floor(decoded.duration * 16000));
    const offline = new OfflineAudioContext(1, length, 16000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    const bytes = new Uint8Array(44 + length * 2),
      view = new DataView(bytes.buffer);
    const word = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) bytes[off + i] = s.charCodeAt(i);
    };
    word(0, "RIFF");
    view.setUint32(4, bytes.length - 8, true);
    word(8, "WAVE");
    word(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 32000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    word(36, "data");
    view.setUint32(40, length * 2, true);
    const samples = rendered.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const v = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, v < 0 ? v * 32768 : v * 32767, true);
    }
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  } finally {
    await audio.close();
  }
}
