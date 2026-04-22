const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log: logger } = require('../utils/logger');

const TALK_EXE_PATH = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'ktalk', 'ktalk.exe');
const TALK_WEB_URL = 'https://alfabank.ktalk.ru/';

function findTalkExecutable() {
  if (process.platform !== 'win32') return null;

  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return null;

  const candidates = [
    path.join(localAppData, 'Programs', 'ktalk', 'ktalk.exe'),
    path.join(localAppData, 'Programs', 'KTalk', 'ktalk.exe'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (e) { }
  }
  return null;
}

function checkInstalled() {
  if (process.platform !== 'win32') return false;
  return !!findTalkExecutable();
}

function launchTolk() {
  if (process.platform !== 'win32') {
    throw new Error('Толк запуск не поддерживается на этой платформе');
  }

  const installed = checkInstalled();

  if (!installed) {
    logger('info', '[Tolk] Приложение не найдено');
    return { needsInstall: true };
  }

  const exePath = findTalkExecutable();
  logger('info', `[Tolk] Запуск: ${exePath}`);

  const child = spawn(exePath, [], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
    shell: true,
  });

  child.on('error', (err) => {
    logger('error', `[Tolk] Ошибка запуска: ${err.message}`);
  });

  child.unref();
  return { success: true };
}

function openWebVersion() {
  const { shell } = require('electron');
  shell.openExternal(TALK_WEB_URL);
}

module.exports = {
  checkInstalled,
  findTalkExecutable,
  launchTolk,
  openWebVersion,
  TALK_EXE_PATH,
  TALK_WEB_URL,
};