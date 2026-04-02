/**
 * IPC module exports
 * Centralized setup for all IPC handlers
 */

const autoUpdaterModule = require('../utils/autoUpdater');

const { setupAppIpcHandlers } = require('./app');
const { setupConnectionIpcHandlers } = require('./connections');
const { setupSettingsIpcHandlers } = require('./settings');
const { setupProfileIpcHandlers } = require('./profiles');
const { setupLauncherIpcHandlers, killAllLaunchedProcesses } = require('./launchers');
const { setupNetworkIpcHandlers } = require('./network');
const { setupMetricsIpcHandlers } = require('./metrics');
const { setupInstallerIpcHandlers } = require('./installer');

function setupAllIpcHandlers(logger) {
  setupAppIpcHandlers(logger);
  setupConnectionIpcHandlers(logger);
  setupSettingsIpcHandlers(logger);
  setupProfileIpcHandlers(logger);
  setupLauncherIpcHandlers(logger);
  setupNetworkIpcHandlers(logger);
  setupMetricsIpcHandlers();
  setupInstallerIpcHandlers(logger);
  
  // Auto-updater handlers (setup in its own module)
  autoUpdaterModule.setupIpcHandlers();
}

module.exports = {
  setupAllIpcHandlers,
  setupAppIpcHandlers,
  setupConnectionIpcHandlers,
  setupSettingsIpcHandlers,
  setupProfileIpcHandlers,
  setupLauncherIpcHandlers,
  setupNetworkIpcHandlers,
  setupMetricsIpcHandlers,
  setupInstallerIpcHandlers,
  killAllLaunchedProcesses
};
