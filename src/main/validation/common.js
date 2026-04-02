/**
 * Common validation utilities
 */

const _DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function deepCloneJsonSafe(value, { maxDepth = 30, maxNodes = 20000 } = {}) {
  const seen = new WeakSet();
  let nodes = 0;

  function clone(v, depth) {
    nodes += 1;
    if (nodes > maxNodes) throw new Error('Object too large');
    if (depth > maxDepth) throw new Error('Object too deep');

    if (v === null || v === undefined) return v;

    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') return v;
    if (t === 'bigint') throw new Error('BigInt is not supported');
    if (t === 'function' || t === 'symbol') throw new Error('Unsupported value type');

    if (Array.isArray(v)) {
      if (seen.has(v)) throw new Error('Circular reference');
      seen.add(v);
      return v.map((x) => clone(x, depth + 1));
    }

    if (isPlainObject(v)) {
      if (seen.has(v)) throw new Error('Circular reference');
      seen.add(v);

      const out = {};
      for (const key of Object.keys(v)) {
        if (_DANGEROUS_KEYS.has(key)) continue;
        out[key] = clone(v[key], depth + 1);
      }
      return out;
    }

    // Disallow class instances (Date, Buffer, etc). Renderer should only send JSON.
    throw new Error('Unsupported object type');
  }

  return clone(value, 0);
}

function assertJsonSize(value, label, maxBytes = 250 * 1024) {
  const json = JSON.stringify(value);
  if (typeof json !== 'string') throw new Error(`${label}: cannot serialize`);
  if (Buffer.byteLength(json, 'utf8') > maxBytes) {
    throw new Error(`${label}: payload too large`);
  }
}

function coerceByTemplate(template, value) {
  if (isPlainObject(template)) {
    const src = isPlainObject(value) ? value : {};
    const out = {};
    for (const key of Object.keys(template)) {
      if (_DANGEROUS_KEYS.has(key)) continue;
      out[key] = coerceByTemplate(template[key], src[key]);
    }
    return out;
  }

  if (typeof template === 'boolean') {
    return typeof value === 'boolean' ? value : template;
  }

  if (typeof template === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? n : template;
  }

  if (typeof template === 'string') {
    return typeof value === 'string' ? value : template;
  }

  return value ?? template;
}

module.exports = {
  _DANGEROUS_KEYS,
  isPlainObject,
  deepCloneJsonSafe,
  assertJsonSize,
  coerceByTemplate
};
