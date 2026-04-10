/**
 * Network check IPC handlers
 * Handles: network-run-full-check, network-run-ping, network-geo
 */

const { ipcMain } = require('electron');
const networkCheck = require('../utils/networkCheck');
const { getStore } = require('../stores/storeManager');
const { BUILTIN_DEFAULTS } = require('../config/defaults');
const { 
  createErrorResponse, 
  createSuccessResponse,
  ERROR_CODES 
} = require('./errorCodes');

function setupNetworkIpcHandlers(logger) {
  const ok = (data) => createSuccessResponse(data);
  const fail = (error) => {
    if (logger) logger('error', `Network check error: ${error?.message || String(error)}`);
    return createErrorResponse(ERROR_CODES.NETWORK_ERROR, 'Network check failed', error?.message);
  };

  // Run full network check
  ipcMain.handle('network-run-full-check', async (event, payload) => {
    try {
      const res = await networkCheck.runFullNetworkCheck(payload || {});
      return ok(res);
    } catch (error) {
      if (logger) logger('error', `Network check error: ${error.message}`);
      return fail(error);
    }
  });

  // Run ping
  ipcMain.handle('network-run-ping', async (event, host, count) => {
    try {
      const configStore = getStore();
      const ping = await networkCheck.runPing(String(host || ''), count);
      const settings = configStore ? (configStore.get('settings') || {}) : BUILTIN_DEFAULTS.settings;
      const thresholdMs = settings?.networkCheck?.latencyThresholdMs ?? 100;
      const evaluation = networkCheck.evaluatePing(ping, thresholdMs);
      return ok({ ping, evaluation });
    } catch (error) {
      if (logger) logger('error', `Network ping error: ${error.message}`);
      return fail(error);
    }
  });

  // Get geo location
  ipcMain.handle('network-geo', async () => {
    try {
      const res = await networkCheck.fetchGeo();
      return ok(res);
    } catch (error) {
      if (logger) logger('error', `Network geo error: ${error.message}`);
      return fail(error);
    }
  });
}

module.exports = { setupNetworkIpcHandlers };
