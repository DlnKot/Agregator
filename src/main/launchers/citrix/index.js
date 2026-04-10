/**
 * Citrix Workspace Launcher - Main Entry Point
 * Delegates to platform-specific implementations
 */

const os = require('os');
const { log: logger } = require('../../utils/logger');

// Platform-specific launchers
let windowsLauncher = null;
let macosLauncher = null;

// Lazy load platform-specific modules
function getWindowsLauncher() {
    if (!windowsLauncher) {
        windowsLauncher = require('./windows');
    }
    return windowsLauncher;
}

function getMacosLauncher() {
    if (!macosLauncher) {
        macosLauncher = require('./macos');
    }
    return macosLauncher;
}

/**
 * Launch Citrix connection
 * @param {Object} connection - Connection configuration
 * @param {Object} settings - Global settings
 * @returns {Promise<void>}
 */
async function launchCitrix(connection, settings) {
    try {
        if (process.platform === 'win32') {
            return await getWindowsLauncher().launchCitrixWindows(connection, settings);
        }

        if (process.platform === 'darwin') {
            return await getMacosLauncher().launchCitrixMac(connection, settings);
        }

        // Linux not supported per requirements
        logger('error', `Citrix Launcher: Platform not supported: ${process.platform}`);
        throw new Error(`Citrix Launcher: Platform not supported: ${process.platform}`);
    } catch (error) {
        logger('error', `Citrix Launcher: Failed to launch: ${error.message}`);
        throw error;
    }
}

/**
 * Kill all launched Citrix processes
 */
function killAllProcesses() {
    try {
        if (process.platform === 'win32' && windowsLauncher) {
            windowsLauncher.killAllProcesses();
        }
        if (process.platform === 'darwin' && macosLauncher) {
            macosLauncher.killAllProcesses();
        }
    } catch (error) {
        logger('error', `Citrix Launcher: Error killing processes: ${error.message}`);
    }
}

module.exports = {
    launchCitrix,
    killAllProcesses
};