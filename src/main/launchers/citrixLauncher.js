/**
 * VMware Horizon Launcher - handles launching VMware Horizon Client connections
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

const launchedProcesses = [];

// Common installation paths
const HORIZON_PATHS = [
 'C:\\Program Files\\VMware\\VMware Horizon Client\\bin\\vmware-view.exe',
 'C:\\Program Files\\VMware\\VMware Horizon\\View\\Client\\bin\\vmware-view.exe',
 'C:\\Program Files (x86)\\VMware\\VMware Horizon Client\\bin\\vmware-view.exe',
 'C:\\Program Files (x86)\\VMware\\VMware Horizon\\View\\Client\\bin\\vmware-view.exe',
 'C:\\ProgramData\\VMware\\VMware Horizon\\View\\Client\\bin\\vmware-view.exe',
 path.join(process.env.LOCALAPPDATA || '', 'VMware', 'VMware Horizon Client', 'bin', 'vmware-view.exe'),
 path.join(process.env.LOCALAPPDATA || '', 'VMware', 'VMware Horizon', 'View', 'Client', 'bin', 'vmware-view.exe'),
 path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'VMware', 'VMware Horizon', 'View', 'Client', 'bin', 'vmware-view.exe')
];

function launchDetached(command, args = [], options = {}) {
 logger('info', `Horizon Launcher: launching ${command} ${args.join(' ')}`);

 try {
  const child = spawn(command, args, {
   detached: true,
   stdio: 'ignore',
   shell: false,
   ...options
  });

  if (child.pid) {
   launchedProcesses.push({
    pid: child.pid,
    command,
    args,
    startTime: Date.now()
   });

   logger('info', `Horizon Launcher: Process started PID=${child.pid}`);
  }

  child.unref();

 } catch (error) {
  logger('error', `Horizon Launcher: Failed to launch ${command}: ${error.message}`);
  throw error;
 }
}

function splitArgs(raw = '') {
 if (!raw) return [];
 return raw.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(a => a.replace(/"/g, '')) || [];
}

function findHorizonExecutable(customPath) {

 if (customPath && customPath.trim()) {
  const trimmed = customPath.trim();

  logger('info', `Horizon Launcher: Checking custom path: ${trimmed}`);

  if (fs.existsSync(trimmed)) {
   return trimmed;
  }

  logger('warn', `Horizon Launcher: Custom path not found`);
 }

 for (const p of HORIZON_PATHS) {
  try {
   if (fs.existsSync(p)) {
    logger('info', `Horizon Launcher: Found at ${p}`);
    return p;
   }
  } catch {
   continue;
  }
 }

 try {
  const result = spawnSync('where', ['vmware-view.exe'], { encoding: 'utf8' });

  if (result.status === 0 && result.stdout) {
   const found = result.stdout.split('\n')[0].trim();

   if (found && fs.existsSync(found)) {
    logger('info', `Horizon Launcher: Found via PATH ${found}`);
    return found;
   }
  }

 } catch {}

 return null;
}

function buildArgs(connection = {}, settings = {}) {

 const args = [];
 const s = settings;

 if (s.serverUrl)
  args.push('-serverURL', s.serverUrl);

 if (connection.desktopPool || s.desktopName)
  args.push('-desktopName', connection.desktopPool || s.desktopName);

 if (s.appName)
  args.push('-appName', s.appName);

 if (connection.username || s.userName)
  args.push('-userName', connection.username || s.userName);

 if (s.password)
  args.push('-password', s.password);

 if (s.domainName)
  args.push('-domainName', s.domainName);

 if (s.desktopProtocol)
  args.push('-desktopProtocol', s.desktopProtocol);

 if (s.desktopLayout)
  args.push('-desktopLayout', s.desktopLayout);

 if (s.monitors)
  args.push('-monitors', s.monitors);

 if (s.unattended)
  args.push('-unattended');

 if (s.nonInteractive && s.password)
  args.push('-nonInteractive');

 if (s.launchMinimized)
  args.push('-launchMinimized');

 if (s.loginAsCurrentUser)
  args.push('-loginAsCurrentUser', 'true');

 if (s.hideClientAfterLaunchSession)
  args.push('-hideClientAfterLaunchSession', 'true');

 if (s.useExisting)
  args.push('-useExisting');

 if (s.singleAutoConnect)
  args.push('-singleAutoConnect');

 if (s.customFlags)
  args.push(...splitArgs(s.customFlags));

 return args;
}

function launchHorizon(connection, settings) {

 const args = buildArgs(connection, settings);

 logger('info', `Horizon Launcher: Built args: ${args.join(' ')}`);

 if (process.platform === 'win32') {

  const exePath = findHorizonExecutable(settings?.customPath);

  if (!exePath) {
   logger('error', 'Horizon Launcher: VMware Horizon client not found');
   throw new Error('VMware Horizon Client not found');
  }

  launchDetached(exePath, args);

  logger('info', `Horizon Launcher: Launched from ${exePath}`);

  return;
 }

 if (process.platform === 'darwin') {

  const checkApp = (name) => {
   const res = spawnSync('open', ['-Ra', name], { stdio: 'ignore' });
   return res.status === 0;
  };

  if (checkApp('VMware Horizon Client')) {
   launchDetached('open', ['-a', 'VMware Horizon Client', '--args', ...args]);
   return;
  }

  if (checkApp('VMware Horizon')) {
   launchDetached('open', ['-a', 'VMware Horizon', '--args', ...args]);
   return;
  }

  logger('error', 'Horizon Launcher: VMware Horizon Client not found on macOS');

  throw new Error('VMware Horizon Client not installed');
 }

 // Linux fallback
 launchDetached('vmware-view', args);
}

function killAllProcesses() {

 logger('info', `Horizon Launcher: Killing ${launchedProcesses.length} processes`);

 for (const proc of launchedProcesses) {

  try {

   if (process.platform === 'win32') {

    spawn('taskkill', [
     '/pid',
     proc.pid.toString(),
     '/T',
     '/F'
    ], { stdio: 'ignore' });

   }

  } catch (e) {

   logger('warn', `Horizon Launcher: Failed to kill ${proc.pid}: ${e.message}`);

  }
 }

 launchedProcesses.length = 0;
}

module.exports = {
 launchHorizon,
 killAllProcesses
};