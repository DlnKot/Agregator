import { ref, computed } from 'vue'
import { connectionsApi, settingsApi } from '../api'

const MAX_RECENT = 3

export function useConnections() {
  const connections = ref([])
  const currentClientFilter = ref('all')
  const recentConnectionIds = ref([])
  const isLoading = ref(false)

  const recentConnections = computed(() => {
    return recentConnectionIds.value
      .map(id => connections.value.find(c => c.id === id))
      .filter(Boolean)
  })

  const filteredConnections = computed(() => {
    if (currentClientFilter.value === 'recent') {
      return recentConnections.value
    }
    if (currentClientFilter.value === 'all') {
      return connections.value
    }
    return connections.value.filter(c => c.type === currentClientFilter.value)
  })

  const lastConnection = computed(() => {
    return recentConnections.value[0] || null
  })

  const lastConnectionId = computed(() => {
    return recentConnectionIds.value[0] || null
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

  async function loadRecentConnections() {
    try {
      const data = await connectionsApi.getRecent()
      recentConnectionIds.value = Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error loading recent connections:', error)
    }
  }

  async function pushRecentConnection(id) {
    try {
      await connectionsApi.pushRecent(id)
      recentConnectionIds.value = [id, ...recentConnectionIds.value.filter(x => x !== id)].slice(0, MAX_RECENT)
    } catch (error) {
      console.error('Error saving recent connection:', error)
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

      if (recentConnectionIds.value.includes(id)) {
        recentConnectionIds.value = recentConnectionIds.value.filter(x => x !== id)
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
    recentConnectionIds,
    recentConnections,
    lastConnection,
    lastConnectionId,
    isLoading,
    loadConnections,
    loadRecentConnections,
    pushRecentConnection,
    saveConnection,
    deleteConnection,
    resetDefaultConnections,
    getUserCredentials,
  }
}
