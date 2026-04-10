/**
 * Citrix Launcher - Utility Functions
 * Helper functions for URL normalization, provider naming, etc.
 */

const { spawn, spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { log: logger } = require('../../utils/logger');

function splitArgs(raw = '') {
    if (!raw) return [];
    return raw.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(a => a.replace(/"/g, '')) || [];
}

function normalizeHttpsUrl(raw = '') {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed.replace(/\/+$/, '');
    return ('https://' + trimmed).replace(/\/+$/, '');
}

function normalizeStorefrontAddress(raw = '') {
    const normalized = normalizeHttpsUrl(raw);
    if (!normalized) return '';

    // If a discovery endpoint is provided, strip it to the base address.
    // Example:
    //   https://host/Citrix/Store/discovery -> https://host/Citrix/Store
    try {
        const u = new URL(normalized);
        const p = u.pathname.replace(/\/+$/, '');
        if (p.toLowerCase().endsWith('/discovery')) {
            u.pathname = p.slice(0, -'/discovery'.length) || '/';
            u.search = '';
            u.hash = '';
            return u.toString().replace(/\/+$/, '');
        }
        u.search = '';
        u.hash = '';
        return u.toString().replace(/\/+$/, '');
    } catch {
        return normalized.replace(/\/+$/, '');
    }
}

function normalizeStorefrontDiscoveryAddress(raw = '') {
    const storeBase = normalizeStorefrontAddress(raw);
    if (!storeBase) return '';

    // If the user already provided /discovery, preserve it (but normalized).
    const normalizedRaw = normalizeHttpsUrl(raw);
    if (normalizedRaw.toLowerCase().endsWith('/discovery')) return normalizedRaw.replace(/\/+$/, '');

    // Only append /discovery for typical StoreFront paths like /Citrix/<Store>.
    try {
        const u = new URL(storeBase);
        const segs = (u.pathname || '').split('/').filter(Boolean);
        if (segs.length >= 2 && segs[0].toLowerCase() === 'citrix') {
            return (storeBase.replace(/\/+$/, '') + '/discovery').replace(/\/+$/, '');
        }
    } catch (e) {
        logger('warn', `Citrix utils: failed to parse storefront URL for discovery suffix: ${e.message}`);
    }

    return storeBase.replace(/\/+$/, '');
}

function getUrlOrigin(raw = '') {
    try {
        return new URL(raw).origin;
    } catch {
        return '';
    }
}

function buildCitrixCreateAccountUrl(accountName, addressUrl) {
    const name = encodeURIComponent(accountName || 'Store');
    const address = encodeURIComponent(addressUrl);
    return `citrixreceiver://createaccount?name=${name}&address=${address}`;
}

function normalizeForUrlCompare(raw = '') {
    const normalized = normalizeHttpsUrl(raw);
    if (!normalized) return '';
    try {
        const u = new URL(normalized);
        u.hostname = u.hostname.toLowerCase();
        u.pathname = (u.pathname || '').replace(/\/+$/, '').toLowerCase();
        u.search = '';
        u.hash = '';
        return u.toString().replace(/\/+$/, '');
    } catch {
        return normalized.replace(/\/+$/, '').toLowerCase();
    }
}

function storefrontKey(raw = '') {
    const normalized = normalizeHttpsUrl(raw);
    if (!normalized) return '';
    try {
        const u = new URL(normalized);
        // Ignore scheme (http/https) for equality; Citrix may store either.
        const host = (u.host || u.hostname || '').toLowerCase();
        let p = (u.pathname || '').replace(/\/+$/, '');
        if (p.toLowerCase().endsWith('/discovery')) p = p.slice(0, -'/discovery'.length);
        p = (p || '/').replace(/\/+$/, '') || '/';
        p = p.toLowerCase();
        return `${host}${p}`;
    } catch {
        // Fall back to a conservative key; if parsing fails we don't treat it as equal.
        return '';
    }
}

function makeCitrixProviderName(rawStoreUrl = '') {
    // Provider name must be stable per StoreFront and not collide across different stores.
    // Use a short hash so we don't depend on path length/characters.
    const raw = String(rawStoreUrl || '').trim();
    const k = storefrontKey(raw) || raw.toLowerCase();
    const h = crypto.createHash('sha1').update(k).digest('hex').slice(0, 6).toUpperCase();

    // Try to build a readable provider name: ARC_<STORE>_<HOST>_<HASH>
    // Examples:
    //   https://sf-vdi.moscow.alfaintra.net/Citrix/VDI/discovery      -> ARC_VDI_SF_VDI_ABC123
    //   http://citrixweb/Citrix/CitrixWeb/discovery                  -> ARC_CITRIXWEB_CITRIXWEB_ABC123
    let store = '';
    let host = '';
    try {
        const u = new URL(normalizeHttpsUrl(raw) || raw);
        host = (u.hostname || '').split('.')[0] || (u.hostname || '');

        const p = (u.pathname || '').replace(/\/+$/, '');
        const segs = p.split('/').filter(Boolean);
        const citrixIdx = segs.findIndex(s => String(s).toLowerCase() === 'citrix');
        if (citrixIdx >= 0 && segs[citrixIdx + 1]) {
            store = segs[citrixIdx + 1];
        } else if (segs.length) {
            store = segs[segs.length - 1];
        }

        if (String(store).toLowerCase() === 'discovery' && segs.length >= 2) {
            store = segs[segs.length - 2] || store;
        }
    } catch {
        // ignore parse failures
    }

    const sanitize = (s) => String(s || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 16);

    const storePart = sanitize(store) || 'STORE';
    const hostPart = sanitize(host) || 'HOST';
    return `ARC_${storePart}_${hostPart}_${h}`;
}

function execCapture(command, args = [], { timeoutMs = 4000 } = {}) {
    return new Promise((resolve) => {
        try {
            const child = spawn(command, args, { windowsHide: true });
            let out = '';
            let err = '';
            let done = false;

            const finish = (res) => {
                if (done) return;
                done = true;
                resolve(res);
            };

            const t = setTimeout(() => {
                try {
                    child.kill();
                } catch (e) {
                    logger('warn', `Citrix utils: failed to kill timed out process ${command}: ${e.message}`);
                }
                finish({ ok: false, code: null, stdout: out, stderr: err, timedOut: true });
            }, timeoutMs);

            child.stdout?.on('data', (d) => { out += d.toString('utf8'); });
            child.stderr?.on('data', (d) => { err += d.toString('utf8'); });
            child.on('error', (e) => {
                clearTimeout(t);
                finish({ ok: false, code: null, stdout: out, stderr: String(e?.message || e), timedOut: false });
            });
            child.on('close', (code) => {
                clearTimeout(t);
                finish({ ok: code === 0, code, stdout: out, stderr: err, timedOut: false });
            });
        } catch (e) {
            resolve({ ok: false, code: null, stdout: '', stderr: String(e?.message || e), timedOut: false });
        }
    });
}

module.exports = {
    splitArgs,
    normalizeHttpsUrl,
    normalizeStorefrontAddress,
    normalizeStorefrontDiscoveryAddress,
    getUrlOrigin,
    buildCitrixCreateAccountUrl,
    normalizeForUrlCompare,
    storefrontKey,
    makeCitrixProviderName,
    execCapture
};
