/**
 * Citrix Workspace Launcher - handles launching Citrix connections
 */

const { spawn, spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { log: logger } = require('../utils/logger');

const launchedProcesses = [];

// Validation functions to prevent command injection
function validateStoreUrl(storeUrl) {
    if (!storeUrl || typeof storeUrl !== 'string') return '';
    const trimmed = storeUrl.trim();
    // Basic URL validation - allow http/https URLs only
    if (!/^https?:\/\/.+/.test(trimmed)) return '';
    if (trimmed.length > 512) throw new Error('Store URL too long');
    return trimmed;
}

function validateResourceName(resourceName) {
    if (!resourceName || typeof resourceName !== 'string') return '';
    const trimmed = resourceName.trim();
    // Reject paths and dangerous characters
    if (/[\\\/&$;|`()\\n\\r]/.test(trimmed)) {
        throw new Error('Invalid resource name: contains invalid characters');
    }
    if (trimmed.length > 128) throw new Error('Resource name too long');
    return trimmed;
}

function validateConnectionData(connection) {
    if (!connection || typeof connection !== 'object') {
        throw new Error('Invalid connection object');
    }

    // For Citrix, host can be store URL or resource name
    // Validate optional storeUrl if present
    if (connection.storeUrl) {
        connection.storeUrl = validateStoreUrl(connection.storeUrl);
    }

    return connection;
}

// Common installation paths
const HORIZON_PATHS = [
    'C:\\Program Files\\VMware\\VMware Horizon Client\\bin\\vmware-view.exe',
    'C:\\Program Files\\VMware\\VMware Horizon\\View\\Client\\bin\\vmware-view.exe',
    'C:\\Program Files (x86)\\VMware\\VMware Horizon Client\\bin\\vmware-view.exe',
    'C:\\Program Files (x86)\\VMware\\VMware Horizon\\View\\Client\\bin\\vmware-view.exe',
    'C:\\ProgramData\\VMware\\VMware Horizon\\View\\Client\\bin\\vmware-view.exe',
    path.join(process.env.LOCALAPPDATA || '', 'VMware', 'VMware Horizon Client', 'bin', 'vmware-view.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'VMware', 'VMware Horizon', 'View', 'Client', 'bin', 'vmware-view.exe'),
    path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'VMware', 'VMware Horizon', 'View', 'Client', 'bin', 'vmware-view.exe')
];

function launchDetached(command, args = [], options = {}) {
    logger('info', `Horizon Launcher: launching ${command} ${args.join(' ')}`);

    try {
        const child = spawn(command, args, {
            detached: true,
            stdio: 'ignore',
            shell: false,
            ...options
        });

        // Prevent unhandled 'error' events (e.g. ENOENT) from crashing the app.
        child.on('error', (e) => {
            logger('error', `Citrix Launcher: failed to launch ${command}: ${e.message}`);
        });

        if (child.pid) {
            launchedProcesses.push({
                pid: child.pid,
                command,
                args,
                startTime: Date.now()
            });

            logger('info', `Horizon Launcher: Process started PID=${child.pid}`);
        }

        child.unref();

    } catch (error) {
        logger('error', `Horizon Launcher: Failed to launch ${command}: ${error.message}`);
        throw error;
    }
}

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
    } catch { /* ignore */ }

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
                try { child.kill(); } catch { /* ignore */ }
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

function getCitrixAccountsDirMac() {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Citrix', 'Receiver', 'Accounts');
}

function getCitrixAccountsDirMacCandidates() {
    const home = os.homedir();
    // Citrix has changed storage locations between Receiver/Workspace versions.
    // We'll check a small set of likely candidates and fall back to scanning.
    return [
        path.join(home, 'Library', 'Application Support', 'Citrix', 'Receiver', 'Accounts'),
        path.join(home, 'Library', 'Application Support', 'Citrix', 'Workspace', 'Accounts'),
        path.join(home, 'Library', 'Application Support', 'Citrix', 'Accounts'),
        path.join(home, 'Library', 'Application Support', 'Citrix Workspace', 'Accounts'),
        path.join(home, 'Library', 'Application Support', 'Citrix Workspace')
    ];
}

function getAccountsFingerprintMac() {
    const dirs = getCitrixAccountsDirMacCandidates();
    const items = [];

    for (const dir of dirs) {
        try {
            if (!fs.existsSync(dir)) {
                items.push({ dir, exists: false, count: 0, mtimeMs: 0 });
                continue;
            }
            const st = fs.statSync(dir);
            let count = 0;
            try {
                count = fs.readdirSync(dir).length;
            } catch { /* ignore */ }
            items.push({ dir, exists: true, count, mtimeMs: st.mtimeMs || 0 });
        } catch {
            items.push({ dir, exists: false, count: 0, mtimeMs: 0 });
        }
    }

    return { items };
}

function hasAccountsFingerprintChanged(before, after) {
    const bItems = before?.items || [];
    const aItems = after?.items || [];
    const map = new Map();
    for (const b of bItems) map.set(b.dir, b);
    for (const a of aItems) {
        const b = map.get(a.dir);
        if (!b) {
            if (a.exists) return true;
            continue;
        }
        if (b.exists !== a.exists) return true;
        if (a.count > b.count) return true;
        if (a.mtimeMs > b.mtimeMs + 1) return true;
    }
    return false;
}

function openUrlMac(url) {
    const u = String(url || '').trim();
    if (!u) return { ok: false, reason: 'empty_url' };
    try {
        const res = spawnSync('open', [u], { encoding: 'utf8' });
        if (res.status !== 0) {
            logger('warn', `Citrix Launcher: open failed (mac) status=${res.status} url=${u} stderr=${(res.stderr || '').trim()}`);
            return { ok: false, status: res.status, stderr: (res.stderr || '').trim() };
        }
        return { ok: true };
    } catch (e) {
        logger('warn', `Citrix Launcher: open failed (mac) url=${u}: ${e?.message || String(e)}`);
        return { ok: false, error: e?.message || String(e) };
    }
}

function scanTextInDir(dir, needles) {
    // Best-effort scan: Citrix stores account metadata in files (often plist/binary).
    // We'll check filenames and file contents (as utf8/latin1) up to a small depth.
    const stack = [{ p: dir, depth: 0 }];
    const maxDepth = 3;

    while (stack.length) {
        const { p, depth } = stack.pop();
        let entries;
        try {
            entries = fs.readdirSync(p, { withFileTypes: true });
        } catch {
            continue;
        }

        for (const ent of entries) {
            const full = path.join(p, ent.name);
            const lowerName = (ent.name || '').toLowerCase();
            if (needles.some(n => lowerName.includes(n))) return true;

            if (ent.isDirectory()) {
                if (depth < maxDepth) stack.push({ p: full, depth: depth + 1 });
                continue;
            }

            if (!ent.isFile()) continue;

            try {
                const buf = fs.readFileSync(full);
                const s1 = buf.toString('utf8');
                const s2 = buf.toString('latin1');
                const hit = needles.some(n => s1.toLowerCase().includes(n) || s2.toLowerCase().includes(n));
                if (hit) return true;
            } catch {
                // ignore unreadable files
            }
        }
    }

    return false;
}

function isStorefrontRegisteredMac(storeUrl) {
    const normalized = normalizeStorefrontAddress(storeUrl);
    if (!normalized) return false;

    let host = '';
    const origin = getUrlOrigin(normalized).toLowerCase();
    try {
        host = new URL(normalized).host.toLowerCase();
    } catch {
        host = normalized.toLowerCase();
    }

    const needles = [host, origin, normalized.toLowerCase()].filter(Boolean);
    const candidates = getCitrixAccountsDirMacCandidates();
    for (const dir of candidates) {
        try {
            if (!fs.existsSync(dir)) continue;
        } catch {
            continue;
        }
        if (scanTextInDir(dir, needles)) return true;
    }
    return false;
}

function ensureStorefrontAccountMac(accountName, storeUrlRaw) {
    const raw = (storeUrlRaw || '').trim();
    const normalized = normalizeStorefrontAddress(raw);
    if (!normalized) return { ensured: false, reason: 'no_store_url' };

    if (isStorefrontRegisteredMac(normalized)) {
        logger('info', `Citrix Launcher: Storefront already registered (mac): ${normalized}`);
        return { ensured: true, already: true, storeUrl: normalized };
    }

    // Prefer the StoreFront store base URL (e.g. https://host/Citrix/Store) over /discovery,
    // otherwise Workspace may ignore the address and fall back to browser.
    const storeBase = normalized;
    const origin = getUrlOrigin(normalized) || normalized;

    const name = (accountName || 'Store');
    const rawNormalized = normalizeHttpsUrl(raw).replace(/\/+$/, '');
    const discoveryUrl = rawNormalized && rawNormalized.toLowerCase().endsWith('/discovery') ? rawNormalized : '';

    const urlDiscovery = discoveryUrl ? buildCitrixCreateAccountUrl(name, discoveryUrl) : '';
    const urlStore = buildCitrixCreateAccountUrl(name, storeBase);
    const urlOrigin = buildCitrixCreateAccountUrl(name, origin);

    logger('info', `Citrix Launcher: Registering Storefront (mac): storeBase=${storeBase} origin=${origin}${discoveryUrl ? ` discovery=${discoveryUrl}` : ''}`);
    if (urlDiscovery) logger('info', `Citrix Launcher: createaccount (discovery): ${urlDiscovery}`);
    logger('info', `Citrix Launcher: createaccount (storeBase): ${urlStore}`);
    const fingerprintBefore = getAccountsFingerprintMac();
    // Try discovery first (if provided), then storeBase.
    const openRes = urlDiscovery ? openUrlMac(urlDiscovery) : openUrlMac(urlStore);

    return {
        ensured: true,
        already: false,
        storeUrl: normalized,
        storeBase,
        origin,
        discoveryUrl,
        urlDiscovery,
        urlStore,
        urlOrigin,
        fingerprintBefore,
        openRes
    };
}

function waitForStorefrontRegistrationMac(storeUrl, beforeFingerprint, { timeoutMs = 15000, intervalMs = 500 } = {}) {
    const normalized = normalizeStorefrontAddress(storeUrl);
    if (!normalized) return Promise.resolve(false);

    const startedAt = Date.now();
    return new Promise((resolve) => {
        const timer = setInterval(() => {
            try {
                if (isStorefrontRegisteredMac(normalized)) {
                    clearInterval(timer);
                    resolve(true);
                    return;
                }
            } catch { /* ignore */ }

            if (beforeFingerprint) {
                const after = getAccountsFingerprintMac();
                if (hasAccountsFingerprintChanged(beforeFingerprint, after)) {
                    clearInterval(timer);
                    resolve(true);
                    return;
                }
            }

            if (Date.now() - startedAt > timeoutMs) {
                clearInterval(timer);
                resolve(false);
            }
        }, intervalMs);
    });
}

function findHorizonExecutable(customPath) {

    if (customPath && customPath.trim()) {
        const trimmed = customPath.trim();

        logger('info', `Horizon Launcher: Checking custom path: ${trimmed}`);

        if (fs.existsSync(trimmed)) {
            return trimmed;
        }

        logger('warn', `Horizon Launcher: Custom path not found`);
    }

    for (const p of HORIZON_PATHS) {
        try {
            if (fs.existsSync(p)) {
                logger('info', `Horizon Launcher: Found at ${p}`);
                return p;
            }
        } catch {
            continue;
        }
    }

    try {
        const result = spawnSync('where', ['vmware-view.exe'], { encoding: 'utf8' });

        if (result.status === 0 && result.stdout) {
            const found = result.stdout.split('\n')[0].trim();

            if (found && fs.existsSync(found)) {
                logger('info', `Horizon Launcher: Found via PATH ${found}`);
                return found;
            }
        }

    } catch { }

    return null;
}

function buildArgs(connection = {}, settings = {}) {

    const args = [];
    const s = settings;

    if (s.serverUrl)
        args.push('-serverURL', s.serverUrl);

    if (connection.desktopPool || s.desktopName)
        args.push('-desktopName', connection.desktopPool || s.desktopName);

    if (s.appName)
        args.push('-appName', s.appName);

    if (connection.username || s.userName)
        args.push('-userName', connection.username || s.userName);

    // Security: Don't pass password as CLI argument - visible in process listings
    // Users should use the Horizon Client UI or secure credential storage
    // if (s.password)
    //  args.push('-password', s.password);

    if (s.domainName)
        args.push('-domainName', s.domainName);

    if (s.desktopProtocol)
        args.push('-desktopProtocol', s.desktopProtocol);

    if (s.desktopLayout)
        args.push('-desktopLayout', s.desktopLayout);

    if (s.monitors)
        args.push('-monitors', s.monitors);

    if (s.unattended)
        args.push('-unattended');

    if (s.nonInteractive)
        args.push('-nonInteractive');

    if (s.launchMinimized)
        args.push('-launchMinimized');

    if (s.loginAsCurrentUser)
        args.push('-loginAsCurrentUser', 'true');

    if (s.hideClientAfterLaunchSession)
        args.push('-hideClientAfterLaunchSession', 'true');

    if (s.useExisting)
        args.push('-useExisting');

    if (s.singleAutoConnect)
        args.push('-singleAutoConnect');

    if (s.customFlags)
        args.push(...splitArgs(s.customFlags));

    return args;
}

function launchHorizon(connection, settings) {
    // Extract horizon settings from full settings object
    const horizonSettings = settings?.horizon || settings || {};
    const args = buildArgs(connection, horizonSettings);

    logger('info', `Horizon Launcher: Built args: ${args.join(' ')}`);

    if (process.platform === 'win32') {

        const exePath = findHorizonExecutable(horizonSettings?.customPath);

        if (!exePath) {
            logger('error', 'Horizon Launcher: VMware Horizon client not found');
            throw new Error('VMware Horizon Client not found');
        }

        launchDetached(exePath, args);

        logger('info', `Horizon Launcher: Launched from ${exePath}`);

        return;
    }

    if (process.platform === 'darwin') {

        const checkApp = (name) => {
            const res = spawnSync('open', ['-Ra', name], { stdio: 'ignore' });
            return res.status === 0;
        };

        if (checkApp('VMware Horizon Client')) {
            launchDetached('open', ['-a', 'VMware Horizon Client', '--args', ...args]);
            return;
        }

        if (checkApp('VMware Horizon')) {
            launchDetached('open', ['-a', 'VMware Horizon', '--args', ...args]);
            return;
        }

        logger('error', 'Horizon Launcher: VMware Horizon Client not found on macOS');

        throw new Error('VMware Horizon Client not installed');
    }

    // Linux fallback
    launchDetached('vmware-view', args);
}

/**
 * Initialize Citrix Storefront (Windows only)
 * Registers/configures a Storefront provider for Citrix client
 * Command: SelfService.exe -init -createprovider PROVIDER_NAME STORE_URL
 */
function initializeCitrixStorefront(exePath, storeUrl, providerName) {
    try {
        // Normalize store URL
        let normalizedUrl = storeUrl.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = 'https://' + normalizedUrl;
        }

        const prov = String(providerName || '').trim() || makeCitrixProviderName(normalizedUrl);

        logger('info', `Citrix Launcher: Initializing Storefront`);
        logger('info', `Citrix Launcher: Store URL: ${normalizedUrl}`);
        logger('info', `Citrix Launcher: Provider Name: ${prov}`);

        // Build initialization arguments
        const initArgs = [
            '-init',
            '-createprovider',
            prov,
            normalizedUrl
        ];

        logger('info', `Citrix Launcher: Running initialization: ${exePath} ${initArgs.join(' ')}`);

        // Async (non-blocking) run, but we still capture result for troubleshooting.
        const child = spawn(exePath, initArgs, {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let out = '';
        let err = '';
        const limit = 16 * 1024;
        child.stdout?.on('data', (d) => { out = (out + d.toString('utf8')).slice(-limit); });
        child.stderr?.on('data', (d) => { err = (err + d.toString('utf8')).slice(-limit); });

        const t = setTimeout(() => {
            try { child.kill(); } catch { /* ignore */ }
            logger('warn', 'Citrix Launcher: Storefront initialization timed out (killed)');
        }, 30000);

        child.on('error', (e) => {
            clearTimeout(t);
            logger('warn', `Citrix Launcher: Initialization process error: ${e.message}`);
        });

        child.on('close', (code) => {
            clearTimeout(t);
            logger('info', `Citrix Launcher: Initialization exited with code ${code}`);
            const sOut = (out || '').trim();
            const sErr = (err || '').trim();
            if (sOut) logger('info', `Citrix Launcher: init stdout: ${sOut}`);
            if (sErr) logger('warn', `Citrix Launcher: init stderr: ${sErr}`);
        });

        logger('info', 'Citrix Launcher: Storefront initialization started (async)');

    } catch (error) {
        logger('warn', `Citrix Launcher: Storefront initialization failed: ${error.message}`);
        // Don't throw - continue with normal launch even if initialization fails
    }
}

function tryBringCitrixToFrontWindows() {
    // Best-effort: if SelfService has a normal window, bring it to foreground.
    // If it's a tray-only instance (MainWindowHandle=0), this won't help, but it's harmless.
    try {
        const script = [
            '$p = Get-Process -Name SelfService -ErrorAction SilentlyContinue | Select-Object -First 1;',
            'if ($p -and $p.MainWindowHandle -ne 0) {',
            '  Add-Type -Name Win32 -Namespace ARC -MemberDefinition "[DllImport(\\"user32.dll\\")]public static extern bool ShowWindowAsync(IntPtr hWnd,int nCmdShow);[DllImport(\\"user32.dll\\")]public static extern bool SetForegroundWindow(IntPtr hWnd);" -ErrorAction SilentlyContinue;',
            '  [ARC.Win32]::ShowWindowAsync($p.MainWindowHandle, 9) | Out-Null;',
            '  [ARC.Win32]::SetForegroundWindow($p.MainWindowHandle) | Out-Null;',
            '}'
        ].join(' ');

        const child = spawn('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', script], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true
        });
        child.on('error', () => { });
        child.unref();
    } catch { /* ignore */ }
}

// Citrix Workspace launcher
function launchCitrix(connection, settings) {
    try {
        // Validate connection data before using it
        validateConnectionData(connection);
    } catch (error) {
        logger('error', `Citrix Launcher: validation failed - ${error.message}`);
        throw error;
    }

    // Extract citrix settings from full settings object
    const citrixSettings = settings?.citrix || settings || {};

    logger('info', `Citrix Launcher: Starting connection to ${connection.host}`);
    logger('info', `Citrix Launcher: Store URL (settings): ${citrixSettings.storeUrl}`);
    logger('info', `Citrix Launcher: Resource: ${citrixSettings.resourceName}`);

    const effectiveStoreUrlRaw = (connection?.storeUrl || '').trim() || (citrixSettings.storeUrl || '').trim();
    const effectiveStoreUrl = normalizeStorefrontAddress(effectiveStoreUrlRaw);

    if (effectiveStoreUrl) {
        logger('info', `Citrix Launcher: Store URL (effective): ${effectiveStoreUrl}`);
    } else if (effectiveStoreUrlRaw) {
        logger('info', `Citrix Launcher: Store URL provided but cannot normalize: ${effectiveStoreUrlRaw}`);
    }

    if (process.platform === 'win32') {
        // Find Citrix Workspace executable - correct paths
        const citrixPaths = [
            'C:\\Program Files (x86)\\Citrix\\ICA Client\\SelfServicePlugin\\SelfService.exe',
            'C:\\Program Files\\Citrix\\ICA Client\\SelfServicePlugin\\SelfService.exe',
            'C:\\Program Files (x86)\\Citrix\\ICA Client\\selfservice.exe',
            'C:\\Program Files\\Citrix\\ICA Client\\selfservice.exe',
            path.join(process.env.LOCALAPPDATA || '', 'Citrix', 'ICA Client', 'SelfServicePlugin', 'SelfService.exe'),
            path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Citrix', 'ICA Client', 'SelfServicePlugin', 'SelfService.exe')
        ];

        let exePath = null;
        for (const p of citrixPaths) {
            try {
                if (fs.existsSync(p)) {
                    exePath = p;
                    logger('info', `Citrix Launcher: Found at: ${p}`);
                    break;
                }
            } catch (e) { continue; }
        }

        // Try custom path
        if (citrixSettings.customPath) {
            const customPath = citrixSettings.customPath.trim();
            try {
                if (fs.existsSync(customPath)) {
                    exePath = customPath;
                    logger('info', `Citrix Launcher: Using custom path: ${customPath}`);
                }
            } catch (e) {
                logger('warn', `Citrix Launcher: Custom path not found: ${customPath}`);
            }
        }

        if (!exePath) {
            logger('error', 'Citrix Launcher: Citrix Workspace not found');
            throw new Error('Citrix Workspace not found. Please install it or specify custom path in settings.');
        }

        // Initialize storefront ONLY if it isn't registered yet (avoid duplicates and UI hangs).
        // Note: Citrix stores this as HKCU\\SOFTWARE\\Citrix\\Dazzle\\Sites\\*\\configUrl.
        if (effectiveStoreUrlRaw) {
            (async () => {
                const exists = await citrixStorefrontExistsWindows(effectiveStoreUrlRaw);
                if (exists.ok && exists.exists) {
                    logger('info', `Citrix Launcher: Storefront already registered (win): match=${exists.match} value=${exists.value}`);
                    return;
                }
                if (!exists.ok) {
                    logger('warn', `Citrix Launcher: Could not verify Storefront in registry (win): reason=${exists.reason}. Skipping auto-registration to avoid duplicates.`);
                    return;
                }

                const toRegister = normalizeStorefrontDiscoveryAddress(effectiveStoreUrlRaw) || normalizeHttpsUrl(effectiveStoreUrlRaw).replace(/\/+$/, '');
                logger('info', `Citrix Launcher: Storefront not found in registry (win). Registering: ${toRegister}`);
                const prov = makeCitrixProviderName(toRegister);
                initializeCitrixStorefront(exePath, toRegister, prov);
            })().catch(() => { });
        }

        // Build args for launching resource or opening client
        const args = [];

        // Store URL - normalize with https:// if needed
        if (effectiveStoreUrl) {
            args.push('-store');
            args.push(effectiveStoreUrl);
            logger('info', `Citrix Launcher: Using store URL: ${effectiveStoreUrl}`);
        }

        // Resource to launch
        if (citrixSettings.resourceName) {
            args.push('-launch');
            args.push(citrixSettings.resourceName);
            logger('info', `Citrix Launcher: Launching resource: ${citrixSettings.resourceName}`);
        }

        // If we're launching a specific published resource, keep it quiet.
        // If not, we want the UI visible (otherwise it often stays in tray and users think nothing happened).
        if (citrixSettings.resourceName) {
            args.push('-quiet');
        }

        // Custom flags
        if (citrixSettings.customFlags) {
            args.push(...splitArgs(citrixSettings.customFlags));
        }

        logger('info', `Citrix Launcher: Launching ${exePath} with args: ${args.join(' ')}`);
        launchDetached(exePath, args);
        tryBringCitrixToFrontWindows();
        logger('info', `Citrix Launcher: Launched from ${exePath}`);
        return;
    }

    if (process.platform === 'darwin') {
        // Check for Citrix Workspace on macOS
        const citrixApps = ['Citrix Workspace', 'Citrix Receiver'];

        for (const appName of citrixApps) {
            const result = spawnSync('open', ['-Ra', appName], { stdio: 'ignore' });
            if (result.status === 0) {
                logger('info', `Citrix Launcher: Found app ${appName}`);

                // macOS: best-effort StoreFront registration (same flow as when it "worked").
                // We don't block the UI: trigger registration, then open the app shortly after.
                const storeUrlRaw = (effectiveStoreUrlRaw || '').trim();
                const accountName = ((citrixSettings.accountName || '').trim() || (connection?.name || '').trim() || 'Store');

                if (storeUrlRaw) {
                    try {
                        const res = ensureStorefrontAccountMac(accountName, storeUrlRaw);
                        if (res.ensured && !res.already) {
                            // Give Workspace a moment to process the createaccount URL.
                            setTimeout(() => {
                                launchDetached('open', ['-a', appName]);
                            }, 1200);
                            return;
                        }
                    } catch (e) {
                        logger('warn', `Citrix Launcher: StoreFront register attempt failed (mac): ${e?.message || String(e)}`);
                        // continue to opening the app below
                    }
                }

                launchDetached('open', ['-a', appName]);
                return;
            }
        }

        logger('error', 'Citrix Launcher: Citrix Workspace not found on macOS');
        throw new Error('Citrix Workspace not found on macOS. Please install Citrix Workspace');
    }

    // Linux
    launchDetached('ctx', ['-store', effectiveStoreUrl || '']);
}

function killAllProcesses() {

    logger('info', `Horizon Launcher: Killing ${launchedProcesses.length} processes`);

    for (const proc of launchedProcesses) {

        try {

            if (process.platform === 'win32') {

                const child = spawn('taskkill', [
                    '/pid',
                    proc.pid.toString(),
                    '/T',
                    '/F'
                ], { stdio: 'ignore' });
                child.on('error', (e) => {
                    logger('warn', `Citrix Launcher: taskkill failed for ${proc.pid}: ${e.message}`);
                });
                child.unref();

            }

        } catch (e) {

            logger('warn', `Horizon Launcher: Failed to kill ${proc.pid}: ${e.message}`);

        }
    }

    launchedProcesses.length = 0;
}

// Дублируем экспорт для совместимости - Citrix файл исторически содержит код всех launchers
// Примечание: это временная мера для совместимости, рекомендуется разделить на отдельные файлы
const rdpLauncher = require('./rdpLauncher');
const horizonLauncher = require('./horizonLauncher');

module.exports = {
    // RDP
    launchRdp: rdpLauncher.launchRdp,
    killAllRdpProcesses: rdpLauncher.killAllProcesses,

    // Horizon
    launchHorizon,
    killAllHorizonProcesses: killAllProcesses,

    // Citrix
    launchCitrix,
    killAllCitrixProcesses: killAllProcesses,

    // Общий killAll - убивает все процессы
    killAllProcesses
};
