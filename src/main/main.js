/**
 * Remote Desktop Manager - Main Process
 * Electron application for managing RDP, VMware Horizon, and Citrix Workspace connections
 * 
 * This is now a lightweight entry point that delegates to specialized modules.
 */

const { app } = require('electron');

// Import logger first
const loggerModule = require('./utils/logger');
const logger = loggerModule.log;

// Import app name from version
const { name: appNameFromFile } = require('../version.cjs');

// Import modular components
const { initializeStores, getStore } = require('./stores/storeManager');
const { initializeMetrics, flushMetrics } = require('./metrics/manager');
const { createWindow, getMainWindow } = require('./window/manager');
const { trySetDockIcon } = require('./window/dock');
const { setupAllIpcHandlers, killAllLaunchedProcesses } = require('./ipc');
const { setupLifecycleHandlers } = require('./lifecycle');

// Ensure the macOS Dock shows our app name even in dev runs (otherwise it can show "Electron").
try {
  const desiredName = appNameFromFile || 'Alfa Remote Client';
  if (typeof app.setName === 'function') app.setName(desiredName);
  // Best-effort: some surfaces in dev use process title or app.name.
  process.title = desiredName;
  app.name = desiredName;
} catch (err) {
  logger('warn', `Failed to set app name: ${err.message}`);
}

// ==================== Auto-updater Configuration ====================

function getAutoUpdateConfig() {
  return {
    currentVersion: app.getVersion(),
    updateUrl: 'https://10.230.121.212/electron/latest/'
  };
}

function initAutoUpdater(updateConfig) {
  const autoUpdaterModule = require('./utils/autoUpdater');
  autoUpdaterModule.initAutoUpdater(updateConfig);
  return autoUpdaterModule;
}

// ==================== Exception Handlers ====================

process.on('uncaughtException', (error) => {
  // Трекинг ошибки в метриках
  const metricsCollector = require('./utils/metricsCollector');
  if (metricsCollector && typeof metricsCollector.trackError === 'function') {
    try {
      metricsCollector.trackError(error);
    } catch (e) {
      logger('warn', `Failed to track uncaught exception in metrics: ${e.message}`);
    }
  }
  
  logger('error', `Uncaught Exception: ${error.message}`);
  logger('error', error.stack);

  // Best-effort graceful shutdown so we don't lose store changes.
  const configStore = getStore();
  try { 
    if (configStore && typeof configStore.flush === 'function') configStore.flush(); 
  } catch (err) {
    logger('error', `Failed to flush store on uncaught exception: ${err.message}`);
  }
  try { 
    flushMetrics(logger); 
  } catch (err) {
    logger('error', `Failed to flush metrics on uncaught exception: ${err.message}`);
  }

  // Quit Electron; if it hangs, force-exit.
  try { 
    app.quit(); 
  } catch (err) {
    logger('error', `Failed to quit app gracefully: ${err.message}`);
  }
  setTimeout(() => {
    try { 
      process.exit(1); 
    } catch (err) {
      logger('error', `Failed to force exit: ${err.message}`);
    }
  }, 1500);
});

process.on('unhandledRejection', (reason) => {
  // Трекинг ошибки в метриках
  const metricsCollector = require('./utils/metricsCollector');
  if (metricsCollector && typeof metricsCollector.trackError === 'function') {
    try {
      metricsCollector.trackError(new Error(String(reason)));
    } catch (e) {
      logger('warn', `Failed to track unhandled rejection in metrics: ${e.message}`);
    }
  }
  
  logger('error', `Unhandled Rejection: ${reason}`);
});

// ==================== Setup Application ====================

// Prepare dependencies for lifecycle handler
const lifecycleDeps = {
  app,
  logger,
  initializeStores: (log) => initializeStores(log),
  initializeMetrics: (store, path, log) => initializeMetrics(store, path, log),
  flushMetrics: (log) => flushMetrics(log),
  setupAllIpcHandlers: (log) => setupAllIpcHandlers(log),
  createWindow: (log, version) => createWindow(log, version),
  trySetDockIcon: (log) => trySetDockIcon(log),
  killAllLaunchedProcesses: (log) => killAllLaunchedProcesses(log),
  getMainWindow,
  getStore,
  getAutoUpdateConfig,
  initAutoUpdater,
  appNameFromFile
};

// Setup lifecycle handlers
setupLifecycleHandlers(lifecycleDeps);

logger('info', 'Main process initialized');
