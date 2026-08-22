import type { ParsedCommand } from './command-engine'

export type NexusActionRisk = 'read' | 'low' | 'medium' | 'high'

export interface NexusActionDecision {
  allowed: boolean
  requiresConfirmation: boolean
  risk: NexusActionRisk
  reason: string
}

/** Política única para ações iniciadas pela inteligência do NexOS. */
export function evaluateCommandAction(command: ParsedCommand): NexusActionDecision {
  switch (command.kind) {
    case 'show-today':
    case 'show-tomorrow':
    case 'show-finance':
    case 'show-important':
    case 'show-week':
      return { allowed: true, requiresConfirmation: false, risk: 'read', reason: 'Consulta somente dados existentes.' }
    case 'create-mission':
      return { allowed: true, requiresConfirmation: true, risk: 'low', reason: 'Cria um novo item no workspace.' }
    case 'prioritize-project':
      return { allowed: true, requiresConfirmation: true, risk: 'medium', reason: 'Altera a prioridade de um projeto.' }
    default:
      return { allowed: false, requiresConfirmation: false, risk: 'high', reason: 'Comando não reconhecido ou não suportado.' }
  }
}

export function assertConfirmedAction(decision: NexusActionDecision, confirmed: boolean) {
  if (!decision.allowed) throw new Error('Ação não permitida pelo NexOS.')
  if (decision.requiresConfirmation && !confirmed) throw new Error('Esta ação exige confirmação.')
}
