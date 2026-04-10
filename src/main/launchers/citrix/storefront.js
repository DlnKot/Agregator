/**
 * Citrix Launcher - StoreFront Management
 * Handles StoreFront registration and checking via registry
 */

const { execCapture } = require('./utils');
const { log: logger } = require('../../utils/logger');

async function getCitrixConfigUrlsWindows() {
    // Prefer PowerShell: locale-independent, avoids reg.exe stderr/stdout quirks.
    const ps = [
        "$base = 'HKCU:\\SOFTWARE\\Citrix\\Dazzle\\Sites';",
        '$urls = New-Object System.Collections.Generic.List[string];',
        'try {',
        '  Get-ChildItem -Path $base -ErrorAction Stop | ForEach-Object {',
        '    try {',
        '      $v = (Get-ItemProperty -Path $_.PsPath -Name configUrl -ErrorAction SilentlyContinue).configUrl;',
        '      if ($v) { $urls.Add([string]$v) | Out-Null }',
        '    } catch {}',
        '  }',
        '} catch {}',
        '$urls | ConvertTo-Json -Compress'
    ].join(' ');

    const psRes = await execCapture('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { timeoutMs: 6000 });
    if (psRes.ok) {
        const s = (psRes.stdout || '').trim();
        if (!s) return [];
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
            if (typeof parsed === 'string') return [parsed];
        } catch {
            // If parsing fails, fall through to reg.exe fallback.
        }
    }

    // Fallback to reg.exe (some environments restrict PowerShell)
    const key = 'HKCU\\SOFTWARE\\Citrix\\Dazzle\\Sites';
    const res = await execCapture('reg', ['query', key, '/s', '/v', 'configUrl'], { timeoutMs: 6000 });
    if (!res.ok) return [];

    const urls = [];
    const lines = (res.stdout || '').split(/\r?\n/);
    for (const line of lines) {
        if (!/configUrl/i.test(line)) continue;
        const parts = line.trim().split(/\s{2,}/);
        const value = parts[parts.length - 1] || '';
        if (value) urls.push(value);
    }
    return urls;
}

async function citrixStorefrontExistsWindows(storeUrlRaw = '') {
    const raw = (storeUrlRaw || '').trim();
    if (!raw) return { ok: true, exists: false, reason: 'no_store_url' };

    // Compare by StoreFront "store root" (host + path without /discovery).
    // This correctly distinguishes different stores on the same host:
    //   /Citrix/VDI-Apps vs /Citrix/VDI
    // and also ignores http/https differences.
    const expectedKey = storefrontKey(raw) || storefrontKey(normalizeStorefrontDiscoveryAddress(raw)) || storefrontKey(normalizeStorefrontAddress(raw));

    const urls = await getCitrixConfigUrlsWindows();
    if (!urls.length) {
        // If there are no sites yet, we can safely register.
        return { ok: true, exists: false, reason: 'no_sites' };
    }

    for (const value of urls) {
        const k = storefrontKey(value);
        if (!k) continue;
        if (expectedKey && k === expectedKey) {
            return { ok: true, exists: true, match: 'storeKey', value };
        }
    }

    return { ok: true, exists: false };
}

/**
 * Initialize Citrix StoreFront on macOS (placeholder - not implemented)
 * @returns {Promise<{ensured: boolean, already: boolean}>}
 */
async function ensureStorefrontAccountMac(accountName, storeUrl) {
    // TODO: Implement macOS StoreFront registration if needed
    logger('info', 'Citrix Launcher: macOS StoreFront registration not implemented');
    return { ensured: false, already: false };
}

/**
 * Get Citrix accounts directory on macOS
 * @returns {string|null} Path to accounts directory or null if not found
 */
function getCitrixAccountsDirMac() {
    // TODO: Implement if needed
    return null;
}

module.exports = {
    getCitrixConfigUrlsWindows,
    citrixStorefrontExistsWindows,
    ensureStorefrontAccountMac,
    getCitrixAccountsDirMac
};