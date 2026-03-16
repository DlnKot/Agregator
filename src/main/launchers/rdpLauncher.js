const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

const launchedProcesses = [];

/* ------------------------------------------------ */
function launchDetached(command, args = []) {

    logger('info', `RDP Launcher: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
        windowsVerbatimArguments: true
    });

    // Prevent unhandled 'error' events (e.g. ENOENT) from crashing the app.
    child.on('error', (e) => {
        logger('error', `RDP Launcher: failed to launch ${command}: ${e.message}`);
    });

    if (!child.pid) {
        throw new Error('Failed to launch process');
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
}

/* ------------------------------------------------ */
function tryLaunch(command, args = []) {
    logger('info', `RDP Launcher: ${command} ${args.join(' ')}`);

    // For `open` on macOS we don't want/need detached process tracking.
    const child = spawn(command, args, { stdio: 'ignore' });
    child.on('error', (e) => {
        logger('error', `RDP Launcher: failed to launch ${command}: ${e.message}`);
    });
    child.on('exit', (code) => {
        if (typeof code === 'number' && code !== 0) {
            logger('warn', `RDP Launcher: ${command} exited with code ${code}`);
        }
    });
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
function createRdpFile(connection, settings) {

    const tempDir = require('electron').app.getPath('temp');
    const file = path.join(tempDir, `rdm_${connection.id}.rdp`);

    const resolution = settings.resolution || '1920x1080';
    const fullscreen = resolution === 'fullscreen' || settings.startFullScreen;

    const width = fullscreen ? 1920 : parseInt(resolution.split('x')[0]) || 1920;
    const height = fullscreen ? 1080 : parseInt(resolution.split('x')[1]) || 1080;

    const lines = [

        `full address:s:${connection.host}`,
        `username:s:${connection.username || ''}`,

        `screen mode id:i:${fullscreen ? 2 : 1}`,
        `desktopwidth:i:${width}`,
        `desktopheight:i:${height}`,

        `session bpp:i:${parseInt(settings.colorDepth) || 32}`,

        `compression:i:1`,
        `multimon:i:${settings.multimon ? 1 : 0}`,
        `span monitors:i:${settings.span ? 1 : 0}`,

        `redirectclipboard:i:${settings.clipboard ? 1 : 0}`,
        `drivestoredirect:s:${settings.driveMapping ? '*' : ''}`,

        `prompt for credentials:i:${settings.promptCredentials ? 1 : 0}`,
        `administrative session:i:${settings.useAdminSession ? 1 : 0}`,

        'authentication level:i:2',
        'negotiate security layer:i:1'
    ];

    if (settings.customFlags) {
        lines.push(...splitArgs(settings.customFlags));
    }

    fs.writeFileSync(file, lines.join('\n'), 'utf8');

    return file;
}

/* ------------------------------------------------ */
function scheduleDelete(file, timeout = 10000) {

    setTimeout(() => {
        try { fs.unlinkSync(file); }
        catch {}
    }, timeout);
}

/* ------------------------------------------------ */
function findMacWindowsApp() {
    // Prefer bundle id to avoid app renames/localization ("Windows App" vs "Microsoft Remote Desktop").
    // Historically Microsoft Remote Desktop uses com.microsoft.rdc.macos.
    const bundleId = 'com.microsoft.rdc.macos';

    try {
        const res = spawnSync(
            'mdfind',
            [`kMDItemCFBundleIdentifier == "${bundleId}"`],
            { stdio: 'pipe' }
        );
        if (res.status === 0) {
            const found = res.stdout.toString().split('\n')[0].trim();
            if (found) return { bundleId, appPath: found };
        }
    } catch { /* ignore */ }

    const candidates = [
        '/Applications/Windows App.app',
        '/Applications/Microsoft Remote Desktop.app',
        path.join(process.env.HOME || '', 'Applications/Windows App.app'),
        path.join(process.env.HOME || '', 'Applications/Microsoft Remote Desktop.app')
    ];

    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) return { bundleId, appPath: p };
        } catch { /* ignore */ }
    }

    return { bundleId, appPath: null };
}

/* ------------------------------------------------ */
function launchRdp(connection, settings) {

    const rdpSettings = settings?.rdp || settings || {};

    const rdpFile = createRdpFile(connection, rdpSettings);

    /* ---------- WINDOWS ---------- */

    if (process.platform === 'win32') {

        launchDetached('mstsc.exe', [rdpFile]);

        scheduleDelete(rdpFile);

        return;
    }

    /* ---------- MAC ---------- */

    if (process.platform === 'darwin') {

        const { bundleId, appPath } = findMacWindowsApp();

        if (appPath) {
            logger('info', `RDP Launcher: using Windows App (${bundleId}) at ${appPath}`);
            // Use bundle id to avoid issues with application name/localization.
            tryLaunch('open', ['-b', bundleId, rdpFile]);
        } else {
            // Fall back to the system default handler for .rdp (may be Horizon if user associated it).
            logger('warn', `RDP Launcher: Windows App not found (bundle id ${bundleId}). Falling back to default handler for .rdp`);
            tryLaunch('open', [rdpFile]);
        }

        scheduleDelete(rdpFile);

        return;
    }

    /* ---------- LINUX ---------- */

    const args = [
        `/v:${connection.host}`,
        connection.username ? `/u:${connection.username}` : '',
        ...(rdpSettings.customFlags ? splitArgs(rdpSettings.customFlags) : [])
    ].filter(Boolean);

    launchDetached('xfreerdp', args);
}

/* ------------------------------------------------ */
function killAllProcesses() {

    logger('info', `RDP Launcher: killing ${launchedProcesses.length}`);

    for (const proc of [...launchedProcesses]) {

        try {

            if (process.platform === 'win32') {

                const child = spawn(
                    'taskkill',
                    ['/pid', proc.pid.toString(), '/T', '/F'],
                    { stdio: 'ignore', shell: true }
                );
                child.on('error', (e) => {
                    logger('warn', `RDP Launcher: taskkill failed for ${proc.pid}: ${e.message}`);
                });
                child.unref();

            } else {

                process.kill(proc.pid, 'SIGKILL');

            }

        } catch (e) {

            logger('warn', `Kill failed ${proc.pid}: ${e.message}`);

        }
    }

    launchedProcesses.length = 0;
}

module.exports = {
    launchRdp,
    killAllProcesses
};
