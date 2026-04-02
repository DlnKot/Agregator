/**
 * Application lifecycle handlers
 * Handles: app.ready, app.window-all-closed, app.before-quit, app.activate
 */

function setupLifecycleHandlers(deps) {
  const {
    app,
    logger,
    initializeStores,
    initializeMetrics,
    flushMetrics,
    setupAllIpcHandlers,
    createWindow,
    trySetDockIcon,
    killAllLaunchedProcesses,
    getMainWindow,
    getStore,
    getAutoUpdateConfig,
    initAutoUpdater,
    appNameFromFile
  } = deps;

  app.whenReady().then(() => {
    // SECURITY NOTE:
    // Do NOT globally disable TLS/certificate verification. If internal endpoints use a private CA,
    // ship that CA and rely on NODE_EXTRA_CA_CERTS (see src/main/utils/autoUpdater.js).
    //
    // If you *must* temporarily bypass TLS verification for debugging, set:
    //   ARC_ALLOW_INSECURE_TLS=1
    // This keeps the default secure.
    if (process.env.ARC_ALLOW_INSECURE_TLS === '1') {
      app.commandLine.appendSwitch('ignore-certificate-errors');
      // Intentionally do NOT set ignore-certificate-errors-spki-list='*' (too broad).
      logger('warn', 'SECURITY: ARC_ALLOW_INSECURE_TLS=1 enabled. TLS certificate verification is disabled.');
    }

    logger('info', 'App ready, starting...');
    logger('info', `Platform: ${process.platform}`);
    logger('info', `Electron: ${process.versions.electron}`);
    logger('info', `Node: ${process.versions.node}`);

    try {
      const { Menu, BrowserWindow } = require('electron');
      const fs = require('fs');
      const path = require('path');
      
      // Remove menu bar everywhere (including macOS app menu).
      try { Menu.setApplicationMenu(null); } catch { /* ignore */ }

      // Initialize logger with app reference
      const loggerModule = require('./utils/logger');
      loggerModule.initLogger(app);

      const userDataPath = app.getPath('userData');
      const logFilePath = path.join(userDataPath, 'app.log');
      loggerModule.setLogFile(logFilePath);

      try { fs.writeFileSync(logFilePath, ''); } catch (e) { /* ignore */ }

      logger('info', `Log file: ${logFilePath}`);

      trySetDockIcon(logger);
      
      const configStore = initializeStores(logger);
      initializeMetrics(configStore, userDataPath, logger);
      
      setupAllIpcHandlers(logger);
      
      const mainWindow = createWindow(logger, appNameFromFile || 'Alfa Remote Client');

      // Initialize auto-updater (only in production)
      if (!process.env.ELECTRON_DEV && app.isPackaged) {
        const settings = configStore ? (configStore.get('settings') || {}) : {};
        const updateConfig = getAutoUpdateConfig(settings);
        initAutoUpdater(updateConfig);

        // Check for updates after startup (with delay)
        setTimeout(() => {
          const autoUpdaterModule = require('./utils/autoUpdater');
          autoUpdaterModule.checkForUpdates().catch(err => {
            logger('warn', `Auto-updater initial check failed: ${err.message}`);
          });
        }, 5000);
      }

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow(logger, appNameFromFile || 'Alfa Remote Client');
        }
      });
    } catch (error) {
      logger('error', `Startup error: ${error.message}`);
      logger('error', error.stack);
    }
  });

  app.on('window-all-closed', () => {
    killAllLaunchedProcesses(logger);
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', (event) => {
    logger('info', 'App is quitting...');
    killAllLaunchedProcesses(logger);

    // Отправка метрик перед закрытием
    flushMetrics(logger);

    // Принудительно сохраняем все данные перед закрытием
    const configStore = getStore();
    if (configStore && typeof configStore.flush === 'function') {
      configStore.flush();
    }

    // Give processes time to cleanup
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
  });
}

module.exports = { setupLifecycleHandlers };
