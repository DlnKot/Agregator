/**
 * Tauri API adapter — replaces Electron's window.api bridge.
 * All backend communication goes through here.
 */
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

function unwrap(result) {
  if (result && typeof result === 'object' && 'success' in result) {
    if (!result.success) throw new Error(result.error || 'Unknown error')
    return result.data
  }
  return result
}

// ==================== Connections ====================

export const connectionsApi = {
  getList: () => invoke('get_connections').then(unwrap),
  save: (conn) => invoke('save_connection', { connection: conn }).then(unwrap),
  delete: (id) => invoke('delete_connection', { id }).then(unwrap),
  resetDefaults: () => invoke('reset_default_connections').then(unwrap),
  getLast: () => invoke('get_last_connection').then(unwrap),
  setLast: (id) => invoke('set_last_connection', { id }).then(unwrap),
}

// ==================== Settings ====================

export const settingsApi = {
  get: () => invoke('get_settings').then(unwrap),
  save: (settings) => invoke('save_settings', { settings }).then(unwrap),
}

// ==================== App ====================

export const appApi = {
  getVersion: () => invoke('get_version').then(unwrap),
  getPlatform: () => invoke('get_platform').then(unwrap),
  openExternal: (url) => invoke('open_external', { url }).then(unwrap),
}

// ==================== Launchers ====================

export const launchersApi = {
  launchRdp: (connection, settings) =>
    invoke('launch_rdp', { connection, settings }).then(unwrap),
  launchHorizon: (connection, settings) =>
    invoke('launch_horizon', { connection, settings }).then(unwrap),
  launchCitrix: (connection, settings) =>
    invoke('launch_citrix', { connection, settings }).then(unwrap),
  launchVpn: () => invoke('launch_vpn').then(unwrap),
  vpnStatus: () => invoke('vpn_status').then(unwrap),
  vpnDisconnect: () => invoke('vpn_disconnect').then(unwrap),
  vpnConnect: (credentials) => invoke('vpn_connect', { credentials }).then(unwrap),
  vpnClientStatus: () => invoke('vpn_client_status').then(unwrap),
  vpnCancel: () => invoke('vpn_cancel').then(unwrap),
  getRudesktopStatus: () => invoke('get_rudesktop_status').then(unwrap),
  launchRudesktop: () => invoke('launch_rudesktop').then(unwrap),
  launchAChat: () => invoke('launch_achat').then(unwrap),
  launchTolk: () => invoke('launch_tolk').then(unwrap),
}

// ==================== External Launchers (web fallbacks) ====================

export const externalApi = {
  openRudesktopDownload: () => invoke('open_rudesktop_download').then(unwrap),
  openAChatWeb: () => invoke('open_achat_web').then(unwrap),
  openTolkWeb: () => invoke('open_tolk_web').then(unwrap),
}

// ==================== Network ====================

export const networkApi = {
  ping: (host, count = 4, thresholdMs) => invoke('network_ping', { host, count, thresholdMs }).then(unwrap),
  runFullCheck: (payload) => invoke('network_run_full_check', { payload }).then(unwrap),
}

// networkGeo — uses Tauri command with reqwest (bypasses webview mixed-content blocking)
export async function networkGeo() {
  return invoke('network_geo').then(unwrap)
}

// ==================== Logging ====================

export const logApi = {
  log: (level, message) => invoke('log_message', { level, message }),
}

// ==================== Tracking / Metrics ====================

export const trackingApi = {
  trackEvent: (type, data) => invoke('track_event', { type, data }).catch(() => {}),
  trackConnectionLaunch: (type, success) => invoke('track_connection_launch', { type, success }).catch(() => {}),
  trackTabView: (tab) => invoke('track_tab_view', { tab }).catch(() => {}),
  trackNetworkCheck: () => invoke('track_network_check').catch(() => {}),
  trackHelpView: (section) => invoke('track_help_view', { section }).catch(() => {}),
  trackError: (error) => invoke('track_error', { error }).catch(() => {}),
}

// ==================== Updates ====================

export const updatesApi = {
  checkForUpdates: () => invoke('check_for_updates').then(unwrap),
  downloadUpdate: () => invoke('download_update').then(unwrap),
  installUpdate: () => invoke('install_update').then(unwrap),
  getUpdateStatus: () => invoke('get_update_status').then(unwrap),
}

// ==================== Installer ====================

export const installerApi = {
  checkClientInstalled: (clientType) => invoke('check_client_installed', { clientType }).then(unwrap),
  checkDistributionDownloaded: (clientType) => invoke('check_distribution_downloaded', { clientType }).then(unwrap),
  downloadDistribution: (clientType) => invoke('download_distribution', { clientType }).then(unwrap),
  openInstaller: (filePath) => invoke('open_installer', { filePath }).then(unwrap),
  ensureClientInstalled: (clientType) => invoke('ensure_client_installed', { clientType }).then(unwrap),
}

// ==================== Events (Tauri events) ====================

export function onAutoUpdateEvent(callback) {
  return listen('auto-update-event', (event) => callback(event.payload))
}

export function onDownloadProgress(callback) {
  return listen('download-progress', (event) => callback(event.payload))
}
