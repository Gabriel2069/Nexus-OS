import type { DailyCheckin, NexusMission } from '../types/nexus'

const priorityWeight: Record<NexusMission['priority'], number> = { Baixa: 3, Média: 8, Alta: 16, Crítica: 26 }
const rankWeight: Record<NexusMission['rank'], number> = { D: 2, C: 5, B: 9, A: 14, S: 20 }

export type Readiness = { score: number; band: 'recover' | 'steady' | 'strong'; focusMinutes: number; label: string; note: string }

export function getReadiness(checkin: DailyCheckin | null): Readiness {
  if (!checkin) return { score: 68, band: 'steady', focusMinutes: 45, label: 'Base neutra', note: 'Faça o check-in para o Nexus adaptar a carga do dia.' }
  const energy = checkin.energy ?? 6
  const focus = checkin.focus ?? energy
  const stress = checkin.stress ?? 5
  const sleep = checkin.sleep_quality ?? Math.min(10, Math.max(1, (checkin.sleep_hours ?? 7) / 0.8))
  const raw = energy * 4.0 + focus * 3.0 + sleep * 2.0 + (11 - stress) * 1.0
  const score = Math.max(15, Math.min(100, Math.round(raw)))
  if (score < 48) return { score, band: 'recover', focusMinutes: 25, label: 'Carga reduzida', note: 'Prefira vitórias menores, tarefas claras e recuperação entre blocos.' }
  if (score < 76) return { score, band: 'steady', focusMinutes: 45, label: 'Ritmo sustentável', note: 'Há capacidade para avançar sem precisar transformar o dia em sprint.' }
  return { score, band: 'strong', focusMinutes: 60, label: 'Janela forte', note: 'Bom momento para proteger um bloco profundo de trabalho importante.' }
}

function urgency(mission: NexusMission) {
  if (!mission.due_at) return 0
  const hours = (new Date(mission.due_at).getTime() - Date.now()) / 3_600_000
  if (hours <= 0) return 35
  if (hours <= 12) return 28
  if (hours <= 24) return 23
  if (hours <= 72) return 15
  if (hours <= 168) return 8
  return 2
}

export function missionFitScore(mission: NexusMission, readiness: Readiness) {
  if (mission.status === 'Bloqueada' || mission.status === 'Inbox' || mission.status === 'Cancelada' || mission.status === 'Feita') return -1000
  const duration = mission.duration_minutes ?? 45
  const durationGap = Math.abs(duration - readiness.focusMinutes)
  const durationFit = Math.max(-12, 12 - durationGap / 3)
  const progressBias = mission.status === 'Em andamento' ? 9 : 0
  const energyPenalty = readiness.band === 'recover' && ['A', 'S'].includes(mission.rank) && duration > 45 ? -12 : 0
  return priorityWeight[mission.priority] + rankWeight[mission.rank] + urgency(mission) + durationFit + progressBias + energyPenalty
}

export function rankMissions(missions: NexusMission[], checkin: DailyCheckin | null) {
  const readiness = getReadiness(checkin)
  return missions.map((mission) => ({ mission, score: missionFitScore(mission, readiness) })).filter((entry) => entry.score > -100).sort((a, b) => b.score - a.score)
}

export function nextBestMission(missions: NexusMission[], checkin: DailyCheckin | null) { return rankMissions(missions, checkin)[0]?.mission ?? null }

export function loadForecast(missions: NexusMission[]) {
  const active = missions.filter((m) => !['Inbox', 'Bloqueada', 'Feita', 'Cancelada'].includes(m.status))
  const dueSoon = active.filter((m) => m.due_at && new Date(m.due_at).getTime() <= Date.now() + 7 * 86400000)
  const minutes = dueSoon.reduce((sum, m) => sum + (m.duration_minutes ?? 45), 0)
  if (minutes > 600) return { level: 'high' as const, minutes, label: 'Semana carregada' }
  if (minutes > 300) return { level: 'medium' as const, minutes, label: 'Carga moderada' }
  return { level: 'low' as const, minutes, label: 'Carga respirável' }
}

export function pearson(pairs: Array<[number, number]>) {
  if (pairs.length < 3) return null
  const mx = pairs.reduce((s, [x]) => s + x, 0) / pairs.length
  const my = pairs.reduce((s, [, y]) => s + y, 0) / pairs.length
  let numerator = 0, dx = 0, dy = 0
  for (const [x, y] of pairs) { const a = x - mx; const b = y - my; numerator += a * b; dx += a * a; dy += b * b }
  if (!dx || !dy) return null
  return numerator / Math.sqrt(dx * dy)
}
