/**
 * Logger utility - centralized logging for the application
 * Features:
 * - Log rotation (max 10MB per file, keeps 3 files)
 * - Proper log levels (info, warn, error, debug)
 * - Console and file output
 */
const fs = require('fs');
const path = require('path');

let logFilePath = null;
let app = null;

// Log rotation settings
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 3; // Keep app.log, app.log.1, app.log.2

function initLogger(application) {
  app = application;
}

function setLogFile(filePath) {
  logFilePath = filePath;
}

/**
 * Rotate log files if current log exceeds MAX_LOG_SIZE
 */
function rotateLogsIfNeeded() {
  if (!logFilePath) return;

  try {
    // Check if log file exists and its size
    if (!fs.existsSync(logFilePath)) return;

    const stats = fs.statSync(logFilePath);
    if (stats.size < MAX_LOG_SIZE) return;

    // Rotate: app.log.2 -> delete, app.log.1 -> app.log.2, app.log -> app.log.1
    for (let i = MAX_LOG_FILES - 1; i > 0; i--) {
      const oldFile = i === 1 ? logFilePath : `${logFilePath}.${i - 1}`;
      const newFile = `${logFilePath}.${i}`;

      if (fs.existsSync(newFile)) {
        fs.unlinkSync(newFile);
      }
      if (fs.existsSync(oldFile)) {
        fs.renameSync(oldFile, newFile);
      }
    }

    // Create new empty log file
    fs.writeFileSync(logFilePath, '', 'utf8');
  } catch (e) {
    // If rotation fails, continue logging (don't crash)
    console.error(`Logger: Failed to rotate logs: ${e.message}`);
  }
}

/**
 * Log a message with specified level
 * @param {string} level - Log level: 'info', 'warn', 'error', 'debug'
 * @param {...any} args - Message parts to log
 */
function log(level, ...args) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] [${level.toUpperCase()}] ${args.join(' ')}`;

  // Console output with appropriate method
  switch (level) {
    case 'error':
      console.error(message);
      break;
    case 'warn':
      console.warn(message);
      break;
    case 'debug':
      console.debug(message);
      break;
    case 'info':
    default:
      console.log(message);
      break;
  }

  // File output (on all platforms)
  if (logFilePath) {
    try {
      // Check if rotation is needed before writing
      rotateLogsIfNeeded();

      fs.appendFileSync(logFilePath, message + '\n', 'utf8');
    } catch (e) {
      // Don't crash if file write fails, but log to console
      console.error(`Logger: Failed to write to log file: ${e.message}`);
    }
  }
}

module.exports = {
  initLogger,
  setLogFile,
  log
};
