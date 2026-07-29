<template>
  <Teleport to="body">
    <div v-if="visible" class="dev-overlay" @click.self="close">
      <div class="dev-panel">
        <div class="dev-header">
          <h3>Dev Panel</h3>
          <button class="dev-close" @click="close">&times;</button>
        </div>
        <div class="dev-body">
          <p class="dev-hint">Нажми <kbd>Ctrl+Shift+D</kbd> чтобы открыть/закрыть</p>
          <div class="dev-section">
            <h4>Модальные окна</h4>
            <div class="dev-buttons">
              <button class="dev-btn" @click="$emit('show', 'firstrun')">First Run</button>
              <button class="dev-btn" @click="$emit('show', 'connection')">Новое подключение</button>
              <button class="dev-btn" @click="$emit('show', 'vpn')">VPN</button>
              <button class="dev-btn" @click="$emit('show', 'rudesktop')">RuDesktop</button>
              <button class="dev-btn" @click="$emit('show', 'install')">Install Dialog</button>
              <button class="dev-btn" @click="$emit('show', 'achat')">A-Chat</button>
              <button class="dev-btn" @click="$emit('show', 'tolk')">Толк</button>
            </div>
          </div>
          <div class="dev-section">
            <h4>Виджеты сайдбара</h4>
            <div class="dev-buttons">
              <button class="dev-btn" @click="$emit('show', 'rudesktop-status')">RuDesktop статус</button>
              <button class="dev-btn" @click="$emit('show', 'vpn-status')">VPN статус</button>
            </div>
          </div>
          <div class="dev-section">
            <h4>Настройки (dev)</h4>
            <div class="dev-setting">
              <label for="dev-latency">Порог задержки (мс)</label>
              <select id="dev-latency" v-model.number="latencyThreshold" @change="saveThreshold">
                <option :value="50">50</option>
                <option :value="80">80</option>
                <option :value="100">100</option>
                <option :value="150">150</option>
                <option :value="200">200</option>
                <option :value="300">300</option>
                <option :value="500">500</option>
              </select>
              <span class="dev-setting-hint">Перезагрузите настройки в UI чтобы увидеть изменения</span>
            </div>
          </div>
          <div class="dev-section">
            <h4>Информация</h4>
            <div class="dev-info">
              <div><strong>Платформа:</strong> {{ platform }}</div>
              <div><strong>Версия:</strong> {{ version }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { appApi, settingsApi } from '../api'

const props = defineProps({
  visible: Boolean,
})

const emit = defineEmits(['close', 'show'])

const platform = ref('—')
const version = ref('—')
const latencyThreshold = ref(100)

async function loadThreshold() {
  try {
    const s = await settingsApi.get()
    if (s?.networkCheck?.latencyThresholdMs != null) {
      latencyThreshold.value = s.networkCheck.latencyThresholdMs
    }
  } catch (e) {
    // ignore
  }
}

async function saveThreshold() {
  try {
    const s = await settingsApi.get()
    if (!s.networkCheck) s.networkCheck = {}
    s.networkCheck.latencyThresholdMs = latencyThreshold.value
    await settingsApi.save(s)
  } catch (e) {
    console.error('DevPanel: failed to save threshold', e)
  }
}

function close() {
  emit('close')
}

watch(() => props.visible, (v) => {
  if (v) loadThreshold()
})

onMounted(async () => {
  try {
    platform.value = await appApi.getPlatform()
  } catch (e) { /* ignore */ }
  try {
    version.value = await appApi.getVersion()
  } catch (e) { /* ignore */ }
})
</script>

<style scoped>
.dev-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.dev-panel {
  background: #1c1c1e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  color: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.dev-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.dev-header h3 {
  margin: 0;
  font-size: 16px;
}

.dev-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 22px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.dev-close:hover {
  color: #fff;
}

.dev-body {
  padding: 16px 20px;
}

.dev-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 16px;
}

.dev-hint kbd {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.dev-section {
  margin-bottom: 16px;
}

.dev-section h4 {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dev-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dev-btn {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: 150ms ease;
}

.dev-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.dev-setting {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dev-setting label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.dev-setting select {
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  max-width: 120px;
}

.dev-setting-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  font-style: italic;
}

.dev-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.8;
}
</style>
