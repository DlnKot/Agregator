/**
 * App-related IPC handlers
 * Handles: get-version, get-platform, open-external, log-message
 */

const { ipcMain, shell } = require('electron');
const { app } = require('electron');
const { version: appVersion } = require('../../version.cjs');

function setupAppIpcHandlers(logger) {
  const ok = (data) => ({ success: true, data });
  const fail = (error) => ({ success: false, error: error?.message || String(error) });

  // App version handler
  ipcMain.handle('get-version', () => {
    try {
      return ok(appVersion);
    } catch (e) {
      return fail(e);
    }
  });

  // Platform handler
  ipcMain.handle('get-platform', () => {
    try {
      return ok(process.platform);
    } catch (e) {
      return fail(e);
    }
  });

  // Open external URL handler
  ipcMain.handle('open-external', async (event, url) => {
    const u = String(url || '').trim();
    if (!u) return fail('Empty URL');

    // Валидация URL - разрешаем только безопасные протоколы
    try {
      const parsedUrl = new URL(u);
      const allowedProtocols = ['https:', 'http:', 'mailto:'];
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        if (logger) logger('warn', `openExternal: Blocked unsafe protocol: ${parsedUrl.protocol}`);
        return fail('Недопустимый протокол. Разрешены только http, https и mailto');
      }
    } catch (e) {
      return fail('Неверный формат URL');
    }

    try {
      await shell.openExternal(u);
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  });

  // Logging handler
  ipcMain.handle('log-message', (event, level, message) => {
    try {
      if (typeof logger === 'function') {
        logger(level, `[Renderer] ${message}`);
      }
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  });
}

module.exports = { setupAppIpcHandlers };
