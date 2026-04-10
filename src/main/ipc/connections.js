/**
 * Connection IPC handlers
 * Handles: get-connections, save-connection, delete-connection, reset-default-connections
 */

const { ipcMain } = require('electron');
const { getStore } = require('../stores/storeManager');
const { getFactoryTemplates } = require('../config/factory');
const { composeConnectionsForRenderer } = require('../stores/connectionNormalizer');
const { sanitizeConnectionInput, deepCloneJsonSafe, isPlainObject } = require('../validation');
const { uuidv4 } = require('../utils/uuid');
const { 
  createErrorResponse, 
  createSuccessResponse,
  ERROR_CODES 
} = require('./errorCodes');

function setupConnectionIpcHandlers(logger) {
  const ok = (data) => createSuccessResponse(data);
  const fail = (error) => {
    if (logger) logger('error', `Connection error: ${error?.message || String(error)}`);
    return createErrorResponse(ERROR_CODES.STORAGE_ERROR, 'Connection operation failed', error?.message);
  };
  ipcMain.handle('get-connections', () => {
    try {
      const configStore = getStore();
      const data = composeConnectionsForRenderer(configStore, getFactoryTemplates, logger);
      if (logger) logger('info', `get-connections: returning ${data.length} connections`);
      return ok(data);
    } catch (e) {
      if (logger) logger('error', `get-connections failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });

  // Save connection
  ipcMain.handle('save-connection', (event, connection) => {
    try {
      const configStore = getStore();
      const safe = deepCloneJsonSafe(connection || {});
      
      // Handle factory connection rename
      if (isPlainObject(safe) && typeof safe.factoryId === 'string' && safe.factoryId.trim()) {
        const factoryId = safe.factoryId.trim();
        const name = typeof safe.name === 'string' ? safe.name.trim() : '';
        if (!name) throw new Error('Connection name is required');
        if (name.length > 200) throw new Error('Connection name too long');

        const templates = getFactoryTemplates(logger);
        const exists = templates.some(t => t.factoryId === factoryId);
        if (!exists) throw new Error('Unknown default connection');

        const overrides = (configStore.get('defaultConnectionOverrides', {}) || {});
        const next = { ...overrides, [factoryId]: { name } };
        configStore.set('defaultConnectionOverrides', next);

        // Return the updated composed connection.
        const updated = composeConnectionsForRenderer(configStore, getFactoryTemplates, logger)
          .find(c => c && typeof c === 'object' && c.factoryId === factoryId);
        return ok(updated || { factoryId, name, isDefault: true });
      }

      // Handle user connection
      const sanitized = sanitizeConnectionInput(connection);
      sanitized.isDefault = false;
      delete sanitized.factoryId;

      const connections = configStore.get('connectionsUser', []);
      const idx = connections.findIndex(c => c && typeof c === 'object' && c.id === sanitized.id);
      let saved;

      if (idx >= 0) {
        // Update existing connection (preserve id).
        connections[idx] = { ...connections[idx], ...sanitized, id: connections[idx].id };
        saved = connections[idx];
      } else {
        // New connection: always generate a strong unique id to avoid collisions.
        saved = { ...sanitized, id: uuidv4() };
        connections.push(saved);
      }

      configStore.set('connectionsUser', connections);
      return ok(saved);
    } catch (e) {
      if (logger) logger('error', `save-connection failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });

  // Delete connection
  ipcMain.handle('delete-connection', (event, connectionId) => {
    try {
      const configStore = getStore();
      const id = typeof connectionId === 'string' ? connectionId : String(connectionId || '');
      if (id.startsWith('factory:')) {
        return fail('Cannot delete default connection');
      }

      const connections = configStore.get('connectionsUser', []);
      configStore.set('connectionsUser', connections.filter(c => c.id !== id));
      return ok(true);
    } catch (e) {
      if (logger) logger('error', `delete-connection failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });

  // Reset default connections
  ipcMain.handle('reset-default-connections', () => {
    try {
      const configStore = getStore();
      configStore.set('defaultConnectionOverrides', {});
      return ok(composeConnectionsForRenderer(configStore, getFactoryTemplates, logger));
    } catch (e) {
      if (logger) logger('error', `reset-default-connections failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });

  // Get last connection ID
  ipcMain.handle('get-last-connection', () => {
    try {
      const configStore = getStore();
      const lastId = configStore ? configStore.get('lastConnectionId') : null;
      return ok(lastId);
    } catch (e) {
      if (logger) logger('error', `get-last-connection failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });

  // Set last connection ID
  ipcMain.handle('set-last-connection', (event, connectionId) => {
    try {
      const configStore = getStore();
      if (configStore) {
        configStore.set('lastConnectionId', connectionId || null);
      }
      return ok(true);
    } catch (e) {
      if (logger) logger('error', `set-last-connection failed: ${e?.message || String(e)}`);
      return fail(e);
    }
  });
}

module.exports = { setupConnectionIpcHandlers };
