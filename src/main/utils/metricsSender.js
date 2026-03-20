/**
 * Metrics Sender - отправка метрик на сервер
 */
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { log: logger } = require('./logger');
const metricsStorage = require('./metricsStorage');

let config = {
  enabled: false,
  endpoint: 'https://10.230.121.212/metrics',
  sendIntervalHours: 24,
  maxBufferSize: 1000
};

let sendTimer = null;

/**
 * Конфигурация отправщика
 * @param {Object} options - Настройки
 */
function configure(options) {
  config = { ...config, ...options };
  
  if (config.enabled) {
    logger('info', `Metrics: Sender configured - endpoint: ${config.endpoint}`);
    startPeriodicSend();
  } else {
    logger('info', 'Metrics: Sender disabled');
    stopPeriodicSend();
  }
}

/**
 * Запуск периодической отправки
 */
function startPeriodicSend() {
  if (sendTimer) {
    clearInterval(sendTimer);
  }
  
  // Отправка каждые N часов
  const intervalMs = config.sendIntervalHours * 60 * 60 * 1000;
  sendTimer = setInterval(() => {
    sendPendingMetrics();
  }, intervalMs);
  
  logger('info', `Metrics: Periodic send scheduled every ${config.sendIntervalHours} hours`);
}

/**
 * Остановка периодической отправки
 */
function stopPeriodicSend() {
  if (sendTimer) {
    clearInterval(sendTimer);
    sendTimer = null;
  }
}

/**
 * Отправка метрик на сервер
 * @param {Object} data - Данные для отправки
 */
async function sendToServer(data) {
  // Заглушка: пока сервер недоступен, просто логируем
  const dataStr = JSON.stringify(data);
  const truncated = dataStr.length > 500 ? dataStr.slice(0, 500) + '...' : dataStr;
  
  logger('warn', `Metrics: Would send to ${config.endpoint}: ${truncated}`);
  
  // Сохраняем локально для отладки
  logger('info', `Metrics: Session data saved locally for later upload`);
  
  // Возвращаем ошибку, чтобы показать что сервер недоступен
  return { 
    success: false, 
    error: 'Server not configured - metrics logged locally',
    dataSaved: true
  };
  
  /* TODO: Раскомментировать когда сервер будет готов
  
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(config.endpoint);
      const isHttps = parsedUrl.protocol === 'https:';
      const lib = isHttps ? https : http;
      
      const postData = JSON.stringify(data);
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 30000,
        // Для самоподписанных сертификатов (если нужно)
        // rejectUnauthorized: false
      };
      
      const req = lib.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            logger('info', `Metrics: Successfully sent to server`);
            resolve({ success: true, response: responseData });
          } else {
            logger('error', `Metrics: Server returned ${res.statusCode}`);
            resolve({ success: false, error: `Server error: ${res.statusCode}` });
          }
        });
      });
      
      req.on('error', (error) => {
        logger('error', `Metrics: Failed to send - ${error.message}`);
        resolve({ success: false, error: error.message });
      });
      
      req.on('timeout', () => {
        req.destroy();
        logger('error', 'Metrics: Request timeout');
        resolve({ success: false, error: 'Request timeout' });
      });
      
      req.write(postData);
      req.end();
      
    } catch (error) {
      logger('error', `Metrics: Send error - ${error.message}`);
      resolve({ success: false, error: error.message });
    }
  });
  */
}

/**
 * Отправка завершённой сессии
 * @param {Object} session - Сессия для отправки
 */
async function sendSession(session) {
  if (!config.enabled) {
    logger('debug', 'Metrics: Sender disabled, skipping send');
    return { success: false, error: 'Disabled' };
  }
  
  const result = await sendToServer(session);
  
  if (result.success) {
    logger('info', `Metrics: Session ${session.sessionId} sent successfully`);
  } else {
    logger('warn', `Metrics: Failed to send session ${session.sessionId}: ${result.error}`);
  }
  
  return result;
}

/**
 * Отправка всех неотправленных метрик
 */
async function sendPendingMetrics() {
  const sessions = metricsStorage.getPendingSessions();
  
  if (sessions.length === 0) {
    logger('debug', 'Metrics: No pending sessions to send');
    return { success: true, sent: 0 };
  }
  
  logger('info', `Metrics: Sending ${sessions.length} pending sessions`);
  
  let sentCount = 0;
  const sentIds = [];
  
  for (const session of sessions) {
    const result = await sendSession(session);
    
    if (result.success) {
      sentIds.push(session.sessionId);
      sentCount++;
    }
    
    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Удаляем успешно отправленные
  if (sentIds.length > 0) {
    metricsStorage.removeSentSessions(sentIds);
  }
  
  logger('info', `Metrics: Sent ${sentCount}/${sessions.length} sessions`);
  
  return { success: true, sent: sentCount, failed: sessions.length - sentCount };
}

/**
 * Принудительная отправка (например при закрытии приложения)
 */
async function flush(session) {
  if (session) {
    // Сначала сохраняем в локальное хранилище
    metricsStorage.addSession(session);
    
    // Пробуем отправить
    if (config.enabled) {
      return await sendSession(session);
    }
  }
  
  return { success: false, error: 'Nothing to flush' };
}

module.exports = {
  configure,
  sendSession,
  sendPendingMetrics,
  flush,
  startPeriodicSend,
  stopPeriodicSend
};
