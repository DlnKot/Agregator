/**
 * VMware Horizon Launcher
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

const launchedProcesses = [];

/* ------------------------------------------------ */
// Validation functions to prevent command injection
function validateHost(host) {
    if (!host || typeof host !== 'string') {
        throw new Error('Invalid host: must be a non-empty string');
    }
    const trimmed = host.trim();
    // Allow URLs and hostnames, but reject special characters that could be command injection
    if (!/^[a-zA-Z0-9._\-:\/]+$/.test(trimmed)) {
        throw new Error('Invalid host format: contains invalid characters');
    }
    if (trimmed.length > 255) {
        throw new Error('Host name too long');
    }
    return trimmed;
}

function validateUsername(username) {
    if (!username) return '';  // Username can be empty
    if (typeof username !== 'string') {
        throw new Error('Invalid username: must be a string');
    }
    // Allow domain\user format, but reject command injection attempts
    if (/[;|&$`()\\n\\r]/.test(username) && !username.includes('\\')) {
        throw new Error('Invalid username: contains invalid characters');
    }
    return username.trim();
}

function validateConnectionData(connection) {
    if (!connection || typeof connection !== 'object') {
        throw new Error('Invalid connection object');
    }

    // Validate host - can be FQDN or URL
    if (connection.host) {
        connection.host = validateHost(connection.host);
    }

    // Validate username - optional
    if (connection.username) {
        connection.username = validateUsername(connection.username);
    }

    return connection;
}

/* ------------------------------------------------ */
function stripDomainFromUserName(userName) {
    if (!userName || typeof userName !== 'string') return '';
    const trimmed = userName.trim();
    // Handle DOMAIN\\user (e.g. MOSCOW\\u_m123) -> user
    if (trimmed.includes('\\')) return trimmed.split('\\').pop().trim();
    // Handle DOMAIN/user -> user
    if (trimmed.includes('/')) return trimmed.split('/').pop().trim();
    return trimmed;
}

/* ------------------------------------------------ */
function launchDetached(command, args = []) {

    logger('info', `Launching: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
        windowsVerbatimArguments: true
    });

    // Prevent unhandled 'error' events (e.g. ENOENT) from crashing the app.
    child.on('error', (e) => {
        logger('error', `Horizon Launcher: failed to launch ${command}: ${e.message}`);
    });

    if (!child.pid) {
        throw new Error('Failed to start process');
    }

    const proc = {
        pid: child.pid,
        command,
        args,
        startTime: Date.now()
    };

    launchedProcesses.push(proc);

    child.on('exit', () => {
        const i = launchedProcesses.findIndex(p => p.pid === proc.pid);
        if (i !== -1) launchedProcesses.splice(i, 1);
    });

    child.unref();

    logger('info', `Process started PID=${child.pid}`);
}

/* ------------------------------------------------ */
function normalizeUrl(url) {

    if (!url) return '';

    url = url.trim();

    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    return url;
}

/* ------------------------------------------------ */
function splitArgs(raw = '') {

    const regex = /[^\s"]+|"([^"]*)"/gi;
    const args = [];
    let match;

    while ((match = regex.exec(raw)) !== null) {
        args.push(match[1] ? match[1] : match[0]);
    }

    return args;
}

/* ------------------------------------------------ */
function buildArgs(connection, settings = {}, macFormat = false) {

    const args = [];

    const flag = macFormat
        ? (k, v) => v ? args.push(`-${k}`, v) : args.push(`-${k}`)
        : (k, v) => v ? args.push(`--${k}=${v}`) : args.push(`--${k}`);

    if (settings.serverUrl)
        flag('serverURL', normalizeUrl(settings.serverUrl));

    if (connection.desktopPool || settings.desktopName)
        flag('desktopName', connection.desktopPool || settings.desktopName);

    if (settings.appName)
        flag('appName', settings.appName);

    const userName = stripDomainFromUserName(connection.username || settings.user?.username);
    if (userName)
        flag('userName', userName);

    if (settings.desktopProtocol)
        flag('desktopProtocol', settings.desktopProtocol);

    if (settings.desktopLayout)
        flag('desktopLayout', settings.desktopLayout);

    if (settings.monitors)
        flag('monitors', settings.monitors);

    if (settings.unattended)
        flag('unattended');

    if (settings.nonInteractive)
        flag('nonInteractive');

    if (settings.launchMinimized)
        flag('launchMinimized');

    if (settings.loginAsCurrentUser)
        flag('loginAsCurrentUser', macFormat ? undefined : 'true');

    if (settings.hideClientAfterLaunchSession)
        flag('hideClientAfterLaunchSession', macFormat ? undefined : 'true');

    if (settings.useExisting)
        flag('useExisting');

    if (settings.singleAutoConnect)
        flag('singleAutoConnect');

    if (settings.customFlags)
        args.push(...splitArgs(settings.customFlags));

    return args;
}

/* ------------------------------------------------ */
function findExeRecursive(dir, exeName, depth = 0, maxDepth = 6) {

    if (depth > maxDepth) return null;

    try {

        for (const item of fs.readdirSync(dir)) {

            const full = path.join(dir, item);
            const stat = fs.statSync(full);

            if (stat.isDirectory()) {

                const found = findExeRecursive(full, exeName, depth + 1);
                if (found) return found;

            } else if (item.toLowerCase() === exeName.toLowerCase()) {

                return full;

            }
        }

    } catch { }

    return null;
}

/* ------------------------------------------------ */
function findHorizonExecutable(customPath) {

    if (customPath && fs.existsSync(customPath))
        return customPath;

    // Prefer registry on Windows to locate the real installation path:
    // HKLM\SOFTWARE\VMware, Inc.\VMware VDM\ClientInstallPath
    if (process.platform === 'win32') {
        const regKey = 'HKLM\\SOFTWARE\\VMware, Inc.\\VMware VDM';
        const regValue = 'ClientInstallPath';

        const tryParseReg = (stdout) => {
            const s = (stdout || '').toString();
            // Typical output:
            // ClientInstallPath    REG_SZ    C:\Program Files\VMware\VMware Horizon Client\
            const m = s.match(new RegExp(`${regValue}\\s+REG_\\w+\\s+(.+)`, 'i'));
            return m ? m[1].trim() : '';
        };

        const tryRegQuery = (extraArgs = []) => {
            try {
                const res = spawnSync('reg', ['query', regKey, '/v', regValue, ...extraArgs], { encoding: 'utf8' });
                if (res.status !== 0) return '';
                return tryParseReg(res.stdout);
            } catch {
                return '';
            }
        };

        const regPath = tryRegQuery(['/reg:64']) || tryRegQuery(['/reg:32']) || tryRegQuery([]);
        if (regPath) {
            const candidate = regPath.toLowerCase().endsWith('.exe')
                ? regPath
                : path.join(regPath, 'bin', 'vmware-view.exe');

            try {
                if (fs.existsSync(candidate)) {
                    logger('info', `Found Horizon via registry: ${candidate}`);
                    return candidate;
                }
                logger('warn', `Horizon registry path found but exe missing: ${candidate}`);
            } catch {
                // ignore
            }
        }
    }

    const roots = [
        'C:\\Program Files\\VMware',
        'C:\\Program Files (x86)\\VMware'
    ];

    for (const r of roots) {

        if (!fs.existsSync(r)) continue;

        const exe = findExeRecursive(r, 'vmware-view.exe');

        if (exe) {
            logger('info', `Found Horizon at ${exe}`);
            return exe;
        }
    }

    try {

        const where = spawnSync('where', ['vmware-view.exe'], { shell: true });

        if (where.status === 0) {

            const p = where.stdout.toString().split('\n')[0].trim();

            if (fs.existsSync(p))
                return p;
        }

    } catch { }

    return null;
}

/* ------------------------------------------------ */
function findMacApp() {

    const locations = [

        '/Applications/VMware Horizon Client.app',
        '/Applications/VMware Horizon.app',
        path.join(process.env.HOME || '', 'Applications/VMware Horizon Client.app')
    ];

    for (const p of locations)
        if (fs.existsSync(p)) return p;

    try {

        const res = spawnSync(
            'mdfind',
            ['kMDItemCFBundleIdentifier == "com.vmware*"'],
            { stdio: 'pipe' }
        );

        if (res.status === 0) {

            const found = res.stdout.toString().split('\n')[0].trim();

            if (found) return found;
        }

    } catch { }

    return null;
}

/* ------------------------------------------------ */
function launchMac(connection, settings) {

    const app = findMacApp();

    if (!app)
        throw new Error('VMware Horizon Client not found');

    const cliArm = path.join(app, 'Contents/Launchers/viewclient-macosx-arm64');
    const cliIntel = path.join(app, 'Contents/Launchers/viewclient-macosx');

    const cli = fs.existsSync(cliArm)
        ? cliArm
        : fs.existsSync(cliIntel)
            ? cliIntel
            : null;

    const args = buildArgs(connection, settings, true);

    if (cli) {

        launchDetached(cli, args);

    } else {

        launchDetached('open', ['-a', app, '--args', ...args]);
    }
}

/* ------------------------------------------------ */
function launchWindows(connection, settings) {
    const exePath = findHorizonExecutable(settings.customPath);

    if (!exePath) throw new Error('VMware Horizon Client not found');

    // Build args array in proper format
    const args = [];

    if (connection.host)
        args.push('-serverURL', connection.host);

    const userName = stripDomainFromUserName(connection.username);
    if (userName)
        args.push('-userName', userName);

    if (settings.desktopName)
        args.push('-desktopName', settings.desktopName);

    if (settings.loginAsCurrentUser)
        args.push('-loginAsCurrentUser', 'true');

    logger('info', `Launching Windows Horizon Client: ${exePath} ${args.join(' ')}`);

    // Use proper spawn API with array arguments - no shell injection risk
    const child = spawn(exePath, args, {
        detached: true,
        stdio: 'ignore',
        shell: false
    });

    // Prevent unhandled 'error' events (e.g. ENOENT) from crashing the app.
    child.on('error', (e) => {
        logger('error', `Horizon Launcher: failed to launch ${exePath}: ${e.message}`);
    });

    if (!child.pid)
        throw new Error('Failed to start Horizon Client');

    child.unref();
}

/* ------------------------------------------------ */
function launchHorizon(connection, settings) {

    try {
        // Validate connection data before using it
        validateConnectionData(connection);
    } catch (error) {
        logger('error', `Horizon Launcher: validation failed - ${error.message}`);
        throw error;
    }

    const s = settings?.horizon || settings || {};

    logger('info', 'Launching Horizon session');

    if (process.platform === 'win32')
        return launchWindows(connection, s);

    if (process.platform === 'darwin')
        return launchMac(connection, s);

    launchDetached('vmware-view', buildArgs(connection, s));
}

/* ------------------------------------------------ */
function killAllProcesses() {

    logger('info', `Killing ${launchedProcesses.length} processes`);

    for (const proc of [...launchedProcesses]) {

        try {

            if (process.platform === 'win32') {

                const child = spawn('taskkill', [
                    '/pid',
                    proc.pid.toString(),
                    '/T',
                    '/F'
                ], { stdio: 'ignore', shell: true });
                child.on('error', (e) => {
                    logger('warn', `Horizon Launcher: taskkill failed for ${proc.pid}: ${e.message}`);
                });
                child.unref();

            } else {

                process.kill(proc.pid, 'SIGKILL');

            }

        } catch (e) {

            logger('warn', `Failed to kill ${proc.pid}: ${e.message}`);

        }
    }

    launchedProcesses.length = 0;
}

/* ------------------------------------------------ */
module.exports = {
    launchHorizon,
    killAllProcesses
};
