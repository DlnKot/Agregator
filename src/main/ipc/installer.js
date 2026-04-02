/**
 * Installer IPC Handlers
 * Handles checking and installing client distributions
 */

const { ipcMain, BrowserWindow } = require('electron');
const { checkClientInstalled } = require('../utils/installChecker');
const { downloadDistribution, openInstaller, checkDistributionDownloaded } = require('../utils/downloader');

function setupInstallerIpcHandlers(logger) {
  const ok = (data) => ({ success: true, data });
  const fail = (error) => ({ success: false, error: error?.message || String(error) });

  // Check if client is installed
  ipcMain.handle('check-client-installed', (event, clientType) => {
    try {
      const result = checkClientInstalled(clientType);
      if (logger) logger('info', `check-client-installed: ${clientType} = ${result.installed}`);
      return ok(result);
    } catch (e) {
      if (logger) logger('error', `check-client-installed failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });

  // Check if distribution already downloaded
  ipcMain.handle('check-distribution-downloaded', (event, clientType) => {
    try {
      const result = checkDistributionDownloaded(clientType);
      return ok(result);
    } catch (e) {
      if (logger) logger('error', `check-distribution-downloaded failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });

  // Download distribution with progress
  ipcMain.handle('download-distribution', (event, clientType) => {
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

    return new Promise((resolve) => {
      const onProgress = (percent, downloaded, total) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            clientType,
            percent: Math.round(percent),
            downloaded,
            total
          });
        }
      };

      downloadDistribution(clientType, onProgress)
        .then((result) => {
          if (logger) logger('info', `download-distribution: ${clientType} downloaded to ${result.path}`);
          resolve(ok(result));
        })
        .catch((error) => {
          if (logger) logger('error', `download-distribution failed: ${error.message}`);
          resolve(fail(error));
        });
    });
  });

  // Open/launch installer
  ipcMain.handle('open-installer', (event, filePath) => {
    try {
      openInstaller(filePath);
      if (logger) logger('info', `open-installer: ${filePath}`);
      return ok(true);
    } catch (e) {
      if (logger) logger('error', `open-installer failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });

  // Combined: check and download if needed
  ipcMain.handle('ensure-client-installed', (event, clientType) => {
    try {
      const installStatus = checkClientInstalled(clientType);
      if (installStatus.installed) {
        return ok({ status: 'installed', path: installStatus.path });
      }

      // Check if already downloaded
      const downloadStatus = checkDistributionDownloaded(clientType);
      if (downloadStatus.exists) {
        return ok({ status: 'downloaded', path: downloadStatus.path });
      }

      return ok({ status: 'not_installed' });
    } catch (e) {
      if (logger) logger('error', `ensure-client-installed failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });
}

module.exports = { setupInstallerIpcHandlers };
