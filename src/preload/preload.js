const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Connections
  getConnections: () => ipcRenderer.invoke('get-connections'),
  saveConnection: (connection) => ipcRenderer.invoke('save-connection', connection),
  deleteConnection: (id) => ipcRenderer.invoke('delete-connection', id),
  resetDefaultConnections: () => ipcRenderer.invoke('reset-default-connections'),
  getLastConnection: () => ipcRenderer.invoke('get-last-connection'),
  setLastConnection: (id) => ipcRenderer.invoke('set-last-connection', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // Profiles
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  saveProfile: (profile) => ipcRenderer.invoke('save-profile', profile),
  deleteProfile: (id) => ipcRenderer.invoke('delete-profile', id),

  // App
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Launchers
  launchRdp: (connection, settings) => ipcRenderer.invoke('launch-rdp', connection, settings),
  launchHorizon: (connection, settings) => ipcRenderer.invoke('launch-horizon', connection, settings),
  launchCitrix: (connection, settings) => ipcRenderer.invoke('launch-citrix', connection, settings),
  launchVpn: () => ipcRenderer.invoke('launch-vpn'),
  vpnConnect: (credentials) => ipcRenderer.invoke('vpn-connect', credentials),
  vpnDisconnect: () => ipcRenderer.invoke('vpn-disconnect'),
  vpnStatus: () => ipcRenderer.invoke('vpn-status'),
  vpnClientStatus: () => ipcRenderer.invoke('vpn-client-status'),
  vpnCancel: () => ipcRenderer.invoke('vpn-cancel'),
  getRudesktopStatus: () => ipcRenderer.invoke('get-rudesktop-status'),
  launchRudesktop: () => ipcRenderer.invoke('launch-rudesktop'),
  openRudesktopDownload: () => ipcRenderer.invoke('open-rudesktop-download'),
  launchAChat: () => ipcRenderer.invoke('launch-achat'),
  openAChatWeb: () => ipcRenderer.invoke('open-achat-web'),
  launchTolk: () => ipcRenderer.invoke('launch-tolk'),
  openTolkWeb: () => ipcRenderer.invoke('open-tolk-web'),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onAutoUpdateEvent: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('auto-update-event', handler);
    return () => ipcRenderer.removeListener('auto-update-event', handler);
  },

  // Network check
  networkRunFullCheck: (payload) => ipcRenderer.invoke('network-run-full-check', payload),
  networkPing: (host, count) => ipcRenderer.invoke('network-run-ping', host, count),
  networkGeo: () => ipcRenderer.invoke('network-geo'),

  // Logging
  log: (level, message) => ipcRenderer.invoke('log-message', level, message),

  // Metrics
  trackEvent: (type, data) => ipcRenderer.invoke('track-event', type, data),
  trackConnectionLaunch: (type, success) => ipcRenderer.invoke('track-connection-launch', type, success),
  trackTabView: (tab) => ipcRenderer.invoke('track-tab-view', tab),
  trackNetworkCheck: () => ipcRenderer.invoke('track-network-check'),
  trackHelpView: (section) => ipcRenderer.invoke('track-help-view', section),
  trackError: (error) => ipcRenderer.invoke('track-error', error),

  // Installer - Check and install client distributions
  checkClientInstalled: (clientType) => ipcRenderer.invoke('check-client-installed', clientType),
  checkDistributionDownloaded: (clientType) => ipcRenderer.invoke('check-distribution-downloaded', clientType),
  downloadDistribution: (clientType) => ipcRenderer.invoke('download-distribution', clientType),
  openInstaller: (filePath) => ipcRenderer.invoke('open-installer', filePath),
  ensureClientInstalled: (clientType) => ipcRenderer.invoke('ensure-client-installed', clientType),
  onDownloadProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },

  // No credentials storage (username is stored in connection profile)
});
