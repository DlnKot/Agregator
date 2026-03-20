import { ref, computed } from 'vue'

// Global state
const connections = ref([])
const settings = ref({})
const currentView = ref('connections')
const currentClientFilter = ref('all')
const isLoading = ref(false)
const isFirstRun = ref(false)

/* --------------------------- LOAD DATA --------------------------- */

async function loadData() {
  isLoading.value = true

  try {
    // Allows opening the renderer directly in a browser (Vite) without Electron preload.
    if (!window.api) {
      connections.value = []
      settings.value = { user: { domain: '', username: '' } }
      isFirstRun.value = true
      return
    }

    const [conns, s] = await Promise.all([
      window.api.getConnections(),
      window.api.getSettings()
    ])

    connections.value = conns
    settings.value = s

    if (!s?.user?.username) {
      isFirstRun.value = true
    } else {
      await createDefaultConnectionsIfNeeded(s)
    }

  } catch (error) {
    // Используем централизованное логирование
    const errorMsg = error?.message || String(error)
    console.error('Error loading data:', errorMsg)
    if (window.api?.log) {
      window.api.log('error', `loadData failed: ${errorMsg}`)
    }
    isFirstRun.value = true

  } finally {

    isLoading.value = false

  }
}

/* ------------------------ CONNECTION OPS ------------------------ */

async function saveConnection(connection) {

  try {
    const isNew = !connection.id
    const result = await window.api.saveConnection(connection)

    connections.value = await window.api.getConnections()

    // Трекинг метрик
    if (result.success && window.api?.trackEvent) {
      if (isNew) {
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
    // Получаем данные подключения перед удалением для трекинга
    const conn = connections.value.find(c => c.id === id)
    const connectionType = conn?.type || 'unknown'
    
    await window.api.deleteConnection(id)

    connections.value = await window.api.getConnections()
    
    // Трекинг метрик
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

/* -------------------------- SETTINGS OPS ------------------------ */

async function saveSettings(newSettings) {

  try {
    const plainSettings = JSON.parse(JSON.stringify(newSettings))

    await window.api.saveSettings(plainSettings)

    settings.value = plainSettings

    await createDefaultConnectionsIfNeeded(plainSettings)
    
    // Трекинг метрик
    if (window.api?.trackEvent) {
      window.api.trackEvent('settings_save', {})
    }
    
    return { success: true }
  } catch (error) {
    const errorMsg = error?.message || String(error)
    console.error('Failed to save settings:', errorMsg)
    if (window.api?.log) {
      window.api.log('error', `saveSettings failed: ${errorMsg}`)
    }
    return { success: false, error: errorMsg }
  }
}

/* ------------------- DEFAULT CONNECTION CONFIG ------------------ */

function getDefaultConnectionsConfig() {
  // Default connections are now loaded from deployment-defaults.json
  // This allows deployment-specific configurations without hardcoding in source
  return []
}

/* ---------------- CREATE DEFAULT CONNECTIONS ---------------- */

async function createDefaultConnectionsIfNeeded(currentSettings) {

  const user = currentSettings?.user

  if (!user?.username) return

  const existingConnections = await window.api.getConnections()

  const hasDefaults = existingConnections.some(c => c.isDefault === true)

  if (hasDefaults) return

  const defaultConfigs = getDefaultConnectionsConfig()

  for (const config of defaultConfigs) {

    const connection = {

      id: Date.now().toString() + Math.random().toString(36).slice(2, 9),

      name: config.name,
      host: config.host,
      type: config.type,
      description: config.description,
      username: user.domain
        ? `${user.domain}\\${user.username}`
        : user.username,

      isDefault: true,

      desktopPool: config.desktopPool || '',

      clientSettings: config.defaultSettings
    }

    await window.api.saveConnection(connection)
  }

  connections.value = await window.api.getConnections()
}

/* ---------------- USER CREDENTIALS ---------------- */

function getUserCredentials() {

  const s = settings.value

  return {
    domain: s.user?.domain || '',
    username: s.user?.username || ''
  }
}

function applyCredentialsToConnection(connection) {

  const creds = getUserCredentials()

  if (!connection.username?.trim() && (creds.domain || creds.username)) {

    const username = creds.domain
      ? `${creds.domain}\\${creds.username}`
      : creds.username

    return { ...connection, username }
  }

  return { ...connection }
}

/* --------------------- LAUNCH CONNECTION --------------------- */

async function launchConnection(conn) {

  if (!conn)
    return { success: false, error: 'Connection not found' }

  try {

    const plainConnection = JSON.parse(JSON.stringify(conn))

    const connectionWithCreds = applyCredentialsToConnection(plainConnection)

    const globalSettings = JSON.parse(JSON.stringify(settings.value))

    let clientSettings = {}

    if (plainConnection.clientSettings) {
      clientSettings = plainConnection.clientSettings
    }

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
        // Трекинг запуска подключения
        if (result?.success && window.api?.trackConnectionLaunch) {
          window.api.trackConnectionLaunch('rdp', true)
        }
        break

      case 'horizon':
        result = await window.api.launchHorizon(connectionWithCreds, mergedSettings)
        // Трекинг запуска подключения
        if (result?.success && window.api?.trackConnectionLaunch) {
          window.api.trackConnectionLaunch('horizon', true)
        }
        break

      case 'citrix':
        result = await window.api.launchCitrix(connectionWithCreds, mergedSettings)
        // Трекинг запуска подключения
        if (result?.success && window.api?.trackConnectionLaunch) {
          window.api.trackConnectionLaunch('citrix', true)
        }
        break

      default:
        return {
          success: false,
          error: `Unsupported connection type: ${plainConnection.type}`
        }
    }

    return result || { success: false, error: 'Unknown error' }

  } catch (error) {
    const errorMsg = error?.message || String(error)
    console.error('Launch error:', errorMsg)
    if (window.api?.log) {
      window.api.log('error', `launchConnection failed: ${errorMsg}`)
    }
    // Трекинг ошибки
    if (window.api?.trackError) {
      window.api.trackError({ message: errorMsg, stack: error?.stack })
    }
    return {
      success: false,
      error: errorMsg
    }
  }
}

/* ---------------- FILTERED CONNECTIONS ---------------- */

const filteredConnections = computed(() =>
  currentClientFilter.value === 'all'
    ? connections.value
    : connections.value.filter(c => c.type === currentClientFilter.value)
)

/* ---------------- AUTO-UPDATER ---------------- */

// Update state
const updateStatus = ref({
  updateAvailable: false,
  updateDownloaded: false,
  version: null,
  macReleaseUrl: null
})

const updateProgress = ref({
  percent: 0,
  bytesPerSecond: 0,
  transferred: 0,
  total: 0
})

const updateError = ref(null)

// Initialize auto-update event listener
function initAutoUpdater() {
  if (window.api?.onAutoUpdateEvent) {
    window.api.onAutoUpdateEvent(({ event, data }) => {
      switch (event) {
        case 'update-available':
          updateStatus.value.updateAvailable = true
          updateStatus.value.version = data.version
          updateStatus.value.macReleaseUrl = data.macReleaseUrl || null
          break
        case 'download-progress':
          updateProgress.value = data
          break
        case 'update-downloaded':
          updateStatus.value.updateDownloaded = true
          updateStatus.value.version = data.version
          updateStatus.value.macReleaseUrl = data.macReleaseUrl || updateStatus.value.macReleaseUrl || null
          break
        case 'update-error':
          updateError.value = data.message
          break
      }
    })
  }
}

// Check for updates manually
async function checkForUpdates() {
  updateError.value = null
  try {
    const result = await window.api.checkForUpdates()
    if (window.api?.log) {
      window.api.log('info', `checkForUpdates result: ${JSON.stringify(result)}`)
    }
    return result
  } catch (error) {
    const errorMsg = error.message
    updateError.value = errorMsg
    if (window.api?.log) {
      window.api.log('error', `checkForUpdates failed: ${errorMsg}`)
    }
    return { success: false, error: errorMsg }
  }
}

// Download available update
async function downloadUpdate() {
  updateError.value = null
  try {
    const result = await window.api.downloadUpdate()
    if (window.api?.log) {
      window.api.log('info', `downloadUpdate result: ${JSON.stringify(result)}`)
    }
    return result
  } catch (error) {
    const errorMsg = error.message
    updateError.value = errorMsg
    if (window.api?.log) {
      window.api.log('error', `downloadUpdate failed: ${errorMsg}`)
    }
    return { success: false, error: errorMsg }
  }
}

// Install downloaded update and restart
function installUpdate() {
  window.api.installUpdate()
}

/* ---------------- EXPORT ---------------- */

export function useApp() {

  return {

    connections,
    settings,
    currentView,
    currentClientFilter,
    isLoading,
    isFirstRun,
    filteredConnections,

    // Auto-updater state
    updateStatus,
    updateProgress,
    updateError,

    loadData,
    saveConnection,
    deleteConnection,
    saveSettings,
    launchConnection,
    getUserCredentials,
    applyCredentialsToConnection,
    createDefaultConnectionsIfNeeded,

    // Auto-updater methods
    initAutoUpdater,
    checkForUpdates,
    downloadUpdate,
    installUpdate
  }
}
