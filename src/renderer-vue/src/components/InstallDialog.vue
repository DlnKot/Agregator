<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="handleCancel">
      <div class="modal install-dialog">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="modal-close" @click="handleCancel" title="Закрыть">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-content">
          <!-- Initial state: ask to install -->
          <div v-if="state === 'ask'" class="install-ask">
            <div class="install-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <p class="install-message">
              {{ clientDisplayName }} не найден в системе.<br>
              Хотите установить его?
            </p>
          </div>

          <!-- Downloading state -->
          <div v-else-if="state === 'downloading'" class="install-downloading">
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: progress + '%' }"></div>
              </div>
              <span class="progress-text">{{ progress }}%</span>
            </div>
            <p class="install-message">Скачивание {{ clientDisplayName }}...</p>
          </div>

          <!-- Error state -->
          <div v-else-if="state === 'error'" class="install-error">
            <div class="error-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <p class="error-message">{{ errorMessage }}</p>
          </div>

          <!-- Downloaded state -->
          <div v-else-if="state === 'downloaded'" class="install-downloaded">
            <div class="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <p class="install-message">{{ clientDisplayName }} скачан. Открыть установщик?</p>
          </div>
        </div>

        <div class="modal-actions">
          <button v-if="state === 'ask'" class="btn btn-primary" @click="handleInstall">
            Установить
          </button>
          <button v-if="state === 'ask'" class="btn btn-secondary" @click="handleCancel">
            Отмена
          </button>
          <button v-if="state === 'error'" class="btn btn-primary" @click="handleRetry">
            Повторить
          </button>
          <button v-if="state === 'error'" class="btn btn-secondary" @click="handleCancel">
            Закрыть
          </button>
          <button v-if="state === 'downloaded'" class="btn btn-primary" @click="handleOpenInstaller">
            Установить
          </button>
          <button v-if="state === 'downloaded'" class="btn btn-secondary" @click="handleCancel">
            Позже
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  clientType: {
    type: String,
    required: true,
    validator: (v) => ['horizon', 'citrix'].includes(v)
  }
})

const emit = defineEmits(['close', 'installed'])

const state = ref('ask')
const progress = ref(0)
const errorMessage = ref('')
const downloadedPath = ref(null)

const clientDisplayName = computed(() => {
  return props.clientType === 'horizon' ? 'VMware Horizon Client' : 'Citrix Workspace'
})

// Cleanup for download progress listener
let removeProgressListener = null

onUnmounted(() => {
  if (removeProgressListener) {
    removeProgressListener()
  }
})

function handleCancel() {
  resetState()
  emit('close')
}

function resetState() {
  state.value = 'ask'
  progress.value = 0
  errorMessage.value = ''
  downloadedPath.value = null
}

async function handleInstall() {
  state.value = 'downloading'
  progress.value = 0

  try {
    // Set up progress listener
    if (window.api?.onDownloadProgress) {
      removeProgressListener = window.api.onDownloadProgress((data) => {
        if (data.clientType === props.clientType) {
          progress.value = data.percent
        }
      })
    }

    const result = await window.api.downloadDistribution(props.clientType)
    
    if (result && result.success) {
      downloadedPath.value = result.data?.path || result.path
      state.value = 'downloaded'
    } else {
      throw new Error(result?.error || 'Ошибка скачивания')
    }
  } catch (error) {
    errorMessage.value = error?.message || 'Сервер недоступен. Попробуйте позже.'
    state.value = 'error'
  }
}

async function handleRetry() {
  resetState()
  await handleInstall()
}

function handleOpenInstaller() {
  if (downloadedPath.value) {
    window.api.openInstaller(downloadedPath.value)
    emit('installed', downloadedPath.value)
  }
  handleCancel()
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    resetState()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-primary, #1a1a1a);
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border-color, #333);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.modal-close {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-muted, #888);
  transition: color 0.2s;
}

.modal-close:hover {
  color: var(--text-primary, #fff);
}

.modal-close svg {
  width: 20px;
  height: 20px;
}

.modal-content {
  padding: 30px 20px;
  text-align: center;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px 20px;
  justify-content: center;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #e74c3c;
  color: white;
}

.btn-primary:hover {
  background: #c0392b;
}

.btn-secondary {
  background: var(--bg-secondary, #2a2a2a);
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-color, #333);
}

.btn-secondary:hover {
  background: var(--bg-tertiary, #333);
}

.install-icon,
.error-icon,
.success-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
}

.install-icon svg,
.error-icon svg,
.success-icon svg {
  width: 100%;
  height: 100%;
}

.install-icon svg {
  stroke: #3498db;
}

.error-icon svg {
  stroke: #e74c3c;
}

.success-icon svg {
  stroke: #2ecc71;
}

.install-message {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary, #fff);
  margin: 0;
}

.error-message {
  font-size: 13px;
  color: #e74c3c;
  margin: 0;
  line-height: 1.5;
}

.progress-container {
  margin-bottom: 16px;
}

.progress-bar {
  height: 8px;
  background: var(--bg-secondary, #2a2a2a);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #3498db;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--text-muted, #888);
}
</style>
