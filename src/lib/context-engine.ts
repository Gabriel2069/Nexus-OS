import type { CalendarCommitment, DailyCheckin, FocusSession, NexusMission, NexusProject, NexusWorkspace } from '../types/nexus'

export type ContextSignal = 'deadline' | 'schedule-conflict' | 'study-priority' | 'overdue' | 'routine' | 'focus' | 'finance'

export type ContextSuggestion = {
  id: string
  signal: ContextSignal
  priority: 'low' | 'medium' | 'high'
  title: string
  explanation: string
  action?: { kind: 'mission' | 'calendar' | 'review'; label: string; payload: Record<string, unknown> }
}

const HOUR = 60 * 60 * 1000

function dayStart(value = new Date()) {
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d
}

function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }

function upcomingCommitments(commitments: CalendarCommitment[], now: Date) {
  const end = new Date(now.getTime() + 48 * HOUR)
  return commitments
    .filter(c => c.starts_at)
    .map(c => ({ c, date: new Date(c.starts_at!) }))
    .filter(({ date }) => date >= now && date <= end)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

function openMissions(missions: NexusMission[]) {
  return missions.filter(m => !['Feita', 'Cancelada'].includes(m.status))
}

export function buildContextSuggestions(workspace: NexusWorkspace, now = new Date()): ContextSuggestion[] {
  const suggestions: ContextSuggestion[] = []
  const missions = openMissions(workspace.missions)
  const commitments = upcomingCommitments(workspace.calendarCommitments, now)

  for (const mission of missions) {
    if (!mission.due_at) continue
    const due = new Date(mission.due_at)
    if (due < now) {
      suggestions.push({
        id: `overdue:${mission.id}`,
        signal: 'overdue',
        priority: mission.priority === 'Crítica' || mission.priority === 'Alta' ? 'high' : 'medium',
        title: `${mission.title} está atrasada`,
        explanation: 'A tarefa passou do prazo e pode precisar de uma nova decisão de prioridade.',
        action: { kind: 'mission', label: 'Revisar tarefa', payload: { missionId: mission.id } },
      })
    } else if (due.getTime() - now.getTime() <= 24 * HOUR) {
      suggestions.push({
        id: `deadline:${mission.id}`,
        signal: 'deadline',
        priority: mission.priority === 'Crítica' ? 'high' : 'medium',
        title: `${mission.title} vence em breve`,
        explanation: 'O prazo está próximo; vale decidir agora se precisa de espaço na agenda.',
        action: { kind: 'mission', label: 'Abrir tarefa', payload: { missionId: mission.id } },
      })
    }
  }

  for (let i = 0; i < commitments.length - 1; i += 1) {
    const current = commitments[i]
    const next = commitments[i + 1]
    if (!current.c.ends_at || !next.c.starts_at) continue
    const end = new Date(current.c.ends_at)
    const start = next.date
    if (end > start) {
      suggestions.push({
        id: `conflict:${current.c.id}:${next.c.id}`,
        signal: 'schedule-conflict',
        priority: 'high',
        title: 'Há compromissos sobrepostos',
        explanation: `${current.c.title} e ${next.c.title} ocupam parte do mesmo horário.`,
        action: { kind: 'calendar', label: 'Revisar agenda', payload: { firstId: current.c.id, secondId: next.c.id } },
      })
    }
  }

  const physicsSignals = workspace.missions.filter(m => /física/i.test(`${m.title} ${m.context ?? ''}`))
  if (physicsSignals.length > 0) {
    const recentFocus = workspace.focusSessions.filter(s => s.started_at && new Date(s.started_at).getTime() >= now.getTime() - 7 * 24 * HOUR)
    const physicsFocus = recentFocus.filter(s => /física/i.test(s.label ?? ''))
    if (physicsFocus.length === 0) {
      suggestions.push({
        id: 'study:physics-gap',
        signal: 'study-priority',
        priority: 'medium',
        title: 'Física pode estar sem espaço recente',
        explanation: 'Há atividades relacionadas a Física, mas nenhum bloco recente identificado. O NexOS pode sugerir um horário, sem alterar sua agenda automaticamente.',
        action: { kind: 'review', label: 'Encontrar espaço', payload: { subject: 'Física' } },
      })
    }
  }

  const today = dayStart(now)
  const todayCommitments = commitments.filter(({ date }) => sameDay(date, today))
  if (todayCommitments.length >= 4) {
    suggestions.push({
      id: 'routine:dense-day',
      signal: 'routine',
      priority: 'medium',
      title: 'Hoje está mais cheio que o normal',
      explanation: `${todayCommitments.length} compromissos já aparecem nas próximas horas. Vale conferir antes de adicionar algo novo.`,
    })
  }

  return suggestions.slice(0, 8)
}

export function getDailyOrientation(workspace: NexusWorkspace, now = new Date()) {
  const suggestions = buildContextSuggestions(workspace, now)
  const high = suggestions.filter(s => s.priority === 'high')
  return {
    headline: high[0]?.title ?? 'Seu dia está sob controle',
    suggestions,
    urgentCount: high.length,
  }
}
