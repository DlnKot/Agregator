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
    } else {
      // User is configured, create default connections if needed
      await createDefaultConnectionsIfNeeded(s)
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
  
  // Create default connections if this is first run setup
  await createDefaultConnectionsIfNeeded(plainSettings)
}

// Default connections configuration
function getDefaultConnectionsConfig() {
  return [
    {
      type: 'horizon',
      name: 'Horizon - telework.alfabank.ru',
      host: 'telework.alfabank.ru',
      description: 'Рабочее место через Horizon',
      isDefault: true,
      defaultSettings: {
        serverUrl: 'telework.alfabank.ru',
        desktopName: 'workspace-fullwm',
        desktopProtocol: '',
        desktopLayout: '',
        monitors: '',
        unattended: true,
        nonInteractive: false,
        launchMinimized: false,
        loginAsCurrentUser: false,
        hideClientAfterLaunchSession: false,
        useExisting: false,
        singleAutoConnect: false
      }
    },
    {
      type: 'horizon',
      name: 'Horizon - telework.moscow.alfaintra.net',
      host: 'telework.moscow.alfaintra.net',
      description: 'Рабочее место через Horizon (Москва)',
      isDefault: true,
      defaultSettings: {
        serverUrl: 'telework.moscow.alfaintra.net',
        desktopName: 'workspace-fullwm',
        desktopProtocol: '',
        desktopLayout: '',
        monitors: '',
        unattended: true,
        nonInteractive: false,
        launchMinimized: false,
        loginAsCurrentUser: false,
        hideClientAfterLaunchSession: false,
        useExisting: false,
        singleAutoConnect: false
      }
    },
    {
      type: 'rdp',
      name: 'RDP - mypc.moscow.alfaintra.net',
      host: 'mypc.moscow.alfaintra.net',
      description: 'Удалённый рабочий стол',
      isDefault: true,
      defaultSettings: {
        resolution: '1920x1080',
        colorDepth: '32',
        multimon: false,
        clipboard: true,
        driveMapping: false,
        useAdminSession: false,
        promptCredentials: true,
        startFullScreen: false,
        span: false
      }
    }
  ]
}

// Create default connections if user credentials are set and no connections exist
async function createDefaultConnectionsIfNeeded(currentSettings) {
  const user = currentSettings?.user
  if (!user || !user.username) return
  
  // Check if default connections already exist
  const existingConnections = await window.api.getConnections()
  const hasDefaults = existingConnections.some(c => c.isDefault === true)
  
  if (hasDefaults) return
  
  // Create default connections
  const defaultConfigs = getDefaultConnectionsConfig()
  
  for (const config of defaultConfigs) {
    const connection = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: config.name,
      host: config.host,
      type: config.type,
      description: config.description,
      username: user.domain ? `${user.domain}\\${user.username}` : user.username,
      isDefault: true,
      // Store default client settings
      clientSettings: config.defaultSettings
    }
    
    await window.api.saveConnection(connection)
  }
  
  // Reload connections
  connections.value = await window.api.getConnections()
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
  // Return a plain copy to avoid reactive issues
  return { ...connection }
}

// Launch operations
async function launchConnection(conn) {
  if (!conn) return { success: false, error: 'Connection not found' }
  
  try {
    // Convert connection to plain object to avoid IPC cloning issues
    const plainConnection = JSON.parse(JSON.stringify(conn))
    
    // Apply credentials from settings
    const connectionWithCreds = applyCredentialsToConnection(plainConnection)
    
    // Merge global settings with connection-specific settings
    const globalSettings = JSON.parse(JSON.stringify(settings.value))
    
    // If connection has client-specific settings, merge them
    let clientSettings = {}
    if (plainConnection.clientSettings) {
      clientSettings = plainConnection.clientSettings
    }
    
    // Merge settings: global -> client specific
    const mergedSettings = {
      ...globalSettings,
      [plainConnection.type]: {
        ...(globalSettings[plainConnection.type] || {}),
        ...clientSettings
      }
    }
    
    let result
    switch (plainConnection.type) {
      case 'rdp':
        result = await window.api.launchRdp(connectionWithCreds, mergedSettings)
        break
      case 'horizon':
        result = await window.api.launchHorizon(connectionWithCreds, mergedSettings)
        break
      case 'citrix':
        result = await window.api.launchCitrix(connectionWithCreds, mergedSettings)
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
    applyCredentialsToConnection,
    createDefaultConnectionsIfNeeded
  }
}
