const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Connections
  getConnections: () => ipcRenderer.invoke('get-connections'),
  saveConnection: (connection) => ipcRenderer.invoke('save-connection', connection),
  deleteConnection: (id) => ipcRenderer.invoke('delete-connection', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // Profiles
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  saveProfile: (profile) => ipcRenderer.invoke('save-profile', profile),
  deleteProfile: (id) => ipcRenderer.invoke('delete-profile', id),

  // Launchers
  launchRdp: (connection, settings) => ipcRenderer.invoke('launch-rdp', connection, settings),
  launchHorizon: (connection, settings) => ipcRenderer.invoke('launch-horizon', connection, settings),
  launchCitrix: (connection, settings) => ipcRenderer.invoke('launch-citrix', connection, settings),
  launchVpn: () => ipcRenderer.invoke('launch-vpn'),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onAutoUpdateEvent: (callback) => {
    ipcRenderer.on('auto-update-event', (event, data) => callback(data));
  },

  // Network check
  networkRunFullCheck: (payload) => ipcRenderer.invoke('network-run-full-check', payload),
  networkPing: (host, count) => ipcRenderer.invoke('network-run-ping', host, count),
  networkGeo: () => ipcRenderer.invoke('network-geo'),

  // Logging
  log: (level, message) => ipcRenderer.invoke('log-message', level, message),

  // No credentials storage (username is stored in connection profile)
});
