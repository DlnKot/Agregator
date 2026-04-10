const { describe, it } = require('node:test');
const assert = require('node:assert');

// Test connection validation
const { sanitizeConnectionInput } = require('../src/main/validation/connection');
const { sanitizeSettingsInput } = require('../src/main/validation/settings');
const { deepCloneJsonSafe } = require('../src/main/validation/common');

describe('Connection Validation', () => {
  it('should reject connection without type', () => {
    assert.throws(() => {
      sanitizeConnectionInput({ name: 'Test', host: 'test.com' });
    }, /type is required/);
  });
  
  it('should reject invalid type', () => {
    assert.throws(() => {
      sanitizeConnectionInput({ type: 'invalid', name: 'Test', host: 'test.com' });
    }, /Invalid connection type/);
  });
  
  it('should validate Citrix storeUrl', () => {
    assert.throws(() => {
      sanitizeConnectionInput({ 
        type: 'citrix', 
        name: 'Test', 
        host: 'test.com',
        storeUrl: 'not-a-url'
      });
    }, /Invalid storeUrl/);
  });
  
  it('should accept valid RDP connection', () => {
    const result = sanitizeConnectionInput({
      type: 'rdp',
      name: 'Test RDP',
      host: '192.168.1.100'
    });
    assert.strictEqual(result.type, 'rdp');
    assert.strictEqual(result.name, 'Test RDP');
    assert.strictEqual(result.host, '192.168.1.100');
  });
  
  it('should sanitize Citrix connection with storeUrl', () => {
    const result = sanitizeConnectionInput({
      type: 'citrix',
      name: 'Test Citrix',
      storeUrl: 'https://example.com/Citrix/Store'
    });
    assert.strictEqual(result.type, 'citrix');
    assert.strictEqual(result.name, 'Test Citrix');
    assert.strictEqual(result.storeUrl, 'https://example.com/Citrix/Store');
  });
  
  it('should reject Citrix connection with dangerous chars in storeUrl', () => {
    assert.throws(() => {
      sanitizeConnectionInput({ 
        type: 'citrix', 
        name: 'Test', 
        storeUrl: 'https://example.com/&malicious'
      });
    }, /Invalid storeUrl/);
  });
});

describe('Settings Validation', () => {
  it('should accept valid settings', () => {
    const input = {
      user: { domain: 'DOMAIN', username: 'user' },
      rdp: { resolution: '1920x1080', colorDepth: '32' },
      horizon: { desktopProtocol: 'PCOIP' },
      citrix: { resourceName: 'TestApp' }
    };
    
    const result = sanitizeSettingsInput(input);
    assert.deepStrictEqual(result, input);
  });
  
  it('should sanitize RDP settings', () => {
    const input = {
      rdp: {
        resolution: '1920x1080',
        colorDepth: '32',
        customFlags: 'compression:i:1'
      }
    };
    
    const result = sanitizeSettingsInput(input);
    assert.deepStrictEqual(result, input);
  });
});

describe('Common Validation', () => {
  it('should deep clone JSON safely', () => {
    const original = {
      nested: { value: 42 },
      arr: [1, 2, 3],
      str: 'test'
    };
    
    const cloned = deepCloneJsonSafe(original);
    assert.deepStrictEqual(cloned, original);
    assert.notStrictEqual(cloned, original);
    assert.notStrictEqual(cloned.nested, original.nested);
    assert.notStrictEqual(cloned.arr, original.arr);
  });
  
  it('should block prototype pollution', () => {
    const malicious = JSON.parse('{"__proto__":{"polluted":true}}');
    const cleaned = deepCloneJsonSafe(malicious);
    assert.strictEqual(typeof cleaned.polluted, 'undefined');
  });
  
  it('should handle circular references', () => {
    const obj = { a: 1 };
    obj.b = obj; // circular reference
    assert.doesNotThrow(() => {
      deepCloneJsonSafe(obj);
    });
  });
  
  it('should respect size limits', () => {
    const largeString = 'x'.repeat(300 * 1024); // 300KB
    const obj = { data: largeString };
    
    assert.throws(() => {
      deepCloneJsonSafe(obj, 'test', 250 * 1024); // 250KB limit
    }, /exceeds maximum size/);
  });
});