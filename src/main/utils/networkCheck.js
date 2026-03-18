const { spawn } = require('child_process');
const { log: logger } = require('./logger');

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clampInt(n, min, max) {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function parseUnixPing(output) {
  const text = String(output || '');
  const result = {
    sent: null,
    received: null,
    lossPercent: null,
    minMs: null,
    avgMs: null,
    maxMs: null
  };

  // packets transmitted, packets received, X% packet loss
  // macOS: "10 packets transmitted, 10 packets received, 0.0% packet loss"
  // linux: "10 packets transmitted, 10 received, 0% packet loss"
  let m = text.match(/(\d+)\s+packets\s+transmitted,\s+(\d+)\s+(?:packets\s+)?received,\s+([\d.]+)%\s+packet\s+loss/i);
  if (!m) {
    m = text.match(/(\d+)\s+packets\s+transmitted,\s+(\d+)\s+received,\s+([\d.]+)%\s+packet\s+loss/i);
  }
  if (m) {
    result.sent = toNumber(m[1]);
    result.received = toNumber(m[2]);
    result.lossPercent = toNumber(m[3]);
  }

  // rtt min/avg/max/mdev = 10.123/20.456/30.789/1.234 ms
  // macOS: round-trip min/avg/max/stddev = ...
  m = text.match(/(?:round-trip|rtt)\s+min\/avg\/max\/(?:stddev|mdev)\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)\s*ms/i);
  if (m) {
    result.minMs = toNumber(m[1]);
    result.avgMs = toNumber(m[2]);
    result.maxMs = toNumber(m[3]);
  }

  return result;
}

function parseWindowsPing(output) {
  const text = String(output || '');
  const result = {
    sent: null,
    received: null,
    lossPercent: null,
    minMs: null,
    avgMs: null,
    maxMs: null
  };

  // Parse per-reply times as a robust fallback (works even if summary is missing).
  // Examples:
  // "Reply from ...: bytes=32 time=12ms TTL=..."
  // "Ответ от ...: число байт=32 время=12мс TTL=..."
  const times = [];
  const timeRe = /(?:\btime|\bвремя)\s*(?:=|<)\s*(\d+)\s*(?:ms|мс)/gi;
  let tm;
  while ((tm = timeRe.exec(text)) !== null) {
    const t = toNumber(tm[1]);
    if (t !== null) times.push(t);
  }

  // English:
  // Packets: Sent = 10, Received = 10, Lost = 0 (0% loss),
  // Russian:
  // Пакетов: отправлено = 10, получено = 10, потеряно = 0 (0% потерь),
  let m = text.match(/Sent\s*=\s*(\d+)[^\d]+Received\s*=\s*(\d+)[^\d]+Lost\s*=\s*(\d+)[^\(]*\((\d+)%\s*loss\)/i);
  if (!m) {
    m = text.match(/отправлено\s*=\s*(\d+)[^\d]+получено\s*=\s*(\d+)[^\d]+потеряно\s*=\s*(\d+)[^\(]*\((\d+)%\s*потер/i);
  }
  if (m) {
    result.sent = toNumber(m[1]);
    result.received = toNumber(m[2]);
    result.lossPercent = toNumber(m[4]);
  } else {
    // Fallback: look for "(X% loss)" or "(X% потерь)"
    const lm = text.match(/\((\d+)%\s*(?:loss|потер)[^)]+\)/i);
    if (lm) result.lossPercent = toNumber(lm[1]);
  }

  // Fallback: count reply lines when summary can't be parsed.
  // Useful when ping output is localized/trimmed or the summary block is missing.
  if (result.received === null) {
    const replyMatches = text.match(/(?:^|\r?\n)\s*(?:Reply from|Ответ от)\b/gi);
    if (replyMatches && replyMatches.length) {
      result.received = replyMatches.length;
    }
  }

  // If we got per-reply times, treat that as received count (most reliable).
  if (result.received === null && times.length) {
    result.received = times.length;
  }

  // English:
  // Minimum = 1ms, Maximum = 2ms, Average = 1ms
  // Russian:
  // Минимальное = 1мсек, Максимальное = 2 мсек, Среднее = 1 мсек
  m = text.match(/Minimum\s*=\s*(\d+)\s*ms[^\d]+Maximum\s*=\s*(\d+)\s*ms[^\d]+Average\s*=\s*(\d+)\s*ms/i);
  if (!m) {
    m = text.match(/Миним\w*\s*=\s*(\d+)\s*м?с?ек[^\d]+Максим\w*\s*=\s*(\d+)\s*м?с?ек[^\d]+Средн\w*\s*=\s*(\d+)\s*м?с?ек/i);
  }
  if (m) {
    result.minMs = toNumber(m[1]);
    result.maxMs = toNumber(m[2]);
    result.avgMs = toNumber(m[3]);
  }

  // Fallback: compute min/avg/max from per-reply times.
  if ((result.minMs === null || result.avgMs === null || result.maxMs === null) && times.length) {
    let min = times[0];
    let max = times[0];
    let sum = 0;
    for (const t of times) {
      if (t < min) min = t;
      if (t > max) max = t;
      sum += t;
    }
    result.minMs = result.minMs ?? min;
    result.maxMs = result.maxMs ?? max;
    result.avgMs = result.avgMs ?? (sum / times.length);
  }

  return result;
}

function runPing(host, count = 10) {
  const packets = clampInt(count, 1, 50);
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const safeHost = String(host || '').trim();
    
    // Улучшенная валидация хоста - предотвращение shell injection
    // Принимаем: hostname, IPv4, IPv6
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!safeHost || 
        safeHost.length > 253 ||
        (!ipv4Regex.test(safeHost) && !ipv6Regex.test(safeHost) && !hostnameRegex.test(safeHost))) {
      resolve({
        host: safeHost,
        ok: false,
        error: 'Некорректный хост для ping',
        durationMs: Date.now() - startedAt
      });
      return;
    }
    let cmd = 'ping';
    let args = [];

    if (process.platform === 'win32') {
      // Windows ping output is often in OEM code page (e.g. CP866 on RU systems).
      // Force UTF-8 for stable display/parsing.
      // -n count, -w timeout-per-reply(ms)
      const pingCmd = `chcp 65001>nul & ping -n ${packets} -w 1000 ${safeHost}`;
      // Use ComSpec to reliably locate cmd.exe even if PATH is restricted.
      cmd = process.env.ComSpec || process.env.comspec || 'cmd.exe';
      args = ['/d', '/s', '/c', pingCmd];
    } else {
      args = ['-c', String(packets), safeHost];
    }

    logger('info', `NetworkCheck: ping ${safeHost} (${packets} packets)`);

    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: true });
    child.on('error', (err) => {
      // Fallback for Windows environments where cmd.exe can't be spawned for some reason.
      if (process.platform === 'win32') {
        try {
          const pingChild = spawn('ping', ['-n', String(packets), '-w', '1000', safeHost], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: false,
            windowsHide: true
          });

          let out = '';
          let errOut = '';
          pingChild.stdout.on('data', (d) => { out += d.toString(); });
          pingChild.stderr.on('data', (d) => { errOut += d.toString(); });

          const timeout2 = setTimeout(() => {
            try { pingChild.kill('SIGKILL'); } catch { /* ignore */ }
          }, 20000);

          pingChild.on('close', (code) => {
            clearTimeout(timeout2);
            const parsed = parseWindowsPing(out + '\n' + errOut);
            const sent = parsed.sent ?? packets;
            const received = parsed.received ?? null;
            const lossPercent = parsed.lossPercent ?? (received === null ? null : Math.max(0, Math.min(100, ((sent - received) / sent) * 100)));

            resolve({
              host: safeHost,
              ok: true,
              exitCode: typeof code === 'number' ? code : null,
              durationMs: Date.now() - startedAt,
              sent,
              received,
              lossPercent,
              minMs: parsed.minMs,
              avgMs: parsed.avgMs,
              maxMs: parsed.maxMs,
              raw: (out + '\n' + errOut).trim()
            });
          });
          return;
        } catch { /* ignore */ }
      }

      resolve({
        host: safeHost,
        ok: false,
        error: err.message,
        durationMs: Date.now() - startedAt
      });
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    const timeout = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
    }, 20000);

    child.on('close', (code) => {
      clearTimeout(timeout);

      const parsed = process.platform === 'win32' ? parseWindowsPing(stdout + '\n' + stderr) : parseUnixPing(stdout + '\n' + stderr);
      const sent = parsed.sent ?? packets;
      const received = parsed.received ?? null;
      const lossPercent = parsed.lossPercent ?? (received === null ? null : Math.max(0, Math.min(100, ((sent - received) / sent) * 100)));

      resolve({
        host: safeHost,
        ok: timedOut ? false : true,
        timedOut,
        exitCode: typeof code === 'number' ? code : null,
        durationMs: Date.now() - startedAt,
        sent,
        received,
        lossPercent,
        minMs: parsed.minMs,
        avgMs: parsed.avgMs,
        maxMs: parsed.maxMs,
        raw: (stdout + '\n' + stderr).trim()
      });
    });
  });
}

function evaluatePing(pingResult, latencyThresholdMs = 100) {
  const threshold = clampInt(latencyThresholdMs, 1, 10000);

  if (!pingResult || pingResult.ok !== true) {
    return {
      status: 'error',
      label: 'Ошибка',
      recommendation: 'Не удалось выполнить ping. Проверьте доступность команды ping и DNS.',
      thresholdMs: threshold
    };
  }

  const received = toNumber(pingResult.received);
  const loss = toNumber(pingResult.lossPercent);
  const avg = toNumber(pingResult.avgMs);

  if (received !== null && received <= 0) {
    return {
      status: 'down',
      label: 'Недоступен',
      recommendation: 'Сервер не отвечает. Проверьте интернет, DNS, корпоративный VPN/прокси и доступность сервиса.',
      thresholdMs: threshold
    };
  }

  if (loss !== null && loss > 0) {
    return {
      status: 'loss',
      label: 'Потери пакетов',
      recommendation: 'Есть потери. Рекомендации: попробуйте проводное подключение, перезапустите роутер, проверьте Wi‑Fi сигнал/канал, отключите тяжелые загрузки.',
      thresholdMs: threshold
    };
  }

  if (avg !== null && avg > threshold) {
    return {
      status: 'high_latency',
      label: 'Нестабильно',
      recommendation: 'Высокая задержка. Рекомендации: проверьте загрузку сети, попробуйте провод, отключите фоновые загрузки/стриминг.',
      thresholdMs: threshold
    };
  }

  return {
    status: 'ok',
    label: 'OK',
    recommendation: '',
    thresholdMs: threshold
  };
}

async function fetchGeo() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('http://ip-api.com/json', { signal: controller.signal });
    const data = await res.json();
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function runFullNetworkCheck({ hosts, count = 10, latencyThresholdMs = 100 } = {}) {
  const targets = Array.isArray(hosts) && hosts.length
    ? hosts
    : ['telework.alfabank.ru', 'telework.moscow.alfaintra.net', 'mypc.moscow.alfaintra.net'];

  const [geoSettled, ...pingsSettled] = await Promise.allSettled([
    fetchGeo(),
    ...targets.map(h => runPing(h, count))
  ]);

  const geo = geoSettled.status === 'fulfilled'
    ? geoSettled.value
    : { status: 'fail', message: geoSettled.reason?.message || String(geoSettled.reason || 'geo_failed') };

  const results = pingsSettled.map((s, idx) => {
    const host = targets[idx];
    const ping = s.status === 'fulfilled'
      ? s.value
      : { host, ok: false, error: s.reason?.message || String(s.reason || 'ping_failed') };
    const evald = evaluatePing(ping, latencyThresholdMs);
    return { host, ping, evaluation: evald };
  });

  // Summary: worst status wins
  const order = { error: 0, down: 1, loss: 2, high_latency: 3, ok: 4 };
  let worst = 'ok';
  for (const r of results) {
    const s = r.evaluation?.status || 'error';
    if (order[s] < order[worst]) worst = s;
  }

  const summaryLabel = ({
    ok: 'Сеть в норме',
    high_latency: 'Есть проблемы со стабильностью',
    loss: 'Обнаружены потери пакетов',
    down: 'Часть сервисов недоступна',
    error: 'Ошибка проверки сети'
  })[worst] || 'Проверка сети';

  return {
    geo,
    results,
    summary: { status: worst, label: summaryLabel },
    meta: { count: clampInt(count, 1, 50), latencyThresholdMs: clampInt(latencyThresholdMs, 1, 10000) }
  };
}

module.exports = {
  runPing,
  evaluatePing,
  fetchGeo,
  runFullNetworkCheck
};
