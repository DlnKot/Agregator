const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

const A_CHAT_PATH = 'C:\\Program Files\\A_Chat\\A_Chat.exe';
const A_CHAT_WEB_URL = 'https://a-chat.alfabank.ru/';

function checkInstalled() {
  if (process.platform !== 'win32') return false;
  try {
    return fs.existsSync(A_CHAT_PATH);
  } catch (e) {
    return false;
  }
}

function launchAChat() {
  if (process.platform !== 'win32') {
    throw new Error('A-Чат запуск не поддерживается на этой платформе');
  }

  const installed = checkInstalled();

  if (!installed) {
    logger('info', '[A-Chat] Приложение не найдено');
    return { needsInstall: true };
  }

  logger('info', `[A-Chat] Запуск: ${A_CHAT_PATH}`);

  const child = spawn(A_CHAT_PATH, [], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
    shell: true,
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
  A_CHAT_PATH,
  A_CHAT_WEB_URL,
};