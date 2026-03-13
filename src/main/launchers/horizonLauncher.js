/**
 * VMware Horizon Launcher - handles launching VMware Horizon Client connections
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

const launchedProcesses = [];

// Common installation paths for VMware Horizon on Windows
const HORIZON_PATHS = [
 'C:\\Program Files\\VMware\\VMware Horizon\\View\\Client\\bin\\vmware-view.exe',
 'C:\\Program Files (x86)\\VMware\\VMware Horizon\\View\\Client\\bin\\vmware-view.exe',
 'C:\\ProgramData\\VMware\\VMware Horizon\\View\\Client\\bin\\vmware-view.exe',
 path.join(process.env.LOCALAPPDATA || '', 'VMware', 'VMware Horizon', 'View', 'Client', 'bin', 'vmware-view.exe'),
 path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'VMware', 'VMware Horizon', 'View', 'Client', 'bin', 'vmware-view.exe')
];

// Also check in common AppData locations
const HORIZON_APP_PATHS = [
 path.join(process.env.LOCALAPPDATA || '', 'Programs', 'VMware Horizon Client', 'vmware-view.exe'),
 path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'VMware', 'VMware Horizon Client', 'vmware-view.exe'),
 'C:\\Program Files\\VMware\\VMware Horizon Client\\vmware-view.exe',
 'C:\\Program Files (x86)\\VMware\\VMware Horizon Client\\vmware-view.exe'
];

function launchDetached(command, args = [], options = {}) {
 logger('info', `Horizon Launcher: launching ${command} with args: ${args.join(' ')}`);
 
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

 logger('info', `Horizon Launcher: Process started with PID ${child.pid}`);
 child.unref();
 } catch (error) {
 logger('error', `Horizon Launcher: Failed to launch ${command}: ${error.message}`);
 throw error;
 }
}

function splitArgs(raw = '') {
 return raw.split(' ').map(x => x.trim()).filter(Boolean);
}

/**
 * Find VMware Horizon executable with full path
 */
function findHorizonExecutable(customPath) {
 // 1. Check custom path first
 if (customPath && customPath.trim()) {
 const trimmed = customPath.trim();
 logger('info', `Horizon Launcher: Checking custom path: ${trimmed}`);
 
 // If it's a full path with exe, check directly
 if (trimmed.toLowerCase().endsWith('.exe') && fs.existsSync(trimmed)) {
 logger('info', `Horizon Launcher: Found at custom path: ${trimmed}`);
 return trimmed;
 }
 
 // If it's a directory, try to find exe inside
 if (fs.existsSync(trimmed)) {
 const exeInDir = path.join(trimmed, 'vmware-view.exe');
 if (fs.existsSync(exeInDir)) {
 logger('info', `Horizon Launcher: Found in custom directory: ${exeInDir}`);
 return exeInDir;
 }
 }
 logger('warn', `Horizon Launcher: Custom path not found: ${trimmed}`);
 }

 // 2. Search in common View\Client\bin locations
 for (const p of HORIZON_PATHS) {
 try {
 if (fs.existsSync(p)) {
 logger('info', `Horizon Launcher: Found at: ${p}`);
 return p;
 }
 } catch (e) { continue; }
 }

 // 3. Search in VMware Horizon Client root directories
 for (const p of HORIZON_APP_PATHS) {
 try {
 if (fs.existsSync(p)) {
 logger('info', `Horizon Launcher: Found at: ${p}`);
 return p;
 }
 } catch (e) { continue; }
 }

 // 4. Try to find via where command
 try {
 const result = spawnSync('where', ['vmware-view.exe'], { stdio: 'pipe', shell: true });
 if (result.status === 0 && result.stdout) {
 const foundPath = result.stdout.toString().split('\n')[0].trim();
 if (foundPath && fs.existsSync(foundPath)) {
 logger('info', `Horizon Launcher: Found via where: ${foundPath}`);
 return foundPath;
 }
 }
 } catch (e) { /* ignore */ }

 // 5. Search recursively in Program Files (limited depth)
 const searchDirs = [
 'C:\\Program Files\\VMware',
 'C:\\Program Files (x86)\\VMware'
 ];
 
 for (const searchDir of searchDirs) {
 try {
 if (fs.existsSync(searchDir)) {
 const found = findExeRecursive(searchDir, 'vmware-view.exe', 3);
 if (found) {
 logger('info', `Horizon Launcher: Found via recursive search: ${found}`);
 return found;
 }
 }
 } catch (e) { continue; }
 }

 return null;
}

/**
 * Recursively search for exe file
 */
function findExeRecursive(dir, exeName, maxDepth, currentDepth = 0) {
 if (currentDepth > maxDepth) return null;
 
 try {
 const items = fs.readdirSync(dir);
 
 for (const item of items) {
 const fullPath = path.join(dir, item);
 
 try {
 const stat = fs.statSync(fullPath);
 
 if (stat.isDirectory()) {
 const found = findExeRecursive(fullPath, exeName, maxDepth, currentDepth + 1);
 if (found) return found;
 } else if (stat.isFile() && item.toLowerCase() === exeName.toLowerCase()) {
 return fullPath;
 }
 } catch (e) { continue; }
 }
 } catch (e) { /* ignore permission errors */ }
 
 return null;
}

function buildArgs(connection, settings) {
 const args = [];
 const s = settings || {};
 
 // Server URL
 if (s.serverUrl) {
 args.push(`--serverURL=${s.serverUrl}`);
 }
 
 // Desktop name (from connection or settings)
 if (connection.desktopPool || s.desktopName) {
 args.push(`--desktopName=${connection.desktopPool || s.desktopName}`);
 }
 
 // Application name
 if (s.appName) {
 args.push(`--appName=${s.appName}`);
 }
 
 // Username - use from connection or settings
 if (connection.username || s.user?.username) {
 args.push(`--userName=${connection.username || s.user.username}`);
 }
 
 // Domain - use from settings
 if (s.user?.domain) {
 args.push(`--domainName=${s.user.domain}`);
 }
 
 // Protocol
 if (s.desktopProtocol) {
 args.push(`--desktopProtocol=${s.desktopProtocol}`);
 }
 
 // Layout
 if (s.desktopLayout) {
 args.push(`--desktopLayout=${s.desktopLayout}`);
 }
 
 // Monitors (for multimonitor)
 if (s.monitors) {
 args.push(`--monitors=${s.monitors}`);
 }
 
 // Unattended mode
 if (s.unattended) {
 args.push('--unattended');
 }
 
 // Non-interactive
 if (s.nonInteractive) {
 args.push('--nonInteractive');
 }
 
 // Launch minimized
 if (s.launchMinimized) {
 args.push('--launchMinimized');
 }
 
 // Login as current user
 if (s.loginAsCurrentUser) {
 args.push('--loginAsCurrentUser=true');
 }
 
 // Hide client after launch
 if (s.hideClientAfterLaunchSession) {
 args.push('--hideClientAfterLaunchSession=true');
 }
 
 // Use existing connection
 if (s.useExisting) {
 args.push('--useExisting');
 }
 
 // Single auto-connect
 if (s.singleAutoConnect) {
 args.push('--singleAutoConnect');
 }
 
 // Custom flags
 if (s.customFlags) {
 args.push(...splitArgs(s.customFlags));
 }
 
 return args;
}

function launchHorizon(connection, settings) {
 const args = buildArgs(connection, settings);
 logger('info', `Horizon Launcher: Built args: ${args.join(' ')}`);

 if (process.platform === 'win32') {
 // Pass customPath from horizon settings
 const horizonSettings = settings?.horizon || {}
 const exePath = findHorizonExecutable(horizonSettings.customPath);
 
 if (exePath) {
 logger('info', `Horizon Launcher: Using executable: ${exePath}`);
 launchDetached(exePath, args);
 logger('info', `Horizon Launcher: Launched from ${exePath}`);
 } else {
 logger('error', 'Horizon Launcher: VMware Horizon client not found');
 throw new Error('VMware Horizon client not found. Please install VMware Horizon Client or specify custom path in settings.');
 }
 return;
 }

 if (process.platform === 'darwin') {
 // Check for VMware Horizon Client
 const checkApp = (appName) => {
 const result = spawnSync('open', ['-Ra', appName], { stdio: 'ignore' });
 return result.status === 0;
 };
 
 if (checkApp('VMware Horizon Client')) {
 launchDetached('open', ['-a', 'VMware Horizon Client', '--args', ...args], { shell: false });
 } else if (checkApp('VMware Horizon')) {
 launchDetached('open', ['-a', 'VMware Horizon', '--args', ...args], { shell: false });
 } else {
 logger('error', 'Horizon Launcher: VMware Horizon Client not found on macOS');
 throw new Error('VMware Horizon Client not found on macOS');
 }
 return;
 }

 // Linux fallback
 launchDetached('vmware-view', args);
}

function killAllProcesses() {
 logger('info', `Horizon Launcher: Killing ${launchedProcesses.length} processes`);
 for (const proc of launchedProcesses) {
 try {
 if (process.platform === 'win32') {
 spawn('taskkill', ['/pid', proc.pid.toString(), '/T', '/F'], { stdio: 'ignore', shell: true });
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
