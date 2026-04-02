/**
 * Profile IPC handlers
 * Handles: get-profiles, save-profile, delete-profile
 */

const { ipcMain } = require('electron');
const { getStore } = require('../stores/storeManager');
const { sanitizeProfileInput } = require('../validation');
const { uuidv4 } = require('../utils/uuid');

function setupProfileIpcHandlers(logger) {
  const ok = (data) => ({ success: true, data });
  const fail = (error) => ({ success: false, error: error?.message || String(error) });

  // Get profiles
  ipcMain.handle('get-profiles', () => {
    try {
      const configStore = getStore();
      const data = configStore ? configStore.get('profiles', []) : [];
      return ok(data);
    } catch (e) {
      if (logger) logger('error', `get-profiles failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });

  // Save profile
  ipcMain.handle('save-profile', (event, profile) => {
    try {
      const configStore = getStore();
      const sanitized = sanitizeProfileInput(profile);

      const profiles = configStore.get('profiles', []);
      const idx = profiles.findIndex(p => p && typeof p === 'object' && p.id === sanitized.id);
      let saved;

      if (idx >= 0) {
        profiles[idx] = { ...profiles[idx], ...sanitized, id: profiles[idx].id };
        saved = profiles[idx];
      } else {
        saved = { ...sanitized, id: uuidv4() };
        profiles.push(saved);
      }

      configStore.set('profiles', profiles);
      return ok(saved);
    } catch (e) {
      if (logger) logger('error', `save-profile failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });

  // Delete profile
  ipcMain.handle('delete-profile', (event, profileId) => {
    try {
      const configStore = getStore();
      const profiles = configStore.get('profiles', []);
      configStore.set('profiles', profiles.filter(p => p.id !== profileId));
      return ok(true);
    } catch (e) {
      if (logger) logger('error', `delete-profile failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });
}

module.exports = { setupProfileIpcHandlers };
