export type VoiceBoundary = {
  started: number;
  lastSound: number;
  voiced: number;
  heard: boolean;
  lastFrame: number;
};
export function voiceBoundary(
  previous: VoiceBoundary,
  rms: number,
  now: number,
) {
  const delta = Math.min(100, Math.max(0, now - previous.lastFrame));
  const voiced =
    rms >= 0.018
      ? previous.voiced + delta
      : previous.heard
        ? previous.voiced
        : 0;
  const next = {
    ...previous,
    voiced,
    heard: voiced >= 180,
    lastFrame: now,
    lastSound: rms >= 0.018 ? now : previous.lastSound,
  };
  const stop =
    now - next.started >= 29000 ||
    (next.heard && now - next.lastSound >= 1500) ||
    (!next.heard && now - next.started >= 12000);
  return { next, stop };
}
