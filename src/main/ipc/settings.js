/**
 * Settings IPC handlers
 * Handles: get-settings, save-settings
 */

const { ipcMain, app } = require('electron');
const { getStore } = require('../stores/storeManager');
const { sanitizeSettingsInput } = require('../validation');
const { BUILTIN_DEFAULTS } = require('../config/defaults');
const autoUpdaterModule = require('../utils/autoUpdater');

function setupSettingsIpcHandlers(logger) {
  const ok = (data) => ({ success: true, data });
  const fail = (error) => ({ success: false, error: error?.message || String(error) });

  // Get settings
  ipcMain.handle('get-settings', () => {
    try {
      const configStore = getStore();
      const data = configStore ? configStore.get('settings') : BUILTIN_DEFAULTS.settings;
      return ok(data);
    } catch (e) {
      if (logger) logger('error', `get-settings failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });

  // Save settings
  ipcMain.handle('save-settings', (event, settings) => {
    try {
      const configStore = getStore();
      const sanitized = sanitizeSettingsInput(settings);
      configStore.set('settings', sanitized);

      // Re-init auto-updater with the new update source (packaged only).
      if (!process.env.ELECTRON_DEV && app.isPackaged) {
        try {
          autoUpdaterModule.initAutoUpdater({
            currentVersion: app.getVersion(),
            updateUrl: 'https://10.230.121.212/electron/latest/',
            updateUrlHttp: 'http://10.230.121.212/electron/latest/',
            useGithub: sanitized?.updates?.useGithub === true
          });
        } catch (e) {
          if (logger) logger('warn', `Auto-updater re-init on save-settings failed: ${e?.message || String(e)}`);
        }
      }

      return ok(true);
    } catch (e) {
      if (logger) logger('error', `save-settings failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });
}

module.exports = { setupSettingsIpcHandlers };
