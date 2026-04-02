/**
 * Settings validation and sanitization
 */

const { BUILTIN_DEFAULTS } = require('../config/defaults');
const { deepCloneJsonSafe, isPlainObject, assertJsonSize, coerceByTemplate } = require('./common');

function sanitizeSettingsInput(input) {
  const safe = deepCloneJsonSafe(input || {});
  if (!isPlainObject(safe)) throw new Error('Invalid settings object');

  // Preserve unknown root keys but sanitize known sections against defaults.
  const out = { ...safe };

  const defaults = BUILTIN_DEFAULTS.settings;
  
  // Sanitize user settings
  if (safe.user && typeof safe.user === 'object') {
    out.user = {
      domain: typeof safe.user.domain === 'string' ? safe.user.domain : '',
      username: typeof safe.user.username === 'string' ? safe.user.username : ''
    };
  } else {
    out.user = { ...defaults.user };
  }
  
  out.rdp = coerceByTemplate(defaults.rdp, safe.rdp);
  out.horizon = coerceByTemplate(defaults.horizon, safe.horizon);
  out.citrix = coerceByTemplate(defaults.citrix, safe.citrix);
  out.general = coerceByTemplate(defaults.general, safe.general);
  out.updates = coerceByTemplate(defaults.updates, safe.updates);
  out.networkCheck = coerceByTemplate(defaults.networkCheck, safe.networkCheck);

  assertJsonSize(out, 'settings');
  return out;
}

module.exports = { sanitizeSettingsInput };
