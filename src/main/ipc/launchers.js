/**
 * Launcher IPC handlers
 * Handles: launch-rdp, launch-horizon, launch-citrix, launch-vpn
 */

const { ipcMain } = require('electron');
const rdpLauncher = require('../launchers/rdpLauncher');
const horizonLauncher = require('../launchers/horizonLauncher');
const citrixLauncher = require('../launchers/citrixLauncher');
const vpnLauncher = require('../launchers/vpnLauncher');
const rudesktopLauncher = require('../launchers/rudesktopLauncher');
const achatLauncher = require('../launchers/achatLauncher');
const tolkLauncher = require('../launchers/tolkLauncher');
const { 
  createErrorResponse, 
  createSuccessResponse,
  ERROR_CODES 
} = require('./errorCodes');

function setupLauncherIpcHandlers(logger) {
  // Launch RDP
  ipcMain.handle('launch-rdp', async (event, connection, settings) => {
    try {
      rdpLauncher.launchRdp(connection, settings || {});
      return createSuccessResponse(true);
    } catch (error) {
      if (logger) logger('error', `RDP launch error: ${error.message}`);
      return createErrorResponse(
        ERROR_CODES.CLIENT_LAUNCH_FAILED, 
        'Failed to launch RDP connection', 
        error.message
      );
    }
  });

  // Launch Horizon
  ipcMain.handle('launch-horizon', async (event, connection, settings) => {
    try {
      horizonLauncher.launchHorizon(connection, settings || {});
      return createSuccessResponse(true);
    } catch (error) {
      if (logger) logger('error', `Horizon launch error: ${error.message}`);
      // Check if client not found
      const notFound = error.message?.includes('not found') || error.message?.includes('Not found');
      if (notFound) {
        return createErrorResponse(
          ERROR_CODES.CLIENT_NOT_FOUND, 
          'Horizon client not found', 
          { needsInstall: true, clientType: 'horizon' }
        );
      }
      return createErrorResponse(
        ERROR_CODES.CLIENT_LAUNCH_FAILED, 
        'Failed to launch Horizon connection', 
        error.message
      );
    }
  });

  // Launch Citrix
  ipcMain.handle('launch-citrix', async (event, connection, settings) => {
    try {
      citrixLauncher.launchCitrix(connection, settings?.citrix || {});
      return createSuccessResponse(true);
    } catch (error) {
      if (logger) logger('error', `Citrix launch error: ${error.message}`);
      // Check if client not found
      const notFound = error.message?.includes('not found') || error.message?.includes('Not found');
      if (notFound) {
        return createErrorResponse(
          ERROR_CODES.CLIENT_NOT_FOUND, 
          'Citrix client not found', 
          { needsInstall: true, clientType: 'citrix' }
        );
      }
      return createErrorResponse(
        ERROR_CODES.CLIENT_LAUNCH_FAILED, 
        'Failed to launch Citrix connection', 
        error.message
      );
    }
  });

  // Launch VPN (legacy - opens GUI)
  ipcMain.handle('launch-vpn', async () => {
    try {
      vpnLauncher.launchVpn();
      return createSuccessResponse(true);
    } catch (error) {
      if (logger) logger('error', `VPN launch error: ${error.message}`);
      return createErrorResponse(
        ERROR_CODES.CLIENT_LAUNCH_FAILED, 
        'Failed to launch VPN connection', 
        error.message
      );
    }
  });

  // VPN connect (interactive with credentials)
  ipcMain.handle('vpn-connect', async (event, { username, password, challenge }) => {
    try {
      if (!username) {
        return createErrorResponse(
          ERROR_CODES.INVALID_INPUT,
          'Username is required',
          'username'
        );
      }
      const result = await vpnLauncher.connectVpnInteractive(username, password, challenge);
      return createSuccessResponse(result);
    } catch (error) {
      if (logger) logger('error', `VPN connect error: ${error.message}`);
      return createErrorResponse(
        ERROR_CODES.CLIENT_LAUNCH_FAILED,
        'Failed to connect to VPN',
        error.message
      );
    }
  });

  // VPN disconnect
  ipcMain.handle('vpn-disconnect', async () => {
    try {
      const result = vpnLauncher.disconnectVpn();
      return createSuccessResponse(result);
    } catch (error) {
      if (logger) logger('error', `VPN disconnect error: ${error.message}`);
      return createErrorResponse(
        ERROR_CODES.CLIENT_LAUNCH_FAILED,
        'Failed to disconnect VPN',
        error.message
      );
    }
  });

  // VPN status check
  ipcMain.handle('vpn-status', async () => {
    try {
      const isConnected = await vpnLauncher.checkVpnConnected();
      return createSuccessResponse({ connected: isConnected });
    } catch (error) {
      if (logger) logger('error', `VPN status error: ${error.message}`);
      return createErrorResponse(
        ERROR_CODES.UNKNOWN_ERROR,
        'Failed to check VPN status',
        error.message
      );
    }
  });

  // Check if VPN client is installed
  ipcMain.handle('vpn-client-status', async () => {
    try {
      const exePath = vpnLauncher.findTracExecutable();
      return createSuccessResponse({ installed: !!exePath, path: exePath });
    } catch (error) {
      if (logger) logger('error', `VPN client status error: ${error.message}`);
      return createSuccessResponse({ installed: false, path: null });
    }
  });

  // Cancel VPN connection
  ipcMain.handle('vpn-cancel', async () => {
    try {
      const cancelled = vpnLauncher.cancelVpnConnection();
      return createSuccessResponse({ cancelled });
    } catch (error) {
      if (logger) logger('error', `VPN cancel error: ${error.message}`);
      return createErrorResponse(
        ERROR_CODES.UNKNOWN_ERROR,
        'Failed to cancel VPN',
        error.message
      );
    }
  });

  // Get RuDesktop status
  ipcMain.handle('get-rudesktop-status', async () => {
    try {
      const status = rudesktopLauncher.getStatus();
      return createSuccessResponse(status);
    } catch (error) {
      if (logger) logger('error', `RuDesktop status error: ${error.message}`);
      return createErrorResponse(
        ERROR_CODES.UNKNOWN_ERROR,
        'Failed to get RuDesktop status',
        error.message
      );
    }
  });

  // Launch RuDesktop
  ipcMain.handle('launch-rudesktop', async () => {
    try {
      const result = rudesktopLauncher.launchRuDesktop();
      if (result.needsInstall) {
        return createErrorResponse(
          ERROR_CODES.CLIENT_NOT_FOUND,
          'RuDesktop not found',
          { needsInstall: true, downloadUrl: rudesktopLauncher.RUDESKTOP_DOWNLOAD_URL }
        );
      }
      return createSuccessResponse(result);
    } catch (error) {
      if (logger) logger('error', `RuDesktop launch error: ${error.message}`);
      return createErrorResponse(
        ERROR_CODES.CLIENT_LAUNCH_FAILED,
        'Failed to launch RuDesktop',
        error.message
      );
    }
  });

  // Open RuDesktop download page
  ipcMain.handle('open-rudesktop-download', async () => {
    try {
      rudesktopLauncher.openDownloadPage();
      return createSuccessResponse(true);
    } catch (error) {
      if (logger) logger('error', `RuDesktop download page error: ${error.message}`);
      return createErrorResponse(
        ERROR_CODES.UNKNOWN_ERROR,
        'Failed to open download page',
        error.message
      );
    }
  });

  // Launch A-Chat
  ipcMain.handle('launch-achat', async () => {
    try {
      const result = achatLauncher.launchAChat();
      if (result.needsInstall) {
        return createErrorResponse(
          ERROR_CODES.CLIENT_NOT_FOUND,
          'A-Чат не установлен',
          { needsInstall: true }
        );
      }
      return createSuccessResponse(result);
    } catch (error) {
      if (logger) logger('error', `A-Chat launch error: ${error.message}`);
      return createErrorResponse(
        ERROR_CODES.CLIENT_LAUNCH_FAILED,
        'Failed to launch A-Чат',
        error.message
      );
    }
  });

  // Open A-Chat web version
  ipcMain.handle('open-achat-web', async () => {
    try {
      achatLauncher.openWebVersion();
      return createSuccessResponse(true);
    } catch (error) {
      if (logger) logger('error', `A-Chat web error: ${error.message}`);
      return createErrorResponse(
        ERROR_CODES.UNKNOWN_ERROR,
        'Failed to open A-Чат',
        error.message
      );
    }
  });

  // Launch Tolk
  ipcMain.handle('launch-tolk', async () => {
    try {
      const result = tolkLauncher.launchTolk();
      if (result.needsInstall) {
        return createErrorResponse(
          ERROR_CODES.CLIENT_NOT_FOUND,
          'Толк не установлен',
          { needsInstall: true }
        );
      }
      return createSuccessResponse(result);
    } catch (error) {
      if (logger) logger('error', `Tolk launch error: ${error.message}`);
      return createErrorResponse(
        ERROR_CODES.CLIENT_LAUNCH_FAILED,
        'Failed to launch Толк',
        error.message
      );
    }
  });

  // Open Tolk web version
  ipcMain.handle('open-tolk-web', async () => {
    try {
      tolkLauncher.openWebVersion();
      return createSuccessResponse(true);
    } catch (error) {
      if (logger) logger('error', `Tolk web error: ${error.message}`);
      return createErrorResponse(
        ERROR_CODES.UNKNOWN_ERROR,
        'Failed to open Толк',
        error.message
      );
    }
  });
}

function killAllLaunchedProcesses(logger) {
  if (logger) logger('info', 'Killing all launched processes...');

  // Используем универсальный killAllProcesses - он убивает все процессы всех типов
  // Это работает благодаря тому, что все launchers используют одинаковый массив launchedProcesses
  // через require кэширование - это один и тот же массив в памяти
  rdpLauncher.killAllProcesses();

  // Дополнительно пытаемся убить процессы других launchers, если они загружены
  if (horizonLauncher && typeof horizonLauncher.killAllProcesses === 'function') {
    try { horizonLauncher.killAllProcesses(); } catch (e) { /* ignore */ }
  }
  if (citrixLauncher && typeof citrixLauncher.killAllProcesses === 'function') {
    try { citrixLauncher.killAllProcesses(); } catch (e) { /* ignore */ }
  }
}

module.exports = { setupLauncherIpcHandlers, killAllLaunchedProcesses };
