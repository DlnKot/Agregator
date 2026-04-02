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
} catch { /* ignore */ }

// ==================== Auto-updater Configuration ====================

function getAutoUpdateConfig(settings) {
  const useGithub = settings?.updates?.useGithub === true;
  
  return {
    currentVersion: app.getVersion(),
    // By default use corporate update server (HTTPS with optional HTTP fallback).
    updateUrl: 'https://10.230.121.212/electron/latest/',
    updateUrlHttp: 'http://10.230.121.212/electron/latest/',
    // Dev/test switch: use GitHub releases instead of corporate server.
    useGithub
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
    try { metricsCollector.trackError(error); } catch (e) { /* ignore */ }
  }
  
  logger('error', `Uncaught Exception: ${error.message}`);
  logger('error', error.stack);

  // Best-effort graceful shutdown so we don't lose store changes.
  const configStore = getStore();
  try { if (configStore && typeof configStore.flush === 'function') configStore.flush(); } catch { /* ignore */ }
  try { flushMetrics(logger); } catch { /* ignore */ }

  // Quit Electron; if it hangs, force-exit.
  try { app.quit(); } catch { /* ignore */ }
  setTimeout(() => {
    try { process.exit(1); } catch { /* ignore */ }
  }, 1500);
});

process.on('unhandledRejection', (reason) => {
  // Трекинг ошибки в метриках
  const metricsCollector = require('./utils/metricsCollector');
  if (metricsCollector && typeof metricsCollector.trackError === 'function') {
    try { metricsCollector.trackError(new Error(String(reason))); } catch (e) { /* ignore */ }
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
