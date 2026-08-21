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

function notification(id: string, kind: NotificationKind, priority: NexusNotification['priority'], title: string, body: string, sourceId?: string): NexusNotification {
  return { id, kind, priority, title, body, sourceId }
}

export function buildNotifications(workspace: NexusWorkspace, now = new Date()): NexusNotification[] {
  const result: NexusNotification[] = []
  const horizon = now.getTime() + 90 * 60 * 1000

  for (const commitment of workspace.calendarCommitments) {
    if (!commitment.starts_at) continue
    const start = new Date(commitment.starts_at)
    if (start >= now && start.getTime() <= horizon) {
      result.push(notification(
        `commitment:${commitment.id}`,
        'commitment',
        'high',
        `Em breve: ${commitment.title}`,
        commitment.ends_at ? `Começa em ${Math.max(0, Math.round((start.getTime() - now.getTime()) / 60000))} min.` : 'Seu próximo compromisso está chegando.',
        commitment.id,
      ))
    }
  }

  for (const mission of workspace.missions) {
    if (!mission.due_at || ['Feita', 'Cancelada'].includes(mission.status)) continue
    const due = new Date(mission.due_at)
    if (due < now) {
      result.push(notification(`overdue:${mission.id}`, 'overdue', mission.priority === 'Crítica' ? 'high' : 'medium', `${mission.title} está atrasada`, 'Vale revisar o prazo ou a prioridade antes de seguir.', mission.id))
    } else if (due.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) {
      result.push(notification(`task:${mission.id}`, 'task', mission.priority === 'Crítica' ? 'high' : 'medium', `${mission.title} vence hoje`, 'O prazo está próximo.', mission.id))
    }
  }

  for (const suggestion of buildContextSuggestions(workspace, now)) {
    if (suggestion.signal === 'study-priority' || suggestion.signal === 'routine') {
      result.push(notification(`context:${suggestion.id}`, suggestion.signal === 'study-priority' ? 'study' : 'daily-summary', suggestion.priority, suggestion.title, suggestion.explanation))
    }
  }

  return result
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
    .slice(0, 12)
}

export function buildDailySummary(workspace: NexusWorkspace, now = new Date()): NexusNotification {
  const notifications = buildNotifications(workspace, now)
  const urgent = notifications.filter(n => n.priority === 'high').length
  const open = workspace.missions.filter(m => !['Feita', 'Cancelada'].includes(m.status)).length
  return notification('daily-summary', 'daily-summary', urgent ? 'medium' : 'low', 'Resumo do seu dia', urgent ? `${urgent} ponto${urgent > 1 ? 's' : ''} merece${urgent > 1 ? 'm' : ''} atenção. Você tem ${open} tarefa${open === 1 ? '' : 's'} em aberto.` : `Tudo relativamente estável. Você tem ${open} tarefa${open === 1 ? '' : 's'} em aberto.`)
}
