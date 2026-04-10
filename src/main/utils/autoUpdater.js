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
                logger('warn', `AutoUpdater: Failed to load custom CA certificate from ${certPath}: ${e.message}`);
            }
        }
    }
    return false;
};

loadCustomCertificate();

// Track update state
let updateAvailable = false;
let updateDownloaded = false;
let updateInfo = null;
let publishConfig = null;

// Custom server URL for updates
const CUSTOM_UPDATE_URL = 'https://10.230.121.212/electron/latest/';

function getExpectedUpdateConfigPath() {
    const fileName = autoUpdater.forceDevUpdateConfig ? 'dev-app-update.yml' : 'app-update.yml';
    const baseDir = autoUpdater.forceDevUpdateConfig ? app.getAppPath() : process.resourcesPath;
    return path.join(baseDir, fileName);
}

/**
 * Initialize auto-updater with custom server settings
 */
function initAutoUpdater(config = {}) {
    publishConfig = config && typeof config === 'object' ? { ...config } : null;

    // Clear old event handlers
    const events = [
        'checking-for-update',
        'update-available',
        'update-not-available',
        'download-progress',
        'update-downloaded',
        'error'
    ];

    if (typeof autoUpdater.removeAllListeners === 'function') {
        for (const eventName of events) {
            try {
                const listeners = autoUpdater.listenerCount(eventName);
                if (listeners > 0) {
                    autoUpdater.removeAllListeners(eventName);
                }
            } catch (e) {
                logger('warn', `AutoUpdater: Failed to remove listeners for ${eventName}: ${e.message}`);
            }
        }
    }

    const updateConfigPath = getExpectedUpdateConfigPath();
    if (app.isPackaged) {
        try {
            if (!fs.existsSync(updateConfigPath)) {
                const message = `AutoUpdater: Missing update config (${updateConfigPath})`;
                logger('error', message);
                notifyRenderer('update-error', { message });
                return;
            }
        } catch (e) {
            logger('warn', `AutoUpdater: Cannot verify update config file: ${e.message || e}`);
        }
    }

    const updateUrl = config.updateUrl || CUSTOM_UPDATE_URL;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    if (updateUrl) {
        autoUpdater.setFeedURL({
            provider: 'generic',
            url: updateUrl,
            channel: 'latest'
        });

        logger('info', `AutoUpdater: Initialized with custom server: ${updateUrl}`);
        logger('info', `AutoUpdater: Current version - ${config.currentVersion}`);
    } else {
        logger('warn', 'AutoUpdater: Update server URL not configured. Updates disabled.');
        return;
    }

    // macOS code-sign check
    if (process.platform === 'darwin' && app.isPackaged) {
        try {
            const res = spawnSync('codesign', ['-dv', '--verbose=2', process.execPath], { encoding: 'utf8' });
            if (res.status !== 0) {
                logger('warn', 'AutoUpdater: macOS app does not look code-signed.');
            }
        } catch (e) {
            logger('warn', `AutoUpdater: Cannot run codesign check: ${e.message || e}`);
        }
    }

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
        logger('info', 'AutoUpdater: Checking for updates...');
        updateAvailable = false;
        updateDownloaded = false;
    });

    autoUpdater.on('update-available', (info) => {
        logger('info', `AutoUpdater: Update available - ${info.version}`);
        updateAvailable = true;
        updateInfo = info;
        notifyRenderer('update-available', {
            version: info.version,
            releaseDate: info.releaseDate,
            releaseNotes: info.releaseNotes
        });
    });

    autoUpdater.on('update-not-available', () => {
        logger('info', 'AutoUpdater: No update available.');
        updateAvailable = false;
    });

    autoUpdater.on('download-progress', (progressObj) => {
        logger('info', `AutoUpdater: Download progress: ${progressObj.percent.toFixed(1)}%`);
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
        notifyRenderer('update-downloaded', {
            version: info.version,
            releaseDate: info.releaseDate,
            releaseNotes: info.releaseNotes
        });
        showUpdateReadyDialog(info);
    });

    autoUpdater.on('error', (error) => {
        const rawMessage = error?.message || String(error);
        logger('error', `AutoUpdater: Error - ${rawMessage}`);
        
        // Provide helpful message for certificate errors
        if (rawMessage.includes('CERT_')) {
            logger('error', 'AutoUpdater: Certificate error detected. Please ensure NODE_EXTRA_CA_CERTS is configured or place ca.pem in config/ directory.');
        }
        
        notifyRenderer('update-error', { message: rawMessage });
    });
}

function notifyRenderer(event, data) {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
        if (win && !win.isDestroyed()) {
            win.webContents.send('auto-update-event', { event, data });
        }
    }
}

async function showUpdateReadyDialog(info) {
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (!mainWindow) {
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
        BrowserWindow.getAllWindows().forEach(window => window.close());
        setTimeout(() => installUpdateDirect(), 500);
    }
}

function installUpdateDirect() {
    try {
        logger('info', 'AutoUpdater: Installing update...');
        if (process.platform === 'win32') {
            setTimeout(() => {
                try {
                    autoUpdater.quitAndInstall(true, true);
                } catch (err) {
                    logger('error', `AutoUpdater: quitAndInstall failed: ${err.message}`);
                    app.quit();
                }
            }, 1000);
        } else {
            let relaunchTimer = null;
            if (process.platform === 'darwin') {
                relaunchTimer = setTimeout(() => {
                    try { app.relaunch(); } catch (e) { /* ignore */ }
                    try { app.exit(0); } catch (e) { /* ignore */ }
                }, 5000);
            }
            autoUpdater.quitAndInstall(false, true);
        }
    } catch (error) {
        logger('error', `AutoUpdater: Failed to install update - ${error.message}`);
        app.quit();
    }
}

async function checkForUpdates() {
    try {
        await autoUpdater.checkForUpdates();
        return { success: true, data: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function downloadUpdate() {
    try {
        await autoUpdater.downloadUpdate();
        return { success: true, data: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function installUpdate() {
    BrowserWindow.getAllWindows().forEach(window => window.close());
    setTimeout(() => installUpdateDirect(), 500);
}

function getUpdateStatus() {
    const updateUrl = publishConfig?.updateUrl || CUSTOM_UPDATE_URL;
    return { success: true, data: {
        updateAvailable,
        updateDownloaded,
        version: updateInfo?.version || null,
        updateUrl,
        updateSource: 'internal'
    }};
}

function setupIpcHandlers() {
    ipcMain.handle('check-for-updates', async () => await checkForUpdates());
    ipcMain.handle('download-update', async () => await downloadUpdate());
    ipcMain.handle('install-update', () => {
        installUpdate();
        return { success: true, data: true };
    });
    ipcMain.handle('get-update-status', () => getUpdateStatus());
}

module.exports = {
    initAutoUpdater,
    setupIpcHandlers,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    getUpdateStatus
};
