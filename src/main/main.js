/**
 * Remote Desktop Manager - Main Process
 * Electron application for managing RDP, VMware Horizon, and Citrix Workspace connections
 */
const { app, BrowserWindow, ipcMain, nativeImage, Menu, shell } = require('electron');
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
const vpnLauncher = require('./launchers/vpnLauncher');
const autoUpdaterModule = require('./utils/autoUpdater');
const networkCheck = require('./utils/networkCheck');
const { version: appVersion, name: appNameFromFile } = require('../version');

// Ensure the macOS Dock shows our app name even in dev runs (otherwise it can show "Electron").
try {
  const desiredName = appNameFromFile || 'Alfa Remote Client';
  if (typeof app.setName === 'function') app.setName(desiredName);
  // Best-effort: some surfaces in dev use process title or app.name.
  process.title = desiredName;
  app.name = desiredName;
} catch { /* ignore */ }

// Default configuration
const BUILTIN_DEFAULTS = {
  settings: {
    rdp: {
      // Базовые настройки
      host: '',
      resolution: '1920x1080',
      colorDepth: '32',
      
      // Мониторы
      multimon: false,
      span: false,
      startFullScreen: false,
      
      // Перенаправление устройств
      clipboard: true,
      driveMapping: false,
      
      // Учётные данные
      promptCredentials: true,
      useAdminSession: false,
      
      // Аудио
      audio: {
        playback: true,
        capture: false
      },
      
      // Перенаправление
      redirect: {
        printers: true,
        smartcards: true,
        webauthn: true
      },
      
      // Производительность
      performance: {
        wallpaper: true,
        fontSmoothing: true,
        desktopComposition: true,
        fullWindowDrag: true,
        menuAnimations: true
      },
      
      // Кастомные флаги
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
      accountName: '',
      resourceName: '',
      customPath: '',
      customFlags: ''
    },
    general: {
      minimizeToTray: false,
      startMinimized: false
    },
    networkCheck: {
      latencyThresholdMs: 100
    }
  },
  connections: [],
  profiles: []
};

let configStore = null;
let mainWindow = null;

function resolveAssetPath(relPath) {
  const candidates = [
    // Packaged: Resources folder (macOS/Windows)
    path.join(process.resourcesPath || '', relPath),
    // Dev: project root
    path.join(app.getAppPath(), relPath),
    // Dev: based on src/main
    path.join(__dirname, '..', '..', relPath)
  ];

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch { /* ignore */ }
  }
  return null;
}

function trySetDockIcon() {
  // In dev (`npm run start` / `electron .`) macOS Dock icon stays Electron's
  // unless we override it programmatically.
  if (process.platform !== 'darwin') return;
  if (!app.dock || typeof app.dock.setIcon !== 'function') return;

  const iconPath = resolveAssetPath(path.join('assets', 'icon.png'));
  if (!iconPath) return;

  try {
    const img = nativeImage.createFromPath(iconPath);
    if (!img || img.isEmpty()) return;
    app.dock.setIcon(img);
    logger('info', `Dock icon set from: ${iconPath}`);
  } catch (e) {
    logger('warn', `Cannot set Dock icon: ${e?.message || String(e)}`);
  }
}

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

  const windowIconPath = resolveAssetPath(path.join('assets', 'icon.png'));

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f0f0f',
    title: appNameFromFile || 'Alfa Remote Client',
    // On Windows/Linux this sets the taskbar/window icon. On macOS it doesn't affect the Dock icon.
    ...(windowIconPath ? { icon: windowIconPath } : {}),
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

  // Remove menu bar everywhere (File/Help/etc).
  try {
    mainWindow.setMenu(null);
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setAutoHideMenuBar(true);
  } catch { /* ignore */ }

  // Dev: load Vite dev server for hot reload.
  if (!app.isPackaged && process.env.ELECTRON_DEV) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    logger('info', `Loading Vue dev server: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl);
  } else {
    // Prod (or dev without server): use built files from dist-renderer if present.
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

  ipcMain.handle('launch-vpn', async () => {
    try {
      vpnLauncher.launchVpn();
      return { success: true };
    } catch (error) {
      logger('error', `VPN launch error: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-platform', () => {
    return process.platform;
  });

  ipcMain.handle('open-external', async (event, url) => {
    const u = String(url || '').trim();
    if (!u) return { success: false, error: 'Empty URL' };

    // Валидация URL - разрешаем только безопасные протоколы
    try {
      const parsedUrl = new URL(u);
      const allowedProtocols = ['https:', 'http:', 'mailto:'];
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        logger('warn', `openExternal: Blocked unsafe protocol: ${parsedUrl.protocol}`);
        return { success: false, error: 'Недопустимый протокол. Разрешены только http, https и mailto' };
      }
    } catch (e) {
      return { success: false, error: 'Неверный формат URL' };
    }

    try {
      await shell.openExternal(u);
      return { success: true };
    } catch (e) {
      return { success: false, error: e?.message || String(e) };
    }
  });

  // Network check
  ipcMain.handle('network-run-full-check', async (event, payload) => {
    try {
      const res = await networkCheck.runFullNetworkCheck(payload || {});
      return { success: true, data: res };
    } catch (error) {
      logger('error', `Network check error: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('network-run-ping', async (event, host, count) => {
    try {
      const ping = await networkCheck.runPing(String(host || ''), count);
      const settings = configStore ? (configStore.get('settings') || {}) : BUILTIN_DEFAULTS.settings;
      const thresholdMs = settings?.networkCheck?.latencyThresholdMs ?? 100;
      const evaluation = networkCheck.evaluatePing(ping, thresholdMs);
      return { success: true, data: { ping, evaluation } };
    } catch (error) {
      logger('error', `Network ping error: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('network-geo', async () => {
    try {
      const res = await networkCheck.fetchGeo();
      return { success: true, data: res };
    } catch (error) {
      logger('error', `Network geo error: ${error.message}`);
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
    // Remove menu bar everywhere (including macOS app menu).
    try { Menu.setApplicationMenu(null); } catch { /* ignore */ }

    // Initialize logger with app reference
    initLogger(app);

    const userDataPath = app.getPath('userData');
    const logFilePath = path.join(userDataPath, 'app.log');
    setLogFile(logFilePath);

    try { fs.writeFileSync(logFilePath, ''); } catch (e) { /* ignore */ }

    logger('info', `Log file: ${logFilePath}`);

    trySetDockIcon();
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

  // Принудительно сохраняем все данные перед закрытием
  if (configStore && typeof configStore.flush === 'function') {
    configStore.flush();
  }

  // Give processes time to cleanup
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }
});

logger('info', 'Main process initialized');
