const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function spawnDetached(command, args = [], options = {}) {
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    ...options
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

    const relCandidates = [
      path.join('CheckPoint', 'Endpoint Connect', 'EPWD.exe'),
      path.join('CheckPoint', 'Endpoint Security', 'EPWD.exe'),
      path.join('CheckPoint', 'Endpoint Security VPN', 'EPWD.exe')
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

    // Fallback: try PATH
    try {
      spawnDetached('EPWD.exe', []);
      return;
    } catch (e) {
      // ignore, we'll throw below
    }

    throw new Error('VPN клиент не найден: EPWD.exe (установите Endpoint Connect или проверьте путь установки)');
  }

  throw new Error(`VPN запуск не поддерживается на платформе: ${process.platform}`);
}

module.exports = {
  launchVpn
};
