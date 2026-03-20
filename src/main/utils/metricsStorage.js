/**
 * Metrics Storage - локальное хранение метрик
 */
const fs = require('fs');
const path = require('path');
const { log: logger } = require('./logger');

const METRICS_DIR = 'metrics';
const SESSIONS_FILE = 'sessions.json';
const MAX_STORED_SESSIONS = 100; // Максимум храним сессий локально

let metricsPath = null;

/**
 * Инициализация хранилища метрик
 * @param {string} userDataPath - Путь к папке пользовательских данных
 */
function initStorage(userDataPath) {
  metricsPath = path.join(userDataPath, METRICS_DIR);
  
  try {
    if (!fs.existsSync(metricsPath)) {
      fs.mkdirSync(metricsPath, { recursive: true });
      logger('info', `Metrics: Created metrics directory at ${metricsPath}`);
    }
  } catch (error) {
    logger('error', `Metrics: Failed to create metrics directory: ${error.message}`);
  }
}

/**
 * Получение пути к файлу сессий
 */
function getSessionsFilePath() {
  return path.join(metricsPath, SESSIONS_FILE);
}

/**
 * Загрузка сохранённых сессий
 */
function loadSessions() {
  const filePath = getSessionsFilePath();
  
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const sessions = JSON.parse(data);
      logger('info', `Metrics: Loaded ${sessions.length} stored sessions`);
      return sessions;
    }
  } catch (error) {
    logger('error', `Metrics: Failed to load sessions: ${error.message}`);
  }
  
  return [];
}

/**
 * Сохранение сессий
 * @param {Array} sessions - Массив сессий
 */
function saveSessions(sessions) {
  const filePath = getSessionsFilePath();
  
  try {
    // Ограничиваем количество хранимых сессий
    const trimmedSessions = sessions.slice(-MAX_STORED_SESSIONS);
    
    const data = JSON.stringify(trimmedSessions, null, 2);
    fs.writeFileSync(filePath, data, 'utf8');
    
    logger('info', `Metrics: Saved ${trimmedSessions.length} sessions`);
    return true;
  } catch (error) {
    logger('error', `Metrics: Failed to save sessions: ${error.message}`);
    return false;
  }
}

/**
 * Добавление сессии в хранилище
 * @param {Object} session - Сессия для сохранения
 */
function addSession(session) {
  const sessions = loadSessions();
  sessions.push(session);
  return saveSessions(sessions);
}

/**
 * Получение всех неотправленных сессий
 */
function getPendingSessions() {
  return loadSessions();
}

/**
 * Удаление отправленных сессий
 * @param {Array} sessionIds - ID сессий для удаления
 */
function removeSentSessions(sessionIds) {
  const sessions = loadSessions();
  const remaining = sessions.filter(s => !sessionIds.includes(s.sessionId));
  return saveSessions(remaining);
}

/**
 * Очистка всех метрик
 */
function clearAllMetrics() {
  const filePath = getSessionsFilePath();
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger('info', 'Metrics: All stored sessions cleared');
    }
    return true;
  } catch (error) {
    logger('error', `Metrics: Failed to clear sessions: ${error.message}`);
    return false;
  }
}

/**
 * Получение статистики по хранилищу
 */
function getStorageStats() {
  const sessions = loadSessions();
  
  let totalEvents = 0;
  let totalDuration = 0;
  let launchesByType = { rdp: 0, horizon: 0, citrix: 0, vpn: 0 };
  let tabsViewCount = { connections: 0, settings: 0, network: 0, help: 0 };
  let networkCheckCount = 0;
  let helpViewsBySection = { helpdesk: 0, indeed: 0, 'remote-types': 0, chatbot: 0 };
  
  for (const session of sessions) {
    if (session.events) totalEvents += session.events.length;
    if (session.sessionDuration) totalDuration += session.sessionDuration;
    
    if (session.stats) {
      if (session.stats.launchesByType) {
        for (const type in session.stats.launchesByType) {
          launchesByType[type] = (launchesByType[type] || 0) + session.stats.launchesByType[type];
        }
      }
      if (session.stats.tabsViewCount) {
        for (const tab in session.stats.tabsViewCount) {
          tabsViewCount[tab] = (tabsViewCount[tab] || 0) + session.stats.tabsViewCount[tab];
        }
      }
      networkCheckCount += session.stats.networkCheckCount || 0;
      
      if (session.stats.helpViewsBySection) {
        for (const section in session.stats.helpViewsBySection) {
          helpViewsBySection[section] = (helpViewsBySection[section] || 0) + session.stats.helpViewsBySection[section];
        }
      }
    }
  }
  
  return {
    storedSessions: sessions.length,
    totalEvents,
    totalDuration, // в секундах
    launchesByType,
    tabsViewCount,
    networkCheckCount,
    helpViewsBySection
  };
}

module.exports = {
  initStorage,
  addSession,
  getPendingSessions,
  removeSentSessions,
  clearAllMetrics,
  getStorageStats
};
