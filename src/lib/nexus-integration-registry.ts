import type { NexusIntegrationAdapter, NexusIntegrationId, NexusIntegrationConnection } from './nexus-integration-contracts'

const adapters = new Map<NexusIntegrationId, NexusIntegrationAdapter>()
const connections = new Map<NexusIntegrationId, NexusIntegrationConnection>()

export function registerIntegration(adapter: NexusIntegrationAdapter) {
  adapters.set(adapter.id, adapter)
  connections.set(adapter.id, { id: adapter.id, status: 'disconnected' })
}

export function getIntegrationConnection(id: NexusIntegrationId): NexusIntegrationConnection {
  return connections.get(id) ?? { id, status: 'disconnected' }
}

export function listIntegrationConnections() { return [...connections.values()] }

export async function connectIntegration(id: NexusIntegrationId) {
  const adapter = adapters.get(id)
  if (!adapter) throw new Error(`Integração ${id} ainda não foi autorizada/configurada.`)
  connections.set(id, { ...getIntegrationConnection(id), status: 'connecting', error: null })
  try {
    await adapter.connect()
    connections.set(id, { ...getIntegrationConnection(id), status: 'connected', error: null })
  } catch (error) {
    connections.set(id, { ...getIntegrationConnection(id), status: 'error', error: error instanceof Error ? error.message : 'Erro desconhecido' })
    throw error
  }
}

export async function syncIntegration(id: NexusIntegrationId) {
  const adapter = adapters.get(id)
  if (!adapter) throw new Error(`Integração ${id} ainda não foi autorizada/configurada.`)
  const result = await adapter.sync()
  connections.set(id, { ...getIntegrationConnection(id), lastSyncAt: new Date().toISOString() })
  return result
}

export async function disconnectIntegration(id: NexusIntegrationId) {
  const adapter = adapters.get(id)
  if (adapter) await adapter.disconnect()
  connections.set(id, { id, status: 'disconnected', lastSyncAt: null, error: null })
}
