<template>
  <div class="settings-container">
    <div class="settings-tabs">
      <button v-for="tab in tabs" :key="tab.id" class="settings-tab" :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id">
        {{ tab.label }}
      </button>
    </div>

    <div class="settings-sections">
      <!-- User Settings -->
      <div v-if="activeTab === 'user'" class="settings-section">
        <h3>Учётная запись</h3>

        <div class="form-group">
          <label for="user-domain">Домен</label>
          <select id="user-domain" v-model="localSettings.user.domain" required>
            <option value="MOSCOW">MOSCOW</option>
            <option value="REGIONS">REGIONS</option>
            <option value="E-BUSINESS">E-BUSINESS</option>
          </select>
        </div>

        <div class="form-group">
          <label for="user-username">Имя пользователя</label>
          <input type="text" id="user-username" v-model="localSettings.user.username" placeholder="ivanov">
        </div>

        <p class="preview-label">Итоговый логин: <strong>{{ previewUsername.toUpperCase() }}</strong></p>
      </div>

      <!-- RDP Settings -->
      <div v-if="activeTab === 'rdp'" class="settings-section">
        <h3>Настройки RDP</h3>

        <div class="form-group">
          <label for="rdp-resolution">Разрешение</label>
          <select id="rdp-resolution" v-model="localSettings.rdp.resolution">
            <option value="1920x1080">1920x1080 (FullHD)</option>
            <option value="1366x768">1366x768</option>
            <option value="1024x768">1024x768</option>
            <option value="1280x720">1280x720 (HD)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="rdp-colors">Глубина цвета</label>
          <select id="rdp-colors" v-model="localSettings.rdp.colorDepth">
            <option value="32">32 бита</option>
            <option value="24">24 бита</option>
            <option value="16">16 бит</option>
          </select>
        </div>

        <div class="form-group">
          <label for="rdp-multimon">Несколько мониторов</label>
          <label class="toggle">
            <input type="checkbox" id="rdp-multimon" v-model="localSettings.rdp.multimon">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="rdp-clipboard">Буфер обмена</label>
          <label class="toggle">
            <input type="checkbox" id="rdp-clipboard" v-model="localSettings.rdp.clipboard">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="rdp-drives">Подключение дисков</label>
          <label class="toggle">
            <input type="checkbox" id="rdp-drives" v-model="localSettings.rdp.driveMapping">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="rdp-admin-session">Административная сессия (/admin)</label>
          <label class="toggle">
            <input type="checkbox" id="rdp-admin-session" v-model="localSettings.rdp.useAdminSession">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="rdp-prompt-credentials">Запрашивать учётные данные (/prompt)</label>
          <label class="toggle">
            <input type="checkbox" id="rdp-prompt-credentials" v-model="localSettings.rdp.promptCredentials">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="rdp-start-fullscreen">Полноэкранный старт (/f)</label>
          <label class="toggle">
            <input type="checkbox" id="rdp-start-fullscreen" v-model="localSettings.rdp.startFullScreen">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="rdp-span">Span на все мониторы (/span)</label>
          <label class="toggle">
            <input type="checkbox" id="rdp-span" v-model="localSettings.rdp.span">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="rdp-custom">Дополнительные параметры (.rdp строки)</label>
          <textarea id="rdp-custom" v-model="localSettings.rdp.customFlags" rows="3"
            placeholder="Например: audiomode:i:1"></textarea>
        </div>
      </div>

      <!-- Horizon Settings -->
      <div v-if="activeTab === 'horizon'" class="settings-section">
        <h3>Настройки VMware Horizon</h3>

        <div class="form-group">
          <label for="horizon-server">URL сервера (--serverURL)</label>
          <input type="text" id="horizon-server" v-model="localSettings.horizon.serverUrl"
            placeholder="https://horizon.company.com">
        </div>

        <div class="form-group">
          <label for="horizon-desktop">Desktop Name (--desktopName)</label>
          <input type="text" id="horizon-desktop" v-model="localSettings.horizon.desktopName"
            placeholder="Имя десктопа или пула">
        </div>

        <div class="form-group">
          <label for="horizon-app">Application (--appName)</label>
          <input type="text" id="horizon-app" v-model="localSettings.horizon.appName"
            placeholder="Имя приложения для запуска">
        </div>

        <div class="form-group">
          <label for="horizon-protocol">Protocol (--desktopProtocol)</label>
          <select id="horizon-protocol" v-model="localSettings.horizon.desktopProtocol">
            <option value="">По умолчанию</option>
            <option value="RDP">RDP</option>
            <option value="PCoIP">PCoIP</option>
            <option value="Blast">Blast</option>
          </select>
        </div>

        <div class="form-group">
          <label for="horizon-layout">Layout (--desktopLayout)</label>
          <select id="horizon-layout" v-model="localSettings.horizon.desktopLayout">
            <option value="">По умолчанию</option>
            <option value="fullscreen">Fullscreen</option>
            <option value="multimonitor">Multi-Monitor</option>
            <option value="windowLarge">Window Large</option>
            <option value="windowSmall">Window Small</option>
            <option value="1920x1080">1920x1080</option>
            <option value="1366x768">1366x768</option>
            <option value="1024x768">1024x768</option>
          </select>
        </div>

        <div class="form-group">
          <label for="horizon-monitors">Monitors (--monitors)</label>
          <input type="text" id="horizon-monitors" v-model="localSettings.horizon.monitors" placeholder="1, 2">
          <small>Индексы мониторов через запятую (для multimonitor)</small>
        </div>

        <div class="form-group">
          <label for="horizon-unattended">Unattended mode (--unattended)</label>
          <label class="toggle">
            <input type="checkbox" id="horizon-unattended" v-model="localSettings.horizon.unattended">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="horizon-noninteractive">Non-interactive (--nonInteractive)</label>
          <label class="toggle">
            <input type="checkbox" id="horizon-noninteractive" v-model="localSettings.horizon.nonInteractive">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="horizon-minimized">Launch minimized (--launchMinimized)</label>
          <label class="toggle">
            <input type="checkbox" id="horizon-minimized" v-model="localSettings.horizon.launchMinimized">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="horizon-currentuser">Login as current user (--loginAsCurrentUser)</label>
          <label class="toggle">
            <input type="checkbox" id="horizon-currentuser" v-model="localSettings.horizon.loginAsCurrentUser">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="horizon-hideafter">Hide client after launch (--hideClientAfterLaunchSession)</label>
          <label class="toggle">
            <input type="checkbox" id="horizon-hideafter" v-model="localSettings.horizon.hideClientAfterLaunchSession">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="horizon-useexisting">Use existing connection (--useExisting)</label>
          <label class="toggle">
            <input type="checkbox" id="horizon-useexisting" v-model="localSettings.horizon.useExisting">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="horizon-single">Single auto-connect (--singleAutoConnect)</label>
          <label class="toggle">
            <input type="checkbox" id="horizon-single" v-model="localSettings.horizon.singleAutoConnect">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="horizon-path">Путь к VMware Horizon</label>
          <input type="text" id="horizon-path" v-model="localSettings.horizon.customPath"
            placeholder="C:\Program Files\VMware\...\vmware-view.exe">
        </div>

        <div class="form-group">
          <label for="horizon-custom">Дополнительные параметры</label>
          <textarea id="horizon-custom" v-model="localSettings.horizon.customFlags" rows="3"
            placeholder="Дополнительные флаги"></textarea>
        </div>
      </div>

      <!-- Citrix Settings -->
      <div v-if="activeTab === 'citrix'" class="settings-section">
        <h3>Настройки Citrix Workspace</h3>

        <div class="form-group">
          <label for="citrix-store">Store URL</label>
          <input type="text" id="citrix-store" v-model="localSettings.citrix.storeUrl"
            placeholder="https://store.company.com/Citrix/Store">
        </div>

        <div class="form-group">
          <label for="citrix-account">Account name (macOS createaccount name=)</label>
          <input type="text" id="citrix-account" v-model="localSettings.citrix.accountName"
            placeholder="Store или CorpStore">
          <small>На macOS используется для регистрации StoreFront через citrixreceiver://createaccount</small>
        </div>

        <div class="form-group">
          <label for="citrix-resource">Ресурс / Published App (-launch)</label>
          <input type="text" id="citrix-resource" v-model="localSettings.citrix.resourceName"
            placeholder="Например: Desktop">
        </div>

        <div class="form-group">
          <label for="citrix-path">Путь к Citrix Workspace</label>
          <input type="text" id="citrix-path" v-model="localSettings.citrix.customPath"
            placeholder="C:\Program Files (x86)\Citrix\ICA Client\SelfServicePlugin\SelfService.exe">
        </div>

        <div class="form-group">
          <label for="citrix-custom">Дополнительные параметры selfservice</label>
          <textarea id="citrix-custom" v-model="localSettings.citrix.customFlags" rows="3"
            placeholder="Например: -logon"></textarea>
        </div>
      </div>

      <!-- General Settings -->
      <div v-if="activeTab === 'general'" class="settings-section">
        <h3>Общие настройки</h3>

        <div class="form-group">
          <label for="general-tray">Сворачивать в трей</label>
          <label class="toggle">
            <input type="checkbox" id="general-tray" v-model="localSettings.general.minimizeToTray">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label for="general-start">Запускать свёрнутым</label>
          <label class="toggle">
            <input type="checkbox" id="general-start" v-model="localSettings.general.startMinimized">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label>Стандартные подключения</label>
          <button class="btn btn-secondary" type="button" @click="emit('reset-default-connections')">
            Сбросить к заводским
          </button>
          <small>Сбросит только переименования стандартных подключений. Пользовательские подключения не затрагиваются.</small>
        </div>
      </div>

      <!-- Network Settings -->
      <div v-if="activeTab === 'network'" class="settings-section">
        <h3>Сеть</h3>

        <div class="form-group">
          <label for="net-latency-threshold">Порог задержки (мс)</label>
          <select
            class="select"
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

      <!-- Updates Settings -->
      <div v-if="activeTab === 'updates'" class="settings-section">
        <h3>Автообновление</h3>

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

            <button class="btn btn-primary" @click="handleDownloadUpdate" :disabled="isDownloading">
              {{ isDownloading ? 'Загрузка...' : 'Скачать обновление' }}
            </button>
          </div>

          <div v-else-if="updateStatus.updateDownloaded" class="update-ready">
            <div class="update-info">
              <span class="update-label">Обновление готово:</span>
              <span class="update-value version-ready">{{ updateStatus.version }}</span>
            </div>
            <button class="btn btn-primary" @click="handleInstallUpdate">
              Перезагрузить и установить
            </button>
          </div>

          <div v-else class="update-check">
            <p v-if="updateError" class="update-error">{{ updateError }}</p>
            <button class="btn btn-secondary" @click="handleCheckUpdates" :disabled="isChecking">
              {{ isChecking ? 'Проверка...' : 'Проверить обновления' }}
            </button>
            <p v-if="!updateStatus.updateAvailable && !isChecking && !updateError" class="update-message">
              У вас установлена последняя версия
            </p>
          </div>
        </div>

        <div class="update-info-text">
          <p>После загрузки обновления приложение будет перезапущено для
            установки.</p>
        </div>
      </div>
    </div>

    <div class="settings-actions">
      <button class="btn btn-primary" @click="saveSettings">Сохранить настройки</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useApp } from '../composables/useApp'
import versionData from '../../../version.js'

const props = defineProps({
  settings: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['save', 'reset-default-connections'])

// Auto-updater
const {
  updateStatus,
  updateProgress,
  updateError,
  initAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate
} = useApp()

const isChecking = ref(false)
const isDownloading = ref(false)
const appVersion = ref(versionData.version)
const isMac = ref(false)

// Initialize auto-updater on mount
onMounted(async () => {
  initAutoUpdater()

  // Get current version from main process via API
  try {
    const res = await window.api?.getVersion?.()
    const version = res && typeof res === 'object' && res.success === true ? res.data : res
    if (version) appVersion.value = version
  } catch (e) {
    // Ignore - will use default value
  }

  // Try to get update status
  try {
    const res = await window.api?.getUpdateStatus?.()
    const status = res && typeof res === 'object' && res.success === true ? res.data : res
    if (status) updateStatus.value = status
  } catch (e) {
    // Ignore - may not be available in dev mode
  }

  try {
    const res = await window.api?.getPlatform?.()
    const p = res && typeof res === 'object' && res.success === true ? res.data : res
    isMac.value = p === 'darwin'
  } catch (e) {
    isMac.value = /Mac|iPhone|iPad/i.test(navigator.userAgent)
  }
})

async function handleCheckUpdates() {
  isChecking.value = true
  try {
    await checkForUpdates()
  } finally {
    isChecking.value = false
  }
}

async function handleDownloadUpdate() {
  isDownloading.value = true
  try {
    await downloadUpdate()
  } finally {
    isDownloading.value = false
  }
}

function handleInstallUpdate() {
  installUpdate()
}

async function handleOpenMacInstaller() {
  const url = updateStatus.value?.macReleaseUrl
  if (!url) {
    alert('Не удалось определить ссылку на релиз. Попробуйте проверить обновления ещё раз.')
    return
  }
  const res = await window.api?.openExternal?.(url)
  if (res && res.success === false) {
    alert(res.error || 'Не удалось открыть ссылку')
  }
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const tabs = [
  { id: 'user', label: 'Пользователь' },
  { id: 'rdp', label: 'RDP' },
  { id: 'horizon', label: 'Horizon' },
  { id: 'citrix', label: 'Citrix' },
  { id: 'general', label: 'Общие' },
  { id: 'network', label: 'Сеть' },
  { id: 'updates', label: 'Обновление' }
]

const activeTab = ref('user')

// Preview username
const previewUsername = computed(() => {
  const u = localSettings.user
  if (u.domain && u.username) {
    return `${u.domain}\\${u.username}`
  }
  return u.username || 'не указан'
})

// Default settings structure
const defaultSettings = {
  user: {
    domain: '',
    username: ''
  },
  rdp: {
    resolution: '1920x1080',
    colorDepth: '32',
    multimon: false,
    clipboard: true,
    driveMapping: false,
    useAdminSession: false,
    promptCredentials: true,
    startFullScreen: false,
    span: false,
    customFlags: ''
  },
  horizon: {
    serverUrl: '',
    desktopName: '',
    appName: '',
    desktopProtocol: '',
    desktopLayout: '',
    monitors: '',
    unattended: false,
    nonInteractive: false,
    launchMinimized: false,
    loginAsCurrentUser: false,
    hideClientAfterLaunchSession: false,
    useExisting: false,
    singleAutoConnect: false,
    customPath: '',
    customFlags: ''
  },
  citrix: {
    storeUrl: '',
    accountName: '',
    resourceName: '',
    customPath: '',
    customFlags: ''
  },
  general: {
    minimizeToTray: false,
    startMinimized: false
  },
  networkCheck: {
    latencyThresholdMs: 100
  }
}

// Initialize local settings with defaults
const localSettings = reactive(JSON.parse(JSON.stringify(defaultSettings)))

// Initialize function
function initSettings() {
  const newSettings = props.settings
  if (newSettings && Object.keys(newSettings).length > 0) {
    // Merge with defaults
    const merged = JSON.parse(JSON.stringify(defaultSettings))

    // User settings
    if (newSettings.user) {
      merged.user = { ...defaultSettings.user, ...newSettings.user }
    }
    // RDP settings
    if (newSettings.rdp) {
      merged.rdp = { ...defaultSettings.rdp, ...newSettings.rdp }
    }
    // Horizon settings
    if (newSettings.horizon) {
      merged.horizon = { ...defaultSettings.horizon, ...newSettings.horizon }
    }
    // Citrix settings
    if (newSettings.citrix) {
      merged.citrix = { ...defaultSettings.citrix, ...newSettings.citrix }
    }
    // General settings
    if (newSettings.general) {
      merged.general = { ...defaultSettings.general, ...newSettings.general }
    }
    // Network settings
    if (newSettings.networkCheck) {
      merged.networkCheck = { ...defaultSettings.networkCheck, ...newSettings.networkCheck }
    }

    Object.assign(localSettings, merged)
  }
}

// Watch for settings changes from props
watch(() => props.settings, () => {
  initSettings()
}, { immediate: true, deep: true })

function saveSettings() {
  emit('save', JSON.parse(JSON.stringify(localSettings)))
}
</script>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: var(--bg-primary);
  border-radius: 30px;
  padding: 20px;
  overflow: hidden;
}

.settings-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  width: fit-content;
}

.settings-tab {
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  opacity: 0.8;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 25px;
  transition: var(--transition);
}

.settings-tab:hover {
  color: var(--text-inverse);
  background: var(--bg-tertiary);
}

.settings-tab.active {
  background: var(--bg-tertiary);
  color: var(--text-inverse);
  opacity: 1;
}

.settings-sections {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
}

.settings-section.active {
  display: block;
}

.settings-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.settings-actions {
  flex-shrink: 0;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
}

/* Preview */
.preview-label {
  font-size: 13px;
  color: var(--text-inverse);
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.preview-label strong {
  color: var(--accent-danger);
}

/* Buttons */
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

/* Forms */
.form-group {
  margin-bottom: 20px;
}

.form-group label:first-child {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-group input[type="text"],
.form-group input[type="url"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  transition: var(--transition);
}

.form-group select.select {
  /* Make the dropdown look consistent across platforms and themes */
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 38px;

  /* Simple chevron arrow */
  background-image:
    linear-gradient(45deg, transparent 50%, var(--text-muted) 50%),
    linear-gradient(135deg, var(--text-muted) 50%, transparent 50%);
  background-position:
    calc(100% - 18px) 50%,
    calc(100% - 12px) 50%;
  background-size:
    6px 6px,
    6px 6px;
  background-repeat: no-repeat;
}

.form-group select.select:hover {
  border-color: var(--border-light);
}

.form-group select.select:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-group select {
  cursor: pointer;
}

.form-group small {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

/* Toggle Switch */
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--accent-primary);
  border: 1px solid var(--border-color);
  transition: var(--transition);
  border-radius: 26px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: var(--text-inverse);
  transition: var(--transition);
  border-radius: 50%;
}

.toggle input:checked+.toggle-slider {
  background-color: var(--bg-tertiary);
  border-color: var(--accent-primary);
}

.toggle input:checked+.toggle-slider:before {
  transform: translateX(22px);
  background-color: var(--text-inverse);
}

/* Update Section */
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

.update-info-text {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.update-info-text p {
  margin: 0;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
