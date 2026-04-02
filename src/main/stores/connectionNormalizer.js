/**
 * Connection normalization utilities
 */

const { uuidv4 } = require('../utils/uuid');

function normalizeConnections(connections = []) {
  let changed = false;

  const normalized = (Array.isArray(connections) ? connections : []).map((conn, index) => {
    if (!conn || typeof conn !== 'object') return conn;

    const result = { ...conn };

    // deployment-defaults.json entries historically didn't include id, but the UI uses it as a key and identifier.
    if (!result.id) {
      result.id = uuidv4();
      changed = true;
    }

    if (typeof result.type === 'string') {
      const lower = result.type.toLowerCase();
      if (lower !== result.type) {
        result.type = lower;
        changed = true;
      }
    }

    // Renderer expects per-connection overrides in `clientSettings`.
    if (result.defaultSettings && !result.clientSettings) {
      result.clientSettings = result.defaultSettings;
      changed = true;
    }

    return result;
  });

  return { normalized, changed };
}

function composeConnectionsForRenderer(store, getFactoryTemplates, logger) {
  const templates = getFactoryTemplates(logger);
  const overrides = store ? (store.get('defaultConnectionOverrides', {}) || {}) : {};

  const userConnectionsRaw = store ? (store.get('connectionsUser', []) || []) : [];
  const { normalized: userConnections, changed } = normalizeConnections(userConnectionsRaw);
  if (changed && store) {
    store.set('connectionsUser', userConnections);
  }

  const mergedDefaults = templates.map((t) => {
    const o = overrides && typeof overrides === 'object' ? overrides[t.factoryId] : null;
    const name = typeof o?.name === 'string' ? o.name.trim() : '';
    if (!name) return t;
    return { ...t, name };
  });

  // Ensure deterministic order: defaults first, then user connections.
  return [...mergedDefaults, ...userConnections];
}

module.exports = { normalizeConnections, composeConnectionsForRenderer };
