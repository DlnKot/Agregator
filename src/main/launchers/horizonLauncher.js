/**
 * VMware Horizon Launcher
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

const launchedProcesses = [];

/* ------------------------------------------------ */
function launchDetached(command, args = []) {

    logger('info', `Launching: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
        windowsVerbatimArguments: true
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

    return `"${url}"`;
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
        flag('serverURL', `"${normalizeUrl(settings.serverUrl)}"`);

    if (connection.desktopPool || settings.desktopName)
        flag('desktopName', connection.desktopPool || settings.desktopName);

    if (settings.appName)
        flag('appName', settings.appName);

    if (connection.username || settings.user?.username)
        flag('userName', connection.username || settings.user.username);

    if (settings.user?.domain)
        flag('domainName', settings.user.domain);

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

    if (connection.username)
        args.push('-userName', connection.username);

    if (connection.domain)
        args.push('-domainName', connection.domain);

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

    if (!child.pid)
        throw new Error('Failed to start Horizon Client');

    child.unref();
}

/* ------------------------------------------------ */
function launchHorizon(connection, settings) {

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

                spawn('taskkill', [
                    '/pid',
                    proc.pid.toString(),
                    '/T',
                    '/F'
                ], { stdio: 'ignore', shell: true });

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