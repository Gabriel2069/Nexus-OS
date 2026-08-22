import type { NexusNotification } from './nexus-intelligence'

export type NotificationPreferences = {
  proactive: boolean
  commitments: boolean
  tasks: boolean
  overdue: boolean
  study: boolean
  reviews: boolean
  habits: boolean
  finance: boolean
  dailySummary: boolean
  weeklySummary: boolean
}

export const defaultNotificationPreferences: NotificationPreferences = {
  proactive: true,
  commitments: true,
  tasks: true,
  overdue: true,
  study: true,
  reviews: true,
  habits: true,
  finance: true,
  dailySummary: true,
  weeklySummary: true,
}

export function filterNotifications(notifications: NexusNotification[], preferences = defaultNotificationPreferences) {
  if (!preferences.proactive) return notifications.filter(item => item.priority === 'high')
  return notifications.filter(item => {
    if (item.type === 'commitment') return preferences.commitments
    if (item.type === 'deadline') return preferences.tasks
    if (item.type === 'overdue') return preferences.overdue
    if (item.type === 'study') return preferences.study
    if (item.type === 'routine') return preferences.habits
    if (item.type === 'summary') return preferences.dailySummary
    return true
  })
}

export function deduplicateNotifications(notifications: NexusNotification[]) {
  const seen = new Set<string>()
  return notifications.filter(item => {
    const key = `${item.type}:${item.sourceId ?? item.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
