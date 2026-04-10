/**
 * Metrics IPC handlers
 * Handles: track-event, track-connection-launch, track-tab-view, track-network-check, track-help-view, track-error
 */

const { ipcMain } = require('electron');
const metricsCollector = require('../utils/metricsCollector');
const { 
  createErrorResponse, 
  createSuccessResponse,
  ERROR_CODES 
} = require('./errorCodes');

function setupMetricsIpcHandlers() {
  const ok = (data) => createSuccessResponse(data);
  const fail = (error) => {
    return createErrorResponse(ERROR_CODES.UNKNOWN_ERROR, 'Metrics operation failed', error?.message);
  };

  // Track custom event
  ipcMain.handle('track-event', (event, type, data) => {
    try {
      if (metricsCollector.hasActiveSession()) {
        metricsCollector.trackEvent(type, data || {});
      }
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  });

  // Track connection launch
  ipcMain.handle('track-connection-launch', (event, connectionType, success) => {
    try {
      if (metricsCollector.hasActiveSession()) {
        metricsCollector.trackConnectionLaunch(connectionType, success);
      }
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  });

  // Track tab view
  ipcMain.handle('track-tab-view', (event, tab) => {
    try {
      if (metricsCollector.hasActiveSession()) {
        metricsCollector.trackTabView(tab);
      }
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  });

  // Track network check
  ipcMain.handle('track-network-check', () => {
    try {
      if (metricsCollector.hasActiveSession()) {
        metricsCollector.trackNetworkCheck();
      }
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  });

  // Track help view
  ipcMain.handle('track-help-view', (event, section) => {
    try {
      if (metricsCollector.hasActiveSession()) {
        metricsCollector.trackHelpView(section);
      }
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  });

  // Track error
  ipcMain.handle('track-error', (event, error) => {
    try {
      if (metricsCollector.hasActiveSession()) {
        metricsCollector.trackError(error);
      }
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  });
}

module.exports = { setupMetricsIpcHandlers };
