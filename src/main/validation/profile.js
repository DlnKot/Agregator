/**
 * Profile validation and sanitization
 */

const { deepCloneJsonSafe, isPlainObject, assertJsonSize } = require('./common');

function sanitizeProfileInput(input) {
  const safe = deepCloneJsonSafe(input || {});
  if (!isPlainObject(safe)) throw new Error('Invalid profile object');

  const out = {
    id: typeof safe.id === 'string' ? safe.id : '',
    name: typeof safe.name === 'string' ? safe.name.trim() : '',
    description: typeof safe.description === 'string' ? safe.description.trim() : ''
  };

  if (isPlainObject(safe.settings)) out.settings = safe.settings;

  if (out.name && out.name.length > 200) throw new Error('Profile name too long');

  assertJsonSize(out, 'profile');
  return out;
}

module.exports = { sanitizeProfileInput };
