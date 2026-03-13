/**
 * RDP Launcher - handles launching Microsoft Remote Desktop connections
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

const launchedProcesses = [];

function launchDetached(command, args = [], options = {}) {
    logger('info', `RDP Launcher: launching ${command} with args: ${args.join(' ')}`);

    try {
        const child = spawn(command, args, {
            detached: true,
            stdio: 'ignore',
            shell: false,
            ...options
        });

        launchedProcesses.push({
            pid: child.pid,
            command: command,
            args: args,
            startTime: Date.now()
        });

        logger('info', `RDP Launcher: Process started with PID ${child.pid}`);
        child.unref();
    } catch (error) {
        logger('error', `RDP Launcher: Failed to launch ${command}: ${error.message}`);
        throw error;
    }
}

function createRdpFile(connection, rdpSettings) {
    const tempDir = require('electron').app.getPath('temp');
    const rdpFilePath = path.join(tempDir, `rdm_${connection.id}.rdp`);

    const resolution = rdpSettings.resolution || '1920x1080';
    const isFullscreen = resolution === 'fullscreen' || !!rdpSettings.startFullScreen;
    const width = isFullscreen ? 1920 : parseInt(resolution.split('x')[0], 10) || 1920;
    const height = isFullscreen ? 1080 : parseInt(resolution.split('x')[1], 10) || 1080;

    const rdpContent = [
        `full address:s:${connection.host}`,
        `username:s:${connection.username || ''}`,
        `screen mode id:i:${isFullscreen ? '2' : '1'}`,
        `desktopwidth:i:${width}`,
        `desktopheight:i:${height}`,
        `session bpp:i:${parseInt(rdpSettings.colorDepth, 10) || 32}`,
        `compression:i:1`,
        `multimon:i:${rdpSettings.multimon ? '1' : '0'}`,
        `span monitors:i:${rdpSettings.span ? '1' : '0'}`,
        `redirectclipboard:i:${rdpSettings.clipboard ? '1' : '0'}`,
        `drivestoredirect:s:${rdpSettings.driveMapping ? '*' : ''}`,
        `prompt for credentials:i:${rdpSettings.promptCredentials ? '1' : '0'}`,
        `administrative session:i:${rdpSettings.useAdminSession ? '1' : '0'}`,
        'authentication level:i:2',
        'negotiate security layer:i:1'
    ];

    if (rdpSettings.customFlags) {
        rdpContent.push(rdpSettings.customFlags);
    }

    fs.writeFileSync(rdpFilePath, rdpContent.join('\n'), 'utf8');
    return rdpFilePath;
}

function scheduleDeleteFile(filePath, timeoutMs = 5000) {
    setTimeout(() => {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    }, timeoutMs);
}

function launchRdp(connection, settings) {
    const rdpSettings = settings || {};
    const rdpFilePath = createRdpFile(connection, rdpSettings);

    if (process.platform === 'win32') {
        launchDetached('mstsc.exe', [rdpFilePath]);
        scheduleDeleteFile(rdpFilePath);
        return;
    }

    if (process.platform === 'darwin') {
        const { spawnSync } = require('child_process');
        const macApps = ['Windows App', 'Microsoft Remote Desktop'];

        for (const appName of macApps) {
            const result = spawnSync('open', ['-Ra', appName], { stdio: 'ignore' });
            if (result.status === 0) {
                launchDetached('open', ['-a', appName, rdpFilePath], { shell: false });
                scheduleDeleteFile(rdpFilePath, 10000);
                return;
            }
        }
        // Fallback
        launchDetached('open', [rdpFilePath], { shell: false });
        scheduleDeleteFile(rdpFilePath, 10000);
        return;
    }

    // Linux - xfreerdp
    const args = [
        `/v:${connection.host}`,
        connection.username ? `/u:${connection.username}` : '',
        ...(rdpSettings.customFlags ? rdpSettings.customFlags.split(' ').filter(Boolean) : [])
    ].filter(Boolean);

    launchDetached('xfreerdp', args);
}

function killAllProcesses() {
    logger('info', `RDP Launcher: Killing ${launchedProcesses.length} processes`);
    for (const proc of launchedProcesses) {
        try {
            if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', proc.pid.toString(), '/T', '/F'], { stdio: 'ignore', shell: true });
            }
        } catch (e) {
            logger('warn', `RDP Launcher: Failed to kill ${proc.pid}: ${e.message}`);
        }
    }
    launchedProcesses.length = 0;
}

module.exports = {
    launchRdp,
    killAllProcesses
};
