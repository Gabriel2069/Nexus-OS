import type { CalendarCommitment, NexusMission, NexusWorkspace } from '../types/nexus'
import { buildContextSuggestions } from './context-engine'

export type NotificationKind = 'commitment' | 'task' | 'overdue' | 'study' | 'review' | 'habit' | 'finance' | 'daily-summary' | 'weekly-summary'

export type NexusNotification = {
  id: string
  kind: NotificationKind
  priority: 'low' | 'medium' | 'high'
  title: string
  body: string
  scheduledFor?: string
  sourceId?: string
}

const priorityRank: Record<NexusNotification['priority'], number> = { high: 0, medium: 1, low: 2 }

function notification(id: string, kind: NotificationKind, priority: NexusNotification['priority'], title: string, body: string, sourceId?: string): NexusNotification {
  return { id, kind, priority, title, body, sourceId }
}

function validDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function buildNotifications(workspace: NexusWorkspace, now = new Date()): NexusNotification[] {
  const result: NexusNotification[] = []
  const horizon = now.getTime() + 90 * 60 * 1000

  for (const commitment of workspace.calendarCommitments) {
    const start = validDate(commitment.starts_at)
    if (!start) continue
    if (start >= now && start.getTime() <= horizon) {
      const minutes = Math.max(0, Math.round((start.getTime() - now.getTime()) / 60000))
      result.push(notification(
        `commitment:${commitment.id}`,
        'commitment',
        'high',
        `Em breve: ${commitment.title}`,
        minutes === 0 ? 'Seu compromisso começa agora.' : `Começa em ${minutes} min.`,
        commitment.id,
      ))
    }
  }

  for (const mission of workspace.missions) {
    if (!mission.due_at || ['Feita', 'Cancelada'].includes(mission.status)) continue
    const due = validDate(mission.due_at)
    if (!due) continue
    if (due < now) {
      result.push(notification(
        `overdue:${mission.id}`,
        mission.priority === 'Crítica' || mission.priority === 'Alta' ? 'overdue' : 'overdue',
        mission.priority === 'Crítica' ? 'high' : 'medium',
        `${mission.title} está atrasada`,
        'Vale revisar o prazo ou a prioridade antes de seguir.',
        mission.id,
      ))
    } else if (due.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) {
      result.push(notification(
        `task:${mission.id}`,
        'task',
        mission.priority === 'Crítica' ? 'high' : 'medium',
        `${mission.title} vence hoje`,
        'O prazo está próximo.',
        mission.id,
      ))
    }
  }

  for (const suggestion of buildContextSuggestions(workspace, now)) {
    const kind: NotificationKind = suggestion.signal === 'study-priority'
      ? 'study'
      : suggestion.signal === 'deadline'
        ? 'task'
        : suggestion.signal === 'overdue'
          ? 'overdue'
          : suggestion.signal === 'focus'
            ? 'review'
            : 'daily-summary'
    result.push(notification(
      `context:${suggestion.id}`,
      kind,
      suggestion.priority,
      suggestion.title,
      suggestion.explanation,
    ))
  }

  const seen = new Set<string>()
  return result
    .filter(item => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
    .slice(0, 12)
}

export function buildDailySummary(workspace: NexusWorkspace, now = new Date()): NexusNotification {
  const notifications = buildNotifications(workspace, now)
  const urgent = notifications.filter(n => n.priority === 'high').length
  const open = workspace.missions.filter(m => !['Feita', 'Cancelada'].includes(m.status)).length
  const upcoming = workspace.calendarCommitments.filter(c => {
    const start = validDate(c.starts_at)
    return start && start >= now && start.getTime() <= now.getTime() + 24 * 60 * 60 * 1000
  }).length

  const body = urgent
    ? `${urgent} ponto${urgent > 1 ? 's' : ''} merece${urgent > 1 ? 'm' : ''} atenção. Você tem ${open} tarefa${open === 1 ? '' : 's'} em aberto e ${upcoming} compromisso${upcoming === 1 ? '' : 's'} nas próximas 24h.`
    : `Você tem ${open} tarefa${open === 1 ? '' : 's'} em aberto e ${upcoming} compromisso${upcoming === 1 ? '' : 's'} nas próximas 24h.`

  return notification('daily-summary', 'daily-summary', urgent ? 'medium' : 'low', 'Resumo do seu dia', body)
}

export function buildWeeklySummary(workspace: NexusWorkspace, now = new Date()): NexusNotification {
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000
  const completed = workspace.missions.filter(m => m.completed_at && new Date(m.completed_at).getTime() >= weekAgo).length
  const open = workspace.missions.filter(m => !['Feita', 'Cancelada'].includes(m.status)).length
  const focusMinutes = workspace.focusSessions
    .filter(s => s.status === 'completed' && new Date(s.started_at).getTime() >= weekAgo)
    .reduce((total, session) => total + (session.actual_minutes ?? session.planned_minutes ?? 0), 0)
  const habitCompletions = workspace.routineCompletions.filter(c => new Date(c.completion_date).getTime() >= weekAgo).length
  const highFriction = workspace.weeklyReviews[0]?.friction?.length ?? 0

  const pieces = [
    `${completed} tarefa${completed === 1 ? '' : 's'} concluída${completed === 1 ? '' : 's'}`,
    `${Math.round(focusMinutes / 60 * 10) / 10}h de foco`,
    `${habitCompletions} rotina${habitCompletions === 1 ? '' : 's'} registrada${habitCompletions === 1 ? '' : 's'}`,
  ]
  if (open > 0) pieces.push(`${open} em aberto`)
  if (highFriction > 0) pieces.push(`${highFriction} ponto${highFriction === 1 ? '' : 's'} de atrito na última revisão`)

  return notification(
    'weekly-summary',
    'weekly-summary',
    'low',
    'Fechamento da semana',
    `${pieces.join(' · ')}.`,
  )
}
