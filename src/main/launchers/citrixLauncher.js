/**
 * VMware Horizon Launcher - handles launching VMware Horizon Client connections
 */

const { spawn, spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

const launchedProcesses = [];

// Common installation paths
const HORIZON_PATHS = [
    'C:\\Program Files\\VMware\\VMware Horizon Client\\bin\\vmware-view.exe',
    'C:\\Program Files\\VMware\\VMware Horizon\\View\\Client\\bin\\vmware-view.exe',
    'C:\\Program Files (x86)\\VMware\\VMware Horizon Client\\bin\\vmware-view.exe',
    'C:\\Program Files (x86)\\VMware\\VMware Horizon\\View\\Client\\bin\\vmware-view.exe',
    'C:\\ProgramData\\VMware\\VMware Horizon\\View\\Client\\bin\\vmware-view.exe',
    path.join(process.env.LOCALAPPDATA || '', 'VMware', 'VMware Horizon Client', 'bin', 'vmware-view.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'VMware', 'VMware Horizon', 'View', 'Client', 'bin', 'vmware-view.exe'),
    path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'VMware', 'VMware Horizon', 'View', 'Client', 'bin', 'vmware-view.exe')
];

function launchDetached(command, args = [], options = {}) {
    logger('info', `Horizon Launcher: launching ${command} ${args.join(' ')}`);

    try {
        const child = spawn(command, args, {
            detached: true,
            stdio: 'ignore',
            shell: false,
            ...options
        });

        if (child.pid) {
            launchedProcesses.push({
                pid: child.pid,
                command,
                args,
                startTime: Date.now()
            });

            logger('info', `Horizon Launcher: Process started PID=${child.pid}`);
        }

        child.unref();

    } catch (error) {
        logger('error', `Horizon Launcher: Failed to launch ${command}: ${error.message}`);
        throw error;
    }
}

function splitArgs(raw = '') {
    if (!raw) return [];
    return raw.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(a => a.replace(/"/g, '')) || [];
}

function normalizeHttpsUrl(raw = '') {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed.replace(/\/+$/, '');
    return ('https://' + trimmed).replace(/\/+$/, '');
}

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
    } catch {
        return normalized.replace(/\/+$/, '');
    }
}

function getUrlOrigin(raw = '') {
    try {
        return new URL(raw).origin;
    } catch {
        return '';
    }
}

function buildCitrixCreateAccountUrl(accountName, addressUrl) {
    const name = encodeURIComponent(accountName || 'Store');
    const address = encodeURIComponent(addressUrl);
    return `citrixreceiver://createaccount?name=${name}&address=${address}`;
}

function getCitrixAccountsDirMac() {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Citrix', 'Receiver', 'Accounts');
}

function scanTextInDir(dir, needles) {
    // Best-effort scan: Citrix stores account metadata in files (often plist/binary).
    // We'll check filenames and file contents (as utf8/latin1) up to a small depth.
    const stack = [{ p: dir, depth: 0 }];
    const maxDepth = 3;

    while (stack.length) {
        const { p, depth } = stack.pop();
        let entries;
        try {
            entries = fs.readdirSync(p, { withFileTypes: true });
        } catch {
            continue;
        }

        for (const ent of entries) {
            const full = path.join(p, ent.name);
            const lowerName = (ent.name || '').toLowerCase();
            if (needles.some(n => lowerName.includes(n))) return true;

            if (ent.isDirectory()) {
                if (depth < maxDepth) stack.push({ p: full, depth: depth + 1 });
                continue;
            }

            if (!ent.isFile()) continue;

            try {
                const buf = fs.readFileSync(full);
                const s1 = buf.toString('utf8');
                const s2 = buf.toString('latin1');
                const hit = needles.some(n => s1.toLowerCase().includes(n) || s2.toLowerCase().includes(n));
                if (hit) return true;
            } catch {
                // ignore unreadable files
            }
        }
    }

    return false;
}

function isStorefrontRegisteredMac(storeUrl) {
    const normalized = normalizeStorefrontAddress(storeUrl);
    if (!normalized) return false;

    const accountsDir = getCitrixAccountsDirMac();
    try {
        if (!fs.existsSync(accountsDir)) return false;
    } catch {
        return false;
    }

    let host = '';
    const origin = getUrlOrigin(normalized).toLowerCase();
    try {
        host = new URL(normalized).host.toLowerCase();
    } catch {
        host = normalized.toLowerCase();
    }

    const needles = [host, origin, normalized.toLowerCase()].filter(Boolean);
    return scanTextInDir(accountsDir, needles);
}

function ensureStorefrontAccountMac(accountName, storeUrl) {
    const normalized = normalizeStorefrontAddress(storeUrl);
    if (!normalized) return { ensured: false, reason: 'no_store_url' };

    if (isStorefrontRegisteredMac(normalized)) {
        logger('info', `Citrix Launcher: Storefront already registered (mac): ${normalized}`);
        return { ensured: true, already: true, storeUrl: normalized };
    }

    // Citrix Workspace on macOS is picky about the address format for createaccount:
    // it typically expects only the origin, like https://storefront.company.com (no /Citrix/Store/... path).
    const origin = getUrlOrigin(normalized) || normalized;
    const url = buildCitrixCreateAccountUrl(accountName || 'Store', origin);
    logger('info', `Citrix Launcher: Registering Storefront (mac): ${url}`);
    launchDetached('open', [url]);
    return { ensured: true, already: false, storeUrl: normalized, url, origin };
}

function findHorizonExecutable(customPath) {

    if (customPath && customPath.trim()) {
        const trimmed = customPath.trim();

        logger('info', `Horizon Launcher: Checking custom path: ${trimmed}`);

        if (fs.existsSync(trimmed)) {
            return trimmed;
        }

        logger('warn', `Horizon Launcher: Custom path not found`);
    }

    for (const p of HORIZON_PATHS) {
        try {
            if (fs.existsSync(p)) {
                logger('info', `Horizon Launcher: Found at ${p}`);
                return p;
            }
        } catch {
            continue;
        }
    }

    try {
        const result = spawnSync('where', ['vmware-view.exe'], { encoding: 'utf8' });

        if (result.status === 0 && result.stdout) {
            const found = result.stdout.split('\n')[0].trim();

            if (found && fs.existsSync(found)) {
                logger('info', `Horizon Launcher: Found via PATH ${found}`);
                return found;
            }
        }

    } catch { }

    return null;
}

function buildArgs(connection = {}, settings = {}) {

    const args = [];
    const s = settings;

    if (s.serverUrl)
        args.push('-serverURL', s.serverUrl);

    if (connection.desktopPool || s.desktopName)
        args.push('-desktopName', connection.desktopPool || s.desktopName);

    if (s.appName)
        args.push('-appName', s.appName);

    if (connection.username || s.userName)
        args.push('-userName', connection.username || s.userName);

    // Security: Don't pass password as CLI argument - visible in process listings
    // Users should use the Horizon Client UI or secure credential storage
    // if (s.password)
    //  args.push('-password', s.password);

    if (s.domainName)
        args.push('-domainName', s.domainName);

    if (s.desktopProtocol)
        args.push('-desktopProtocol', s.desktopProtocol);

    if (s.desktopLayout)
        args.push('-desktopLayout', s.desktopLayout);

    if (s.monitors)
        args.push('-monitors', s.monitors);

    if (s.unattended)
        args.push('-unattended');

    if (s.nonInteractive)
        args.push('-nonInteractive');

    if (s.launchMinimized)
        args.push('-launchMinimized');

    if (s.loginAsCurrentUser)
        args.push('-loginAsCurrentUser', 'true');

    if (s.hideClientAfterLaunchSession)
        args.push('-hideClientAfterLaunchSession', 'true');

    if (s.useExisting)
        args.push('-useExisting');

    if (s.singleAutoConnect)
        args.push('-singleAutoConnect');

    if (s.customFlags)
        args.push(...splitArgs(s.customFlags));

    return args;
}

function launchHorizon(connection, settings) {
    // Extract horizon settings from full settings object
    const horizonSettings = settings?.horizon || settings || {};
    const args = buildArgs(connection, horizonSettings);

    logger('info', `Horizon Launcher: Built args: ${args.join(' ')}`);

    if (process.platform === 'win32') {

        const exePath = findHorizonExecutable(horizonSettings?.customPath);

        if (!exePath) {
            logger('error', 'Horizon Launcher: VMware Horizon client not found');
            throw new Error('VMware Horizon Client not found');
        }

        launchDetached(exePath, args);

        logger('info', `Horizon Launcher: Launched from ${exePath}`);

        return;
    }

    if (process.platform === 'darwin') {

        const checkApp = (name) => {
            const res = spawnSync('open', ['-Ra', name], { stdio: 'ignore' });
            return res.status === 0;
        };

        if (checkApp('VMware Horizon Client')) {
            launchDetached('open', ['-a', 'VMware Horizon Client', '--args', ...args]);
            return;
        }

        if (checkApp('VMware Horizon')) {
            launchDetached('open', ['-a', 'VMware Horizon', '--args', ...args]);
            return;
        }

        logger('error', 'Horizon Launcher: VMware Horizon Client not found on macOS');

        throw new Error('VMware Horizon Client not installed');
    }

    // Linux fallback
    launchDetached('vmware-view', args);
}

/**
 * Initialize Citrix Storefront (Windows only)
 * Registers/configures a Storefront provider for Citrix client
 * Command: SelfService.exe -init -createprovider PROVIDER_NAME STORE_URL
 */
function initializeCitrixStorefront(exePath, storeUrl) {
    try {
        // Normalize store URL
        let normalizedUrl = storeUrl.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = 'https://' + normalizedUrl;
        }

        // Use a descriptive provider name for the Storefront
        const providerName = 'StoreFront';

        logger('info', `Citrix Launcher: Initializing Storefront`);
        logger('info', `Citrix Launcher: Store URL: ${normalizedUrl}`);
        logger('info', `Citrix Launcher: Provider Name: ${providerName}`);

        // Build initialization arguments
        const initArgs = [
            '-init',
            '-createprovider',
            providerName,
            normalizedUrl
        ];

        logger('info', `Citrix Launcher: Running initialization: ${exePath} ${initArgs.join(' ')}`);

        // Run initialization synchronously and wait for completion
        const result = spawnSync(exePath, initArgs, {
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 30000 // 30 second timeout for initialization
        });

        if (result.error) {
            logger('warn', `Citrix Launcher: Initialization process error: ${result.error.message}`);
            return;
        }

        if (result.status === 0) {
            logger('info', `Citrix Launcher: Storefront initialization completed successfully`);
        } else {
            logger('warn', `Citrix Launcher: Initialization exited with code ${result.status}`);
            if (result.stderr) {
                logger('warn', `Citrix Launcher: stderr: ${result.stderr.toString()}`);
            }
        }

    } catch (error) {
        logger('warn', `Citrix Launcher: Storefront initialization failed: ${error.message}`);
        // Don't throw - continue with normal launch even if initialization fails
    }
}

// Citrix Workspace launcher
function launchCitrix(connection, settings) {
    // Extract citrix settings from full settings object
    const citrixSettings = settings?.citrix || settings || {};

    logger('info', `Citrix Launcher: Starting connection to ${connection.host}`);
    logger('info', `Citrix Launcher: Store URL (settings): ${citrixSettings.storeUrl}`);
    logger('info', `Citrix Launcher: Resource: ${citrixSettings.resourceName}`);

    const effectiveStoreUrlRaw = (connection?.storeUrl || '').trim() || (citrixSettings.storeUrl || '').trim();
    const effectiveStoreUrl = normalizeStorefrontAddress(effectiveStoreUrlRaw);

    if (effectiveStoreUrl) {
        logger('info', `Citrix Launcher: Store URL (effective): ${effectiveStoreUrl}`);
    } else if (effectiveStoreUrlRaw) {
        logger('info', `Citrix Launcher: Store URL provided but cannot normalize: ${effectiveStoreUrlRaw}`);
    }

    if (process.platform === 'win32') {
        // Find Citrix Workspace executable - correct paths
        const citrixPaths = [
            'C:\\Program Files (x86)\\Citrix\\ICA Client\\SelfServicePlugin\\SelfService.exe',
            'C:\\Program Files\\Citrix\\ICA Client\\SelfServicePlugin\\SelfService.exe',
            'C:\\Program Files (x86)\\Citrix\\ICA Client\\selfservice.exe',
            'C:\\Program Files\\Citrix\\ICA Client\\selfservice.exe',
            path.join(process.env.LOCALAPPDATA || '', 'Citrix', 'ICA Client', 'SelfServicePlugin', 'SelfService.exe'),
            path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Citrix', 'ICA Client', 'SelfServicePlugin', 'SelfService.exe')
        ];

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

        // Initialize storefront if storeUrl is provided (connection.storeUrl has priority)
        if (effectiveStoreUrl) {
            initializeCitrixStorefront(exePath, effectiveStoreUrl);
        }

        // Build args for launching resource or opening client
        const args = [];

        // Store URL - normalize with https:// if needed
        if (effectiveStoreUrl) {
            args.push('-store');
            args.push(effectiveStoreUrl);
            logger('info', `Citrix Launcher: Using store URL: ${effectiveStoreUrl}`);
        }

        // Resource to launch
        if (citrixSettings.resourceName) {
            args.push('-launch');
            args.push(citrixSettings.resourceName);
            logger('info', `Citrix Launcher: Launching resource: ${citrixSettings.resourceName}`);
        }

        // Run quietly (no UI)
        args.push('-quiet');

        // Custom flags
        if (citrixSettings.customFlags) {
            args.push(...splitArgs(citrixSettings.customFlags));
        }

        logger('info', `Citrix Launcher: Launching ${exePath} with args: ${args.join(' ')}`);
        launchDetached(exePath, args);
        logger('info', `Citrix Launcher: Launched from ${exePath}`);
        return;
    }

    if (process.platform === 'darwin') {
        // Check for Citrix Workspace on macOS
        const citrixApps = ['Citrix Workspace', 'Citrix Receiver'];

        for (const appName of citrixApps) {
            const result = spawnSync('open', ['-Ra', appName], { stdio: 'ignore' });
            if (result.status === 0) {
                logger('info', `Citrix Launcher: Found app ${appName}`);

                const storeUrl = effectiveStoreUrl;
                const accountName = ((citrixSettings.accountName || '').trim() || 'Store');

                if (storeUrl) {
                    const res = ensureStorefrontAccountMac(accountName, storeUrl);
                    if (res.ensured && !res.already) {
                        // Give the receiver some time to create the account before we bring the app to front.
                        setTimeout(() => {
                            launchDetached('open', ['-a', appName]);
                        }, 1200);
                        return;
                    }
                }

                // Normal open (already registered, or store URL not provided)
                launchDetached('open', ['-a', appName]);
                return;
            }
        }

        logger('error', 'Citrix Launcher: Citrix Workspace not found on macOS');
        throw new Error('Citrix Workspace not found on macOS. Please install Citrix Workspace');
    }

    // Linux
    launchDetached('ctx', ['-store', effectiveStoreUrl || '']);
}

function killAllProcesses() {

    logger('info', `Horizon Launcher: Killing ${launchedProcesses.length} processes`);

    for (const proc of launchedProcesses) {

        try {

            if (process.platform === 'win32') {

                spawn('taskkill', [
                    '/pid',
                    proc.pid.toString(),
                    '/T',
                    '/F'
                ], { stdio: 'ignore' });

            }

        } catch (e) {

            logger('warn', `Horizon Launcher: Failed to kill ${proc.pid}: ${e.message}`);

        }
    }

    launchedProcesses.length = 0;
}

module.exports = {
    launchHorizon,
    launchCitrix,
    killAllProcesses
};
