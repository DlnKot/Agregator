/**
 * Citrix Launcher - Windows Implementation
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../../utils/logger');
const { 
    validateConnectionData 
} = require('./validation');
const { 
    citrixStorefrontExistsWindows,
    initializeCitrixStorefrontSync,
    getCitrixAccountsDirMac // Not used on Windows but keeping for consistency
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

function initializeCitrixStorefront(exePath, storeUrl, providerName) {
    if (!exePath || !storeUrl) return;

    try {
        const initArgs = ['-init', '-createprovider', providerName, storeUrl];
        logger('info', `Citrix Launcher: Initializing StoreFront: ${exePath} ${initArgs.join(' ')}`);

        // Async (non-blocking) run, but we still capture result for troubleshooting.
        const child = spawn(exePath, initArgs, {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let out = '';
        let err = '';
        const limit = 16 * 1024;
        child.stdout?.on('data', (d) => { out = (out + d.toString('utf8')).slice(-limit); });
        child.stderr?.on('data', (d) => { err = (err + d.toString('utf8')).slice(-limit); });

        const t = setTimeout(() => {
            try {
                child.kill();
            } catch (e) {
                logger('warn', `Citrix Launcher: failed to kill storefront init process: ${e.message}`);
            }
            logger('warn', 'Citrix Launcher: Storefront initialization timed out (killed)');
        }, 30000);

        child.on('error', (e) => {
            clearTimeout(t);
            logger('warn', `Citrix Launcher: Initialization process error: ${e.message}`);
        });

        child.on('close', (code) => {
            clearTimeout(t);
            logger('info', `Citrix Launcher: Initialization exited with code ${code}`);
            const sOut = (out || '').trim();
            const sErr = (err || '').trim();
            if (sOut) logger('info', `Citrix Launcher: init stdout: ${sOut}`);
            if (sErr) logger('warn', `Citrix Launcher: init stderr: ${sErr}`);
        });

        logger('info', 'Citrix Launcher: Storefront initialization started (async)');

    } catch (error) {
        logger('warn', `Citrix Launcher: Storefront initialization failed: ${error.message}`);
        // Don't throw - continue with normal launch even if initialization fails
    }
}

function tryBringCitrixToFrontWindows() {
    // Best-effort: if SelfService has a normal window, bring it to foreground.
    // If it's a tray-only instance (MainWindowHandle=0), this won't help, but it's harmless.
    try {
        const script = [
            '$p = Get-Process -Name SelfService -ErrorAction SilentlyContinue | Select-Object -First 1;',
            'if ($p -and $p.MainWindowHandle -ne 0) {',
            '  Add-Type -Name Win32 -Namespace ARC -MemberDefinition "[DllImport(\\"user32.dll\\")]public static extern bool ShowWindowAsync(IntPtr hWnd,int nCmdShow);[DllImport(\\"user32.dll\\")]public static extern bool SetForegroundWindow(IntPtr hWnd);" -ErrorAction SilentlyContinue;',
            '  [ARC.Win32]::ShowWindowAsync($p.MainWindowHandle, 9) | Out-Null;',
            '  [ARC.Win32]::SetForegroundWindow($p.MainWindowHandle) | Out-Null;',
            '}'
        ].join(' ');

        const child = spawn('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', script], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true
        });
        child.on('error', (e) => {
            logger('warn', `Citrix Launcher: bring-to-front helper failed: ${e.message}`);
        });
        child.unref();
    } catch (e) {
        logger('warn', `Citrix Launcher: failed to run bring-to-front helper: ${e.message}`);
    }
}

function getCitrixPaths() {
    return [
        'C:\\Program Files (x86)\\Citrix\\ICA Client\\SelfServicePlugin\\SelfService.exe',
        'C:\\Program Files\\Citrix\\ICA Client\\SelfServicePlugin\\SelfService.exe',
        'C:\\Program Files (x86)\\Citrix\\ICA Client\\selfservice.exe',
        'C:\\Program Files\\Citrix\\ICA Client\\selfservice.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Citrix', 'ICA Client', 'SelfServicePlugin', 'SelfService.exe'),
        path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Citrix', 'ICA Client', 'SelfServicePlugin', 'SelfService.exe')
    ];
}

async function launchCitrixWindows(connection, settings) {
    try {
        // Validate connection data before using it
        validateConnectionData(connection);
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
    const effectiveStoreUrl = normalizeStorefrontAddress(effectiveStoreUrlRaw);

    if (!effectiveStoreUrlRaw) {
        throw new Error('Citrix Store URL is required in the connection');
    }

    if (effectiveStoreUrl) {
        logger('info', `Citrix Launcher: Store URL (effective): ${effectiveStoreUrl}`);
    } else if (effectiveStoreUrlRaw) {
        logger('info', `Citrix Launcher: Store URL provided but cannot normalize: ${effectiveStoreUrlRaw}`);
    }

    // Find Citrix Workspace executable
    const citrixPaths = getCitrixPaths();

    let exePath = null;
    for (const p of citrixPaths) {
        try {
            if (fs.existsSync(p)) {
                exePath = p;
                logger('info', `Citrix Launcher: Found at: ${p}`);
                break;
            }
        } catch (e) { continue; }
    }

    // Try custom path
    if (citrixSettings.customPath) {
        const customPath = citrixSettings.customPath.trim();
        try {
            if (fs.existsSync(customPath)) {
                exePath = customPath;
                logger('info', `Citrix Launcher: Using custom path: ${customPath}`);
            }
        } catch (e) {
            logger('warn', `Citrix Launcher: Custom path not found: ${customPath}`);
        }
    }

    if (!exePath) {
        logger('error', 'Citrix Launcher: Citrix Workspace not found');
        throw new Error('Citrix Workspace not found. Please install it or specify custom path in settings.');
    }

    // Get application name from connection (new field)
    const appName = (connection?.citrixApp || '').trim();
    logger('info', `Citrix Launcher: Application name: ${appName || '(none - will open store)'}`);

    // NEW LOGIC: Check if StoreFront is registered, then decide what to do
    return (async () => {
        try {
            const exists = await citrixStorefrontExistsWindows(effectiveStoreUrlRaw);
            
            if (!exists.ok) {
                logger('warn', `Citrix Launcher: Could not verify Storefront in registry: reason=${exists.reason}`);
                // Fallback: just open SelfService
                launchDetached(exePath, []);
                tryBringCitrixToFrontWindows();
                return;
            }

            if (!exists.exists) {
                // StoreFront NOT registered - need to add it
                logger('info', 'Citrix Launcher: StoreFront not registered, adding...');
                
                const toRegister = normalizeStorefrontDiscoveryAddress(effectiveStoreUrlRaw) || normalizeHttpsUrl(effectiveStoreUrlRaw).replace(/\/+$/, '');
                const providerName = makeCitrixProviderName(toRegister);
                
                logger('info', `Citrix Launcher: Registering StoreFront: ${toRegister}`);
                
                // Register synchronously (user will see "Настройка Citrix StoreFront..." toast)
                const initResult = await initializeCitrixStorefrontSync(exePath, toRegister, providerName);
                
                if (initResult.success) {
                    logger('info', 'Citrix Launcher: StoreFront registered successfully');
                } else {
                    logger('warn', `Citrix Launcher: StoreFront registration failed: ${initResult.error}`);
                }
                
                // Open SelfService (no args - user will see the store)
                logger('info', 'Citrix Launcher: Opening SelfService after registration');
                launchDetached(exePath, []);
                tryBringCitrixToFrontWindows();
                
            } else {
                // StoreFront ALREADY registered
                logger('info', `Citrix Launcher: StoreFront already registered: ${exists.value}`);
                
                if (appName) {
                    // Launch specific application with -qlaunch
                    logger('info', `Citrix Launcher: Launching application: ${appName}`);
                    launchDetached(exePath, ['-qlaunch', appName]);
                } else {
                    // No app name - just open SelfService
                    logger('info', 'Citrix Launcher: Opening SelfService (no specific app)');
                    launchDetached(exePath, []);
                    tryBringCitrixToFrontWindows();
                }
            }
            
        } catch (error) {
            logger('error', `Citrix Launcher: Error during launch: ${error.message}`);
            // Fallback: just open SelfService
            launchDetached(exePath, []);
            tryBringCitrixToFrontWindows();
        }
    })();
}

function killAllProcesses() {
    logger('info', `Citrix Launcher: Killing ${launchedProcesses.length} processes`);

    for (const proc of launchedProcesses) {
        try {
            if (process.platform === 'win32') {
                const child = spawn('taskkill', [
                    '/pid',
                    proc.pid.toString(),
                    '/T',
                    '/F'
                ], { stdio: 'ignore' });
                child.on('error', (e) => {
                    logger('warn', `Citrix Launcher: taskkill failed for ${proc.pid}: ${e.message}`);
                });
                child.unref();
            }
        } catch (e) {
            logger('warn', `Citrix Launcher: Failed to kill ${proc.pid}: ${e.message}`);
        }
    }

    launchedProcesses.length = 0;
}

// Export functions
module.exports = {
    launchCitrixWindows,
    killAllProcesses
};

// Helper function for normalization (used in validation)
function normalizeStorefrontAddress(raw = '') {
    const normalized = normalizeHttpsUrl(raw);
    if (!normalized) return '';

    // If a discovery endpoint is provided, strip it to the base address.
    // Example:
    //   https://host/Citrix/Store/discovery -> https://host/Citrix/Store
    try {
        const u = new URL(normalized);
        const p = u.pathname.replace(/\/+$/, '');
        if (p.toLowerCase().endsWith('/discovery')) {
            u.pathname = p.slice(0, -'/discovery'.length) || '/';
            u.search = '';
            u.hash = '';
            return u.toString().replace(/\/+$/, '');
        }
        u.search = '';
        u.hash = '';
        return u.toString().replace(/\/+$/, '');
    } catch (e) {
        logger('warn', `Citrix Launcher: failed to normalize storefront address: ${e.message}`);
        return normalized.replace(/\/+$/, '');
    }
}

function normalizeHttpsUrl(raw = '') {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed.replace(/\/+$/, '');
    return ('https://' + trimmed).replace(/\/+$/, '');
}

// Export normalization functions for external use
module.exports.normalizeStorefrontAddress = normalizeStorefrontAddress;
module.exports.normalizeHttpsUrl = normalizeHttpsUrl;
