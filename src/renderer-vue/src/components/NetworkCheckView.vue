<template>
  <div class="network-check">
    <div class="net-head">
      <div class="net-title">
        <h3>Проверка сети</h3>
        <p class="net-subtitle">Проверяем доступность сервисов через ping ({{ packets }} пакетов)</p>
      </div>
      <div class="net-meta">
        <span>Порог: <span class="mono">{{ thresholdMs }}</span> мс</span>
        <button class="btn btn-primary" type="button" @click="runAll" :disabled="runAllLoading">
          {{ runAllLoading ? 'Проверяем...' : 'Проверить все' }}
        </button>
        <button class="btn btn-secondary" type="button" @click="refreshGeo" :disabled="geoLoading">
          {{ geoLoading ? 'Обновление...' : 'Обновить гео' }}
        </button>
      </div>
    </div>

    <div v-if="geoOk && geo.countryCode !== 'RU'" class="net-alert net-alert-warning">
      <div class="net-alert-title">Возможно, у вас включен VPN</div>
      <div class="net-alert-text">
        Мы определили страну подключения как <span class="mono">{{ geo.country }} ({{ geo.countryCode }})</span>.
        Если вы не из России или у вас включен VPN, доступ к VDI может быть медленнее или нестабильным.
      </div>
    </div>

    <p v-if="globalError" class="net-error">{{ globalError }}</p>

    <div class="net-grid">
      <div class="card geo">
        <h3>Гео и провайдер</h3>
        <div v-if="geoOk" class="kv">
          <div class="row"><span class="k">IP</span><span class="v mono">{{ geo.query }}</span></div>
          <div class="row"><span class="k">Страна</span><span class="v">{{ geo.country }} ({{ geo.countryCode }})</span>
          </div>
          <div class="row"><span class="k">Регион</span><span class="v">{{ geo.regionName }}</span></div>
          <div class="row"><span class="k">Город</span><span class="v">{{ geo.city }}</span></div>
          <div class="row"><span class="k">Провайдер</span><span class="v">{{ geo.isp }}</span></div>
          <div class="row"><span class="k">Орг.</span><span class="v">{{ geo.org }}</span></div>
        </div>
        <div v-else class="muted">
          {{ geoLoading ? 'Загрузка...' : 'Не удалось получить данные ip-api' }}
          <span v-if="geoError" class="mono">({{ geoError }})</span>
        </div>
      </div>

      <div v-for="t in targets" :key="t.id" class="card host">
        <div class="host-head">
          <div class="host-left">
            <h3 class="host-name">{{ t.title }}</h3>
            <div class="host-sub muted mono">{{ t.host }}</div>
          </div>
          <span v-if="results[t.id]?.evaluation" class="badge" :class="`s-${results[t.id].evaluation.status}`">
            {{ results[t.id].evaluation.label }}
          </span>
        </div>

        <div class="host-actions">
          <button class="btn btn-primary" type="button" @click="runTarget(t)" :disabled="results[t.id]?.loading">
            {{ results[t.id]?.loading ? 'Проверка...' : t.buttonLabel }}
          </button>
          <span class="muted" v-if="results[t.id]?.lastRunAt">Последняя: {{ fmtTime(results[t.id].lastRunAt) }}</span>
        </div>

        <p v-if="results[t.id]?.error" class="net-error">{{ results[t.id].error }}</p>

        <div v-if="results[t.id]?.ping && results[t.id]?.evaluation" class="metrics">
          <div class="metric">
            <span class="k">Потери</span>
            <span class="v mono">{{ fmtLoss(results[t.id].ping.lossPercent) }}</span>
          </div>
          <div class="metric">
            <span class="k">Средняя</span>
            <span class="v mono">{{ fmtMs(results[t.id].ping.avgMs) }}</span>
          </div>
          <div class="metric">
            <span class="k">Мин/Макс</span>
            <span class="v mono">{{ fmtMinMax(results[t.id].ping.minMs, results[t.id].ping.maxMs) }}</span>
          </div>
        </div>

        <p v-if="results[t.id]?.evaluation?.recommendation" class="recommendation">
          {{ results[t.id].evaluation.recommendation }}
        </p>

        <p v-if="results[t.id]?.evaluation" class="hint" :class="hintClass(results[t.id].evaluation.status)">
          {{ hintText(results[t.id].evaluation.status) }}
        </p>

        <details v-if="results[t.id]?.ping" class="details">
          <summary>Детали</summary>
          <pre class="raw">{{ results[t.id].ping.raw || results[t.id].ping.error || 'Нет данных' }}</pre>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps({
  settings: {
    type: Object,
    default: () => ({})
  }
})

const globalError = ref('')

const geoLoading = ref(false)
const geoError = ref('')
const geo = ref(null)

const results = ref({})
const runAllLoading = ref(false)

const thresholdMs = computed(() => {
  const v = props.settings?.networkCheck?.latencyThresholdMs
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 100
})

const packets = 10

const geoOk = computed(() => geo.value?.status === 'success')

const targets = [
  { id: 'vdi', host: 'telework.alfabank.ru', title: 'VDI', buttonLabel: 'Проверить доступ до VDI' },
  { id: 'vdi_backup', host: 'telework.moscow.alfaintra.net', title: 'VDI (резерв)', buttonLabel: 'Проверить доступ до VDI РЕЗЕРВ' },
  { id: 'purms', host: 'mypc.moscow.alfaintra.net', title: 'ПУРМС', buttonLabel: 'Проверить доступ к ПУРМС' }
]

function fmtMs(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return `${n.toFixed(0)} мс`
}

function fmtLoss(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return `${n.toFixed(0)}%`
}

function fmtMinMax(min, max) {
  const n1 = Number(min)
  const n2 = Number(max)
  if (!Number.isFinite(n1) || !Number.isFinite(n2)) return '—'
  return `${n1.toFixed(0)} / ${n2.toFixed(0)}`
}

function fmtTime(ts) {
  try { return new Date(ts).toLocaleString() } catch { return '—' }
}

function hintClass(status) {
  return status === 'ok' ? 'hint-ok' : 'hint-bad'
}

function hintText(status) {
  if (status === 'ok') return '✓ Отлично! Сервис работает правильно и быстро.'
  if (status === 'high_latency') return '⚠ Медленное соединение. Сервис доступен, но может быть замедленным. Проверьте своё интернет-соединение.'
  if (status === 'loss') return '⚠ Нестабильное соединение. Некоторые пакеты теряются. Может быть проблема с сетью или маршрутизацией.'
  if (status === 'down') return '✗ Сервис недоступен. Проверьте подключение к интернету и убедитесь, что VPN включен (если требуется).'
  return '? Не удалось проверить. Попробуйте позже или обратитесь в IT Support.'
}

async function refreshGeo() {
  geoError.value = ''
  geoLoading.value = true
  try {
    if (!window.api?.networkGeo) {
      geoError.value = 'Недоступно в браузере'
      return
    }

    const res = await window.api.networkGeo()
    if (!res?.success) {
      geoError.value = res?.error || 'Ошибка'
      return
    }
    geo.value = res.data
  } catch (e) {
    geoError.value = e?.message || String(e)
  } finally {
    geoLoading.value = false
  }
}

async function runTarget(t) {
  // Трекинг метрик
  if (window.api?.trackNetworkCheck) {
    window.api.trackNetworkCheck()
  }
  
  globalError.value = ''
  // Avoid race conditions when multiple checks run in parallel.
  results.value = {
    ...results.value,
    [t.id]: { ...(results.value[t.id] || {}), loading: true, error: '' }
  }

  try {
    if (!window.api?.networkPing) {
      results.value = {
        ...results.value,
        [t.id]: { ...(results.value[t.id] || {}), loading: false, error: 'Проверка доступна только в Electron' }
      }
      return
    }

    // Ensure geo is present, but do not block checks if it fails.
    if (!geo.value && !geoLoading.value) {
      refreshGeo().catch(() => { })
    }

    const res = await window.api.networkPing(t.host, packets)
    if (!res?.success) {
      results.value = {
        ...results.value,
        [t.id]: { ...(results.value[t.id] || {}), loading: false, error: res?.error || 'Ошибка' }
      }
      return
    }

    results.value = {
      ...results.value,
      [t.id]: {
        ...(results.value[t.id] || {}),
        loading: false,
        error: '',
        ping: res.data.ping,
        evaluation: res.data.evaluation,
        lastRunAt: Date.now()
      }
    }
  } catch (e) {
    results.value = {
      ...results.value,
      [t.id]: { ...(results.value[t.id] || {}), loading: false, error: e?.message || String(e) }
    }
  }
}

async function runAll() {
  globalError.value = ''
  runAllLoading.value = true
  try {
    // Run all checks in parallel; per-target updates are race-safe.
    await Promise.allSettled(targets.map(t => runTarget(t)))
  } finally {
    runAllLoading.value = false
  }
}

onMounted(() => {
  // Geo is lightweight; ping checks are only manual via buttons.
  refreshGeo().catch(() => { })
})
</script>

<style scoped>
.network-check {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
}

.net-alert {
  border-radius: var(--radius);
  border: 1px solid rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.10);
  padding: 12px 14px;
}

.net-alert-title {
  font-weight: 750;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.net-alert-text {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.net-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.net-meta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.net-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 750;
  color: var(--text-primary);
}

.net-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.net-error {
  color: #7f1d1d;
  font-size: 13px;
  padding: 10px 12px;
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.10);
  border-radius: var(--radius);
}

.hint {
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.35;
}

.hint-ok {
  color: #065f46;
  border: 1px solid rgba(16, 185, 129, 0.45);
  background: rgba(16, 185, 129, 0.12);
}

.hint-bad {
  color: #7f1d1d;
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.10);
}

html[data-theme="dark"] .net-error,
html[data-theme="dark"] .hint-bad {
  color: rgba(255, 255, 255, 0.88);
  border-color: rgba(239, 68, 68, 0.42);
  background: rgba(239, 68, 68, 0.14);
}

html[data-theme="dark"] .hint-ok {
  color: rgba(255, 255, 255, 0.90);
  border-color: rgba(16, 185, 129, 0.45);
  background: rgba(16, 185, 129, 0.16);
}

.net-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  overflow: auto;
  /* Give shadows breathing room so they don't clip on last row */
  padding: 2px 8px 18px 2px;
}

/* Local button styles (App.vue button styles are scoped and don't apply here) */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-xl);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  user-select: none;
}

.btn-primary {
  background: var(--accent-danger);
  color: var(--text-inverse);
  box-shadow: var(--shadow);
}

.btn-primary:hover {
  background: var(--bg-tertiary);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
  color: var(--text-inverse);
  border-color: var(--border-light);
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (min-width: 860px) {
  .net-grid {
    grid-template-columns: 1fr 1fr;
  }

  .card.host {
    grid-column: span 1;
  }

  .card.geo,
  .card.summary {
    grid-column: span 1;
  }
}

.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 16px;
  box-shadow: var(--shadow);
}

.card h3 {
  font-size: 14px;
  font-weight: 650;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.card.warning {
  border-color: rgba(245, 158, 11, 0.40);
  background: rgba(245, 158, 11, 0.10);
}

.warning-text {
  margin: 0;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.45;
}

.muted {
  color: var(--text-muted);
  font-size: 13px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.kv .row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--border-color);
}

.kv .row:last-child {
  border-bottom: none;
}

.kv .k {
  color: var(--text-secondary);
  font-size: 12px;
}

.kv .v {
  color: var(--text-primary);
  font-size: 12px;
  text-align: right;
}

.summary-line {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.badge.s-ok {
  border-color: rgba(16, 185, 129, 0.55);
  background: rgba(16, 185, 129, 0.18);
  color: var(--text-primary);
}

.badge.s-high_latency {
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.10);
  color: var(--text-primary);
}

.badge.s-loss,
.badge.s-down,
.badge.s-error {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.10);
  color: var(--text-primary);
}

.host-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.host-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.host-name {
  font-size: 13px;
  font-weight: 700;
  margin: 0;
}

.host-sub {
  font-size: 11px;
}

.host-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.metric {
  padding: 10px;
  border-radius: var(--radius);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.metric .k {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.metric .v {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 650;
}

.recommendation {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 10px;
}

.details summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--text-muted);
}

.raw {
  margin-top: 10px;
  padding: 12px;
  border-radius: var(--radius);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  overflow: auto;
  max-height: 220px;
  font-size: 11px;
  color: var(--text-primary);
}

.empty {
  padding: 14px;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-xl);
  background: var(--bg-primary);
}
</style>
