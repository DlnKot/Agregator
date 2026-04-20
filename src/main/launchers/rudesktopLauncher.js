/**
 * RuDesktop Launcher
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

const RUDESKTOP_DOWNLOAD_URL = 'https://rudesktop.ru/downloads/';

let cachedDeviceId = null;

function findRuDesktop() {
    if (process.platform === 'win32') {
        return findRuDesktopWindows();
    } else if (process.platform === 'darwin') {
        return findRuDesktopMac();
    }
    return null;
}

function findRuDesktopWindows() {
    const paths = [
        'C:\\Program Files\\RuDesktop\\rudesktop.exe',
        'C:\\Program Files (x86)\\RuDesktop\\rudesktop.exe'
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) {
            logger('info', `Found RuDesktop at ${p}`);
            return p;
        }
    }

    try {
        const where = spawnSync('where', ['rudesktop.exe'], { shell: true, encoding: 'utf8' });
        if (where.status === 0) {
            const p = where.stdout.toString().split('\n')[0].trim();
            if (p && fs.existsSync(p)) {
                logger('info', `Found RuDesktop via where: ${p}`);
                return p;
            }
        }
    } catch (e) {
        logger('warn', `RuDesktop Launcher: where lookup failed: ${e.message}`);
    }

    return null;
}

function findRuDesktopMac() {
    const paths = [
        '/Applications/RuDesktop.app',
        path.join(process.env.HOME || '', 'Applications/RuDesktop.app')
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) {
            logger('info', `Found RuDesktop at ${p}`);
            return p;
        }
    }

    try {
        const res = spawnSync('mdfind', ['kMDItemCFBundleIdentifier == "ru.rudesktop.client"'], { stdio: 'pipe' });
        if (res.status === 0) {
            const found = res.stdout.toString().split('\n')[0].trim();
            if (found) return found;
        }
    } catch (e) {
        logger('warn', `RuDesktop Launcher: mdfind lookup failed: ${e.message}`);
    }

    return null;
}

function getDeviceId(exePath) {
    try {
        if (process.platform === 'win32') {
            const result = spawnSync(exePath, ['--get-id'], { 
                encoding: 'utf8',
                timeout: 10000 
            });
            
            if (result.status === 0 && result.stdout) {
                const id = result.stdout.toString().trim();
                cachedDeviceId = id;
                logger('info', `RuDesktop device ID: ${id}`);
                return id;
            }
            logger('warn', `RuDesktop --get-id returned status ${result.status}`);
        } else if (process.platform === 'darwin') {
            const result = spawnSync('/Applications/RuDesktop.app/Contents/MacOS/rudesktop', ['--get-id'], {
                encoding: 'utf8',
                timeout: 10000
            });
            
            if (result.status === 0 && result.stdout) {
                const id = result.stdout.toString().trim();
                cachedDeviceId = id;
                logger('info', `RuDesktop device ID: ${id}`);
                return id;
            }
        }
    } catch (e) {
        logger('error', `Failed to get RuDesktop device ID: ${e.message}`);
    }
    return null;
}

function launchRuDesktop() {
    const exePath = findRuDesktop();

    if (!exePath) {
        return {
            success: false,
            needsInstall: true,
            error: 'RuDesktop not found'
        };
    }

    try {
        logger('info', `Launching RuDesktop from ${exePath}`);

        if (process.platform === 'win32') {
            spawn(exePath, [], {
                detached: true,
                stdio: 'ignore',
                shell: false
            }).unref();
        } else if (process.platform === 'darwin') {
            spawn('open', ['-a', 'RuDesktop'], {
                detached: true,
                stdio: 'ignore'
            }).unref();
        }

        const deviceId = getDeviceId(exePath);

        return {
            success: true,
            deviceId: deviceId,
            message: deviceId ? `Запущено. ID: ${deviceId}` : 'Запущено'
        };

    } catch (e) {
        logger('error', `Failed to launch RuDesktop: ${e.message}`);
        return {
            success: false,
            error: e.message
        };
    }
}

function getStatus() {
    const exePath = findRuDesktop();
    
    if (!exePath) {
        return {
            installed: false,
            deviceId: null
        };
    }

    const deviceId = getDeviceId(exePath) || cachedDeviceId;

    return {
        installed: true,
        deviceId: deviceId,
        exePath: exePath
    };
}

function openDownloadPage() {
    const { shell } = require('electron');
    shell.openExternal(RUDESKTOP_DOWNLOAD_URL);
}

module.exports = {
    findRuDesktop,
    launchRuDesktop,
    getStatus,
    openDownloadPage,
    RUDESKTOP_DOWNLOAD_URL
};
