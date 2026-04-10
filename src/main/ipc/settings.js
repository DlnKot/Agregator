/**
 * Settings IPC handlers
 * Handles: get-settings, save-settings
 */

const { ipcMain } = require('electron');
const { getStore } = require('../stores/storeManager');
const { sanitizeSettingsInput } = require('../validation');
const { BUILTIN_DEFAULTS } = require('../config/defaults');
const { 
  createErrorResponse, 
  createSuccessResponse,
  ERROR_CODES 
} = require('./errorCodes');

function setupSettingsIpcHandlers(logger) {
  const ok = (data) => createSuccessResponse(data);
  const fail = (error) => {
    if (logger) logger('error', `Settings error: ${error?.message || String(error)}`);
    return createErrorResponse(ERROR_CODES.STORAGE_ERROR, 'Settings operation failed', error?.message);
  };

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

      return ok(true);
    } catch (e) {
      if (logger) logger('error', `save-settings failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });
}

module.exports = { setupSettingsIpcHandlers };
