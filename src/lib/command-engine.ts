import type { NexusMission, NexusProject, NexusWorkspace } from '../types/nexus'

export type ParsedCommand =
  | { kind: 'show-today' }
  | { kind: 'show-tomorrow' }
  | { kind: 'show-finance' }
  | { kind: 'create-mission'; title: string; dateHint?: string }
  | { kind: 'prioritize-project'; query: string }
  | { kind: 'unknown'; text: string }

const normalize = (text: string) => text.trim().toLocaleLowerCase('pt-BR')

export function parseCommand(text: string): ParsedCommand {
  const value = normalize(text)
  if (/^(o que tenho|como está).*(hoje|agora)/.test(value) || value === 'hoje') return { kind: 'show-today' }
  if (/amanhã|amanha/.test(value) && /tenho|agenda|compromisso/.test(value)) return { kind: 'show-tomorrow' }
  if (/quanto.*gastei|finanças|financas|gastos/.test(value)) return { kind: 'show-finance' }

  const add = value.match(/^(marca|marque|adiciona|adicione|cria|crie)\s+(?:uma?\s+)?(?:tarefa|missão|missao)?\s*(?:de\s+)?(.+?)(?:\s+(?:amanhã|amanha|hoje))?$/i)
  if (add) {
    const dateHint = /amanhã|amanha/.test(value) ? 'tomorrow' : /hoje/.test(value) ? 'today' : undefined
    return { kind: 'create-mission', title: add[2].replace(/\s+(?:amanhã|amanha|hoje)$/i, '').trim(), dateHint }
  }

  const priority = value.match(/^(?:coloca|coloque|prioriza|priorize).*(?:como|deixa|deixe).*(?:prioridade).*(.+)$/i)
  if (priority) return { kind: 'prioritize-project', query: priority[1].trim() }

  return { kind: 'unknown', text }
}

export function resolveProjectQuery(workspace: NexusWorkspace, query: string): NexusProject | null {
  const q = normalize(query)
  return workspace.projects.find(project => normalize(project.name).includes(q)) ?? null
}

export function commandNeedsConfirmation(command: ParsedCommand) {
  return ['create-mission', 'prioritize-project'].includes(command.kind)
}

export function commandPreview(command: ParsedCommand, workspace: NexusWorkspace) {
  if (command.kind === 'create-mission') return `Criar a tarefa “${command.title}”${command.dateHint === 'tomorrow' ? ' para amanhã' : command.dateHint === 'today' ? ' para hoje' : ''}?`
  if (command.kind === 'prioritize-project') {
    const project = resolveProjectQuery(workspace, command.query)
    return project ? `Definir “${project.name}” como prioridade?` : `Não encontrei um projeto correspondente a “${command.query}”.`
  }
  return null
}
