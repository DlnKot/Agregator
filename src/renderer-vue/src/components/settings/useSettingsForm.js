import { reactive } from 'vue'

/**
 * Minimal section shapes for filling missing top-level keys.
 * Actual defaults come from the backend (merged deployment-defaults + user overrides).
 */
const SECTION_SHAPES = {
  user: { domain: '', username: '' },
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
    audio: { playback: true, capture: false },
    redirect: { printers: true, smartcards: true, webauthn: true },
    performance: {
      wallpaper: true, fontSmoothing: true, desktopComposition: true,
      fullWindowDrag: true, menuAnimations: true
    },
    customFlags: ''
  },
  horizon: {
    appName: '', desktopProtocol: '', desktopLayout: '', monitors: '',
    unattended: false, nonInteractive: false, launchMinimized: false,
    loginAsCurrentUser: false, hideClientAfterLaunchSession: false,
    useExisting: false, singleAutoConnect: false, customPath: '', customFlags: ''
  },
  citrix: {
    accountName: '', resourceName: '', customPath: '', customFlags: ''
  },
  general: {
    minimizeToTray: false, startMinimized: false
  },
  networkCheck: {
    latencyThresholdMs: 100
  }
}

function fillSection(section, shape) {
  if (!section || typeof section !== 'object') return { ...shape }
  const result = { ...shape }
  for (const key of Object.keys(shape)) {
    if (key in section) {
      if (typeof shape[key] === 'object' && shape[key] !== null && !Array.isArray(shape[key])) {
        result[key] = { ...shape[key], ...(section[key] || {}) }
      } else {
        result[key] = section[key]
      }
    }
  }
  return result
}

function buildSettings(settings) {
  const result = {}
  for (const [key, shape] of Object.entries(SECTION_SHAPES)) {
    result[key] = fillSection(settings?.[key], shape)
  }
  for (const key of Object.keys(settings || {})) {
    if (!(key in SECTION_SHAPES)) {
      result[key] = JSON.parse(JSON.stringify(settings[key]))
    }
  }
  return result
}

export function useSettingsForm(initialSettings) {
  const localSettings = reactive(buildSettings(initialSettings))

  function initSettings(settings) {
    if (!settings || Object.keys(settings).length === 0) return
    Object.assign(localSettings, buildSettings(settings))
  }

  function getSettings() {
    return JSON.parse(JSON.stringify(localSettings))
  }

  return {
    localSettings,
    initSettings,
    getSettings
  }
}
