/**
 * Metrics manager - initialization and lifecycle
 */

const metricsCollector = require('../utils/metricsCollector');
const metricsStorage = require('../utils/metricsStorage');
const metricsSender = require('../utils/metricsSender');
const { uuidv4 } = require('../utils/uuid');

function getOrCreateClientId(store, logger) {
  let clientId = store.get('clientId');
  
  if (!clientId) {
    clientId = uuidv4();
    store.set('clientId', clientId);
    if (logger) logger('info', `Metrics: Generated new clientId: ${clientId}`);
  }
  
  return clientId;
}

function initializeMetrics(store, userDataPath, logger) {
  // Инициализация хранилища метрик
  metricsStorage.initStorage(userDataPath);
  
  // Получаем или создаём clientId
  const clientId = getOrCreateClientId(store, logger);
  
  // Инициализация сбора метрик - начинаем новую сессию
  metricsCollector.initSession(clientId);
  
  // Настройка отправщика (пока отключен - будет включен после готовности сервера)
  metricsSender.configure({
    enabled: false, // Включить когда сервер будет готов
    endpoint: 'https://10.230.121.212/metrics',
    sendIntervalHours: 24
  });
  
  if (logger) logger('info', `Metrics: Initialized with clientId: ${clientId}`);
  
  return clientId;
}

function flushMetrics(logger) {
  // Завершаем сессию и отправляем/сохраняем метрики
  const session = metricsCollector.endSession();
  if (session) {
    metricsSender.flush(session);
    if (logger) logger('info', 'Metrics: Session flushed on app quit');
  }
}

module.exports = { getOrCreateClientId, initializeMetrics, flushMetrics };
