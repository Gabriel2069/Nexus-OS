import type { NexusProject, NexusWorkspace } from '../types/nexus'
import { createMission, updateProject } from './nexus-api'

export type ParsedCommand =
  | { kind: 'show-today' }
  | { kind: 'show-tomorrow' }
  | { kind: 'show-finance' }
  | { kind: 'show-important' }
  | { kind: 'show-week' }
  | { kind: 'create-mission'; title: string; dateHint?: string }
  | { kind: 'prioritize-project'; query: string }
  | { kind: 'unknown'; text: string }

const normalize = (text: string) => text.trim().toLocaleLowerCase('pt-BR')

export function parseCommand(text: string): ParsedCommand {
  const value = normalize(text)
  if (/^(o que tenho|como está|como esta).*(hoje|agora)/.test(value) || value === 'hoje') return { kind: 'show-today' }
  if (/amanhã|amanha/.test(value) && /tenho|agenda|compromisso/.test(value)) return { kind: 'show-tomorrow' }
  if (/quanto.*gastei|finanças|financas|gastos|orçamento|orcamento/.test(value)) return { kind: 'show-finance' }
  if (/(algo|alguma coisa|o que é|o que e).*(importante|urgente)|tenho algo importante/.test(value)) return { kind: 'show-important' }
  if (/resumo.*(semana|semanal)|como foi.*semana/.test(value)) return { kind: 'show-week' }

  const add = value.match(/^(marca|marque|adiciona|adicione|cria|crie)\s+(?:uma?\s+)?(?:tarefa|missão|missao)?\s*(?:de\s+)?(.+?)(?:\s+(?:amanhã|amanha|hoje))?$/i)
  if (add) {
    const dateHint = /amanhã|amanha/.test(value) ? 'tomorrow' : /hoje/.test(value) ? 'today' : undefined
    const title = add[2].replace(/\s+(?:amanhã|amanha|hoje)$/i, '').trim()
    return title ? { kind: 'create-mission', title, dateHint } : { kind: 'unknown', text }
  }

  const priority = value.match(/^(?:coloca|coloque|prioriza|priorize).*(?:como|deixa|deixe).*(?:prioridade).*(.+)$/i)
  if (priority) return { kind: 'prioritize-project', query: priority[1].trim() }

  return { kind: 'unknown', text }
}

export function resolveProjectQuery(workspace: NexusWorkspace, query: string): NexusProject | null {
  const q = normalize(query)
  if (!q) return null
  return workspace.projects.find(project => normalize(project.name).includes(q)) ?? null
}

export function commandNeedsConfirmation(command: ParsedCommand) {
  return ['create-mission', 'prioritize-project'].includes(command.kind)
}

export function commandPreview(command: ParsedCommand, workspace: NexusWorkspace) {
  if (command.kind === 'create-mission') {
    return `Criar a tarefa “${command.title}”${command.dateHint === 'tomorrow' ? ' para amanhã' : command.dateHint === 'today' ? ' para hoje' : ''}?`
  }
  if (command.kind === 'prioritize-project') {
    const project = resolveProjectQuery(workspace, command.query)
    return project ? `Definir “${project.name}” como prioridade?` : `Não encontrei um projeto correspondente a “${command.query}”.`
  }
  return null
}

/** Executa somente comandos previamente confirmados pelo usuário. */
export async function executeConfirmedCommand(userId: string, command: ParsedCommand, workspace: NexusWorkspace) {
  if (command.kind === 'create-mission') {
    const dueAt = command.dateHint
      ? new Date(Date.now() + (command.dateHint === 'tomorrow' ? 86400000 : 0)).toISOString()
      : undefined
    return createMission(userId, {
      title: command.title,
      status: 'A fazer',
      priority: 'Média',
      rank: 'C',
      due_at: dueAt,
      context: 'Comando NexOS',
      xp_base: 60,
      coins_base: 10,
    })
  }

  if (command.kind === 'prioritize-project') {
    const project = resolveProjectQuery(workspace, command.query)
    if (!project) throw new Error(`Não encontrei um projeto correspondente a “${command.query}”.`)
    return updateProject(userId, project.id, { priority: 'Alta' })
  }

  throw new Error('Este comando não possui uma ação confirmável.')
}
