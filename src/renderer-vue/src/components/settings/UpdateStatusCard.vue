<template>
  <div class="update-status-card">
    <div class="update-info">
      <span class="update-label">Текущая версия:</span>
      <span class="update-value">{{ appVersion }}</span>
    </div>

    <div v-if="updateStatus.updateAvailable && !updateStatus.updateDownloaded" class="update-available">
      <div class="update-info">
        <span class="update-label">Доступна версия:</span>
        <span class="update-value version-new">{{ updateStatus.version }}</span>
      </div>

      <div v-if="updateProgress.percent > 0" class="update-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: updateProgress.percent + '%' }"></div>
        </div>
        <span class="progress-text">{{ updateProgress.percent.toFixed(1) }}% ({{
          formatBytes(updateProgress.bytesPerSecond) }}/с)</span>
      </div>

      <button class="btn btn-primary" @click="$emit('download')" :disabled="isDownloading">
        {{ isDownloading ? 'Загрузка...' : 'Скачать обновление' }}
      </button>
    </div>

    <div v-else-if="updateStatus.updateDownloaded" class="update-ready">
      <div class="update-info">
        <span class="update-label">Обновление готово:</span>
        <span class="update-value version-ready">{{ updateStatus.version }}</span>
      </div>
      <button class="btn btn-primary" @click="$emit('install')">
        Перезагрузить и установить
      </button>
    </div>

    <div v-else class="update-check">
      <p v-if="updateError" class="update-error">{{ updateError }}</p>
      <button class="btn btn-secondary" @click="$emit('check')" :disabled="isChecking">
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
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 16px;
}

.update-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.update-label {
  font-size: 14px;
  color: var(--text-primary);
}

.update-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.update-value.version-new {
  color: var(--accent-primary);
}

.update-value.version-ready {
  color: #22c55e;
}

.update-available,
.update-ready,
.update-check {
  margin-top: 16px;
}

.update-progress {
  margin-bottom: 16px;
}

.progress-bar {
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--accent-primary);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--text-primary);
}

.update-message {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-primary);
}

.update-error {
  color: #ef4444;
  font-size: 13px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-sm);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.btn-primary {
  background: var(--accent-danger);
  color: var(--text-inverse);
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
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
