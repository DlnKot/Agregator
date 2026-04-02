/**
 * Store manager - initialization and migrations
 */

const path = require('path');
const { app } = require('electron');
const SimpleStore = require('./simpleStore');
const { BUILTIN_DEFAULTS } = require('../config/defaults');
const { readDeploymentDefaults } = require('../config/deployment');
const { normalizeFactoryConnections, connectionSignatureKey } = require('../config/factory');
const { normalizeConnections } = require('./connectionNormalizer');

let configStore = null;

function getStore() {
  return configStore;
}

function initializeStores(logger) {
  const userDataPath = app.getPath('userData');
  if (logger) logger('info', `User data path: ${userDataPath}`);

  configStore = new SimpleStore(path.join(userDataPath, 'config.json'), {
    settings: BUILTIN_DEFAULTS.settings,
    // New model
    connectionsUser: [],
    defaultConnectionOverrides: {},
    // Recent connection tracking
    lastConnectionId: null,
    // Legacy keys kept for safe migrations
    connections: [],
    profiles: []
  });

  const deploymentDefaults = readDeploymentDefaults(logger);
  const existingProfiles = configStore.get('profiles', []);
  const legacyConnections = configStore.get('connections', []);
  const connectionsUserExisting = configStore.get('connectionsUser', []);
  const overridesExisting = configStore.get('defaultConnectionOverrides', {});

  // First-run defaults: apply settings only on truly first run (no user data at all).
  // Check if user already has saved settings with username - if so, don't overwrite.
  const existingSettings = configStore.get('settings', null);
  const hasUserSettings = existingSettings?.user?.username;

  if (
    !hasUserSettings &&
    (Array.isArray(connectionsUserExisting) ? connectionsUserExisting.length : 0) === 0 &&
    (Array.isArray(existingProfiles) ? existingProfiles.length : 0) === 0 &&
    (Array.isArray(legacyConnections) ? legacyConnections.length : 0) === 0
  ) {
    const source = deploymentDefaults || BUILTIN_DEFAULTS;
    configStore.set('settings', { ...BUILTIN_DEFAULTS.settings, ...(source.settings || {}) });
    configStore.set('profiles', source.profiles || []);
    if (logger) logger('info', 'Default deployment profile has been applied (settings/profiles)');
  }

  // Migration (legacy -> new model): if we have legacy connections but no new-model data.
  const hasNewModel =
    (Array.isArray(connectionsUserExisting) ? connectionsUserExisting.length : 0) > 0 ||
    (overridesExisting && typeof overridesExisting === 'object' && Object.keys(overridesExisting).length > 0);

  if (!hasNewModel && Array.isArray(legacyConnections) && legacyConnections.length > 0) {
    const templates = normalizeFactoryConnections((deploymentDefaults || BUILTIN_DEFAULTS).connections || []);
    const templatesBySig = new Map(templates.map(t => [connectionSignatureKey(t), t]));

    const legacyDefaults = legacyConnections.filter(c => c && typeof c === 'object' && c.isDefault === true);
    const legacyUsers = legacyConnections.filter(c => !(c && typeof c === 'object' && c.isDefault === true));

    const overrides = {};
    for (const d of legacyDefaults) {
      const sig = connectionSignatureKey(d);
      const t = templatesBySig.get(sig);
      const name = typeof d?.name === 'string' ? d.name.trim() : '';
      if (t && name && name !== t.name) {
        overrides[t.factoryId] = { name };
      }
    }

    const { normalized: usersNormalized } = normalizeConnections(legacyUsers);
    configStore.set('connectionsUser', usersNormalized);
    configStore.set('defaultConnectionOverrides', overrides);

    // Stop using the legacy key.
    configStore.set('connections', []);

    if (logger) logger('info', `Migrated legacy connections: defaults=${legacyDefaults.length}, users=${legacyUsers.length}`);
  }

  // Normalize user connections shape.
  const currentUsers = configStore.get('connectionsUser', []);
  const { normalized: usersNormalized, changed: usersChanged } = normalizeConnections(currentUsers);
  if (usersChanged) {
    configStore.set('connectionsUser', usersNormalized);
    if (logger) logger('info', `User connections normalized: ${currentUsers.length} entries`);
  }

  return configStore;
}

module.exports = { getStore, initializeStores };
