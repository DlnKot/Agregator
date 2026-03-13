import { ref, reactive, computed } from 'vue'

// Global state
const connections = ref([])
const profiles = ref([])
const settings = ref({})
const currentView = ref('connections')
const currentClientFilter = ref('all')
const isLoading = ref(false)

// Load data from main process
async function loadData() {
  isLoading.value = true
  try {
    connections.value = await window.api.getConnections()
    profiles.value = await window.api.getProfiles()
    settings.value = await window.api.getSettings()
  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    isLoading.value = false
  }
}

// Connection operations
async function saveConnection(connection) {
  const result = await window.api.saveConnection(connection)
  connections.value = await window.api.getConnections()
  return result
}

async function deleteConnection(id) {
  await window.api.deleteConnection(id)
  connections.value = await window.api.getConnections()
}

// Profile operations
async function saveProfile(profile) {
  const result = await window.api.saveProfile(profile)
  profiles.value = await window.api.getProfiles()
  return result
}

async function deleteProfile(id) {
  await window.api.deleteProfile(id)
  profiles.value = await window.api.getProfiles()
}

// Settings operations
async function saveSettings(newSettings) {
  await window.api.saveSettings(newSettings)
  settings.value = newSettings
}

// Launch operations
async function launchConnection(conn) {
  if (!conn) return { success: false, error: 'Connection not found' }
  
  try {
    let result
    switch (conn.type) {
      case 'rdp':
        result = await window.api.launchRdp(conn, settings.value)
        break
      case 'horizon':
        result = await window.api.launchHorizon(conn, settings.value)
        break
      case 'citrix':
        result = await window.api.launchCitrix(conn, settings.value)
        break
    }
    return result || { success: false, error: 'Unknown error' }
  } catch (error) {
    console.error('Launch error:', error)
    return { success: false, error: error.message }
  }
}

async function launchProfile(profile) {
  if (!profile || !profile.connections) return
  
  for (const connId of profile.connections) {
    const conn = connections.value.find(c => c.id === connId)
    if (conn) {
      await launchConnection(conn)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

// Filtered connections
const filteredConnections = computed(() => {
  if (currentClientFilter.value === 'all') {
    return connections.value
  }
  return connections.value.filter(c => c.type === currentClientFilter.value)
})

// Export composable
export function useApp() {
  return {
    // State
    connections,
    profiles,
    settings,
    currentView,
    currentClientFilter,
    isLoading,
    filteredConnections,
    
    // Methods
    loadData,
    saveConnection,
    deleteConnection,
    saveProfile,
    deleteProfile,
    saveSettings,
    launchConnection,
    launchProfile
  }
}
