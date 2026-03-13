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

    console.error('Error loading data:', error)
    isFirstRun.value = true

  } finally {

    isLoading.value = false

  }
}

/* ------------------------ CONNECTION OPS ------------------------ */

async function saveConnection(connection) {

  const result = await window.api.saveConnection(connection)

  connections.value = await window.api.getConnections()

  return result
}

async function deleteConnection(id) {

  await window.api.deleteConnection(id)

  connections.value = await window.api.getConnections()
}

/* -------------------------- SETTINGS OPS ------------------------ */

async function saveSettings(newSettings) {

  const plainSettings = JSON.parse(JSON.stringify(newSettings))

  await window.api.saveSettings(plainSettings)

  settings.value = plainSettings

  await createDefaultConnectionsIfNeeded(plainSettings)
}

/* ------------------- DEFAULT CONNECTION CONFIG ------------------ */

function getDefaultConnectionsConfig() {

  return [
    {
      type: 'horizon',
      name: 'VDI',
      host: 'telework.alfabank.ru',
      description: 'Рабочее место через Horizon',
      isDefault: true,
      desktopPool: 'workspace-fullwm',
      defaultSettings: {
        serverUrl: 'https://telework.alfabank.ru',
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
      name: 'VDI - Резерв',
      host: 'telework.moscow.alfaintra.net',
      description: 'Рабочее место через Horizon (Москва)',
      isDefault: true,
      desktopPool: 'workspace-fullwm',
      defaultSettings: {
        serverUrl: 'https://telework.moscow.alfaintra.net',
        desktopName: 'workspace-fullwm',
        desktopProtocol: '',
        desktopLayout: '',
        monitors: '',
        unattended: true,
        nonInteractive: false,
        launchMinimized: false,
        loginAsCurrentUser: true,
        hideClientAfterLaunchSession: false,
        useExisting: false,
        singleAutoConnect: false
      }
    },
    {
      type: 'rdp',
      name: 'ПУРМС',
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
    },
    {
      type: 'citrix',
      name: 'Citrix',
      host: 'sf-vdi.moscow.alfaintra.net',
      description: 'Виртуальные приложения Citrix',
      isDefault: true,
      defaultSettings: {
        storeUrl: 'https://sf-vdi.moscow.alfaintra.net/Citrix/VDI-Apps/discovery',
        resourceName: '',
        customPath: '',
        customFlags: ''
      }
    }
  ]
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
        break

      case 'horizon':
        result = await window.api.launchHorizon(connectionWithCreds, mergedSettings)
        break

      case 'citrix':
        result = await window.api.launchCitrix(connectionWithCreds, mergedSettings)
        break

      default:
        return {
          success: false,
          error: `Unsupported connection type: ${plainConnection.type}`
        }
    }

    return result || { success: false, error: 'Unknown error' }

  } catch (error) {

    console.error('Launch error:', error)

    return {
      success: false,
      error: error.message
    }
  }
}

/* ---------------- FILTERED CONNECTIONS ---------------- */

const filteredConnections = computed(() =>
  currentClientFilter.value === 'all'
    ? connections.value
    : connections.value.filter(c => c.type === currentClientFilter.value)
)

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