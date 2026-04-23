const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

// trac.exe пишет через Windows Console API (WriteConsole), а не через stdout/stderr.
// Node spawn() с pipe не видит WriteConsole-вывод — нужен настоящий PTY.
// node-pty создаёт PTY, trac.exe думает что работает в реальной консоли
// и весь вывод перехватывается через onData.
// node-pty — нативный модуль, собирается на Windows через GitHub Actions.

let pty = null;
if (process.platform === 'win32') {
  try {
    pty = require('node-pty');
    logger('info', '[VPN Launcher] node-pty загружен успешно');
  } catch (e) {
    logger('error', `[VPN Launcher] ❌ node-pty не загружен: ${e.message}`);
  }
}

const CHECKPOINT_SITE = 'mypc.alfabank.ru';
const VPN_CHECK_HOST = 'mypc.moscow.alfaintra.net';
const VPN_CONNECT_TIMEOUT_MS = 60000;

const launchedProcesses = [];
let currentVpnProcess = null;

// ─── Утилиты ──────────────────────────────────────────────────────────────────

function findFirstExistingPath(paths) {
  for (const p of paths) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch (e) { }
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
  } catch (e) { }
  return null;
}

function findTracExecutable() {
  if (process.platform !== 'win32') return null;

  const pf = process.env.ProgramFiles;
  const pf86 = process.env['ProgramFiles(x86)'];
  const pfw = process.env.ProgramW6432;
  const bases = [pf, pf86, pfw].filter(Boolean);

  const relCandidates = [
    path.join('CheckPoint', 'Endpoint Connect', 'trac.exe'),
    path.join('CheckPoint', 'Endpoint Security VPN', 'trac.exe'),
  ];

  const absCandidates = [];
  for (const base of bases)
    for (const rel of relCandidates)
      absCandidates.push(path.join(base, rel));

  return findFirstExistingPath(absCandidates) || findInPathWindows('trac.exe');
}

// ─── Ping / VPN-check ─────────────────────────────────────────────────────────

function runPingOnce(host) {
  return new Promise((resolve) => {
    const safeHost = String(host || '').trim();
    if (!safeHost) { resolve({ reachable: false, error: 'No host' }); return; }

    let cmd, args;
    if (process.platform === 'win32') {
      cmd = process.env.ComSpec || 'cmd.exe';
      args = ['/d', '/s', '/c', `chcp 65001>nul & ping -n 1 -w 2000 ${safeHost}`];
    } else {
      cmd = 'ping';
      args = ['-c', '1', '-W', '2', safeHost];
    }

    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGKILL'); } catch (e) { }
    }, 5000);

    let out = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { out += d.toString(); });
    child.on('close', () => {
      clearTimeout(timer);
      const reachable = !timedOut && (
        out.includes('Reply from') || out.includes('Ответ от') ||
        out.includes('1 received') || out.includes('1 packets received')
      );
      resolve({ reachable, raw: out });
    });
    child.on('error', () => { clearTimeout(timer); resolve({ reachable: false, error: 'Spawn error' }); });
  });
}

async function checkVpnConnected() {
  const result = await runPingOnce(VPN_CHECK_HOST);
  return result.reachable;
}

// ─── Spawn через node-pty ─────────────────────────────────────────────────────

function spawnVpnProcess(tracArgs) {
  if (!pty) throw new Error('node-pty недоступен');

  const tracExe = findTracExecutable();
  if (!tracExe) throw new Error('Checkpoint trac.exe не найден');

  const safeArgs = tracArgs.map((arg, i) => (i >= 4 && arg.length > 0) ? '[hidden]' : arg);

  const ptyProcess = pty.spawn(tracExe, tracArgs, {
    name: 'xterm',
    cols: 220,
    rows: 50,
    cwd: path.dirname(tracExe),
    env: process.env,
    useConpty: true,  // Windows ConPTY — стабильнее на Windows 10+
  });

  logger('info', `[VPN Spawn] PTY процесс запущен, PID: ${ptyProcess.pid}`);

  launchedProcesses.push(ptyProcess);
  currentVpnProcess = ptyProcess;

  ptyProcess.onExit(({ exitCode, signal }) => {
    currentVpnProcess = null;
  });

  return ptyProcess;
}

function cancelVpnConnection() {
  if (currentVpnProcess) {
    try {
      currentVpnProcess.kill();
      currentVpnProcess = null;
      logger('info', '[VPN] Подключение отменено');
      return true;
    } catch (e) {
      logger('error', `[VPN] Ошибка при отмене: ${e.message}`);
    }
  }
  return false;
}

// ─── Подключение ──────────────────────────────────────────────────────────────

async function connectVpnInteractive(username, domainPassword, indeedCode) {
  return new Promise((resolve, reject) => {
    logger('info', `[VPN Connect] Начало подключения к ${CHECKPOINT_SITE}`);
    logger('info', `[VPN Connect] Таймаут: ${VPN_CONNECT_TIMEOUT_MS}ms`);

    const ptyProcess = spawnVpnProcess(['connect', '-s', CHECKPOINT_SITE, '-u', username, '-p', indeedCode]);

    let output = '';
    let chunkCount = 0;
    let timedOut = false;
    let passwordSent = false;
    let settled = false;

    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { ptyProcess.kill(); } catch (e) { }
      fn(value);
    };

    const timeout = setTimeout(() => {
      timedOut = true;
      
      settle(reject, new Error('Таймаут ожидания ответа от VPN'));
    }, VPN_CONNECT_TIMEOUT_MS);

    // node-pty объединяет stdout+stderr в один поток
    ptyProcess.onData((data) => {
      const clean = data
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')  // ANSI CSI sequences
        .replace(/\x1b\][^\x07]*\x07/g, '')       // OSC sequences
        .replace(/\r/g, '');                       // carriage returns
      output += clean;
      chunkCount++;
      
      checkOutput();
    });

    const sendInput = (text) => {
      if (timedOut) {
        
        return;
      }
     
      try {
        ptyProcess.write(text + '\r');
        
      } catch (e) {
        logger('error', `[VPN Input] ❌ Ошибка: ${e.message}`);
      }
    };

    const SUCCESS_MARKERS = [
      'connection was successfully established',
    ];
    const FAILURE_MARKERS = [
      'authentication failed',
      'login failed',
      'access denied',
      'wrong password',
      'connection failed',
    ];

    const checkOutput = () => {
      if (timedOut || settled) return;

      const lower = output.toLowerCase();

      const hitSuccess = SUCCESS_MARKERS.find(m => lower.includes(m));
      if (hitSuccess) {
        logger('info', `[VPN Connect] ✅ Успешное подключение! Маркер: "${hitSuccess}"`);
        settle(resolve, { success: true });
        return;
      }

      const hitFailure = FAILURE_MARKERS.find(m => lower.includes(m));
      if (hitFailure) {
        settle(reject, new Error(output || 'Ошибка подключения к VPN'));
        return;
      }

      if (!passwordSent && lower.includes('password:')) {
        passwordSent = true;
        sendInput(domainPassword);
        logger('info', `[VPN Connect] Пароль отправлен, ожидаем ответа VPN...`);
      }
    };

    ptyProcess.onExit(({ exitCode }) => {
      logger('info', `[VPN Connect] PTY завершён. Код: ${exitCode}`);

      if (settled) {
        logger('info', `[VPN Connect] Промис уже завершён ранее, пропускаем`);
        return;
      }

      checkOutput();
      if (settled) return;

      if (exitCode === 0) {
        logger('info', `[VPN Connect] ✅ Код 0 — считаем успехом`);
        settle(resolve, { success: true });
      } else {
        logger('error', `[VPN Connect] ❌ Код ${exitCode}`);
        settle(reject, new Error(`VPN процесс завершился с кодом ${exitCode}:\n${output}`));
      }
    });
  });
}

// ─── Отключение ───────────────────────────────────────────────────────────────

function disconnectVpn() {
  const exePath = findTracExecutable();
  if (!exePath) throw new Error('Checkpoint trac.exe не найден');

  logger('info', `[VPN Disconnect] Отключение через ${exePath}`);

  // disconnect не интерактивный — обычный spawnSync работает нормально
  const result = spawnSync(exePath, ['disconnect'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: false,
    timeout: 10000,
  });

  if (result.error) throw result.error;

  const out = [result.stdout, result.stderr]
    .map(b => (b || '').toString().trim())
    .filter(Boolean)
    .join('\n');

  logger('info', `[VPN Disconnect] Вывод: ${out || '(пусто)'}`);
  logger('info', `[VPN Disconnect] Код выхода: ${result.status}`);

  if (result.status !== 0) {
    throw new Error(`Disconnect завершился с кодом ${result.status}: ${out}`);
  }

  return { success: true };
}

// ─── Legacy GUI запуск ────────────────────────────────────────────────────────

function launchVpnLegacy() {
  if (process.platform === 'darwin') {
    const knownBundle = findFirstExistingPath([
      '/Applications/Endpoint Security VPN.app',
      '/Applications/EndpointConnect.app',
      '/Applications/Endpoint Connect.app',
    ]);

    if (knownBundle) {
      knownBundle.endsWith('/Endpoint Security VPN.app')
        ? spawnDetached('open', ['-a', 'Endpoint Security VPN'])
        : spawnDetached('open', [knownBundle]);
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
      path.join('TrGUI', 'TrGUI.exe'),
      path.join('TrGUI', 'TrGUI', 'TrGUI.exe'),
      path.join('CheckPoint', 'Endpoint Connect', 'TrGUI.exe'),
      path.join('CheckPoint', 'Endpoint Security VPN', 'TrGUI.exe'),
    ];

    const absCandidates = [];
    for (const base of bases)
      for (const rel of relCandidates)
        absCandidates.push(path.join(base, rel));

    const exePath = findFirstExistingPath(absCandidates) || findInPathWindows('TrGUI.exe');
    if (exePath) { spawnDetached(exePath, []); return; }

    throw new Error('VPN клиент не найден: TrGUI.exe');
  }

  throw new Error(`VPN запуск не поддерживается на платформе: ${process.platform}`);
}

function spawnDetached(command, args = []) {
  logger('info', `[VPN Legacy] Запуск: ${command} ${args.join(' ')}`);

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    shell: false,
  });

  child.on('error', (err) => {
    logger('error', `[VPN Legacy] Ошибка запуска: ${err.message}`);
  });

  child.unref();
  return child;
}

function killAllProcesses() {
  for (const proc of launchedProcesses) {
    try { proc.kill(); } catch (e) { }
  }
  launchedProcesses.length = 0;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  launchVpn: launchVpnLegacy,
  connectVpnInteractive,
  disconnectVpn,
  cancelVpnConnection,
  checkVpnConnected,
  killAllProcesses,
  findTracExecutable,
  CHECKPOINT_SITE,
  VPN_CHECK_HOST,
};