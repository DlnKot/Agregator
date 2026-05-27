const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

const A_CHAT_WEB_URL = 'https://achat.best/';

const A_CHAT_CANDIDATES = [
  'C:\\Program Files\\A_Chat\\A_Chat.exe',
  'C:\\Program Files (x86)\\A_Chat\\A_Chat.exe',
  'C:\\A_Chat\\A_Chat.exe',
];

function findAChat() {
  if (process.platform !== 'win32') return null;
  
  for (const p of A_CHAT_CANDIDATES) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch (e) { }
  }
  return null;
}

function checkInstalled() {
  return findAChat() !== null;
}

function launchAChat() {
  if (process.platform !== 'win32') {
    throw new Error('A-Чат запуск не поддерживается на этой платформе');
  }

  const exePath = findAChat();

  if (!exePath) {
    logger('info', '[A-Chat] Приложение не найдено');
    return { needsInstall: true };
  }

  logger('info', `[A-Chat] Запуск: ${exePath}`);

  const child = spawn(exePath, [], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
    shell: false,
  });

  child.on('error', (err) => {
    logger('error', `[A-Chat] Ошибка запуска: ${err.message}`);
  });

  child.unref();
  return { success: true };
}

function openWebVersion() {
  const { shell } = require('electron');
  shell.openExternal(A_CHAT_WEB_URL);
}

module.exports = {
  checkInstalled,
  launchAChat,
  openWebVersion,
  A_CHAT_WEB_URL,
};