/** Contratos internos para integrações externas. Não executam OAuth nem fazem chamadas de rede. */

export type NexusIntegrationId = 'google-calendar' | 'notion' | 'google-gmail' | 'google-drive' | 'whatsapp' | 'deezer'
export type NexusIntegrationCapability = 'read' | 'create' | 'update' | 'delete' | 'command' | 'search'

export type NexusIntegrationStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface NexusIntegrationConnection {
  id: NexusIntegrationId
  status: NexusIntegrationStatus
  accountLabel?: string
  lastSyncAt?: string | null
  error?: string | null
}

export interface NexusIntegrationAdapter {
  id: NexusIntegrationId
  capabilities: NexusIntegrationCapability[]
  connect(): Promise<void>
  disconnect(): Promise<void>
  sync(): Promise<{ imported: number; updated: number; removed: number }>
}

export interface NexusExternalEvent {
  externalId: string
  title: string
  startsAt: string
  endsAt?: string | null
  source: NexusIntegrationId
  url?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Nenhum adaptador é registrado aqui até a autorização do usuário existir.
 * Isso evita que o núcleo tente acessar serviços externos por acidente.
 */
export const NEXUS_EXTERNAL_INTEGRATIONS: NexusIntegrationId[] = [
  'google-calendar',
  'notion',
  'google-gmail',
  'google-drive',
  'whatsapp',
  'deezer',
]
