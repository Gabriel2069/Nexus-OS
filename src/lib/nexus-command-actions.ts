import type { NexusMission } from '../types/nexus'
import { createMission, updateMission } from './nexus-api'

/** Ações mutáveis do Command Layer. Chamadas somente após confirmação explícita. */
export async function executeCreateMission(
  userId: string,
  input: { title: string; dueAt?: string | null; priority?: NexusMission['priority']; context?: string | null; projectId?: string | null },
) {
  return createMission(userId, {
    title: input.title.trim(),
    due_at: input.dueAt ?? null,
    priority: input.priority ?? 'Média',
    context: input.context ?? 'Comando confirmado pelo NexOS',
    project_id: input.projectId ?? null,
  })
}

export async function executeUpdateMission(
  userId: string,
  missionId: string,
  patch: Parameters<typeof updateMission>[2],
) {
  return updateMission(userId, missionId, patch)
}

export type ConfirmedCommandAction =
  | { type: 'create_mission'; payload: Parameters<typeof executeCreateMission>[1] }
  | { type: 'update_mission'; missionId: string; payload: Parameters<typeof executeUpdateMission>[2] }

export async function executeConfirmedCommand(userId: string, action: ConfirmedCommandAction) {
  if (action.type === 'create_mission') return executeCreateMission(userId, action.payload)
  return executeUpdateMission(userId, action.missionId, action.payload)
}
