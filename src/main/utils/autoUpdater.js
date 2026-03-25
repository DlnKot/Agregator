/**
 * Auto Updater Module - handles automatic updates from custom server
 */
const { autoUpdater } = require('electron-updater');
const { BrowserWindow, dialog, ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { log: logger } = require('./logger');

// Configure auto-updater logging
autoUpdater.logger = {
    info: (message) => logger('info', `[AutoUpdater] ${message}`),
    warn: (message) => logger('warn', `[AutoUpdater] ${message}`),
    error: (message) => logger('error', `[AutoUpdater] ${message}`),
    debug: (message) => logger('debug', `[AutoUpdater] ${message}`)
};

autoUpdater.logger.transports = { level: 'info' };

// Security: Load custom CA certificate if provided for self-signed certificates
// Use environment variable: NODE_EXTRA_CA_CERTS=/path/to/ca.pem
// Or place ca.pem in app root and it will be loaded automatically
const loadCustomCertificate = () => {
    const possiblePaths = [
        path.join(app.getAppPath(), 'ca.pem'),
        path.join(app.getAppPath(), 'config', 'ca.pem'),
        process.env.NODE_EXTRA_CA_CERTS
    ];

    for (const certPath of possiblePaths) {
        if (certPath && fs.existsSync(certPath)) {
            try {
                process.env.NODE_EXTRA_CA_CERTS = certPath;
                logger('info', `AutoUpdater: Custom CA certificate loaded from ${certPath}`);
                return true;
            } catch (e) {
                logger('warn', `AutoUpdater: Failed to load custom CA certificate: ${e.message}`);
            }
        }
    }
    return false;
};

// Load custom certificate on startup
loadCustomCertificate();

// Enable debugging only in development mode
if (process.env.NODE_ENV === 'development') {
    process.env.ELECTRON_DEBUG = '1';
}

// Track if update is available
let updateAvailable = false;
let updateDownloaded = false;
let updateInfo = null;
let publishConfig = null;

// Custom server URL for updates
const CUSTOM_UPDATE_URL = 'https://10.230.121.212/electron/latest/';
const CUSTOM_UPDATE_URL_HTTP = 'http://10.230.121.212/electron/latest/';

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
 * Initialize auto-updater with custom server settings
 * @param {Object} config - Configuration with server settings
 */
function initAutoUpdater(config = {}) {
    publishConfig = config && typeof config === 'object' ? { ...config } : null;

    // Очищаем старые обработчики событий перед добавлением новых
    // Это предотвращает утечку памяти при переинициализации
    const events = [
        'checking-for-update',
        'update-available',
        'update-not-available',
        'download-progress',
        'update-downloaded',
        'error'
    ];

    // Безопасное удаление слушателей - проверяем существование метода
    if (typeof autoUpdater.removeAllListeners === 'function') {
        for (const eventName of events) {
            try {
                // Проверяем, есть ли слушатели для этого события
                const listeners = autoUpdater.listenerCount(eventName);
                if (listeners > 0) {
                    autoUpdater.removeAllListeners(eventName);
                    logger('debug', `AutoUpdater: Removed ${listeners} listeners for ${eventName}`);
                }
            } catch (e) {
                // Игнорируем ошибки при удалении
                logger('debug', `AutoUpdater: Could not remove listeners for ${eventName}: ${e.message}`);
            }
        }
    }

    // Предотвращаем шумный ENOENT на macOS/Windows если приложение собрано без метаданных обновлений.
    // В production electron-updater всегда пытается прочитать process.resourcesPath/app-update.yml.
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

    // Configure custom server publish settings
    const updateUrl = config.updateUrl || CUSTOM_UPDATE_URL;
    const updateUrlHttp = config.updateUrlHttp || CUSTOM_UPDATE_URL_HTTP;
    const allowHttpFallback = config.allowHttpFallback === true;

    if (updateUrl) {
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;

        // Try HTTPS first, then fallback to HTTP
        let feedUrl = updateUrl;

        // Set initial feed URL (will retry with HTTP on error)
        autoUpdater.setFeedURL({
            provider: 'generic',
            url: feedUrl,
            channel: 'latest'
        });

        logger('info', `AutoUpdater: Initialized with custom server: ${updateUrl}`);
        logger('info', `AutoUpdater: Current version - ${config.currentVersion}`);

        // Best-effort diagnostics: macOS auto-update requires a signed app.
        if (process.platform === 'darwin' && app.isPackaged) {
            try {
                const res = spawnSync('codesign', ['-dv', '--verbose=2', process.execPath], { encoding: 'utf8' });
                if (res.status !== 0) {
                    logger('warn', 'AutoUpdater: macOS app does not look code-signed. Auto-update may fail to install.');
                } else {
                    logger('info', 'AutoUpdater: macOS code-sign check passed.');
                }
            } catch (e) {
                logger('warn', `AutoUpdater: Cannot run codesign check: ${e.message || e}`);
            }
        }
    } else {
        logger('warn', 'AutoUpdater: Update server URL not configured. Updates disabled.');
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

        // Security: never downgrade update transport unless explicitly allowed.
        // Self-signed/enterprise PKI should be handled via a custom CA (NODE_EXTRA_CA_CERTS / ca.pem).
        if (allowHttpFallback && updateUrl.startsWith('https') && rawMessage.includes('CERT_')) {
            logger('warn', 'AutoUpdater: HTTPS failed with cert error, trying HTTP fallback (allowHttpFallback=true)...');
            const feedUrl = updateUrlHttp;
            try {
                autoUpdater.setFeedURL({
                    provider: 'generic',
                    url: feedUrl,
                    channel: 'latest'
                });
                // Retry check
                autoUpdater.checkForUpdates().catch(err => {
                    const msg = `AutoUpdater: HTTP fallback also failed: ${err.message}`;
                    logger('error', msg);
                    notifyRenderer('update-error', { message: msg });
                });
            } catch (e) {
                const msg = `AutoUpdater: Error - ${rawMessage}`;
                logger('error', msg);
                notifyRenderer('update-error', { message: msg });
            }
            return;
        } else if (updateUrl.startsWith('https') && rawMessage.includes('CERT_')) {
            const msg = `AutoUpdater: TLS certificate error. Install the corporate CA (ca.pem / NODE_EXTRA_CA_CERTS) for ${updateUrl}. Details: ${rawMessage}`;
            logger('error', msg);
            notifyRenderer('update-error', { message: msg });
            return;
        }

        const message = `AutoUpdater: Error - ${rawMessage}`;
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
            // macOS and Linux
            // On macOS we prefer a non-silent install to make Squirrel/MacUpdater behave more predictably.
            // Also add a safety relaunch fallback in case the updater quits the app but doesn't relaunch it.
            let relaunchTimer = null;
            if (process.platform === 'darwin') {
                relaunchTimer = setTimeout(() => {
                    logger('warn', 'AutoUpdater: Relaunch fallback triggered (macOS).');
                    try { app.relaunch(); } catch (e) { /* ignore */ }
                    try { app.exit(0); } catch (e) { /* ignore */ }
                }, 5000);
            }

            // Parameters: isSilent, isForceRunAfter
            // NOTE: quitAndInstall is typically synchronous and returns immediately, so we must NOT clear
            // the relaunch timer here. If the app actually quits, the process will exit before the timer fires.
            autoUpdater.quitAndInstall(false, true);
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
        return { success: true, data: true };
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
        return { success: true, data: true };
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
    const updateUrl = publishConfig?.updateUrl || CUSTOM_UPDATE_URL;

    return { success: true, data: {
        updateAvailable,
        updateDownloaded,
        version: updateInfo?.version || null,
        updateUrl
    }};
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
        return { success: true, data: true };
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
