import type { NexusMission, NexusWorkspace, DailyCheckin } from '../types/nexus'

export type NexusSuggestionKind = 'priority' | 'schedule' | 'study' | 'deadline' | 'routine' | 'finance'

export type NexusSuggestion = {
  id: string
  kind: NexusSuggestionKind
  title: string
  explanation: string
  confidence: number
  action?: { type: 'create-mission' | 'update-mission' | 'open' | 'review'; payload: Record<string, unknown> }
}

export type NexusNotification = {
  id: string
  type: 'commitment' | 'deadline' | 'overdue' | 'study' | 'summary' | 'routine'
  priority: 'low' | 'normal' | 'high'
  title: string
  body: string
  sourceId?: string
}

const DAY = 86_400_000

function startOfDay(value = new Date()) {
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d
}

function missionDate(mission: NexusMission) {
  return mission.due_at ? new Date(mission.due_at) : null
}

function isOpen(mission: NexusMission) {
  return mission.status !== 'Feita' && mission.status !== 'Cancelada'
}

function subjectFrom(title: string) {
  const normalized = title.toLowerCase()
  const subjects = ['física', 'matemática', 'química', 'biologia', 'história', 'geografia', 'português', 'literatura', 'inglês']
  return subjects.find(subject => normalized.includes(subject)) ?? null
}

export function buildNotifications(workspace: NexusWorkspace, now = new Date()): NexusNotification[] {
  const today = startOfDay(now)
  const tomorrow = new Date(today.getTime() + DAY)
  const notifications: NexusNotification[] = []

  for (const mission of workspace.missions.filter(isOpen)) {
    const due = missionDate(mission)
    if (!due) continue
    if (due.getTime() < today.getTime()) {
      notifications.push({ id: `overdue:${mission.id}`, type: 'overdue', priority: mission.priority === 'Crítica' ? 'high' : 'normal', title: 'Tarefa atrasada', body: mission.title, sourceId: mission.id })
    } else if (due.getTime() < tomorrow.getTime()) {
      notifications.push({ id: `deadline:${mission.id}`, type: 'deadline', priority: mission.priority === 'Alta' || mission.priority === 'Crítica' ? 'high' : 'normal', title: 'Vence hoje', body: mission.title, sourceId: mission.id })
    }
  }

  for (const commitment of workspace.calendarCommitments) {
    if (!commitment.starts_at) continue
    const starts = new Date(commitment.starts_at)
    const minutes = (starts.getTime() - now.getTime()) / 60_000
    if (minutes >= 0 && minutes <= 120) {
      notifications.push({ id: `commitment:${commitment.id}`, type: 'commitment', priority: minutes <= 30 ? 'high' : 'normal', title: 'Próximo compromisso', body: commitment.title, sourceId: commitment.id })
    }
  }

  const rank = { high: 0, normal: 1, low: 2 }
  return notifications.sort((a, b) => rank[a.priority] - rank[b.priority])
}

export function buildSuggestions(workspace: NexusWorkspace, now = new Date()): NexusSuggestion[] {
  const suggestions: NexusSuggestion[] = []
  const open = workspace.missions.filter(isOpen)
  const today = startOfDay(now)
  const upcoming = open.filter(m => {
    const due = missionDate(m)
    return due && due.getTime() >= today.getTime() && due.getTime() < today.getTime() + 2 * DAY
  })

  for (const mission of open) {
    const due = missionDate(mission)
    if (due && due < today && mission.priority !== 'Crítica') {
      suggestions.push({
        id: `overdue:${mission.id}`,
        kind: 'deadline',
        title: `Revisar "${mission.title}"`,
        explanation: 'Essa tarefa já passou do prazo. Vale decidir se deve ser remarcada, dividida ou encerrada.',
        confidence: 0.96,
        action: { type: 'review', payload: { missionId: mission.id } },
      })
    }
  }

  const academicSubjects = workspace.academicSchedule.map(item => item.subject.toLowerCase())
  const recentFocus = workspace.focusSessions.filter(s => s.started_at && new Date(s.started_at).getTime() >= today.getTime() - 7 * DAY)
  const focusSubjects = new Set(recentFocus.map(s => s.label ? subjectFrom(s.label) : null).filter(Boolean) as string[])
  const physicsGap = academicSubjects.some(subject => subject.includes('física')) && !focusSubjects.has('física')

  if (physicsGap) {
    suggestions.push({
      id: 'study:physics-gap',
      kind: 'study',
      title: 'Há espaço para Física',
      explanation: 'Física aparece na sua rotina acadêmica, mas não encontrei uma sessão de foco recente identificável para essa matéria.',
      confidence: 0.78,
      action: { type: 'create-mission', payload: { title: 'Revisão de Física', context: 'Estudo sugerido pelo NexOS' } },
    })
  }

  if (upcoming.length >= 4) {
    suggestions.push({
      id: 'schedule:load',
      kind: 'schedule',
      title: 'Seu próximo período está carregado',
      explanation: `Há ${upcoming.length} tarefas abertas com prazo nas próximas 48 horas. Vale revisar a ordem antes de adicionar novas demandas.`,
      confidence: 0.9,
      action: { type: 'review', payload: { scope: 'next-48-hours' } },
    })
  }

  return suggestions.slice(0, 6)
}

export function buildDailySummary(workspace: NexusWorkspace, now = new Date()) {
  const today = startOfDay(now)
  const tomorrow = new Date(today.getTime() + DAY)
  const open = workspace.missions.filter(isOpen)
  const dueToday = open.filter(m => { const d = missionDate(m); return d && d >= today && d < tomorrow })
  const overdue = open.filter(m => { const d = missionDate(m); return d && d < today })
  const commitments = workspace.calendarCommitments.filter(c => c.starts_at && new Date(c.starts_at) >= today && new Date(c.starts_at) < tomorrow)
  const focusToday = workspace.focusSessions.filter(s => s.started_at && new Date(s.started_at) >= today)
  const focusMinutes = focusToday.reduce((total, session) => total + (session.actual_minutes ?? session.planned_minutes ?? 0), 0)

  return {
    dueToday,
    overdue,
    commitments,
    focusMinutes,
    headline: overdue.length ? `Você tem ${overdue.length} pendência${overdue.length === 1 ? '' : 's'} atrasada${overdue.length === 1 ? '' : 's'} para decidir.` : dueToday.length ? `${dueToday.length} tarefa${dueToday.length === 1 ? '' : 's'} com prazo hoje.` : 'Seu dia está sem pendências críticas.',
  }
}

export function buildWeeklySummary(workspace: NexusWorkspace) {
  const completed = workspace.activity.filter(event => event.event_type.toLowerCase().includes('complete')).length
  const focusMinutes = workspace.focusSessions.reduce((total, session) => total + (session.actual_minutes ?? 0), 0)
  const checkins = workspace.dailyCheckins as DailyCheckin[]
  const averageFocus = checkins.length ? checkins.reduce((sum, c) => sum + (c.focus ?? 0), 0) / checkins.length : null
  const openProjects = workspace.projects.filter(project => project.status === 'Ativo').length

  return { completed, focusMinutes, averageFocus, openProjects, reviews: workspace.weeklyReviews.slice(0, 2) }
}
