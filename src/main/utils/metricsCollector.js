/**
 * Metrics Collector - сбор метрик использования приложения
 */
const { uuidv4 } = require('./uuid');
const { log: logger } = require('./logger');

// Глобальное состояние метрик
let currentSession = null;
let stats = {
  launchesByType: { rdp: 0, horizon: 0, citrix: 0, vpn: 0 },
  tabsViewCount: { connections: 0, settings: 0, network: 0, help: 0 },
  networkCheckCount: 0,
  helpViewsBySection: { helpdesk: 0, indeed: 0, 'remote-types': 0, chatbot: 0 },
  totalLaunches: 0,
  errors: []
};

/**
 * Инициализация новой сессии метрик
 */
function initSession(clientId) {
  const sessionId = uuidv4();
  currentSession = {
    sessionId,
    clientId,
    sessionStart: new Date().toISOString(),
    events: [],
    stats: { ...stats } // Копируем начальные значения
  };
  
  // Сбрасываем статистику для новой сессии
  resetStats();
  
  // Трекинг события запуска
  trackEvent('app_start', {});
  
  logger('info', `Metrics: Session started - ${sessionId}`);
  
  return currentSession;
}

/**
 * Сброс статистики
 */
function resetStats() {
  stats = {
    launchesByType: { rdp: 0, horizon: 0, citrix: 0, vpn: 0 },
    tabsViewCount: { connections: 0, settings: 0, network: 0, help: 0 },
    networkCheckCount: 0,
    helpViewsBySection: { helpdesk: 0, indeed: 0, 'remote-types': 0, chatbot: 0 },
    totalLaunches: 0,
    errors: []
  };
}

/**
 * Трекинг события
 * @param {string} type - Тип события
 * @param {object} data - Дополнительные данные
 */
function trackEvent(type, data = {}) {
  if (!currentSession) {
    logger('warn', 'Metrics: No active session, skipping event');
    return;
  }

  const event = {
    type,
    timestamp: new Date().toISOString(),
    data
  };

  currentSession.events.push(event);
  logger('debug', `Metrics: Event tracked - ${type}`);
}

/**
 * Трекинг запуска подключения
 * @param {string} connectionType - Тип подключения (rdp/horizon/citrix/vpn)
 * @param {boolean} success - Успешность запуска
 */
function trackConnectionLaunch(connectionType, success = true) {
  trackEvent('connection_launch', { type: connectionType, success });
  
  if (stats.launchesByType.hasOwnProperty(connectionType)) {
    stats.launchesByType[connectionType]++;
  }
  stats.totalLaunches++;
}

/**
 * Трекинг просмотра вкладки
 * @param {string} tab - Название вкладки
 */
function trackTabView(tab) {
  trackEvent('tab_view', { tab });
  
  if (stats.tabsViewCount.hasOwnProperty(tab)) {
    stats.tabsViewCount[tab]++;
  }
}

/**
 * Трекинг проверки сети
 */
function trackNetworkCheck() {
  trackEvent('network_check', {});
  stats.networkCheckCount++;
}

/**
 * Трекинг просмотра раздела помощи
 * @param {string} section - Раздел (helpdesk/indeed/remote-types/chatbot)
 */
function trackHelpView(section) {
  trackEvent('help_view', { section });
  
  if (stats.helpViewsBySection.hasOwnProperty(section)) {
    stats.helpViewsBySection[section]++;
  }
}

/**
 * Трекинг ошибки
 * @param {Error} error - Объект ошибки
 */
function trackError(error) {
  const errorData = {
    message: error?.message || String(error),
    stack: error?.stack || '',
    timestamp: new Date().toISOString()
  };
  
  trackEvent('error', errorData);
  stats.errors.push(errorData);
  
  logger('error', `Metrics: Error tracked - ${errorData.message}`);
}

/**
 * Трекинг сохранения настроек
 */
function trackSettingsSave() {
  trackEvent('settings_save', {});
}

/**
 * Трекинг создания подключения
 * @param {string} connectionType - Тип подключения
 */
function trackConnectionCreate(connectionType) {
  trackEvent('connection_create', { type: connectionType });
}

/**
 * Трекинг редактирования подключения
 * @param {string} connectionType - Тип подключения
 */
function trackConnectionEdit(connectionType) {
  trackEvent('connection_edit', { type: connectionType });
}

/**
 * Трекинг удаления подключения
 * @param {string} connectionType - Тип подключения
 */
function trackConnectionDelete(connectionType) {
  trackEvent('connection_delete', { type: connectionType });
}

/**
 * Трекинг смены темы
 * @param {string} theme - Тема (light/dark)
 */
function trackThemeToggle(theme) {
  trackEvent('theme_toggle', { theme });
}

/**
 * Завершение сессии
 */
function endSession() {
  if (!currentSession) {
    logger('warn', 'Metrics: No active session to end');
    return null;
  }

  const sessionEnd = new Date().toISOString();
  const sessionDuration = new Date(sessionEnd) - new Date(currentSession.sessionStart);

  currentSession.sessionEnd = sessionEnd;
  currentSession.sessionDuration = Math.floor(sessionDuration / 1000); // в секундах
  currentSession.stats = { ...stats };

  logger('info', `Metrics: Session ended - ${currentSession.sessionId}, duration: ${sessionDuration}ms`);

  const completedSession = { ...currentSession };
  currentSession = null;

  return completedSession;
}

/**
 * Получение текущей статистики
 */
function getCurrentStats() {
  return { ...stats };
}

/**
 * Проверка активности сессии
 */
function hasActiveSession() {
  return currentSession !== null;
}

module.exports = {
  initSession,
  endSession,
  trackEvent,
  trackConnectionLaunch,
  trackTabView,
  trackNetworkCheck,
  trackHelpView,
  trackError,
  trackSettingsSave,
  trackConnectionCreate,
  trackConnectionEdit,
  trackConnectionDelete,
  trackThemeToggle,
  getCurrentStats,
  hasActiveSession
};
