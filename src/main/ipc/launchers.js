/**
 * Launcher IPC handlers
 * Handles: launch-rdp, launch-horizon, launch-citrix, launch-vpn
 */

const { ipcMain } = require('electron');
const rdpLauncher = require('../launchers/rdpLauncher');
const horizonLauncher = require('../launchers/horizonLauncher');
const citrixLauncher = require('../launchers/citrixLauncher');
const vpnLauncher = require('../launchers/vpnLauncher');

function setupLauncherIpcHandlers(logger) {
  const ok = (data) => ({ success: true, data });
  const fail = (error, extra = {}) => ({ success: false, error: error?.message || String(error), ...extra });

  // Launch RDP
  ipcMain.handle('launch-rdp', async (event, connection, settings) => {
    try {
      rdpLauncher.launchRdp(connection, settings || {});
      return ok(true);
    } catch (error) {
      if (logger) logger('error', `RDP launch error: ${error.message}`);
      return fail(error);
    }
  });

  // Launch Horizon
  ipcMain.handle('launch-horizon', async (event, connection, settings) => {
    try {
      horizonLauncher.launchHorizon(connection, settings || {});
      return ok(true);
    } catch (error) {
      if (logger) logger('error', `Horizon launch error: ${error.message}`);
      // Check if client not found
      const notFound = error.message?.includes('not found') || error.message?.includes('Not found');
      return fail(error, notFound ? { needsInstall: true, clientType: 'horizon' } : {});
    }
  });

  // Launch Citrix
  ipcMain.handle('launch-citrix', async (event, connection, settings) => {
    try {
      citrixLauncher.launchCitrix(connection, settings?.citrix || {});
      return ok(true);
    } catch (error) {
      if (logger) logger('error', `Citrix launch error: ${error.message}`);
      // Check if client not found
      const notFound = error.message?.includes('not found') || error.message?.includes('Not found');
      return fail(error, notFound ? { needsInstall: true, clientType: 'citrix' } : {});
    }
  });

  // Launch VPN
  ipcMain.handle('launch-vpn', async () => {
    try {
      vpnLauncher.launchVpn();
      return ok(true);
    } catch (error) {
      if (logger) logger('error', `VPN launch error: ${error.message}`);
      return fail(error);
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
