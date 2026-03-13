import { ref, reactive, computed } from 'vue'

// Global state
const connections = ref([])
const settings = ref({})
const currentView = ref('connections')
const currentClientFilter = ref('all')
const isLoading = ref(false)
const isFirstRun = ref(false)

// Load data from main process
async function loadData() {
  isLoading.value = true
  try {
    connections.value = await window.api.getConnections()
    settings.value = await window.api.getSettings()
    
    // Check if first run (no user credentials configured)
    const s = settings.value
    if (!s.user || !s.user.domain || !s.user.username) {
      isFirstRun.value = true
    }
  } catch (error) {
    console.error('Error loading data:', error)
    isFirstRun.value = true
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

// Settings operations
async function saveSettings(newSettings) {
  // Convert to plain object to avoid IPC cloning issues
  const plainSettings = JSON.parse(JSON.stringify(newSettings))
  await window.api.saveSettings(plainSettings)
  settings.value = plainSettings
}

// Get user credentials from settings
function getUserCredentials() {
  const s = settings.value
  return {
    domain: s.user?.domain || '',
    username: s.user?.username || ''
  }
}

// Apply user credentials to connection
function applyCredentialsToConnection(connection) {
  const creds = getUserCredentials()
  if (!connection.username && (creds.domain || creds.username)) {
    const username = creds.domain ? `${creds.domain}\\${creds.username}` : creds.username
    return { ...connection, username }
  }
  return connection
}

// Launch operations
async function launchConnection(conn) {
  // Apply credentials from settings
  const connectionWithCreds = applyCredentialsToConnection(conn)
  
  if (!conn) return { success: false, error: 'Connection not found' }
  
  try {
    // Convert to plain object to avoid IPC cloning issues
    const plainSettings = JSON.parse(JSON.stringify(settings.value))
    let result
    switch (conn.type) {
      case 'rdp':
        result = await window.api.launchRdp(connectionWithCreds, plainSettings)
        break
      case 'horizon':
        result = await window.api.launchHorizon(connectionWithCreds, plainSettings)
        break
      case 'citrix':
        result = await window.api.launchCitrix(connectionWithCreds, plainSettings)
        break
    }
    return result || { success: false, error: 'Unknown error' }
  } catch (error) {
    console.error('Launch error:', error)
    return { success: false, error: error.message }
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
    settings,
    currentView,
    currentClientFilter,
    isLoading,
    isFirstRun,
    filteredConnections,
    
    // Methods
    loadData,
    saveConnection,
    deleteConnection,
    saveSettings,
    launchConnection,
    getUserCredentials,
    applyCredentialsToConnection
  }
}
