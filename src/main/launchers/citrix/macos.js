/**
 * Citrix Launcher - macOS Implementation
 * Minimal implementation since requirements focus on Windows
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../../utils/logger');
const { 
    ensureStorefrontAccountMac,
    getCitrixAccountsDirMac
} = require('./storefront');

const launchedProcesses = [];

function launchDetached(command, args = [], options = {}) {
    logger('info', `Citrix Launcher: launching ${command} ${args.join(' ')}`);

    try {
        const child = spawn(command, args, {
            detached: true,
            stdio: 'ignore',
            shell: false,
            ...options
        });

        // Prevent unhandled 'error' events (e.g. ENOENT) from crashing the app.
        child.on('error', (e) => {
            logger('error', `Citrix Launcher: failed to launch ${command}: ${e.message}`);
        });

        if (child.pid) {
            launchedProcesses.push({
                pid: child.pid,
                command,
                args,
                startTime: Date.now()
            });

            logger('info', `Citrix Launcher: Process started PID=${child.pid}`);
        }

        child.unref();

    } catch (error) {
        logger('error', `Citrix Launcher: Failed to launch ${command}: ${error.message}`);
        throw error;
    }
}

function tryBringCitrixToFront() {
    // Placeholder - not implemented
}

function getCitrixApps() {
    return ['Citrix Workspace', 'Citrix Receiver'];
}

async function launchCitrixMac(connection, settings) {
    try {
        // Basic validation
        if (!connection || typeof connection !== 'object') {
            throw new Error('Invalid connection object');
        }

        if (!connection.storeUrl || typeof connection.storeUrl !== 'string' || !connection.storeUrl.trim()) {
            throw new Error('Citrix Store URL is required in the connection');
        }
    } catch (error) {
        logger('error', `Citrix Launcher: validation failed - ${error.message}`);
        throw error;
    }

    // Extract citrix settings from full settings object
    const citrixSettings = settings?.citrix || settings || {};

    logger('info', `Citrix Launcher: Starting connection to ${connection.host}`);
    logger('info', `Citrix Launcher: Store URL (settings): ${citrixSettings.storeUrl || ''}`);
    logger('info', `Citrix Launcher: Resource: ${citrixSettings.resourceName}`);

    const effectiveStoreUrlRaw = (connection?.storeUrl || '').trim();
    const effectiveStoreUrl = effectiveStoreUrlRaw; // Keep as-is for macOS

    // Get application name from connection (new field)
    const appName = (connection?.citrixApp || '').trim();
    logger('info', `Citrix Launcher: Application name: ${appName || '(none - will open store)'}`);

    // Find Citrix Workspace on macOS
    const citrixApps = getCitrixApps();

    for (const app of citrixApps) {
        const result = spawnSync('open', ['-Ra', app], { stdio: 'ignore' });
        if (result.status === 0) {
            logger('info', `Citrix Launcher: Found app ${app}`);

            // macOS: best-effort StoreFront registration (same flow as when it "worked").
            // We don't block the UI: trigger registration, then open the app shortly after.
            const storeUrlRaw = effectiveStoreUrlRaw;
            const accountName = ((citrixSettings.accountName || '').trim() || (connection?.name || '').trim() || 'Store');

            if (storeUrlRaw) {
                try {
                    const res = await ensureStorefrontAccountMac(accountName, storeUrlRaw);
                    if (res.ensured && !res.already) {
                        // Give Workspace a moment to process the createaccount URL.
                        setTimeout(() => {
                            launchDetached('open', ['-a', app]);
                        }, 1200);
                        return;
                    }
                } catch (e) {
                    logger('warn', `Citrix Launcher: StoreFront register attempt failed (mac): ${e?.message || String(e)}`);
                    // continue to opening the app below
                }
            }

            launchDetached('open', ['-a', app]);
            return;
        }
    }

    logger('error', 'Citrix Launcher: Citrix Workspace not found on macOS');
    throw new Error('Citrix Workspace not found on macOS. Please install Citrix Workspace');
}

function killAllProcesses() {
    logger('info', `Citrix Launcher: Killing ${launchedProcesses.length} processes`);

    for (const proc of launchedProcesses) {
        try {
            if (process.platform === 'darwin') {
                // TODO: Implement proper process killing for macOS if needed
            }
        } catch (e) {
            logger('warn', `Citrix Launcher: Failed to kill ${proc.pid}: ${e.message}`);
        }
    }

    launchedProcesses.length = 0;
}

// Export functions
module.exports = {
    launchCitrixMac,
    killAllProcesses
};