const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

function spawnDetached(command, args = [], options = {}) {
  logger('info', `VPN Launcher: launching ${command} ${args.join(' ')}`);

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    shell: false,
    ...options
  });

  // Prevent unhandled 'error' events (e.g. ENOENT) from crashing the app.
  child.on('error', (err) => {
    logger('error', `VPN Launcher: spawn failed: ${err.message}`);
  });

  child.unref();
  return child;
}

function findFirstExistingPath(paths) {
  for (const p of paths) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch (e) {
      // ignore
    }
  }
  return null;
}

function findInPathWindows(exeName) {
  try {
    const res = spawnSync('where', [exeName], { encoding: 'utf8' });
    if (res.status === 0 && res.stdout) {
      const first = res.stdout.split(/\r?\n/).map(s => s.trim()).find(Boolean);
      if (first && fs.existsSync(first)) return first;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function launchVpn() {
  if (process.platform === 'darwin') {
    // Primary command per requirement:
    //   open -a "Endpoint Security VPN"
    // We keep a small fallback for older product naming if the bundle exists.
    const knownBundle = findFirstExistingPath([
      '/Applications/Endpoint Security VPN.app',
      '/Applications/EndpointConnect.app',
      '/Applications/Endpoint Connect.app'
    ]);

    if (knownBundle) {
      // If it's the VPN bundle, prefer the name-based open to match the requested command.
      if (knownBundle.endsWith('/Endpoint Security VPN.app')) {
        spawnDetached('open', ['-a', 'Endpoint Security VPN']);
      } else {
        spawnDetached('open', [knownBundle]);
      }
      return;
    }

    spawnDetached('open', ['-a', 'Endpoint Security VPN']);
    return;
  }

  if (process.platform === 'win32') {
    const pf = process.env.ProgramFiles;
    const pf86 = process.env['ProgramFiles(x86)'];
    const pfw = process.env.ProgramW6432;
    const bases = [pf, pf86, pfw].filter(Boolean);

    // Primary requirement: start TrGUI.exe (typically installed in Program Files).
    const relCandidates = [
      path.join('TrGUI', 'TrGUI.exe'),
      path.join('TrGUI', 'TrGUI', 'TrGUI.exe')
    ];

    const absCandidates = [];
    for (const base of bases) {
      for (const rel of relCandidates) absCandidates.push(path.join(base, rel));
    }

    const exePath = findFirstExistingPath(absCandidates);
    if (exePath) {
      spawnDetached(exePath, []);
      return;
    }

    // PATH fallback (safe: resolve first, then spawn)
    const pathTrGui = findInPathWindows('TrGUI.exe');
    if (pathTrGui) {
      spawnDetached(pathTrGui, []);
      return;
    }

    throw new Error('VPN клиент не найден: TrGUI.exe (установите VPN клиент или проверьте путь установки)');
  }

  throw new Error(`VPN запуск не поддерживается на платформе: ${process.platform}`);
}

module.exports = {
  launchVpn
};
