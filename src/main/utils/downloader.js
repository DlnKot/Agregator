/**
 * Downloader Utility
 * Downloads distribution files from the internal server
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { log: logger } = require('./logger');

// Base URL for distributions
const BASE_DISTR_URL = 'https://10.230.121.212/distrs';
const BASE_DISTR_URL_HTTP = 'http://10.230.121.212/distrs';

// Platform-specific file patterns
const DISTRO_FILES = {
  horizon: {
    win32: 'vmware-horizon-client.exe',
    darwin: 'vmware-horizon-client.dmg',
    linux: 'vmware-horizon-client.deb'
  },
  citrix: {
    win32: 'citrix-workspace.exe',
    darwin: 'citrix-workspace.dmg',
    linux: 'citrix-workspace.deb'
  }
};

const activeDownloads = new Map();

function safeCloseStream(file, context) {
  try {
    file.close();
  } catch (err) {
    logger('warn', `Downloader: failed to close stream (${context}): ${err.message}`);
  }
}

/**
 * Get the download URL for a client
 * @param {string} clientType - 'horizon' or 'citrix'
 * @param {string} platform - 'win32', 'darwin', 'linux'
 * @returns {Object} { url: string, filename: string }
 */
function getDownloadInfo(clientType, platform) {
  const platformFiles = DISTRO_FILES[clientType?.toLowerCase()];
  if (!platformFiles) {
    return { error: `Unknown client type: ${clientType}` };
  }

  const filename = platformFiles[platform || process.platform];
  if (!filename) {
    return { error: `Platform not supported: ${platform || process.platform}` };
  }

  const folderName = clientType.toLowerCase();
  const url = `${BASE_DISTR_URL}/${folderName}/${filename}`;
  const urlHttp = `${BASE_DISTR_URL_HTTP}/${folderName}/${filename}`;

  return { url, urlHttp, filename };
}

/**
 * Get download directory
 * @returns {string}
 */
function getDownloadDir() {
  const userDataPath = app.getPath('userData');
  const downloadDir = path.join(userDataPath, 'downloads');
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  return downloadDir;
}

/**
 * Download a file with progress callback
 * @param {string} url - URL to download
 * @param {string} destPath - Destination file path
 * @param {function} onProgress - Progress callback (percent, downloaded, total)
 * @param {function} onError - Error callback
 * @param {function} onComplete - Complete callback
 */
function downloadFile(url, destPath, onProgress, onError, onComplete) {
  const file = fs.createWriteStream(destPath);
  const isHttps = url.startsWith('https');
  const httpModule = isHttps ? https : http;
  let done = false;

  const finishError = (err) => {
    if (done) return;
    done = true;
    safeCloseStream(file, 'error');
    fs.unlink(destPath, () => {});
    onError(err);
  };

  const finishSuccess = () => {
    if (done) return;
    done = true;
    safeCloseStream(file, 'success');
    if (onComplete) onComplete(destPath);
  };

  file.on('error', (err) => {
    finishError(err);
  });

  const request = httpModule.get(url, {
    timeout: 30000,
    rejectUnauthorized: false // For corporate self-signed certs
  }, (response) => {
    // Handle redirects
    if (response.statusCode === 301 || response.statusCode === 302) {
      const redirectUrl = response.headers.location;
      if (redirectUrl) {
        request.destroy();
        safeCloseStream(file, 'redirect');
        downloadFile(redirectUrl, destPath, onProgress, onError, onComplete);
        return;
      }
    }

    if (response.statusCode !== 200) {
      finishError(new Error(`Server returned status: ${response.statusCode}`));
      return;
    }

    const totalBytes = parseInt(response.headers['content-length'], 10) || 0;
    let downloadedBytes = 0;

    response.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0 && onProgress) {
        const percent = (downloadedBytes / totalBytes) * 100;
        onProgress(percent, downloadedBytes, totalBytes);
      }
    });

    response.pipe(file);

    file.on('finish', () => {
      finishSuccess();
    });
  });

  request.on('error', (err) => {
    finishError(err);
  });

  request.on('timeout', () => {
    request.destroy();
    finishError(new Error('Download timeout'));
  });
}

/**
 * Download distribution file
 * @param {string} clientType - 'horizon' or 'citrix'
 * @param {function} onProgress - Progress callback
 * @returns {Promise}
 */
function downloadDistribution(clientType, onProgress) {
  const normalizedClientType = String(clientType || '').toLowerCase();
  if (!normalizedClientType) {
    return Promise.reject(new Error('Client type is required'));
  }

  if (activeDownloads.has(normalizedClientType)) {
    logger('info', `Download already in progress for: ${normalizedClientType}`);
    return activeDownloads.get(normalizedClientType);
  }

  const downloadPromise = new Promise((resolve, reject) => {
    const { url, urlHttp, filename, error } = getDownloadInfo(clientType, process.platform);

    if (error) {
      reject(new Error(error));
      return;
    }

    const downloadDir = getDownloadDir();
    const destPath = path.join(downloadDir, filename);

    logger('info', `Downloading ${clientType} from: ${url}`);

    // Try HTTPS first, then fallback to HTTP
    downloadFile(url, destPath, onProgress,
      (httpsError) => {
        logger('warn', `HTTPS download failed: ${httpsError.message}, trying HTTP...`);
        // Try HTTP fallback
        downloadFile(urlHttp, destPath, onProgress,
          (httpError) => {
            logger('error', `HTTP download also failed: ${httpError.message}`);
            reject(new Error(`Сервер недоступен. Попробуйте позже.\nДетали: ${httpError.message}`));
          },
          (downloadedPath) => {
            logger('info', `Download completed: ${downloadedPath}`);
            resolve({ success: true, path: downloadedPath });
          }
        );
      },
      (downloadedPath) => {
        logger('info', `Download completed: ${downloadedPath}`);
        resolve({ success: true, path: downloadedPath });
      }
    );
  });

  activeDownloads.set(normalizedClientType, downloadPromise);
  downloadPromise.then(() => {
    activeDownloads.delete(normalizedClientType);
  }).catch(() => {
    activeDownloads.delete(normalizedClientType);
  });

  return downloadPromise;
}

/**
 * Open downloaded file (launch installer)
 * @param {string} filePath - Path to the downloaded file
 */
function openInstaller(filePath) {
  const { shell } = require('electron');

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  logger('info', `Opening installer: ${filePath}`);
  return shell.openPath(filePath);
}

/**
 * Check if distribution file already downloaded
 * @param {string} clientType - 'horizon' or 'citrix'
 * @returns {Object} { exists: boolean, path: string | null }
 */
function checkDistributionDownloaded(clientType) {
  const { filename } = getDownloadInfo(clientType, process.platform);
  if (!filename) return { exists: false, path: null };

  const downloadDir = getDownloadDir();
  const filePath = path.join(downloadDir, filename);

  return {
    exists: fs.existsSync(filePath),
    path: fs.existsSync(filePath) ? filePath : null
  };
}

module.exports = {
  getDownloadInfo,
  downloadDistribution,
  openInstaller,
  checkDistributionDownloaded,
  getDownloadDir,
  BASE_DISTR_URL
};
