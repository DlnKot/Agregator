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

function sleepMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return;
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
  } catch {
    // ignore
  }
}

function queryWindowsServiceState(serviceName) {
  const name = String(serviceName || '').trim();
  if (!name) return '';

  try {
    const res = spawnSync('sc', ['query', name], { encoding: 'utf8' });
    if (res.status !== 0) return '';
    const out = String(res.stdout || '');
    // Example: STATE              : 4  RUNNING
    const m = out.match(/\bSTATE\s*:\s*\d+\s+(\w+)\b/i);
    return m && m[1] ? String(m[1]).toUpperCase() : '';
  } catch {
    return '';
  }
}

function ensureWindowsServiceRunning(serviceName) {
  const name = String(serviceName || '').trim();
  if (!name) return false;

  const state = queryWindowsServiceState(name);
  if (!state) {
    logger('debug', `RuDesktop Launcher: service not found: ${name}`);
    return false;
  }
  if (state === 'RUNNING') {
    logger('debug', `RuDesktop Launcher: service already running: ${name}`);
    return true;
  }

  logger('info', `RuDesktop Launcher: starting service ${name} (state=${state})`);
  try {
    const startRes = spawnSync('sc', ['start', name], { encoding: 'utf8' });
    if (startRes.status !== 0) {
      logger('warn', `RuDesktop Launcher: failed to start service ${name}: ${String(startRes.stderr || startRes.stdout || '').trim()}`);
      return false;
    }
  } catch {
    logger('warn', `RuDesktop Launcher: failed to start service ${name}`);
    return false;
  }

  sleepMs(600);
  const next = queryWindowsServiceState(name);
  logger('info', `RuDesktop Launcher: service ${name} state after start: ${next || 'unknown'}`);
  return next === 'RUNNING';
}

function isWindowsProcessRunning(imageName) {
  const img = String(imageName || '').trim();
  if (!img) return false;

  try {
    const res = spawnSync('tasklist', ['/FI', `IMAGENAME eq ${img}`], { encoding: 'utf8' });
    if (res.status !== 0) return false;
    const out = String(res.stdout || '').toLowerCase();
    if (out.includes('no tasks are running')) return false;
    return out.includes(img.toLowerCase());
  } catch {
    return false;
  }
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

  const clean = (p) => String(p || '').trim().replace(/^"+|"+$/g, '');

  // Typical form: "C:\Path\RuDesktop.exe" "%1"
  const startQuoted = s.match(/^"([^"]+\.exe)"/i);
  if (startQuoted && startQuoted[1]) return clean(startQuoted[1]);

  // Some commands wrap the exe later in the string.
  const anyQuoted = s.match(/"([^"]+\.exe)"/i);
  if (anyQuoted && anyQuoted[1]) return clean(anyQuoted[1]);

  // Common case: non-quoted path with spaces (e.g. C:\Program Files\...\RuDesktop.exe)
  const drivePath = s.match(/([A-Za-z]:\\.+?\.exe)/i);
  if (drivePath && drivePath[1]) return clean(drivePath[1]);

  // UNC path (best-effort)
  const uncPath = s.match(/(\\\\[^\\\s"]+\\.+?\.exe)/i);
  if (uncPath && uncPath[1]) return clean(uncPath[1]);

  // Fallback: first token that ends with .exe
  const tokenExe = s.match(/([^\s"]+\.exe)/i);
  if (tokenExe && tokenExe[1]) return clean(tokenExe[1]);

  // Final fallback: first token.
  const token = s.split(/\s+/)[0] || '';
  return clean(token);
}

function getEnvCaseInsensitive(name) {
  const needle = String(name || '').toLowerCase();
  if (!needle) return '';
  const direct = process.env[name];
  if (direct) return direct;
  for (const k of Object.keys(process.env || {})) {
    if (String(k).toLowerCase() === needle) return process.env[k] || '';
  }
  return '';
}

function expandWindowsEnvVars(input = '') {
  const s = String(input || '');
  return s.replace(/%([^%]+)%/g, (m, varName) => {
    const v = getEnvCaseInsensitive(varName);
    return v ? v : m;
  });
}

function parseRegQueryDefaultValue(stdout = '') {
  const lines = String(stdout || '').split(/\r?\n/);

  // We intentionally do NOT depend on locale strings like "(Default)" / "(По умолчанию)".
  // We simply look for the last column after "REG_*".
  for (const line of lines) {
    const m = line.match(/\sREG_\w+\s+(.+)$/i);
    if (m && m[1]) {
      const raw = m[1].trim();
      if (!raw) continue;
      return raw;
    }
  }

  return '';
}

function queryRegDefaultCommandWindows(key, extraArgs = []) {
  try {
    const res = spawnSync('reg', ['query', key, '/ve', ...extraArgs], { encoding: 'utf8' });
    if (res.status !== 0) return '';
    return parseRegQueryDefaultValue(res.stdout);
  } catch {
    return '';
  }
}

function getRuDesktopExeFromRegistryWindows() {
  const keys = [
    // File association
    'HKCU\\SOFTWARE\\Classes\\.rudesktop\\shell\\open\\command',
    'HKLM\\SOFTWARE\\Classes\\.rudesktop\\shell\\open\\command',
    'HKCR\\.rudesktop\\shell\\open\\command',

    // Protocol association (best-effort)
    'HKCU\\SOFTWARE\\Classes\\rudesktop\\shell\\open\\command',
    'HKLM\\SOFTWARE\\Classes\\rudesktop\\shell\\open\\command',
    'HKCR\\rudesktop\\shell\\open\\command',

    // Some installers may register a class name
    'HKLM\\SOFTWARE\\Classes\\RuDesktop\\shell\\open\\command',
    'HKCR\\RuDesktop\\shell\\open\\command'
  ];

  const views = [
    ['/reg:64'],
    ['/reg:32'],
    []
  ];

  for (const key of keys) {
    for (const viewArgs of views) {
      const raw = queryRegDefaultCommandWindows(key, viewArgs);
      const exe = expandWindowsEnvVars(parseWindowsCommandExe(raw));
      if (exe && /\.exe$/i.test(exe)) {
        logger('info', `RuDesktop Launcher: registry candidate (${viewArgs.join(' ') || 'default'}) ${key} -> ${exe}`);
        return exe;
      }
    }
  }

  return '';
}

function findRuDesktopExeWindowsFallback() {
  const programFiles = process.env.ProgramW6432 || process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const localAppData = process.env.LOCALAPPDATA || '';

  const exeNames = ['RuDesktop.exe', 'rudesktop.exe', 'RuDesktopClient.exe'];
  const candidates = [];

  for (const exeName of exeNames) {
    candidates.push(
      path.join(programFiles, 'RuDesktop', exeName),
      path.join(programFiles, 'RuDesktop Client', exeName),
      path.join(programFilesX86, 'RuDesktop', exeName),
      path.join(programFilesX86, 'RuDesktop Client', exeName)
    );

    if (localAppData) {
      candidates.push(
        path.join(localAppData, 'Programs', 'RuDesktop', exeName),
        path.join(localAppData, 'Programs', 'RuDesktop Client', exeName)
      );
    }
  }

  const direct = findFirstExistingPath(candidates);
  if (direct) {
    logger('info', `RuDesktop Launcher: found via common paths: ${direct}`);
    return direct;
  }

  // Last resort: PATH lookup.
  for (const exeName of exeNames) {
    try {
      const where = spawnSync('where', [exeName], { encoding: 'utf8', shell: true });
      if (where.status === 0) {
        const p = String(where.stdout || '').split(/\r?\n/)[0].trim();
        if (p && fs.existsSync(p)) {
          logger('info', `RuDesktop Launcher: found via where(${exeName}): ${p}`);
          return p;
        }
      }
    } catch {
      // ignore
    }
  }

  return '';
}

function resolveRuDesktopExeWindows() {
  const fromReg = getRuDesktopExeFromRegistryWindows();
  if (fromReg) {
    try {
      if (/\.exe$/i.test(fromReg) && fs.existsSync(fromReg)) {
        const stat = fs.statSync(fromReg);
        if (stat && stat.isFile()) return fromReg;
      }
      logger('warn', `RuDesktop Launcher: registry path found but exe missing: ${fromReg}`);
    } catch {
      logger('warn', `RuDesktop Launcher: registry path found but cannot verify exe: ${fromReg}`);
    }
  }
  return findRuDesktopExeWindowsFallback();
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
    const exe = resolveRuDesktopExeWindows();
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
    // Ensure the background service is running (best-effort).
    // Service name: RuDesktop (display name may be different).
    try { ensureWindowsServiceRunning('RuDesktop'); } catch { /* ignore */ }

    const exePath = resolveRuDesktopExeWindows();
    if (!exePath) {
      const err = new Error('RuDesktop not installed');
      err.code = 'RUDESKTOP_NOT_INSTALLED';
      err.downloadUrl = DOWNLOAD_URL;
      throw err;
    }

    try {
      if (!fs.existsSync(exePath)) {
        logger('warn', `RuDesktop Launcher: resolved path but exe missing: ${exePath}`);
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

    const exeName = path.basename(exePath);
    const wasRunning = isWindowsProcessRunning(exeName);

    spawnDetached(exePath, [], { cwd: path.dirname(exePath) });

    // Best-effort: verify the process exists shortly after spawn.
    sleepMs(900);
    const isRunning = isWindowsProcessRunning(exeName);
    if (!wasRunning && !isRunning) {
      const err = new Error('RuDesktop failed to start');
      err.code = 'RUDESKTOP_LAUNCH_FAILED';
      throw err;
    }
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
