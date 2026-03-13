/**
 * Logger utility - centralized logging for the application
 */
const fs = require('fs');
const path = require('path');

let logFilePath = null;
let app = null;

function initLogger(application) {
 app = application;
}

function setLogFile(filePath) {
 logFilePath = filePath;
}

function log(level, ...args) {
 const timestamp = new Date().toISOString();
 const message = `[${timestamp}] [${level}] ${args.join(' ')}`;
 
 // Console output
 console.log(message);
 
 // File output (on Windows)
 if (logFilePath && process.platform === 'win32') {
 try {
 fs.appendFileSync(logFilePath, message + '\n', 'utf8');
 } catch (e) {
 // ignore file write errors
 }
 }
}

module.exports = {
 initLogger,
 setLogFile,
 log
};
