import { ref, computed } from 'vue'
import { connectionsApi, settingsApi } from '../api'

export function useConnections() {
  const connections = ref([])
  const currentClientFilter = ref('all')
  const lastConnectionId = ref(null)
  const isLoading = ref(false)

  const lastConnection = computed(() => {
    if (!lastConnectionId.value) return null
    return connections.value.find(c => c.id === lastConnectionId.value) || null
  })

  const filteredConnections = computed(() => {
    if (currentClientFilter.value === 'recent') {
      return lastConnection.value ? [lastConnection.value] : []
    }
    if (currentClientFilter.value === 'all') {
      return connections.value
    }
    return connections.value.filter(c => c.type === currentClientFilter.value)
  })

  async function loadConnections() {
    isLoading.value = true
    try {
      connections.value = await connectionsApi.getList()
    } catch (error) {
      console.error('Error loading connections:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function loadLastConnection() {
    try {
      const data = await connectionsApi.getLast()
      lastConnectionId.value = data || null
    } catch (error) {
      console.error('Error loading last connection:', error)
    }
  }

  async function setLastConnection(id) {
    try {
      lastConnectionId.value = id
      await connectionsApi.setLast(id)
    } catch (error) {
      console.error('Error saving last connection:', error)
    }
  }

  async function saveConnection(connection) {
    try {
      await connectionsApi.save(connection)
      connections.value = await connectionsApi.getList()
      return { success: true }
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('Failed to save connection:', errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  async function deleteConnection(id) {
    try {
      await connectionsApi.delete(id)
      connections.value = await connectionsApi.getList()

      if (lastConnectionId.value === id) {
        await setLastConnection(null)
      }

      return { success: true }
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('Failed to delete connection:', errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  async function resetDefaultConnections() {
    try {
      await connectionsApi.resetDefaults()
      connections.value = await connectionsApi.getList()
      return { success: true }
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('Failed to reset:', errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  function getUserCredentials(settings) {
    return {
      domain: settings?.user?.domain || '',
      username: settings?.user?.username || ''
    }
  }

  return {
    connections,
    filteredConnections,
    currentClientFilter,
    lastConnectionId,
    lastConnection,
    isLoading,
    loadConnections,
    loadLastConnection,
    setLastConnection,
    saveConnection,
    deleteConnection,
    resetDefaultConnections,
    getUserCredentials,
  }
}
