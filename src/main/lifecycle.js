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
    logger('info', 'App ready, starting...');
    logger('info', `Platform: ${process.platform}`);
    logger('info', `Electron: ${process.versions.electron}`);
    logger('info', `Node: ${process.versions.node}`);

    try {
      const { Menu, BrowserWindow } = require('electron');
      const fs = require('fs');
      const path = require('path');
      
      // Remove menu bar everywhere (including macOS app menu).
      try {
        Menu.setApplicationMenu(null);
      } catch (e) {
        logger('warn', `Failed to clear app menu: ${e.message}`);
      }

      // Initialize logger with app reference
      const loggerModule = require('./utils/logger');
      loggerModule.initLogger(app);

      const userDataPath = app.getPath('userData');
      const logFilePath = path.join(userDataPath, 'app.log');
      loggerModule.setLogFile(logFilePath);

      try {
        fs.writeFileSync(logFilePath, '');
      } catch (e) {
        logger('warn', `Failed to truncate log file: ${e.message}`);
      }

      logger('info', `Log file: ${logFilePath}`);

      trySetDockIcon(logger);
      
      const configStore = initializeStores(logger);
      initializeMetrics(configStore, userDataPath, logger);
      
      setupAllIpcHandlers(logger);
      
      const mainWindow = createWindow(logger, appNameFromFile || 'Alfa Remote Client');

      // Initialize auto-updater (only in production)
      if (!process.env.ELECTRON_DEV && app.isPackaged) {
        const updateConfig = getAutoUpdateConfig();
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
    try {
      killAllLaunchedProcesses(logger);
    } catch (e) {
      logger('warn', `Failed to kill launched processes on quit: ${e.message}`);
    }

    // Отправка метрик перед закрытием
    try {
      flushMetrics(logger);
    } catch (e) {
      logger('warn', `Failed to flush metrics on quit: ${e.message}`);
    }

    // Принудительно сохраняем все данные перед закрытием
    const configStore = getStore();
    if (configStore && typeof configStore.flush === 'function') {
      try {
        configStore.flush();
      } catch (e) {
        logger('warn', `Failed to flush store on quit: ${e.message}`);
      }
    }

    // Give processes time to cleanup
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.destroy();
      } catch (e) {
        logger('warn', `Failed to destroy main window on quit: ${e.message}`);
      }
    }
  });
}

module.exports = { setupLifecycleHandlers };
