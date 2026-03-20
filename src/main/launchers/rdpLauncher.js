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
    // Allow IP addresses and hostnames, but reject paths and special characters
    if (!/^[a-zA-Z0-9._\-:]+$/.test(trimmed)) {
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
    // Allow domain\user and simple usernames, reject command injection attempts
    if (/[;|&$`()\\n\\r]/.test(username) && !username.includes('\\')) {
        throw new Error('Invalid username: contains invalid characters');
    }
    return username.trim();
}

function validateConnectionData(connection) {
    if (!connection || typeof connection !== 'object') {
        throw new Error('Invalid connection object');
    }

    // Validate host - required
    connection.host = validateHost(connection.host);

    // Validate username - optional
    if (connection.username) {
        connection.username = validateUsername(connection.username);
    }

    // Validate ID
    if (!connection.id || typeof connection.id !== 'string') {
        throw new Error('Connection must have valid ID');
    }

    return connection;
}

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

    // Используем настройки из объекта или дефолтные значения
    const s = settings || {};

    // Разрешение
    const resolution = s.resolution || '1920x1080';
    const fullscreen = resolution === 'fullscreen' || s.startFullScreen;

    let width = 1920;
    let height = 1080;

    if (!fullscreen && resolution.includes('x')) {
        const parts = resolution.split('x');
        width = parseInt(parts[0]) || 1920;
        height = parseInt(parts[1]) || 1080;
    }

    const lines = [];

    // Основные настройки
    lines.push(`full address:s:${connection.host}`);
    lines.push(`username:s:${connection.username || ''}`);
    lines.push(`screen mode id:i:${fullscreen ? 2 : 1}`);
    lines.push(`desktopwidth:i:${width}`);
    lines.push(`desktopheight:i:${height}`);
    lines.push(`session bpp:i:${parseInt(s.colorDepth) || 32}`);

    // WinPosStr - позиция и размер окна
    lines.push(`winposstr:s:0,3,0,0,${width},${height}`);

    // Мониторы
    lines.push(`use multimon:i:${s.multimon ? 1 : 0}`);
    lines.push(`span monitors:i:${s.span ? 1 : 0}`);
    lines.push(`displayconnectionbar:i:1`);
    lines.push(`enableworkspacereconnect:i:0`);

    // Перенаправление устройств
    lines.push(`redirectclipboard:i:${s.clipboard ? 1 : 0}`);
    lines.push(`drivestoredirect:s:${s.driveMapping ? '*' : ''}`);

    // Redirect - новый формат
    const redirect = s.redirect || {};
    lines.push(`redirectprinters:i:${redirect.printers !== false ? 1 : 0}`);
    lines.push(`redirectsmartcards:i:${redirect.smartcards !== false ? 1 : 0}`);
    lines.push(`redirectwebauthn:i:${redirect.webauthn !== false ? 1 : 0}`);
    lines.push(`redirectcomports:i:0`);
    lines.push(`redirectposdevices:i:0`);
    lines.push(`redirectlocation:i:0`);

    // Аудио - новый формат
    const audio = s.audio || {};
    // audiomode: 0 - bring to this computer, 1 - leave at remote, 2 - do not play
    lines.push(`audiomode:i:${audio.playback !== false ? 0 : 2}`);
    lines.push(`audiocapturemode:i:${audio.capture ? 1 : 0}`);

    // Видео
    lines.push(`videoplaybackmode:i:1`);

    // Производительность / отображение - новый формат
    const perf = s.performance || {};
    lines.push(`disable wallpaper:i:${perf.wallpaper === false ? 1 : 0}`);
    lines.push(`allow font smoothing:i:${perf.fontSmoothing !== false ? 1 : 0}`);
    lines.push(`allow desktop composition:i:${perf.desktopComposition !== false ? 1 : 0}`);
    lines.push(`disable full window drag:i:${perf.fullWindowDrag === false ? 1 : 0}`);
    lines.push(`disable menu anims:i:${perf.menuAnimations === false ? 1 : 0}`);
    lines.push(`disable themes:i:0`);
    lines.push(`disable cursor setting:i:0`);

    // Сеть
    lines.push(`compression:i:1`);
    lines.push(`networkautodetect:i:1`);
    lines.push(`bandwidthautodetect:i:1`);
    lines.push(`connection type:i:7`);

    // Перенаправление COM-портов
    lines.push(`bitmapcachepersistenable:i:1`);

    // Автопереподключение
    lines.push(`autoreconnection enabled:i:1`);

    // Учётные данные
    lines.push(`prompt for credentials:i:${s.promptCredentials ? 1 : 0}`);
    lines.push(`administrative session:i:${s.useAdminSession ? 1 : 0}`);

    // Безопасность
    lines.push(`authentication level:i:2`);
    lines.push(`negotiate security layer:i:1`);
    lines.push(`remoteapplicationmode:i:0`);

    // Shell
    lines.push(`alternate shell:s:`);
    lines.push(`shell working directory:s:`);

    // Gateway
    lines.push(`gatewayhostname:s:`);
    lines.push(`gatewayusagemethod:i:4`);
    lines.push(`gatewaycredentialssource:i:4`);
    lines.push(`gatewayprofileusagemethod:i:0`);
    lines.push(`promptcredentialonce:i:0`);
    lines.push(`gatewaybrokeringtype:i:0`);
    lines.push(`use redirection server name:i:0`);
    lines.push(`rdgiskdcproxy:i:0`);
    lines.push(`kdcproxyname:s:`);
    lines.push(`enablerdsaadauth:i:0`);
    lines.push(`remoteappmousemoveinject:i:1`);

    // Кастомные флаги
    if (s.customFlags) {
        const customLines = splitArgs(s.customFlags);
        lines.push(...customLines);
    }

    fs.writeFileSync(file, lines.join('\n'), 'utf8');

    return file;
}

/* ------------------------------------------------ */
function scheduleDelete(file, timeout = 10000) {

    setTimeout(() => {
        try { fs.unlinkSync(file); }
        catch { }
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

    try {
        // Validate connection data before using it
        validateConnectionData(connection);
    } catch (error) {
        logger('error', `RDP Launcher: validation failed - ${error.message}`);
        throw error;
    }

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
