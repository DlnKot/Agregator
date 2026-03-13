/**
 * Auto Updater Module - handles automatic updates from GitHub releases
 */
const { autoUpdater } = require('electron-updater');
const { BrowserWindow, dialog, ipcMain, app } = require('electron');
const { log: logger } = require('./logger');

// Configure auto-updater logging
autoUpdater.logger = {
    info: (message) => logger('info', `[AutoUpdater] ${message}`),
    warn: (message) => logger('warn', `[AutoUpdater] ${message}`),
    error: (message) => logger('error', `[AutoUpdater] ${message}`),
    debug: (message) => logger('debug', `[AutoUpdater] ${message}`)
};

autoUpdater.logger.transports = { level: 'info' };

// Enable debugging
process.env.ELECTRON_DEBUG = '1';

// Track if update is available
let updateAvailable = false;
let updateDownloaded = false;
let updateInfo = null;

/**
 * Initialize auto-updater with GitHub settings
 * @param {Object} config - Configuration with publish settings
 */
function initAutoUpdater(config = {}) {
    // Configure GitHub publish settings
    if (config.owner && config.repo) {
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;

        logger('info', `AutoUpdater: Initialized for ${config.owner}/${config.repo}`);
        logger('info', `AutoUpdater: Current version - ${config.currentVersion}`);
    } else {
        logger('warn', 'AutoUpdater: GitHub owner/repo not configured. Updates disabled.');
        return;
    }

    // Set up event handlers
    autoUpdater.on('checking-for-update', () => {
        logger('info', 'AutoUpdater: Checking for updates...');
        updateAvailable = false;
        updateDownloaded = false;
    });

    autoUpdater.on('update-available', (info) => {
        logger('info', `AutoUpdater: Update available - ${info.version}`);
        updateAvailable = true;
        updateInfo = info;

        // Notify renderer process
        notifyRenderer('update-available', {
            version: info.version,
            releaseDate: info.releaseDate,
            releaseNotes: info.releaseNotes
        });
    });

    autoUpdater.on('update-not-available', (info) => {
        logger('info', `AutoUpdater: No update available. Current version is latest.`);
        updateAvailable = false;
    });

    autoUpdater.on('download-progress', (progressObj) => {
        const logMessage = `AutoUpdater: Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent.toFixed(1)}%`;
        logger('info', logMessage);

        notifyRenderer('download-progress', {
            percent: progressObj.percent,
            bytesPerSecond: progressObj.bytesPerSecond,
            transferred: progressObj.transferred,
            total: progressObj.total
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        logger('info', `AutoUpdater: Update downloaded - ${info.version}`);
        updateDownloaded = true;
        updateInfo = info;

        // Notify renderer
        notifyRenderer('update-downloaded', {
            version: info.version,
            releaseDate: info.releaseDate,
            releaseNotes: info.releaseNotes
        });

        // Show dialog to user
        showUpdateReadyDialog(info);
    });

    autoUpdater.on('error', (error) => {
        logger('error', `AutoUpdater: Error - ${error.message}`);
        notifyRenderer('update-error', { message: error.message });
    });
}

/**
 * Notify renderer process about update events
 */
function notifyRenderer(event, data) {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
        if (win && !win.isDestroyed()) {
            win.webContents.send('auto-update-event', { event, data });
        }
    }
}

/**
 * Show dialog when update is ready to install
 */
async function showUpdateReadyDialog(info) {
    const mainWindow = BrowserWindow.getFocusedWindow();
    if (!mainWindow) return;

    const result = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Обновление готово',
        message: `Доступна версия ${info.version}`,
        detail: 'Новое обновление было загружено. Перезапустите приложение для установки обновления.',
        buttons: ['Перезагрузить сейчас', 'Позже'],
        defaultId: 0,
        cancelId: 1
    });

    if (result.response === 0) {
        logger('info', 'AutoUpdater: User chose to restart now');
        autoUpdater.quitAndInstall(false, true);
    } else {
        logger('info', 'AutoUpdater: User chose to install later');
    }
}

/**
 * Check for updates (manual trigger)
 */
async function checkForUpdates() {
    try {
        logger('info', 'AutoUpdater: Manual check for updates triggered');
        await autoUpdater.checkForUpdates();
        return { success: true };
    } catch (error) {
        logger('error', `AutoUpdater: Check failed - ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Download update (manual trigger)
 */
async function downloadUpdate() {
    try {
        logger('info', 'AutoUpdater: Starting update download');
        await autoUpdater.downloadUpdate();
        return { success: true };
    } catch (error) {
        logger('error', `AutoUpdater: Download failed - ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Install downloaded update
 */
function installUpdate() {
    logger('info', 'AutoUpdater: Installing update and restarting');
    autoUpdater.quitAndInstall(false, true);
}

/**
 * Get current update status
 */
function getUpdateStatus() {
    return {
        updateAvailable,
        updateDownloaded,
        version: updateInfo?.version || null
    };
}

/**
 * Set up IPC handlers for renderer communication
 */
function setupIpcHandlers() {
    ipcMain.handle('check-for-updates', async () => {
        return await checkForUpdates();
    });

    ipcMain.handle('download-update', async () => {
        return await downloadUpdate();
    });

    ipcMain.handle('install-update', () => {
        installUpdate();
    });

    ipcMain.handle('get-update-status', () => {
        return getUpdateStatus();
    });
}

module.exports = {
    initAutoUpdater,
    setupIpcHandlers,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    getUpdateStatus
};
