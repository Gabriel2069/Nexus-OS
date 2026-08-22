import type { NexusWorkspace } from '../types/nexus'
import { createMission } from './nexus-api'

export type NexosCommand =
  | { type: 'agenda'; dateOffset: number; label: string }
  | { type: 'summary'; period: 'day' | 'week' }
  | { type: 'finance'; period: 'month' }
  | { type: 'create_mission'; title: string; dateOffset: number; requiresConfirmation: true }
  | { type: 'unknown'; raw: string }

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function parseNexosCommand(input: string): NexosCommand {
  const raw = input.trim()
  const value = normalize(raw)
  if (!value) return { type: 'unknown', raw }

  if (/\b(o que|que) (tenho|tem) (hoje|para hoje)\b/.test(value)) return { type: 'agenda', dateOffset: 0, label: 'hoje' }
  if (/\b(o que|que) (tenho|tem) (amanha|para amanha)\b/.test(value)) return { type: 'agenda', dateOffset: 1, label: 'amanhã' }
  if (/\b(como foi|resumo).*(semana|semanal)\b/.test(value)) return { type: 'summary', period: 'week' }
  if (/\b(resumo|como esta|como foi).*(dia|hoje)\b/.test(value)) return { type: 'summary', period: 'day' }
  if (/\b(quanto|gastei|gastos).*(mes|mês)\b/.test(value)) return { type: 'finance', period: 'month' }

  const match = value.match(/\b(marca|cria|adicione|adiciona)\s+(?:uma?\s+)?(?:revisao|tarefa|missao)?\s*(?:de\s+)?(.+?)\s+(?:amanha|para amanha)\b/)
  if (match?.[2]) return { type: 'create_mission', title: match[2].trim(), dateOffset: 1, requiresConfirmation: true }

  return { type: 'unknown', raw }
}

export function buildCommandPreview(command: NexosCommand, workspace: NexusWorkspace) {
  if (command.type === 'agenda') {
    const target = new Date()
    target.setDate(target.getDate() + command.dateOffset)
    const day = target.toISOString().slice(0, 10)
    const commitments = workspace.calendarCommitments.filter((item) => item.starts_at?.slice(0, 10) === day)
    const missions = workspace.missions.filter((item) => item.due_at?.slice(0, 10) === day)
    return { kind: 'answer' as const, text: `Você tem ${commitments.length} compromisso(s) e ${missions.length} tarefa(s) ${command.label}.`, commitments, missions }
  }
  if (command.type === 'create_mission') return { kind: 'confirmation' as const, text: `Criar “${command.title}” para amanhã?`, command }
  if (command.type === 'summary') return { kind: 'answer' as const, text: command.period === 'week' ? 'Vou consolidar sua semana a partir dos registros disponíveis.' : 'Vou consolidar o seu dia a partir dos registros disponíveis.' }
  if (command.type === 'finance') return { kind: 'answer' as const, text: 'Vou consultar o período financeiro disponível no NexOS.' }
  return { kind: 'unknown' as const, text: `Ainda não reconheci esse comando: “${command.raw}”.` }
}

/** Executa apenas comandos que já foram confirmados explicitamente pelo usuário. */
export async function executeConfirmedNexosCommand(userId: string, command: NexosCommand) {
  if (command.type !== 'create_mission') {
    throw new Error('Este comando não possui uma ação de escrita confirmável.')
  }

  const due = new Date()
  due.setDate(due.getDate() + command.dateOffset)
  due.setHours(12, 0, 0, 0)

  return createMission(userId, {
    title: command.title,
    status: 'A fazer',
    priority: 'Média',
    rank: 'C',
    due_at: due.toISOString(),
    context: 'Comando NexOS',
    xp_base: 60,
    coins_base: 10,
  })
}
