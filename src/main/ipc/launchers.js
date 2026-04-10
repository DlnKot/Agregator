/**
 * Launcher IPC handlers
 * Handles: launch-rdp, launch-horizon, launch-citrix, launch-vpn
 */

const { ipcMain } = require('electron');
const rdpLauncher = require('../launchers/rdpLauncher');
const horizonLauncher = require('../launchers/horizonLauncher');
const citrixLauncher = require('../launchers/citrixLauncher');
const vpnLauncher = require('../launchers/vpnLauncher');
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

  // Launch VPN
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
