<template>
  <div class="network-check-container">
    <div class="network-check">
      <!-- Loading overlay -->
      <div v-if="runAllLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span>Проверка сети...</span>
      </div>

      <div class="net-head">
        <div class="net-title">
          <h3>Проверка сети</h3>
          <p class="net-subtitle">Проверка доступности сервисов через ping ({{ packets }} пакетов)</p>
        </div>
        <div class="net-meta">
          <button class="btn btn-check-all" type="button" @click="runAll" :disabled="runAllLoading">
            {{ runAllLoading ? 'Проверяем...' : 'Проверить все' }}
          </button>
        </div>
      </div>

      <!-- Geo info — always visible -->
      <div class="geo-bar" v-if="geoOk">
        <span class="geo-flag">{{ geo.countryCode === 'RU' ? '🇷🇺' : '🌍' }}</span>
        <span class="geo-text">
          {{ geo.country }} ({{ geo.countryCode }})
          <span v-if="geo.city"> · {{ geo.city }}</span>
          <span v-if="geo.isp"> · {{ geo.isp }}</span>
        </span>
        <button class="btn btn-geo" type="button" @click="refreshGeo" :disabled="geoLoading">
          {{ geoLoading ? '...' : '↻' }}
        </button>
      </div>
      <div class="geo-bar geo-loading" v-else-if="geoLoading">
        <span class="geo-text muted">Определение местоположения...</span>
      </div>
      <div class="geo-bar geo-error" v-else-if="geoError">
        <span class="geo-text">Не удалось определить местоположение</span>
      </div>

      <!-- VPN warning -->
      <div v-if="geoOk && geo.countryCode !== 'RU'" class="net-alert net-alert-warning">
        <div class="net-alert-title">Возможно, у вас включен VPN</div>
        <div class="net-alert-text">
          Мы определили страну подключения как <span class="mono">{{ geo.country }} ({{ geo.countryCode }})</span>.
          Если вы не из России или у вас включен VPN, доступ к VDI может быть медленнее или нестабильным.
        </div>
      </div>

      <p v-if="globalError" class="net-error">{{ globalError }}</p>

      <div class="net-grid">
        <div v-for="t in targets" :key="t.id" class="card host">
          <div class="host-head">
            <div class="host-left">
              <h3 class="host-name">{{ t.title }}</h3>
              <div class="host-sub muted mono">{{ t.host }}</div>
            </div>
            <span v-if="results[t.id]?.evaluation" class="badge" :class="`s-${results[t.id].evaluation.status}`">
              {{ results[t.id].evaluation.label }}
            </span>
            <span v-else class="badge s-none">—</span>
          </div>

          <div class="host-actions">
            <button class="btn-check-target" type="button" @click="runTarget(t)" :disabled="results[t.id]?.loading">
              {{ results[t.id]?.loading ? 'Проверка...' : t.buttonLabel }}
            </button>
            <span class="muted" v-if="results[t.id]?.lastRunAt">Последняя: {{ fmtTime(results[t.id].lastRunAt) }}</span>
          </div>

          <p v-if="results[t.id]?.error" class="net-error">{{ results[t.id].error }}</p>

          <div v-if="results[t.id]?.ping" class="ping-details">
            <p v-if="results[t.id]?.evaluation?.recommendation" class="recommendation">
              {{ results[t.id].evaluation.recommendation }}
            </p>
            <div class="metrics">
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
            <details v-if="results[t.id]?.ping?.raw" class="details-raw">
              <summary class="details-summary">Вывод ping</summary>
              <pre class="raw">{{ results[t.id].ping.raw || 'Нет данных' }}</pre>
            </details>
          </div>
        </div>
      </div>

      <details class="details geo-details" v-if="geoOk || geoError || geoLoading">
        <summary class="details-summary">Геоданные</summary>
        <div class="details-content">
          <div class="geo-info">
            <div v-if="geoOk" class="kv">
              <div class="row"><span class="k">IP</span><span class="v mono">{{ geo.query }}</span></div>
              <div class="row"><span class="k">Страна</span><span class="v">{{ geo.country }} ({{ geo.countryCode }})</span></div>
              <div class="row"><span class="k">Регион</span><span class="v">{{ geo.regionName }}</span></div>
              <div class="row"><span class="k">Город</span><span class="v">{{ geo.city }}</span></div>
              <div class="row"><span class="k">Провайдер</span><span class="v">{{ geo.isp }}</span></div>
              <div class="row"><span class="k">Орг.</span><span class="v">{{ geo.org }}</span></div>
            </div>
            <div v-else-if="geoLoading" class="muted">Загрузка...</div>
            <div v-else class="muted">
              Не удалось получить данные ip-api
              <span v-if="geoError" class="mono">({{ geoError }})</span>
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { networkApi, networkGeo, trackingApi } from '../api'

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
  { id: 'vdi', host: 'telework.alfabank.ru', title: 'VDI', buttonLabel: 'Проверить доступ' },
  { id: 'vdi_backup', host: 'telework.moscow.alfaintra.net', title: 'VDI (резерв)', buttonLabel: 'Проверить доступ' },
  { id: 'purms', host: 'mypc.moscow.alfaintra.net', title: 'ПУРМС', buttonLabel: 'Проверить доступ' }
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

async function refreshGeo() {
  geoError.value = ''
  geoLoading.value = true
  try {
    const data = await networkGeo()
    geo.value = data
  } catch (e) {
    const msg = e?.message || String(e)
    console.error('[geo] error', msg)
    geoError.value = msg
  } finally {
    geoLoading.value = false
  }
}

async function runTarget(t) {
  trackingApi.trackNetworkCheck()

  globalError.value = ''
  results.value = {
    ...results.value,
    [t.id]: { ...(results.value[t.id] || {}), loading: true, error: '' }
  }

  try {
    if (!geo.value && !geoLoading.value) {
      refreshGeo().catch(() => { })
    }

    const result = await networkApi.ping(t.host, packets, thresholdMs.value)
    results.value = {
      ...results.value,
      [t.id]: {
        ...(results.value[t.id] || {}),
        loading: false,
        error: '',
        ping: result.ping,
        evaluation: result.evaluation,
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
  await nextTick()
  await new Promise(r => setTimeout(r, 50))
  try {
    for (const t of targets) {
      await runTarget(t)
    }
  } finally {
    runAllLoading.value = false
  }
}

onMounted(() => {
  refreshGeo().catch(() => { })
})
</script>

<style scoped>
.network-check-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: var(--bg-primary);
  border-radius: 16px;
  padding: 20px;
  overflow: hidden;
  position: relative;
}

.network-check {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
  position: relative;
}

/* Geo bar */
.geo-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.geo-flag {
  font-size: 18px;
  line-height: 1;
}

.geo-text {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
}

.geo-loading {
  opacity: 0.7;
}

.geo-error {
  opacity: 0.6;
}

.btn-geo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-inverse);
  font-size: 16px;
  cursor: pointer;
  transition: var(--transition);
  flex-shrink: 0;
}

.btn-geo:hover {
  background: var(--bg-hover);
}

.btn-geo:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Alert */
.net-alert {
  border-radius: 16px;
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

/* Header */
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
  color: var(--text-primary);
  font-size: 13px;
  padding: 10px 12px;
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.10);
  border-radius: 16px;
}

/* Grid */
.net-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  overflow: auto;
  padding: 2px 8px 18px 2px;
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

/* Card */
.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
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

/* Loading overlay */
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--bg-primary);
  border-radius: 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-color);
  border-top-color: var(--text-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* "Проверить все" button — prominent style like "Добавить подключение" */
.btn-check-all {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  user-select: none;
  white-space: nowrap;
  background: var(--bg-tertiary);
  color: var(--text-inverse);
}

.btn-check-all:hover {
  background: var(--bg-hover);
}

.btn-check-all:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* Individual target check button — BottomSlot glassmorphism */
.btn-check-target {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 4px 12px;
  gap: 2px;
  min-width: 80px;
  height: 32px;
  min-height: 32px;
  background: rgba(15, 25, 55, 0.1);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  user-select: none;
  white-space: nowrap;
  flex: none;
  order: 2;
  flex-grow: 0;
}

.btn-check-target:hover {
  background: rgba(15, 25, 55, 0.18);
}

.btn-check-target:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

html[data-theme="dark"] .btn-check-target {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.06);
}

html[data-theme="dark"] .btn-check-target:hover {
  background: rgba(255, 255, 255, 0.14);
}

/* Host card */
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

/* Badge */
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
  flex-shrink: 0;
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

.badge.s-none {
  opacity: 0.4;
}

/* Metrics */
.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.metric {
  padding: 10px;
  border-radius: 8px;
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
  line-height: 1.4;
}

/* Ping details — always visible after check */
.ping-details {
  margin-top: 12px;
  padding: 12px;
  border-radius: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

/* Details / Collapse */
.details {
  margin-top: 8px;
}

.details-summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--text-muted);
  padding: 6px 8px;
  border-radius: 8px;
  user-select: none;
  display: inline-block;
}

.details-summary:hover {
  background: var(--item-hover-bg);
  color: var(--text-primary);
}

.details-content {
  margin-top: 8px;
  padding: 12px;
  border-radius: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.details-raw {
  margin-top: 8px;
}

.geo-details {
  margin-top: 0;
}

.geo-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Key-value rows */
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

/* Raw output */
.raw {
  padding: 12px;
  border-radius: 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  overflow: auto;
  max-height: 220px;
  font-size: 11px;
  color: var(--text-primary);
  margin-top: 8px;
  white-space: pre-wrap;
}

.empty {
  padding: 14px;
  border: 1px dashed var(--border-color);
  border-radius: 16px;
  background: var(--bg-primary);
}
</style>
