/**
 * Remote Desktop Manager - Main Process
 * Electron application for managing RDP, VMware Horizon, and Citrix Workspace connections
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Import modules
const loggerModule = require('./utils/logger');
const logger = loggerModule.log;
const initLogger = loggerModule.initLogger;
const setLogFile = loggerModule.setLogFile;
const SimpleStore = require('./stores/simpleStore');
const rdpLauncher = require('./launchers/rdpLauncher');
const horizonLauncher = require('./launchers/horizonLauncher');
const citrixLauncher = require('./launchers/citrixLauncher');
const autoUpdaterModule = require('./utils/autoUpdater');
const { version: appVersion } = require('../version');

// Default configuration
const BUILTIN_DEFAULTS = {
  settings: {
    rdp: {
      resolution: '1920x1080',
      colorDepth: '32',
      multimon: false,
      clipboard: true,
      driveMapping: false,
      useAdminSession: false,
      promptCredentials: true,
      startFullScreen: false,
      span: false,
      customFlags: ''
    },
    horizon: {
      serverUrl: '',
      desktopName: '',
      appName: '',
      userName: '',
      domainName: '',
      desktopProtocol: '',
      desktopLayout: '',
      monitors: '',
      unattended: false,
      nonInteractive: false,
      launchMinimized: false,
      loginAsCurrentUser: false,
      hideClientAfterLaunchSession: false,
      useExisting: false,
      singleAutoConnect: false,
      customPath: '',
      customFlags: ''
    },
    citrix: {
      storeUrl: '',
      resourceName: '',
      customPath: '',
      customFlags: ''
    },
    general: {
      minimizeToTray: false,
      startMinimized: false
    }
  },
  connections: [],
  profiles: []
};

let configStore = null;
let mainWindow = null;

// ==================== Deployment Config ====================

function resolveDeploymentConfigPath() {
  const candidates = [
    path.join(app.getAppPath(), 'config', 'deployment-defaults.json'),
    path.join(process.cwd(), 'config', 'deployment-defaults.json'),
    path.join(path.dirname(__dirname), 'config', 'deployment-defaults.json')
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        logger('info', `Found deployment config at: ${candidate}`);
        return candidate;
      }
    } catch (e) { continue; }
  }
  return null;
}

function readDeploymentDefaults() {
  const configPath = resolveDeploymentConfigPath();
  if (!configPath) return null;

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    logger('warn', 'Cannot parse deployment-defaults.json:', error.message);
    return null;
  }
}

// ==================== Store Initialization ====================

function normalizeConnections(connections = []) {
  let changed = false;

  const normalized = (Array.isArray(connections) ? connections : []).map((conn, index) => {
    if (!conn || typeof conn !== 'object') return conn;

    const result = { ...conn };

    // deployment-defaults.json entries historically didn't include id, but the UI uses it as a key and identifier.
    if (!result.id) {
      result.id = `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 9)}`;
      changed = true;
    }

    if (typeof result.type === 'string') {
      const lower = result.type.toLowerCase();
      if (lower !== result.type) {
        result.type = lower;
        changed = true;
      }
    }

    // Renderer expects per-connection overrides in `clientSettings`.
    if (result.defaultSettings && !result.clientSettings) {
      result.clientSettings = result.defaultSettings;
      changed = true;
    }

    return result;
  });

  return { normalized, changed };
}

function initializeStores() {
  const userDataPath = app.getPath('userData');
  logger('info', `User data path: ${userDataPath}`);

  configStore = new SimpleStore(path.join(userDataPath, 'config.json'), {
    settings: BUILTIN_DEFAULTS.settings,
    connections: [],
    profiles: []
  });

  const deploymentDefaults = readDeploymentDefaults();
  const existingConnections = configStore.get('connections', []);
  const existingProfiles = configStore.get('profiles', []);

  if (existingConnections.length === 0 && existingProfiles.length === 0) {
    const source = deploymentDefaults || BUILTIN_DEFAULTS;
    configStore.set('settings', { ...BUILTIN_DEFAULTS.settings, ...(source.settings || {}) });
    const { normalized } = normalizeConnections(source.connections || []);
    configStore.set('connections', normalized);
    configStore.set('profiles', source.profiles || []);
    logger('info', 'Default deployment profile has been applied');
  }

  // Migration: ensure all stored connections have an id and normalized structure.
  const currentConnections = configStore.get('connections', []);
  const { normalized, changed } = normalizeConnections(currentConnections);
  if (changed) {
    configStore.set('connections', normalized);
    logger('info', `Connections normalized (missing id/clientSettings fixed): ${currentConnections.length} entries`);
  }
}

// ==================== Window Management ====================

function createWindow() {
  logger('info', 'Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    frame: true,
    titleBarStyle: 'default'
  });

  // Load Vue app - use built files from dist-renderer
  const distPath = path.join(__dirname, '../../dist-renderer/index.html');
  const fsCheck = require('fs');

  if (fsCheck.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
    logger('info', `Loading Vue app from: ${distPath}`);
  } else {
    // Fallback to source files for development
    mainWindow.loadFile(path.join(__dirname, '../renderer-vue/index.html'));
    logger('info', 'Loading Vue app from source (dist not found)');
  }

  // Log any page errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger('error', `Failed to load: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['verbose', 'info', 'warn', 'error'];
    const logLevel = levels[level] || 'info';
    logger(logLevel, `[Renderer] ${message}`);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    logger('info', 'Main window shown');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    killAllLaunchedProcesses();
  });
}

function killAllLaunchedProcesses() {
  logger('info', 'Killing all launched processes...');
  rdpLauncher.killAllProcesses();
  horizonLauncher.killAllProcesses();
  citrixLauncher.killAllProcesses();
}

// ==================== Exception Handlers ====================

process.on('uncaughtException', (error) => {
  logger('error', `Uncaught Exception: ${error.message}`);
  logger('error', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger('error', `Unhandled Rejection: ${reason}`);
});

// ==================== IPC Handlers ====================

function setupIpcHandlers() {
  // Data handlers
  ipcMain.handle('get-connections', () => configStore ? configStore.get('connections', []) : []);
  ipcMain.handle('get-settings', () => configStore ? configStore.get('settings') : BUILTIN_DEFAULTS.settings);
  ipcMain.handle('get-profiles', () => configStore ? configStore.get('profiles', []) : []);

  // App version handler
  ipcMain.handle('get-version', () => appVersion);

  // Connection handlers
  ipcMain.handle('save-connection', (event, connection) => {
    const connections = configStore.get('connections', []);
    const idx = connections.findIndex(c => c.id === connection.id);
    if (idx >= 0) connections[idx] = connection;
    else { connection.id = Date.now().toString(); connections.push(connection); }
    configStore.set('connections', connections);
    return connection;
  });

  ipcMain.handle('delete-connection', (event, connectionId) => {
    const connections = configStore.get('connections', []);
    configStore.set('connections', connections.filter(c => c.id !== connectionId));
    return true;
  });

  // Settings handlers
  ipcMain.handle('save-settings', (event, settings) => {
    configStore.set('settings', settings);
    return true;
  });

  // Profile handlers
  ipcMain.handle('save-profile', (event, profile) => {
    const profiles = configStore.get('profiles', []);
    const idx = profiles.findIndex(p => p.id === profile.id);
    if (idx >= 0) profiles[idx] = profile;
    else { profile.id = Date.now().toString(); profiles.push(profile); }
    configStore.set('profiles', profiles);
    return profile;
  });

  ipcMain.handle('delete-profile', (event, profileId) => {
    const profiles = configStore.get('profiles', []);
    configStore.set('profiles', profiles.filter(p => p.id !== profileId));
    return true;
  });

  // Launch handlers
  ipcMain.handle('launch-rdp', async (event, connection, settings) => {
    try {
      rdpLauncher.launchRdp(connection, settings || {});
      return { success: true };
    } catch (error) {
      logger('error', `RDP launch error: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('launch-horizon', async (event, connection, settings) => {
    try {
      // Pass the full settings object - launcher will extract horizon settings
      horizonLauncher.launchHorizon(connection, settings || {});
      return { success: true };
    } catch (error) {
      logger('error', `Horizon launch error: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('launch-citrix', async (event, connection, settings) => {
    try {
      citrixLauncher.launchCitrix(connection, settings?.citrix || {});
      return { success: true };
    } catch (error) {
      logger('error', `Citrix launch error: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Auto-updater handlers
  autoUpdaterModule.setupIpcHandlers();
}

// ==================== App Lifecycle ====================

app.whenReady().then(() => {
  logger('info', 'App ready, starting...');
  logger('info', `Platform: ${process.platform}`);
  logger('info', `Electron: ${process.versions.electron}`);
  logger('info', `Node: ${process.versions.node}`);

  try {
    // Initialize logger with app reference
    initLogger(app);

    const userDataPath = app.getPath('userData');
    const logFilePath = path.join(userDataPath, 'app.log');
    setLogFile(logFilePath);

    try { fs.writeFileSync(logFilePath, ''); } catch (e) { /* ignore */ }

    logger('info', `Log file: ${logFilePath}`);

    initializeStores();
    setupIpcHandlers();
    createWindow();

    // Initialize auto-updater (only in production)
    if (!process.env.ELECTRON_DEV && app.isPackaged) {
      const githubConfig = {
        owner: 'DlnKot',
        repo: 'Agregator',
        currentVersion: app.getVersion()
      };
      autoUpdaterModule.initAutoUpdater(githubConfig);

      // Check for updates after startup (with delay)
      setTimeout(() => {
        autoUpdaterModule.checkForUpdates().catch(err => {
          logger('warn', `Auto-updater initial check failed: ${err.message}`);
        });
      }, 5000);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (error) {
    logger('error', `Startup error: ${error.message}`);
    logger('error', error.stack);
  }
});

app.on('window-all-closed', () => {
  killAllLaunchedProcesses();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', (event) => {
  logger('info', 'App is quitting...');
  killAllLaunchedProcesses();
  // Give processes time to cleanup
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }
});

logger('info', 'Main process initialized');
