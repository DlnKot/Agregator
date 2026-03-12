const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

function log(level, ...args) {
 const timestamp = new Date().toISOString();
 console.log(`[${timestamp}] [${level}]`, ...args);
}

class SimpleStore {
 constructor(filePath, defaults = {}) {
 this.filePath = filePath;
 this.defaults = defaults;
 this.data = this._load();
 }

 _load() {
 try {
 if (fs.existsSync(this.filePath)) {
 const content = fs.readFileSync(this.filePath, 'utf8');
 const parsed = JSON.parse(content);
 return { ...this.defaults, ...parsed };
 }
 } catch (error) {
 log('error', 'Error loading store:', error);
 }

 return { ...this.defaults };
 }

 _save() {
 try {
 const dir = path.dirname(this.filePath);
 if (!fs.existsSync(dir)) {
 fs.mkdirSync(dir, { recursive: true });
 }

 fs.writeFileSync(this.filePath, JSON.stringify(this.data, null,2), 'utf8');
 } catch (error) {
 log('error', 'Error saving store:', error);
 }
 }

 get(key, defaultValue) {
 const value = this.data[key];
 return value !== undefined ? value : defaultValue;
 }

 set(key, value) {
 this.data[key] = value;
 this._save();
 }
}

const BUILTIN_DEFAULTS = {
 settings: {
 rdp: {
 resolution: '1920x1080',
 colorDepth: '32',
 multimon: false,
 clipboard: true,
 driveMapping: false,
 useAdminSession: false,
 promptCredentials: true,
 startFullScreen: false,
 span: false,
 customFlags: ''
 },
 horizon: {
 brokerUrl: '',
 desktopPool: '',
 userName: '',
 domainName: '',
 once: true,
 nonInteractive: false,
 customFlags: ''
 },
 citrix: {
 storeUrl: '',
 resourceName: '',
 customFlags: ''
 },
 general: {
 minimizeToTray: false,
 startMinimized: false
 }
 },
 connections: [],
 profiles: []
};

let configStore;
let mainWindow = null;

function resolveDeploymentConfigPath() {
 const candidates = [
 path.join(app.getAppPath(), 'config', 'deployment-defaults.json'),
 path.join(process.cwd(), 'config', 'deployment-defaults.json')
 ];

 for (const candidate of candidates) {
 if (fs.existsSync(candidate)) {
 return candidate;
 }
 }

 return null;
}

function readDeploymentDefaults() {
 const configPath = resolveDeploymentConfigPath();

 if (!configPath) {
 return null;
 }

 try {
 const content = fs.readFileSync(configPath, 'utf8');
 return JSON.parse(content);
 } catch (error) {
 log('warn', 'Cannot parse deployment-defaults.json:', error.message);
 return null;
 }
}

function initializeStores() {
 const userDataPath = app.getPath('userData');

 configStore = new SimpleStore(path.join(userDataPath, 'config.json'), {
 settings: BUILTIN_DEFAULTS.settings,
 connections: [],
 profiles: []
 });

 const deploymentDefaults = readDeploymentDefaults();

 const existingConnections = configStore.get('connections', []);
 const existingProfiles = configStore.get('profiles', []);

 if (existingConnections.length ===0 && existingProfiles.length ===0) {
 const source = deploymentDefaults || BUILTIN_DEFAULTS;

 configStore.set('settings', {
 ...BUILTIN_DEFAULTS.settings,
 ...(source.settings || {})
 });
 configStore.set('connections', source.connections || []);
 configStore.set('profiles', source.profiles || []);

 log('info', 'Default deployment profile has been applied');
 }
}

function splitArgs(raw = '') {
 return raw
 .split(' ')
 .map((x) => x.trim())
 .filter(Boolean);
}

function launchDetached(command, args = [], options = {}) {
 const child = spawn(command, args, {
 detached: true,
 stdio: 'ignore',
 shell: true,
 ...options
 });

 child.unref();
}

function macAppExists(appName) {
 const result = spawnSync('open', ['-Ra', appName], { stdio: 'ignore' });
 return result.status ===0;
}

function createRdpFile(connection, rdpSettings) {
 const tempDir = app.getPath('temp');
 const rdpFilePath = path.join(tempDir, `rdm_${connection.id}.rdp`);

 const resolution = rdpSettings.resolution || '1920x1080';
 const isFullscreen = resolution === 'fullscreen' || !!rdpSettings.startFullScreen;
 const width = isFullscreen ?1920 : parseInt(resolution.split('x')[0],10) ||1920;
 const height = isFullscreen ?1080 : parseInt(resolution.split('x')[1],10) ||1080;

 const rdpContent = [
 `full address:s:${connection.host}`,
 `username:s:${connection.username || ''}`,
 `screen mode id:i:${isFullscreen ? '2' : '1'}`,
 `desktopwidth:i:${width}`,
 `desktopheight:i:${height}`,
 `session bpp:i:${parseInt(rdpSettings.colorDepth,10) ||32}`,
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

function scheduleDeleteFile(filePath, timeoutMs =5000) {
 setTimeout(() => {
 try {
 fs.unlinkSync(filePath);
 } catch (error) {
 log('warn', `Could not delete file ${filePath}:`, error.message);
 }
 }, timeoutMs);
}

function launchRdpByPlatform(connection, rdpSettings) {
 const rdpFilePath = createRdpFile(connection, rdpSettings);

 if (process.platform === 'win32') {
 launchDetached('mstsc.exe', [rdpFilePath]);
 scheduleDeleteFile(rdpFilePath);
 return;
 }

 if (process.platform === 'darwin') {
 if (macAppExists('Windows App')) {
 launchDetached('open', ['-a', 'Windows App', rdpFilePath], { shell: false });
 } else if (macAppExists('Microsoft Remote Desktop')) {
 launchDetached('open', ['-a', 'Microsoft Remote Desktop', rdpFilePath], { shell: false });
 } else {
 launchDetached('open', [rdpFilePath], { shell: false });
 }

 scheduleDeleteFile(rdpFilePath,10000);
 return;
 }

 const args = [
 `/v:${connection.host}`,
 connection.username ? `/u:${connection.username}` : '',
 ...splitArgs(rdpSettings.customFlags)
 ].filter(Boolean);

 launchDetached('xfreerdp', args);
}

function launchHorizonByPlatform(connection, horizonSettings) {
 const args = [];

 if (horizonSettings.brokerUrl) {
 args.push(`--serverURL=${horizonSettings.brokerUrl}`);
 }

 if (connection.desktopPool || horizonSettings.desktopPool) {
 args.push(`--desktopName=${connection.desktopPool || horizonSettings.desktopPool}`);
 }

 if (connection.username || horizonSettings.userName) {
 args.push(`--userName=${connection.username || horizonSettings.userName}`);
 }

 if (horizonSettings.domainName) {
 args.push(`--domainName=${horizonSettings.domainName}`);
 }

 if (horizonSettings.once) {
 args.push('--once');
 }

 if (horizonSettings.nonInteractive) {
 args.push('--nonInteractive');
 }

 args.push(...splitArgs(horizonSettings.customFlags));

 if (process.platform === 'win32') {
 launchDetached('vmware-view.exe', args);
 return;
 }

 if (process.platform === 'darwin') {
 if (macAppExists('VMware Horizon Client')) {
 launchDetached('open', ['-a', 'VMware Horizon Client', '--args', ...args], { shell: false });
 } else {
 launchDetached('open', ['-a', 'VMware Horizon', '--args', ...args], { shell: false });
 }
 return;
 }

 launchDetached('vmware-view', args);
}

function launchCitrixByPlatform(connection, citrixSettings) {
 const args = [];

 if (citrixSettings.storeUrl) {
 args.push(`-url=${citrixSettings.storeUrl}`);
 }

 if (citrixSettings.resourceName || connection.host) {
 args.push(`-launch ${citrixSettings.resourceName || connection.host}`);
 }

 args.push(...splitArgs(citrixSettings.customFlags));

 if (process.platform === 'win32') {
 launchDetached('selfservice.exe', args);
 return;
 }

 if (process.platform === 'darwin') {
 launchDetached('open', ['-a', 'Citrix Workspace', '--args', ...args], { shell: false });
 return;
 }

 launchDetached('selfservice', args);
}

function createWindow() {
 mainWindow = new BrowserWindow({
 width:1100,
 height:700,
 minWidth:900,
 minHeight:600,
 backgroundColor: '#0f0f0f',
 webPreferences: {
 preload: path.join(__dirname, '../preload/preload.js'),
 contextIsolation: true,
 nodeIntegration: false,
 sandbox: false
 },
 show: false,
 frame: true,
 titleBarStyle: 'default'
 });

 mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

 mainWindow.once('ready-to-show', () => {
 mainWindow.show();
 });

 mainWindow.on('closed', () => {
 mainWindow = null;
 });
}

process.on('uncaughtException', (error) => {
 log('error', 'Uncaught Exception:', error);
 process.exit(1);
});

process.on('unhandledRejection', (reason) => {
 log('error', 'Unhandled Rejection:', reason);
});

app.whenReady().then(() => {
 initializeStores();
 createWindow();

 app.on('activate', () => {
 if (BrowserWindow.getAllWindows().length ===0) {
 createWindow();
 }
 });
});

app.on('window-all-closed', () => {
 if (process.platform !== 'darwin') {
 app.quit();
 }
});

ipcMain.handle('get-connections', () => configStore.get('connections', []));
ipcMain.handle('get-settings', () => configStore.get('settings'));
ipcMain.handle('get-profiles', () => configStore.get('profiles', []));

ipcMain.handle('save-connection', (event, connection) => {
 const connections = configStore.get('connections', []);
 const existingIndex = connections.findIndex((c) => c.id === connection.id);

 if (existingIndex >=0) {
 connections[existingIndex] = connection;
 } else {
 connection.id = Date.now().toString();
 connections.push(connection);
 }

 configStore.set('connections', connections);
 return connection;
});

ipcMain.handle('delete-connection', (event, connectionId) => {
 const connections = configStore.get('connections', []);
 configStore.set('connections', connections.filter((c) => c.id !== connectionId));
 return true;
});

ipcMain.handle('save-settings', (event, settings) => {
 configStore.set('settings', settings);
 return true;
});

ipcMain.handle('save-profile', (event, profile) => {
 const profiles = configStore.get('profiles', []);
 const existingIndex = profiles.findIndex((p) => p.id === profile.id);

 if (existingIndex >=0) {
 profiles[existingIndex] = profile;
 } else {
 profile.id = Date.now().toString();
 profiles.push(profile);
 }

 configStore.set('profiles', profiles);
 return profile;
});

ipcMain.handle('delete-profile', (event, profileId) => {
 const profiles = configStore.get('profiles', []);
 configStore.set('profiles', profiles.filter((p) => p.id !== profileId));
 return true;
});

ipcMain.handle('launch-rdp', async (event, connection, settings) => {
 try {
 launchRdpByPlatform(connection, settings?.rdp || {});
 return { success: true };
 } catch (error) {
 log('error', 'RDP launch error:', error);
 return { success: false, error: error.message };
 }
});

ipcMain.handle('launch-horizon', async (event, connection, settings) => {
 try {
 launchHorizonByPlatform(connection, settings?.horizon || {});
 return { success: true };
 } catch (error) {
 log('error', 'Horizon launch error:', error);
 return { success: false, error: error.message };
 }
});

ipcMain.handle('launch-citrix', async (event, connection, settings) => {
 try {
 launchCitrixByPlatform(connection, settings?.citrix || {});
 return { success: true };
 } catch (error) {
 log('error', 'Citrix launch error:', error);
 return { success: false, error: error.message };
 }
});
