const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

const DOWNLOAD_URL = 'https://rudesktop.ru/downloads/';

function spawnDetached(command, args = [], options = {}) {
  logger('info', `RuDesktop Launcher: launching ${command} ${args.join(' ')}`);

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    shell: false,
    ...options
  });

  child.on('error', (err) => {
    logger('error', `RuDesktop Launcher: spawn failed: ${err.message}`);
  });

  child.unref();
  return child;
}

function findFirstExistingPath(paths) {
  for (const p of paths) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

function parseWindowsCommandExe(raw = '') {
  const s = String(raw || '').trim();
  if (!s) return '';

  // Typical form: "C:\Path\RuDesktop.exe" "%1"
  const quoted = s.match(/^"([^"]+\.exe)"/i);
  if (quoted && quoted[1]) return quoted[1];

  // Fallback: first token until whitespace.
  const token = s.split(/\s+/)[0] || '';
  return token.replace(/^"+|"+$/g, '');
}

function getRuDesktopExeFromRegistryWindows() {
  try {
    const key = 'HKLM\\SOFTWARE\\Classes\\.rudesktop\\shell\\open\\command';
    const res = spawnSync('reg', ['query', key, '/ve'], { encoding: 'utf8' });
    if (res.status !== 0) return '';

    const out = (res.stdout || '').split(/\r?\n/);
    // Example line: (Default)    REG_SZ    "C:\...\RuDesktop.exe" "%1"
    for (const line of out) {
      const m = line.match(/\(Default\)\s+REG_\w+\s+(.+)$/i);
      if (m && m[1]) return parseWindowsCommandExe(m[1]);
    }
  } catch {
    // ignore
  }
  return '';
}

function findRuDesktopMacApp() {
  const candidates = [
    '/Applications/RuDesktop.app',
    '/Applications/RuDesktop Client.app',
    path.join(process.env.HOME || '', 'Applications/RuDesktop.app'),
    path.join(process.env.HOME || '', 'Applications/RuDesktop Client.app')
  ];

  const direct = findFirstExistingPath(candidates);
  if (direct) return direct;

  // LaunchServices lookup without opening Finder/UI.
  // Returns a POSIX path like: "/Applications/RuDesktop.app/"
  try {
    const res = spawnSync('osascript', ['-e', 'POSIX path of (path to application "RuDesktop")'], { encoding: 'utf8' });
    if (res.status === 0) {
      const p = String(res.stdout || '').trim();
      if (p && p.endsWith('.app/')) {
        const appPath = p.slice(0, -1); // drop trailing slash
        if (fs.existsSync(appPath)) return appPath;
      } else if (p && p.endsWith('.app')) {
        if (fs.existsSync(p)) return p;
      }
    }
  } catch {
    // ignore
  }

  // Spotlight search by app bundle name (best-effort).
  try {
    const res = spawnSync('mdfind', ['kMDItemFSName == "RuDesktop.app"'], { encoding: 'utf8' });
    if (res.status === 0) {
      const found = String(res.stdout || '').split('\n').map(s => s.trim()).find(s => s.endsWith('.app'));
      if (found && fs.existsSync(found)) return found;
    }
  } catch {
    // ignore
  }

  return '';
}

function isInstalled() {
  if (process.platform === 'darwin') {
    return Boolean(findRuDesktopMacApp());
  }

  if (process.platform === 'win32') {
    const exe = getRuDesktopExeFromRegistryWindows();
    if (!exe) return false;
    try {
      return fs.existsSync(exe);
    } catch {
      return false;
    }
  }

  return false;
}

function launchRuDesktop() {
  if (process.platform === 'darwin') {
    const appPath = findRuDesktopMacApp();
    if (!appPath) {
      const err = new Error('RuDesktop not installed');
      err.code = 'RUDESKTOP_NOT_INSTALLED';
      err.downloadUrl = DOWNLOAD_URL;
      throw err;
    }

    // Requirement: launch via `open`.
    spawnDetached('open', [appPath]);
    return;
  }

  if (process.platform === 'win32') {
    const exePath = getRuDesktopExeFromRegistryWindows();
    if (!exePath) {
      const err = new Error('RuDesktop not installed');
      err.code = 'RUDESKTOP_NOT_INSTALLED';
      err.downloadUrl = DOWNLOAD_URL;
      throw err;
    }

    try {
      if (!fs.existsSync(exePath)) {
        const err = new Error('RuDesktop not installed');
        err.code = 'RUDESKTOP_NOT_INSTALLED';
        err.downloadUrl = DOWNLOAD_URL;
        throw err;
      }
    } catch {
      const err = new Error('RuDesktop not installed');
      err.code = 'RUDESKTOP_NOT_INSTALLED';
      err.downloadUrl = DOWNLOAD_URL;
      throw err;
    }

    spawnDetached(exePath, []);
    return;
  }

  const err = new Error(`RuDesktop launch not supported on platform: ${process.platform}`);
  err.code = 'RUDESKTOP_UNSUPPORTED_PLATFORM';
  throw err;
}

module.exports = {
  launchRuDesktop,
  isInstalled,
  DOWNLOAD_URL
};
