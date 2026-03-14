/**
 * Auto Updater Module - handles automatic updates from GitHub releases
 */
const { autoUpdater } = require('electron-updater');
const { BrowserWindow, dialog, ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { log: logger } = require('./logger');

// Configure auto-updater logging
autoUpdater.logger = {
    info: (message) => logger('info', `[AutoUpdater] ${message}`),
    warn: (message) => logger('warn', `[AutoUpdater] ${message}`),
    error: (message) => logger('error', `[AutoUpdater] ${message}`),
    debug: (message) => logger('debug', `[AutoUpdater] ${message}`)
};

autoUpdater.logger.transports = { level: 'info' };

// Enable debugging only in development mode
if (process.env.NODE_ENV === 'development') {
    process.env.ELECTRON_DEBUG = '1';
}

// Track if update is available
let updateAvailable = false;
let updateDownloaded = false;
let updateInfo = null;

function getExpectedUpdateConfigPath() {
    // electron-updater:
    // - prod: process.resourcesPath/app-update.yml
    // - dev (forceDevUpdateConfig): app.getAppPath()/dev-app-update.yml
    // We only use it for a friendly "missing file" check before checkForUpdates().
    const fileName = autoUpdater.forceDevUpdateConfig ? 'dev-app-update.yml' : 'app-update.yml';
    const baseDir = autoUpdater.forceDevUpdateConfig ? app.getAppPath() : process.resourcesPath;
    return path.join(baseDir, fileName);
}

/**
 * Initialize auto-updater with GitHub settings
 * @param {Object} config - Configuration with publish settings
 */
function initAutoUpdater(config = {}) {
    // Prevent a noisy ENOENT on macOS/Windows if the app was built without update metadata.
    // In production electron-updater always tries to read process.resourcesPath/app-update.yml.
    const updateConfigPath = getExpectedUpdateConfigPath();
    if (app.isPackaged) {
        try {
            if (!fs.existsSync(updateConfigPath)) {
                const message = `AutoUpdater: Missing update config (${updateConfigPath}). ` +
                    `Build must be produced by electron-builder with a non-null "publish" config.`;
                logger('error', message);
                notifyRenderer('update-error', { message });
                return;
            }
        } catch (e) {
            // If we cannot stat the file for some reason, keep going and let electron-updater emit a proper error.
            logger('warn', `AutoUpdater: Cannot verify update config file: ${e.message || e}`);
        }
    }

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
        const rawMessage = error?.message || String(error);
        const message = /Cannot find latest-mac\.yml/i.test(rawMessage) || /\b404\b/.test(rawMessage)
            ? (
                'AutoUpdater: Cannot download update metadata (latest-mac.yml).\n' +
                'Checklist:\n' +
                '1) GitHub Release for the current channel is published (not Draft).\n' +
                '2) Release assets contain `latest-mac.yml` and the corresponding `*-mac.zip`.\n' +
                '3) If the repo is private, the app must be configured with an auth token to download assets.\n' +
                `Original error: ${rawMessage}`
            )
            : `AutoUpdater: Error - ${rawMessage}`;

        logger('error', message);
        notifyRenderer('update-error', { message });
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
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (!mainWindow) {
        // No window, just install directly
        logger('info', 'AutoUpdater: No window found, installing directly');
        installUpdateDirect();
        return;
    }

    const result = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Обновление готово',
        message: `Доступна версия ${info.version}`,
        detail: 'Приложение будет перезагружено для установки обновления.',
        buttons: ['Перезагрузить сейчас', 'Позже'],
        defaultId: 0,
        cancelId: 1
    });

    if (result.response === 0) {
        logger('info', 'AutoUpdater: User chose to restart now, closing all windows...');
        // Close all windows to release file handles
        BrowserWindow.getAllWindows().forEach(window => {
            window.close();
        });
        // Give windows time to close, then install
        setTimeout(() => {
            installUpdateDirect();
        }, 500);
    } else {
        logger('info', 'AutoUpdater: User chose to install later');
    }
}

/**
 * Install update and quit
 */
function installUpdateDirect() {
    try {
        logger('info', 'AutoUpdater: Installing update...');

        // For better reliability on Windows, give extra time for file handles to release
        if (process.platform === 'win32') {
            setTimeout(() => {
                try {
                    // Parameters: isSilent (true = no progress window), isForceRunAfter (true = launch after install)
                    autoUpdater.quitAndInstall(true, true);
                } catch (err) {
                    logger('error', `AutoUpdater: quitAndInstall failed: ${err.message}`);
                    // Force quit if quitAndInstall fails
                    app.quit();
                }
            }, 1000);
        } else {
            // macOS and Linux - install immediately
            autoUpdater.quitAndInstall(true, true);
        }
    } catch (error) {
        logger('error', `AutoUpdater: Failed to install update - ${error.message}`);
        // Emergency exit if installation fails
        app.quit();
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
    logger('info', 'AutoUpdater: User triggered manual installation');
    // Close all windows to release file handles before installation
    BrowserWindow.getAllWindows().forEach(window => {
        window.close();
    });
    // Give windows time to close, then install
    setTimeout(() => {
        installUpdateDirect();
    }, 500);
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
