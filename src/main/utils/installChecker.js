/**
 * Install Checker Utility
 * Checks if Horizon and Citrix clients are installed on the system
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

// Common installation paths for different platforms
const HORIZON_PATHS = {
  win32: [
    'C:\\Program Files\\VMware\\VMware Horizon Client\\bin\\wswc.exe',
    'C:\\Program Files (x86)\\VMware\\VMware Horizon Client\\bin\\wswc.exe',
    'C:\\Program Files\\VMware\\Horizon Client\\bin\\wswc.exe'
  ],
  darwin: [
    '/Applications/VMware Horizon Client.app',
    '/Applications/VMware Horizon.app'
  ],
  linux: [
    '/usr/bin/vmware-view',
    '/opt/vmware/view/bin/vmware-view'
  ]
};

const CITRIX_PATHS = {
  win32: [
    'C:\\Program Files (x86)\\Citrix\\ICA Client\\SelfServicePlugin\\SelfService.exe',
    'C:\\Program Files\\Citrix\\ICA Client\\SelfServicePlugin\\SelfService.exe',
    'C:\\Program Files (x86)\\Citrix\\ICA Client\\wfcrun32.exe',
    'C:\\Program Files\\Citrix\\ICA Client\\wfcrun32.exe',
    'C:\\Program Files (x86)\\Citrix\\ICA Client\\Citrix Workspace Launcher.exe'
  ],
  darwin: [
    '/Applications/Citrix Workspace Launcher.app',
    '/Applications/Citrix Workspace.app',
    '/Applications/Citrix Receiver.app'
  ],
  linux: [
    '/usr/bin/icaclient',
    '/opt/Citrix/ICAClient/wfica'
  ]
};

/**
 * Check if a file or directory exists
 */
function pathExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Check if Horizon Client is installed
 * @returns {Object} { installed: boolean, path: string | null }
 */
function checkHorizonInstalled() {
  const platform = process.platform;
  const paths = HORIZON_PATHS[platform] || [];

  for (const p of paths) {
    if (pathExists(p)) {
      return { installed: true, path: p };
    }
  }

  // Additional check via command (macOS)
  if (platform === 'darwin') {
    try {
      const result = execSync('mdfind "kMDItemCFBundleIdentifier == \'com.vmware.horizon\'"', {
        encoding: 'utf8',
        timeout: 5000
      }).trim();
      if (result) {
        return { installed: true, path: result.split('\n')[0] };
      }
    } catch { /* ignore */ }
  }

  // Additional check via command (Windows)
  if (platform === 'win32') {
    try {
      const result = execSync('reg query "HKLM\\SOFTWARE\\VMware, Inc.\\VMware Horizon View Client" /ve 2>nul', {
        encoding: 'utf8',
        timeout: 5000
      });
      if (result.includes('REG_SZ')) {
        return { installed: true, path: 'registry' };
      }
    } catch { /* ignore */ }
  }

  return { installed: false, path: null };
}

/**
 * Check if Citrix Workspace is installed
 * @returns {Object} { installed: boolean, path: string | null }
 */
function checkCitrixInstalled() {
  const platform = process.platform;
  const paths = CITRIX_PATHS[platform] || [];

  for (const p of paths) {
    if (pathExists(p)) {
      return { installed: true, path: p };
    }
  }

  // Additional check via command (macOS)
  if (platform === 'darwin') {
    try {
      const result = execSync('mdfind "kMDItemCFBundleIdentifier == \'com.citrix.receiver\'"', {
        encoding: 'utf8',
        timeout: 5000
      }).trim();
      if (result) {
        return { installed: true, path: result.split('\n')[0] };
      }
    } catch { /* ignore */ }
  }

  // Additional check via command (Windows)
  if (platform === 'win32') {
    try {
      const result = execSync('reg query "HKLM\\SOFTWARE\\Citrix\\ICA Client" /ve 2>nul', {
        encoding: 'utf8',
        timeout: 5000
      });
      if (result.includes('REG_SZ')) {
        return { installed: true, path: 'registry' };
      }
    } catch { /* ignore */ }
  }

  return { installed: false, path: null };
}

/**
 * Check installation status for a client type
 * @param {string} clientType - 'horizon' or 'citrix'
 * @returns {Object} { installed: boolean, path: string | null }
 */
function checkClientInstalled(clientType) {
  switch (clientType?.toLowerCase()) {
    case 'horizon':
      return checkHorizonInstalled();
    case 'citrix':
      return checkCitrixInstalled();
    default:
      return { installed: false, path: null, error: `Unknown client type: ${clientType}` };
  }
}

module.exports = {
  checkHorizonInstalled,
  checkCitrixInstalled,
  checkClientInstalled,
  HORIZON_PATHS,
  CITRIX_PATHS
};
