const { describe, it } = require('node:test');
const assert = require('node:assert');

const { 
  normalizeStorefrontAddress,
  storefrontKey,
  makeCitrixProviderName,
  normalizeForUrlCompare
} = require('../src/main/launchers/citrix/utils');

describe('Citrix StoreFront Utils', () => {
  it('should normalize storefront address', () => {
    // Basic case
    assert.strictEqual(
      normalizeStorefrontAddress('sf-vdi.moscow.alfaintra.net/Citrix/VDI/discovery'),
      'https://sf-vdi.moscow.alfaintra.net/Citrix/VDI'
    );
    
    // With http
    assert.strictEqual(
      normalizeStorefrontAddress('http://host/Citrix/Store'),
      'https://host/Citrix/Store'
    );
    
    // Already normalized
    assert.strictEqual(
      normalizeStorefrontAddress('https://host/Citrix/Store/'),
      'https://host/Citrix/Store'
    );
    
    // Empty input
    assert.strictEqual(normalizeStorefrontAddress(''), '');
    assert.strictEqual(normalizeStorefrontAddress(null), '');
  });
  
  it('should generate consistent storefront key', () => {
    const key1 = storefrontKey('https://host/Citrix/Store');
    const key2 = storefrontKey('http://host/Citrix/Store/');
    const key3 = storefrontKey('HOST/citrix/store');
    
    // Should ignore protocol, case, and trailing slash
    assert.strictEqual(key1, key2);
    assert.strictEqual(key1, key3);
    
    // Different stores should have different keys
    assert.notEqual(
      storefrontKey('https://host/Citrix/StoreA'),
      storefrontKey('https://host/Citrix/StoreB')
    );
  });
  
  it('should generate stable provider name', () => {
    const name = makeCitrixProviderName('https://sf-vdi.moscow.alfaintra.net/Citrix/VDI');
    assert.match(name, /^ARC_VDI_SF_VDI_[A-F0-9]{6}$/);
    
    // Same input should produce same output
    const name2 = makeCitrixProviderName('https://sf-vdi.moscow.alfaintra.net/Citrix/VDI');
    assert.strictEqual(name, name2);
    
    // Different inputs should produce different names (with very high probability)
    const name3 = makeCitrixProviderName('https://different.com/Citrix/Other');
    assert.notEqual(name, name3);
  });
  
  it('should normalize for URL comparison', () => {
    assert.strictEqual(
      normalizeForUrlCompare('https://host/Citrix/Store'),
      'https://host/citrix/store'
    );
    
    assert.strictEqual(
      normalizeForUrlCompare('HTTP://HOST/CITRIX/STORE/'),
      'https://host/citrix/store'
    );
  });
});