<template>
  <div class="update-status-card">
    <div class="version-row">
      <span class="version-label">Текущая версия</span>
      <span class="version-badge">{{ appVersion }}</span>
    </div>

    <div v-if="updateStatus.updateAvailable && !updateStatus.updateDownloaded" class="update-section">
      <div class="divider"></div>
      <div class="version-row">
        <span class="version-label">Доступна версия</span>
        <span class="version-badge version-new">{{ updateStatus.version }}</span>
      </div>

      <div v-if="updateProgress.percent > 0" class="update-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: updateProgress.percent + '%' }"></div>
        </div>
        <span class="progress-text">{{ updateProgress.percent.toFixed(1) }}% ({{
          formatBytes(updateProgress.bytesPerSecond) }}/с)</span>
      </div>

      <button class="action-btn btn-download" @click="$emit('download')" :disabled="isDownloading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {{ isDownloading ? 'Загрузка...' : 'Скачать обновление' }}
      </button>
    </div>

    <div v-else-if="updateStatus.updateDownloaded" class="update-section">
      <div class="divider"></div>
      <div class="version-row">
        <span class="version-label">Обновление готово</span>
        <span class="version-badge version-ready">{{ updateStatus.version }}</span>
      </div>
      <button class="action-btn btn-install" @click="$emit('install')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polyline points="23 6 13.5 15.5 8.5 10.5"/>
          <polyline points="17 6 23 6 23 12"/>
          <path d="M20 14.66V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8"/>
        </svg>
        Перезагрузить и установить
      </button>
    </div>

    <div v-else class="update-section">
      <div class="divider"></div>
      <div v-if="updateError" class="update-error">{{ updateError }}</div>
      <button class="action-btn btn-check" @click="$emit('check')" :disabled="isChecking">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        {{ isChecking ? 'Проверка...' : 'Проверить обновления' }}
      </button>
      <p v-if="!updateStatus.updateAvailable && !isChecking && !updateError" class="update-message">
        У вас установлена последняя версия
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  appVersion: {
    type: String,
    default: ''
  },
  updateStatus: {
    type: Object,
    default: () => ({})
  },
  updateProgress: {
    type: Object,
    default: () => ({})
  },
  updateError: {
    type: String,
    default: null
  },
  isChecking: {
    type: Boolean,
    default: false
  },
  isDownloading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['check', 'download', 'install'])

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<style scoped>
.update-status-card {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.version-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.version-label {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.version-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.version-badge.version-new {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  background: rgba(37, 99, 235, 0.08);
}

.version-badge.version-ready {
  color: var(--accent-success);
  border-color: var(--accent-success);
  background: rgba(16, 185, 129, 0.08);
}

.divider {
  height: 1px;
  background: var(--border-color);
  margin: 16px 0;
}

.update-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.update-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-bar {
  height: 6px;
  background: var(--bg-primary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-primary);
  transition: width 0.3s ease;
  border-radius: 3px;
}

.progress-text {
  font-size: 12px;
  color: var(--text-muted);
}

.update-message {
  font-size: 13px;
  color: var(--accent-success);
  font-weight: 500;
}

.update-error {
  color: var(--accent-danger);
  font-size: 13px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-sm);
  line-height: 1.4;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  width: fit-content;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-download {
  background: var(--accent-primary);
  color: #fff;
}

.btn-download:hover:not(:disabled) {
  background: var(--accent-primary-hover);
}

.btn-install {
  background: var(--accent-success);
  color: #fff;
}

.btn-install:hover:not(:disabled) {
  background: #059669;
}

.btn-check {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-check:hover:not(:disabled) {
  background: var(--bg-tertiary);
  color: var(--text-inverse);
  border-color: var(--border-light);
}
</style>
