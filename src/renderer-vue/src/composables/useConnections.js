import { ref, computed } from 'vue'
import { useIpc } from './useIpc'

/**
 * Connections composable
 * Handles CRUD operations for connections
 */
export function useConnections() {
  const { unwrapIpc } = useIpc()
  
  const connections = ref([])
  const currentClientFilter = ref('all')
  const isLoading = ref(false)

  const filteredConnections = computed(() =>
    currentClientFilter.value === 'all'
      ? connections.value
      : connections.value.filter(c => c.type === currentClientFilter.value)
  )

  async function loadConnections() {
    isLoading.value = true
    try {
      if (!window.api) {
        connections.value = []
        return
      }
      const data = unwrapIpc(await window.api.getConnections())
      connections.value = data
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('Error loading connections:', errorMsg)
      if (window.api?.log) {
        window.api.log('error', `loadConnections failed: ${errorMsg}`)
      }
    } finally {
      isLoading.value = false
    }
  }

  async function saveConnection(connection) {
    try {
      const isFactory = !!connection?.factoryId
      const isNew = !isFactory && !connection.id
      const result = await window.api.saveConnection(connection)
      unwrapIpc(result)

      connections.value = unwrapIpc(await window.api.getConnections())

      if (result.success && window.api?.trackEvent) {
        if (isFactory) {
          window.api.trackEvent('default_connection_rename', { factoryId: connection.factoryId })
        } else if (isNew) {
          window.api.trackEvent('connection_create', { type: connection.type })
        } else {
          window.api.trackEvent('connection_edit', { type: connection.type })
        }
      }

      return { success: true, result }
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('Failed to save connection:', errorMsg)
      if (window.api?.log) {
        window.api.log('error', `saveConnection failed: ${errorMsg}`)
      }
      return { success: false, error: errorMsg }
    }
  }

  async function deleteConnection(id) {
    try {
      const conn = connections.value.find(c => c.id === id)
      const connectionType = conn?.type || 'unknown'

      unwrapIpc(await window.api.deleteConnection(id))
      connections.value = unwrapIpc(await window.api.getConnections())

      if (window.api?.trackEvent) {
        window.api.trackEvent('connection_delete', { type: connectionType })
      }

      return { success: true }
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('Failed to delete connection:', errorMsg)
      if (window.api?.log) {
        window.api.log('error', `deleteConnection failed: ${errorMsg}`)
      }
      return { success: false, error: errorMsg }
    }
  }

  async function resetDefaultConnections() {
    try {
      if (!window.api?.resetDefaultConnections) {
        return { success: false, error: 'Недоступно в браузере' }
      }

      const res = await window.api.resetDefaultConnections()
      const data = unwrapIpc(res)
      if (Array.isArray(data)) {
        connections.value = data
      } else {
        connections.value = unwrapIpc(await window.api.getConnections())
      }

      if (window.api?.trackEvent) {
        window.api.trackEvent('default_connections_reset', {})
      }

      return { success: true }
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('Failed to reset default connections:', errorMsg)
      if (window.api?.log) {
        window.api.log('error', `resetDefaultConnections failed: ${errorMsg}`)
      }
      return { success: false, error: errorMsg }
    }
  }

  function getUserCredentials(settings) {
    return {
      domain: settings?.user?.domain || '',
      username: settings?.user?.username || ''
    }
  }

  function applyCredentialsToConnection(connection, settings) {
    const creds = getUserCredentials(settings)

    if (!connection.username?.trim() && (creds.domain || creds.username)) {
      const username = creds.domain
        ? `${creds.domain}\\${creds.username}`
        : creds.username
      return { ...connection, username }
    }

    return { ...connection }
  }

  return {
    connections,
    filteredConnections,
    currentClientFilter,
    isLoading,
    loadConnections,
    saveConnection,
    deleteConnection,
    resetDefaultConnections,
    getUserCredentials,
    applyCredentialsToConnection
  }
}
