/**
 * Factory connection templates
 * Handles default connection templates from deployment config
 */

const { BUILTIN_DEFAULTS } = require('./defaults');
const { readDeploymentDefaults } = require('./deployment');

function normalizeFactoryId(raw, fallback) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (s) return s;
  return fallback;
}

function getStoreUrlLike(conn) {
  if (!conn || typeof conn !== 'object') return '';
  const s1 = typeof conn.storeUrl === 'string' ? conn.storeUrl.trim() : '';
  if (s1) return s1;
  const s2 = typeof conn?.clientSettings?.storeUrl === 'string' ? conn.clientSettings.storeUrl.trim() : '';
  if (s2) return s2;
  const s3 = typeof conn?.defaultSettings?.storeUrl === 'string' ? conn.defaultSettings.storeUrl.trim() : '';
  if (s3) return s3;
  return '';
}

function connectionSignatureKey(conn) {
  const type = typeof conn?.type === 'string' ? conn.type.trim().toLowerCase() : '';
  const host = typeof conn?.host === 'string' ? conn.host.trim() : '';
  const desktopPool = typeof conn?.desktopPool === 'string' ? conn.desktopPool.trim() : '';
  const storeUrl = getStoreUrlLike(conn).replace(/\/+$/, '');
  return [type, host, desktopPool, storeUrl].join('|');
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function normalizeFactoryConnections(connections = []) {
  const out = [];
  const arr = Array.isArray(connections) ? connections : [];
  for (let i = 0; i < arr.length; i += 1) {
    const c = arr[i];
    if (!c || typeof c !== 'object') continue;

    const type = typeof c.type === 'string' ? c.type.trim().toLowerCase() : '';
    if (!type) continue;

    const fallbackFactoryId = `factory-${type}-${i}`;
    const factoryId = normalizeFactoryId(c.factoryId, fallbackFactoryId);

    const template = {
      id: `factory:${factoryId}`,
      factoryId,
      isDefault: true,
      isUserModified: false,
      type,
      name: typeof c.name === 'string' ? c.name.trim() : '',
      host: typeof c.host === 'string' ? c.host.trim() : '',
      description: typeof c.description === 'string' ? c.description.trim() : '',
      desktopPool: typeof c.desktopPool === 'string' ? c.desktopPool.trim() : ''
    };

    // Use per-connection overrides under `clientSettings` (legacy key: defaultSettings).
    if (isPlainObject(c.clientSettings)) template.clientSettings = c.clientSettings;
    else if (isPlainObject(c.defaultSettings)) template.clientSettings = c.defaultSettings;

    // Citrix uses storeUrl at connection level (falls back to settings otherwise).
    const storeUrl = getStoreUrlLike(c);
    if (storeUrl) template.storeUrl = storeUrl;

    out.push(template);
  }
  return out;
}

function getFactoryTemplates(logger) {
  const deploymentDefaults = readDeploymentDefaults(logger);
  const source = deploymentDefaults || BUILTIN_DEFAULTS;
  return normalizeFactoryConnections(source.connections || []);
}

module.exports = {
  normalizeFactoryId,
  getStoreUrlLike,
  connectionSignatureKey,
  normalizeFactoryConnections,
  getFactoryTemplates
};
