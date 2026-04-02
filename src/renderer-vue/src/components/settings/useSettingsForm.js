import { ref, reactive, watch } from 'vue'

const defaultSettings = {
  user: {
    domain: '',
    username: ''
  },
  rdp: {
    resolution: '1920x1080',
    colorDepth: '32',
    multimon: false,
    span: false,
    clipboard: true,
    driveMapping: false,
    useAdminSession: false,
    promptCredentials: true,
    startFullScreen: false,
    audio: {
      playback: true,
      capture: false
    },
    redirect: {
      printers: true,
      smartcards: true,
      webauthn: true
    },
    performance: {
      wallpaper: true,
      fontSmoothing: true,
      desktopComposition: true,
      fullWindowDrag: true,
      menuAnimations: true
    },
    customFlags: ''
  },
  horizon: {
    appName: '',
    desktopProtocol: '',
    desktopLayout: '',
    monitors: '',
    unattended: false,
    nonInteractive: false,
    launchMinimized: false,
    loginAsCurrentUser: false,
    hideClientAfterLaunchSession: false,
    useExisting: false,
    singleAutoConnect: false,
    customPath: '',
    customFlags: ''
  },
  citrix: {
    accountName: '',
    resourceName: '',
    customPath: '',
    customFlags: ''
  },
  general: {
    minimizeToTray: false,
    startMinimized: false
  },
  updates: {
    // Updates are served from custom internal server only
  },
  networkCheck: {
    latencyThresholdMs: 100
  }
}

export function useSettingsForm(initialSettings) {
  const localSettings = reactive(JSON.parse(JSON.stringify(defaultSettings)))

  function initSettings(settings) {
    if (!settings || Object.keys(settings).length === 0) return

    const merged = JSON.parse(JSON.stringify(defaultSettings))

    if (settings.user) {
      merged.user = { ...defaultSettings.user, ...settings.user }
    }
    if (settings.rdp) {
      merged.rdp = { ...defaultSettings.rdp, ...settings.rdp }
    }
    if (settings.horizon) {
      merged.horizon = { ...defaultSettings.horizon, ...settings.horizon }
    }
    if (settings.citrix) {
      merged.citrix = { ...defaultSettings.citrix, ...settings.citrix }
    }
    if (settings.general) {
      merged.general = { ...defaultSettings.general, ...settings.general }
    }
    if (settings.updates) {
      merged.updates = { ...defaultSettings.updates, ...settings.updates }
    }
    if (settings.networkCheck) {
      merged.networkCheck = { ...defaultSettings.networkCheck, ...settings.networkCheck }
    }

    Object.assign(localSettings, merged)
  }

  function getSettings() {
    return JSON.parse(JSON.stringify(localSettings))
  }

  function resetToDefaults() {
    Object.assign(localSettings, JSON.parse(JSON.stringify(defaultSettings)))
  }

  // Initialize with provided settings
  if (initialSettings) {
    initSettings(initialSettings)
  }

  return {
    localSettings,
    defaultSettings,
    initSettings,
    getSettings,
    resetToDefaults
  }
}
