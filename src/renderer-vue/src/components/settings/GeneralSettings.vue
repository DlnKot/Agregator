<template>
  <div class="settings-section">
    <div class="settings-group">
      <div class="group-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Учётная запись</span>
      </div>
      <div class="group-body">
        <div class="form-group">
          <label for="user-domain">Домен</label>
          <select id="user-domain" v-model="localSettings.user.domain">
            <option value="MOSCOW">MOSCOW</option>
            <option value="REGIONS">REGIONS</option>
            <option value="E-BUSINESS">E-BUSINESS</option>
          </select>
        </div>

        <div class="form-group">
          <label for="user-username">Имя пользователя</label>
          <input type="text" id="user-username" v-model="localSettings.user.username" placeholder="ivanov">
        </div>

        <div class="login-preview">
          <span class="login-preview-label">Итоговый логин</span>
          <span class="login-preview-value">{{ previewUsername.toUpperCase() }}</span>
        </div>
      </div>
    </div>

    <div class="settings-group">
      <div class="group-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span>Общие настройки</span>
      </div>
      <div class="group-body">
        <div class="form-group">
          <label for="general-tray">Сворачивать в трей</label>
          <label class="toggle">
            <input type="checkbox" id="general-tray" v-model="localSettings.general.minimizeToTray">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-group">
      <div class="group-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        <span>Сеть</span>
      </div>
      <div class="group-body">
        <div class="form-group">
          <label for="net-latency-threshold">Порог задержки (мс)</label>
          <select
            id="net-latency-threshold"
            v-model.number="localSettings.networkCheck.latencyThresholdMs"
          >
            <option :value="50">50</option>
            <option :value="80">80</option>
            <option :value="100">100</option>
            <option :value="150">150</option>
            <option :value="200">200</option>
            <option :value="300">300</option>
            <option :value="500">500</option>
          </select>
          <small>Если средняя задержка (avg) выше порога, будет показано предупреждение о нестабильной связи</small>
        </div>
      </div>
    </div>

    <div class="settings-group">
      <div class="group-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
        <span>Стандартные подключения</span>
      </div>
      <div class="group-body">
        <div class="form-group">
          <button class="btn btn-secondary" type="button" @click="$emit('reset-default-connections')">
            Сбросить к заводским
          </button>
          <small>Сбросит только переименования стандартных подключений. Пользовательские подключения не затрагиваются.</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

defineEmits(['reset-default-connections'])

const localSettings = computed(() => props.settings)

const previewUsername = computed(() => {
  const u = localSettings.value.user
  if (u?.domain && u?.username) {
    return `${u.domain}\\${u.username}`
  }
  return u?.username || 'не указан'
})
</script>

<style scoped>
.login-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  transition: var(--transition);
}

.login-preview-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.login-preview-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}
</style>
