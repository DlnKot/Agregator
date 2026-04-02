/**
 * Connection validation and sanitization
 */

const { deepCloneJsonSafe, isPlainObject, assertJsonSize } = require('./common');

function sanitizeConnectionInput(input) {
  const safe = deepCloneJsonSafe(input || {});
  if (!isPlainObject(safe)) throw new Error('Invalid connection object');

  const allowedTypes = new Set(['rdp', 'horizon', 'citrix']);
  const type = typeof safe.type === 'string' ? safe.type.trim().toLowerCase() : '';
  if (!allowedTypes.has(type)) throw new Error('Invalid connection type');

  const name = typeof safe.name === 'string' ? safe.name.trim() : '';
  const host = typeof safe.host === 'string' ? safe.host.trim() : '';
  if (!name) throw new Error('Connection name is required');
  if (!host) throw new Error('Connection host is required');
  if (name.length > 200) throw new Error('Connection name too long');
  if (host.length > 2048) throw new Error('Connection host too long');

  const out = {
    id: typeof safe.id === 'string' ? safe.id : '',
    type,
    name,
    host,
    desktopPool: typeof safe.desktopPool === 'string' ? safe.desktopPool.trim() : '',
    storeUrl: typeof safe.storeUrl === 'string' ? safe.storeUrl.trim() : '',
    username: typeof safe.username === 'string' ? safe.username.trim() : '',
    description: typeof safe.description === 'string' ? safe.description.trim() : '',
    isUserModified: true
  };

  if (isPlainObject(safe.clientSettings)) out.clientSettings = safe.clientSettings;

  // Citrix requires a StoreFront discovery URL.
  if (out.type === 'citrix' && !out.storeUrl) {
    throw new Error('Citrix Store URL is required');
  }

  // Basic URL sanity for Citrix storeUrl.
  if (out.type === 'citrix') {
    try {
      // Keep previous behavior (renderer normalizes by adding https:// if missing).
      if (!out.storeUrl.startsWith('http://') && !out.storeUrl.startsWith('https://')) {
        out.storeUrl = 'https://' + out.storeUrl;
      }
      out.storeUrl = out.storeUrl.replace(/\/+$/, '');
      const u = new URL(out.storeUrl);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new Error('Citrix Store URL must be http/https');
      }
    } catch {
      throw new Error('Invalid Citrix Store URL');
    }
  }

  assertJsonSize(out, 'connection');
  return out;
}

module.exports = { sanitizeConnectionInput };
