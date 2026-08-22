import type { NexusWorkspace } from '../types/nexus'
import { buildDailySummary, buildNotifications, buildSuggestions, buildWeeklySummary } from './nexus-intelligence'
import { commandNeedsConfirmation, commandPreview, executeConfirmedCommand, parseCommand } from './command-engine'

export type NexusDailyBrief = ReturnType<typeof buildDailySummary> & {
  notifications: ReturnType<typeof buildNotifications>
  suggestions: ReturnType<typeof buildSuggestions>
}

export type NexusWeeklyBrief = ReturnType<typeof buildWeeklySummary> & {
  notifications: ReturnType<typeof buildNotifications>
}

export function buildNexusBrief(workspace: NexusWorkspace, now = new Date()): NexusDailyBrief {
  return { ...buildDailySummary(workspace, now), notifications: buildNotifications(workspace, now), suggestions: buildSuggestions(workspace, now) }
}

export function buildNexusWeeklyBrief(workspace: NexusWorkspace, now = new Date()): NexusWeeklyBrief {
  return { ...buildWeeklySummary(workspace), notifications: buildNotifications(workspace, now) }
}

export function prepareCommand(text: string, workspace: NexusWorkspace) {
  const command = parseCommand(text)
  return { command, needsConfirmation: commandNeedsConfirmation(command), preview: commandPreview(command, workspace) }
}

export async function confirmAndExecuteCommand(userId: string, text: string, workspace: NexusWorkspace) {
  const prepared = prepareCommand(text, workspace)
  if (!prepared.needsConfirmation) throw new Error('Este comando não exige confirmação ou não possui ação modificadora.')
  const result = await executeConfirmedCommand(userId, prepared.command, workspace)
  return { ...prepared, result }
}

export function selectProactiveNotifications(workspace: NexusWorkspace, now = new Date()) {
  return buildNotifications(workspace, now).filter(notification => notification.priority !== 'low')
}
