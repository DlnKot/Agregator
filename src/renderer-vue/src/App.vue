<template>
  <div class="app">
    <div class="app-container">
      <div class="header">
        <img class="header-mark" :src="headerMarkSrc" alt="" aria-hidden="true" />
        <img class="header-logo" :src="headerLogoSrc" alt="Alfa Remote Client" />
      </div>
      <div class="app-content">
        <!-- Sidebar -->
        <aside class="sidebar">
          <nav class="sidebar-nav">
            <button class="nav-item" :class="{ active: currentView === 'connections' }"
              @click="handleViewChange('connections')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Подключения
            </button>
            <button class="nav-item" :class="{ active: currentView === 'settings' }"
              @click="handleViewChange('settings')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Настройки
            </button>
            <button class="nav-item" :class="{ active: currentView === 'network' }"
              @click="handleViewChange('network')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19v-7"></path>
                <path d="M8 19v-11"></path>
                <path d="M12 19v-4"></path>
                <path d="M16 19v-9"></path>
                <path d="M20 19v-13"></path>
              </svg>
              Проверка сети
            </button>
            <button class="nav-item" :class="{ active: currentView === 'help' }" @click="handleViewChange('help')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
              Помощь
            </button>
          </nav>
          <div class="sidebar-footer">
            <button class="theme-toggle" type="button" @click="toggleTheme"
              :title="theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'">
              <span class="theme-toggle-icon" aria-hidden="true">
                <svg v-if="theme === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2"></path>
                  <path d="M12 20v2"></path>
                  <path d="M4.93 4.93l1.41 1.41"></path>
                  <path d="M17.66 17.66l1.41 1.41"></path>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="M4.93 19.07l1.41-1.41"></path>
                  <path d="M17.66 6.34l1.41-1.41"></path>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path>
                </svg>
              </span>
              <span class="theme-toggle-text">{{ theme === 'dark' ? 'Light' : 'Dark' }}</span>
            </button>
            <span class="version">v{{ appVersion }}</span>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
          <!-- Connections View -->
          <section v-if="currentView === 'connections'" id="connections-view" class="view active">
            <div class="view-header">
              <div class="client-tabs" ref="clientTabsRef">
                <div class="tab-slider" :style="clientSliderStyle"></div>
                <button class="client-tab" :class="{ active: currentClientFilter === 'recent' }"
                  @click="currentClientFilter = 'recent'" v-if="lastConnectionId" ref="tabRecent">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  Недавнее
                </button>
                <button class="client-tab" :class="{ active: currentClientFilter === 'all' }"
                  @click="currentClientFilter = 'all'" ref="tabAll">Все</button>
                <button class="client-tab" :class="{ active: currentClientFilter === 'rdp' }"
                  @click="currentClientFilter = 'rdp'" ref="tabRdp">RDP</button>
                <button class="client-tab" :class="{ active: currentClientFilter === 'horizon' }"
                  @click="currentClientFilter = 'horizon'" ref="tabHorizon">Horizon</button>
                <button class="client-tab" :class="{ active: currentClientFilter === 'citrix' }"
                  @click="currentClientFilter = 'citrix'" ref="tabCitrix">Citrix</button>
              </div>
              <div class="view-header-actions">
                <button class="btn btn-secondary btn-vpn" title="Запустить VPN" @click="handleVpnClick">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3"></polyline>
                    <line x1="12" y1="12" x2="20" y2="7.5"></line>
                    <line x1="12" y1="12" x2="12" y2="21"></line>
                    <line x1="12" y1="12" x2="4" y2="7.5"></line>
                  </svg>
                  VPN
                </button>
                <button class="btn btn-primary" id="add-connection-btn" @click="openConnectionModal()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Добавить подключение
                </button>
              </div>
            </div>

            <div id="connections-list" class="connections-list">
              <ConnectionsList :connections="filteredConnections" @launch="handleLaunch" @edit="openConnectionModal"
                @delete="handleDeleteConnection" @add="openConnectionModal" />
            </div>
          </section>

          <!-- Settings View -->
          <section v-if="currentView === 'settings'" id="settings-view" class="view">
            <div class="view-header">
              <h2>Настройки</h2>
            </div>

            <SettingsView :settings="settings" @save="handleSaveSettings" @reset-default-connections="handleResetDefaultConnections" />
          </section>

          <!-- Network Check View -->
          <section v-if="currentView === 'network'" id="network-view" class="view">
            <div class="view-header">
              <h2>Проверка сети</h2>
            </div>
            <NetworkCheckView :settings="settings" />
          </section>

          <!-- Help View -->
          <section v-if="currentView === 'help'" id="help-view" class="view">
            <HelpView />
          </section>
        </main>

      </div>
    </div>





    <!-- Connection Modal -->
    <ConnectionModal v-if="showConnectionModal" :connection="editingConnection" :default-username="defaultUsername"
      @close="closeConnectionModal" @save="handleSaveConnection" />

    <!-- First Run Modal -->
    <FirstRunModal v-if="isFirstRun" @save="handleFirstRunSave" />

    <!-- Install Dialog -->
    <InstallDialog 
      v-if="showInstallDialog" 
      :show="showInstallDialog" 
      :client-type="pendingInstallClient"
      @close="closeInstallDialog"
      @installed="handleInstallComplete"
    />

    <!-- Toast -->
    <div v-if="toast.show" :class="['toast', toast.type]">
      <span class="toast-message">{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useConnections, useSettings, useLauncher, useAutoUpdate, useTheme, useInstaller } from './composables'
import ConnectionsList from './components/ConnectionsList.vue'
import { SettingsView } from './components/settings'
import NetworkCheckView from './components/NetworkCheckView.vue'
import HelpView from './components/HelpView.vue'
import ConnectionModal from './components/ConnectionModal.vue'
import FirstRunModal from './components/FirstRunModal.vue'
import InstallDialog from './components/InstallDialog.vue'
import versionData from '../../version.js'
import headerLogoBlack from './assets/icons/logo-black.svg'
import headerLogoWhite from './assets/icons/logo-white.svg'
import headerMarkBlack from './assets/icons/arc-black.svg'
import headerMarkWhite from './assets/icons/arc-white.svg'

const appVersion = ref(versionData.version)

// Composables
const { theme, toggleTheme, initTheme } = useTheme()
const { 
  connections, 
  filteredConnections, 
  currentClientFilter, 
  lastConnectionId,
  loadConnections, 
  loadLastConnection,
  setLastConnection,
  saveConnection, 
  deleteConnection, 
  resetDefaultConnections,
  getUserCredentials 
} = useConnections()
const { settings, isFirstRun, loadSettings, saveSettings } = useSettings()
const { launchConnection, launchVpn } = useLauncher()
const { initAutoUpdater } = useAutoUpdate()

// Install dialog state
const showInstallDialog = ref(false)
const pendingInstallClient = ref(null)

function closeInstallDialog() {
  showInstallDialog.value = false
  pendingInstallClient.value = null
}

function handleInstallComplete(filePath) {
  showToast('Установщик открыт', 'success')
  closeInstallDialog()
}

const currentView = ref('connections')
const headerLogoSrc = computed(() => (theme.value === 'dark' ? headerLogoWhite : headerLogoBlack))
const headerMarkSrc = computed(() => (theme.value === 'dark' ? headerMarkWhite : headerMarkBlack))

// Client tabs slider refs
const clientTabsRef = ref(null)
const tabAll = ref(null)
const tabRdp = ref(null)
const tabHorizon = ref(null)
const tabCitrix = ref(null)
const tabRecent = ref(null)

const clientSliderStyle = computed(() => {
  if (!clientTabsRef.value) return { width: '0px', transform: 'translateX(0)' }
  
  const filter = currentClientFilter.value
  let targetRef = null
  
  if (filter === 'recent' && tabRecent.value) {
    targetRef = tabRecent.value
  } else if (filter === 'all' && tabAll.value) {
    targetRef = tabAll.value
  } else if (filter === 'rdp' && tabRdp.value) {
    targetRef = tabRdp.value
  } else if (filter === 'horizon' && tabHorizon.value) {
    targetRef = tabHorizon.value
  } else if (filter === 'citrix' && tabCitrix.value) {
    targetRef = tabCitrix.value
  }
  
  // If no target ref found (e.g., 'recent' tab doesn't exist), hide slider
  if (!targetRef) return { width: '0px', transform: 'translateX(0)', opacity: '0' }
  
  const containerRect = clientTabsRef.value.getBoundingClientRect()
  const tabRect = targetRef.getBoundingClientRect()
  
  return {
    width: `${tabRect.width}px`,
    transform: `translateX(${tabRect.left - containerRect.left}px)`,
    opacity: '1'
  }
})

// Load data function
async function loadData() {
  await Promise.all([loadConnections(), loadSettings()])
  await loadLastConnection()
  
  // Set initial filter based on last connection
  if (lastConnectionId.value) {
    currentClientFilter.value = 'recent'
  } else {
    currentClientFilter.value = 'all'
  }
}

// Computed default username from settings
const defaultUsername = computed(() => {
  const creds = getUserCredentials(settings.value)
  if (creds.domain && creds.username) {
    return `${creds.domain}\\${creds.username}`
  }
  return ''
})

// Modal state
const showConnectionModal = ref(false)
const editingConnection = ref(null)

// Toast state
const toast = reactive({
  show: false,
  message: '',
  type: 'success'
})

function showToast(message, type = 'success') {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, 3000)
}

// Connection modal
function openConnectionModal(connection = null) {
  if (connection) {
    editingConnection.value = { ...connection }
  } else {
    // When creating a new connection, preselect type based on current filter tab.
    const t = (currentClientFilter.value && currentClientFilter.value !== 'all')
      ? currentClientFilter.value
      : 'rdp'
    editingConnection.value = { type: t }
  }
  showConnectionModal.value = true
}

function closeConnectionModal() {
  showConnectionModal.value = false
  editingConnection.value = null
}

async function handleSaveConnection(connection) {
  try {
    const result = await saveConnection(connection)
    if (result.success) {
      closeConnectionModal()
      showToast('Подключение сохранено', 'success')
    } else {
      showToast(result.error || 'Ошибка сохранения подключения', 'error')
    }
  } catch (error) {
    showToast('Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка'), 'error')
  }
}

async function handleDeleteConnection(id) {
  if (!confirm('Вы уверены, что хотите удалить это подключение?')) return

  try {
    const result = await deleteConnection(id)
    if (result.success) {
      showToast('Подключение удалено', 'success')
    } else {
      showToast(result.error || 'Ошибка удаления подключения', 'error')
    }
  } catch (error) {
    showToast('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'), 'error')
  }
}

// Launch handlers
async function handleLaunch(id) {
  const conn = connections.value.find(c => c.id === id)
  if (!conn) return

  const result = await launchConnection(conn, settings.value)
  if (result && result.success) {
    // Save this connection as the last used
    await setLastConnection(id)
    showToast('Клиент запущен', 'success')
  } else if (result?.needsInstall) {
    // Client not installed - show install dialog
    pendingInstallClient.value = result.clientType
    showInstallDialog.value = true
  } else {
    showToast(result?.error || 'Ошибка запуска', 'error')
  }
}

// VPN handler - launching bank VPN
async function handleVpnClick() {
  const result = await launchVpn()
  if (result && result.success) {
    showToast('VPN клиент запущен', 'success')
  } else {
    showToast(result?.error || 'Не удалось запустить VPN клиент', 'error')
  }
}


// Handle view change with metrics
function handleViewChange(view) {
  currentView.value = view
  // Трекинг метрик
  if (window.api?.trackTabView) {
    window.api.trackTabView(view)
  }
}

// Settings
async function handleSaveSettings(newSettings) {
  try {
    const result = await saveSettings(newSettings)
    if (result.success) {
      showToast('Настройки сохранены', 'success')
    } else {
      showToast(result.error || 'Ошибка сохранения настроек', 'error')
    }
  } catch (error) {
    showToast('Ошибка сохранения настроек: ' + (error.message || 'Неизвестная ошибка'), 'error')
  }
}

async function handleResetDefaultConnections() {
  const ok = confirm('Сбросить стандартные подключения к заводским настройкам?\n\nПользовательские подключения не будут затронуты.')
  if (!ok) return

  try {
    const result = await resetDefaultConnections()
    if (result.success) {
      showToast('Стандартные подключения сброшены', 'success')
    } else {
      showToast(result.error || 'Не удалось сбросить стандартные подключения', 'error')
    }
  } catch (error) {
    showToast('Ошибка сброса: ' + (error?.message || String(error)), 'error')
  }
}

// First run handler
async function handleFirstRunSave(userData) {
  // Use deep copy to avoid reactive object issues
  const currentSettings = JSON.parse(JSON.stringify(settings.value || {}))
  currentSettings.user = {
    domain: userData.domain,
    username: userData.username
  }
  await saveSettings(currentSettings)
  isFirstRun.value = false
  showToast('Данные пользователя сохранены', 'success')

  // Reload connections to get default ones
  await loadData()
}

// Initialize
onMounted(async () => {
  initTheme()
  await loadData()

  // Load app version from main process
  try {
    const res = await window.api?.getVersion?.()
    const version = res && typeof res === 'object' && res.success === true ? res.data : res
    if (version) appVersion.value = version
  } catch (e) {
    // Ignore - version will use default value
  }
})

// Apply theme ASAP (before first paint when possible)
initTheme()
</script>

<style scoped>
.app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px;
  gap: 10px;
  border-radius: var(--radius);
  /* background: var(--bg-primary); */
  /* box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); */
}

.app-content {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 10px;
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-radius: 30px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
}

.header {
  background: var(--bg-secondary);
  padding: 20px 8px;
  display: flex;
  align-items: center;
  border-radius: 30px;
  flex-shrink: 0;
}

.header-mark {
  width: 28px;
  height: 28px;
  margin-left: 14px;
  flex: 0 0 auto;
  display: block;
}

.header-logo {
  height: 28px;
  width: auto;
  margin-left: 10px;
  display: block;
}

.header h1 {
  font-size: 24px;
  margin-inline: 12px;
  font-weight: 300;
  color: var(--text-primary);
}

.sidebar-nav {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 25px;
  transition: var(--transition);
  text-align: left;
  width: 100%;
}

.nav-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-inverse);
  transition: var(--transition);
  opacity: 0.9;
}

.nav-item.active {
  background: var(--accent-danger);
  color: var(--text-inverse);
}

.nav-item svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 10px;
  border-top: 1px solid var(--border-color);
  opacity: 0.8;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}

.version {
  font-size: 12px;
  margin-inline: 10px;
  color: var(--text-muted);
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 999px;
  cursor: pointer;
  transition: var(--transition);
}

.theme-toggle:hover {
  border-color: var(--border-light);
  background: var(--bg-tertiary);
  color: var(--text-inverse);
}

.theme-toggle-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle-icon svg {
  width: 18px;
  height: 18px;
  display: block;
}

.theme-toggle-text {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

/* Main Content */
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-radius: 30px;
  min-height: 0;
  min-width: 0;
}

.view {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  padding: 24px;
  min-height: 0;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.view-header h2 {
  font-size: 24px;
  font-weight: 600;
}

.view-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-xl);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.btn svg {
  width: 18px;
  height: 18px;
}

.btn-primary {
  background: var(--accent-danger);
  color: var(--text-inverse);
}

.btn-primary:hover {
  background: #dc2626;
  opacity: 1;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-inverse);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.btn-danger {
  background: var(--accent-danger);
  color: var(--text-inverse);
}

.btn-danger:hover {
  background: #dc2626;
}

/* Client Tabs */
.client-tabs {
  display: flex;
  align-content: center;
  justify-content: center;
  gap: 8px;
  padding: 4px;
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  width: fit-content;
  border: 1px solid var(--border-color);
  position: relative;
}

.tab-slider {
  position: absolute;
  top: 4px;
  left: 0;
  height: calc(100% - 8px);
  background: var(--bg-tertiary);
  border-radius: var(--radius-xl);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  z-index: 0;
}

.client-tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-xl);
  transition: color 0.2s ease;
  position: relative;
  z-index: 1;
}

.client-tab:hover {
  color: var(--text-primary);
}

.client-tab.active {
  color: var(--text-inverse);
}

.client-tab svg {
  margin-right: 4px;
  vertical-align: middle;
}

.btn-vpn {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.btn-vpn:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.5);
}

.btn-vpn svg {
  width: 18px;
  height: 18px;
}

.connections-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 8px;
}
</style>
