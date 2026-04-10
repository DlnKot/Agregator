/**
 * Window management
 */

const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let mainWindow = null;

function getMainWindow() {
  return mainWindow;
}

function resolveAssetPath(relPath) {
  const candidates = [
    // Packaged: Resources folder (macOS/Windows)
    path.join(process.resourcesPath || '', relPath),
    // Dev: project root
    path.join(app.getAppPath(), relPath),
    // Dev: based on src/main/window (../../ = project root)
    path.join(__dirname, '../../../', relPath)
  ];

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {
      // Best effort path probing; continue to the next candidate.
    }
  }
  return null;
}

function createWindow(logger, appVersion) {
  if (logger) logger('info', 'Creating main window...');

  const windowIconPath = resolveAssetPath(path.join('assets', 'icon.png'));
  // __dirname = src/main/window/, so ../../ = project root
  const preloadPath = path.join(__dirname, '../../preload/preload.js');

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f0f0f',
    title: appVersion || 'Alfa Remote Client',
    // On Windows/Linux this sets the taskbar/window icon. On macOS it doesn't affect the Dock icon.
    ...(windowIconPath ? { icon: windowIconPath } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
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
  } catch (e) {
    if (logger) logger('warn', `Failed to hide menu bar: ${e.message}`);
  }

  // Dev: load Vite dev server for hot reload.
  if (!app.isPackaged && process.env.ELECTRON_DEV) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    if (logger) logger('info', `Loading Vue dev server: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl);
  } else {
    // Prod (or dev without server): use built files from dist-renderer if present.
    const distPath = path.join(__dirname, '../../../dist-renderer/index.html');

    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath);
      if (logger) logger('info', `Loading Vue app from: ${distPath}`);
    } else {
      // Fallback to source files for development
      mainWindow.loadFile(path.join(__dirname, '../../../src/renderer-vue/index.html'));
      if (logger) logger('info', 'Loading Vue app from source (dist not found)');
    }
  }

  // Log any page errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (logger) logger('error', `Failed to load: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['verbose', 'info', 'warn', 'error'];
    const logLevel = levels[level] || 'info';
    if (logger) logger(logLevel, `[Renderer] ${message}`);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (logger) logger('info', 'Main window shown');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

module.exports = { getMainWindow, createWindow, resolveAssetPath };
