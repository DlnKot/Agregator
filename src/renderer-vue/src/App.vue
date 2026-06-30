<template>
  <div class="app">
    <div class="app-container">
      <div class="header">
        <img class="header-mark" :src="headerMarkSrc" alt="" aria-hidden="true" />
        <h1 class="header-logo"><span class="header-symbol">&gt;</span>remote client<span class="header-symbol">_</span></h1>  
      </div>
      <div class="app-content">
        <!-- Sidebar -->
        <SidebarNav 
          :current-view="currentView"
          :theme="theme"
          :app-version="appVersion"
          @view-change="handleViewChange"
          @toggle-theme="toggleTheme"
          @rudesktop-launched="handleRudesktopLaunched"
          @show-rudesktop-modal="showRudesktopModal = true"
          @show-vpn-modal="showVpnModal = true"
          @show-achat-modal="showAChatModal = true"
          @show-tolk-modal="showTolkModal = true"
          ref="sidebarNavRef"
        />

        <!-- Main Content -->
        <main class="main-content">
          <!-- Connections View -->
          <section v-if="currentView === 'connections'" id="connections-view" class="view active">
            <div class="view-header">
              <div class="client-tabs" ref="clientTabsRef">
                <div class="tab-slider" :style="clientSliderStyle"></div>
                <button class="client-tab" :class="{ active: currentClientFilter === 'recent' }"
                  @click="currentClientFilter = 'recent'" v-if="lastConnectionId" ref="tabRecent">
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
              <ConnectionsList :connections="filteredConnections" :filter="currentClientFilter" @launch="handleLaunch" @edit="openConnectionModal"
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

    <!-- RuDesktop not found modal -->
    <RudesktopNotFoundModal 
      v-if="showRudesktopModal" 
      :show="showRudesktopModal"
      @close="showRudesktopModal = false"
      @download="handleRudesktopDownload"
    />

    <!-- VPN Connect Modal -->
    <VpnConnectModal 
      v-if="showVpnModal" 
      :default-username="defaultUsername"
      @close="showVpnModal = false"
      @connect="handleVpnConnected"
    />

    <!-- A-Chat not found modal -->
    <div v-if="showAChatModal" class="modal-overlay" @click.self="showAChatModal = false">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>А-Чат</h3>
          <button class="modal-close" @click="showAChatModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <p>Приложение А-Чат не установлено. Хотите открыть веб-версию?</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAChatModal = false">Нет</button>
          <button class="btn btn-primary" @click="openAChatWeb">Да</button>
        </div>
      </div>
    </div>

    <!-- Tolk not found modal -->
    <div v-if="showTolkModal" class="modal-overlay" @click.self="showTolkModal = false">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>Толк</h3>
          <button class="modal-close" @click="showTolkModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <p>Приложение Толк не установлено. Хотите открыть веб-версию?</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showTolkModal = false">Нет</button>
          <button class="btn btn-primary" @click="openTolkWeb">Да</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" :class="['toast', toast.type]">
      <span class="toast-message">{{ toast.message }}</span>
    </div>

    <!-- Alert Notification -->
    <AlertNotification :show="alert.show" :message="alert.message" @close="alert.show = false" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useConnections, useSettings, useLauncher, useAutoUpdate, useTheme, useInstaller } from './composables'
import ConnectionsList from './components/ConnectionsList.vue'
import SidebarNav from './components/SidebarNav.vue'
import { SettingsView } from './components/settings'
import NetworkCheckView from './components/NetworkCheckView.vue'
import HelpView from './components/HelpView.vue'
import ConnectionModal from './components/ConnectionModal.vue'
import FirstRunModal from './components/FirstRunModal.vue'
import InstallDialog from './components/InstallDialog.vue'
import AlertNotification from './components/AlertNotification.vue'
import RudesktopNotFoundModal from './components/RudesktopNotFoundModal.vue'
import VpnConnectModal from './components/VpnConnectModal.vue'
import versionData from '../../version.js'
import headerLogoBlack from './assets/icons/logo-black.svg'
import headerLogoWhite from './assets/icons/logo-white.svg'
import headerMarkBlack from './assets/icons/arc-black.svg'
import headerMarkWhite from './assets/icons/arc-white.svg'

const appVersion = ref(versionData.version)
const sidebarNavRef = ref(null)

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

// RuDesktop modal state
const showRudesktopModal = ref(false)

// VPN modal state
const showVpnModal = ref(false)

// A-Chat modal state
const showAChatModal = ref(false)

// Tolk modal state
const showTolkModal = ref(false)

async function openAChatWeb() {
  try {
    await window.api?.openAChatWeb?.()
  } catch (e) {
    console.error('Failed to open A-Chat web:', e)
  }
  showAChatModal.value = false
}

async function openTolkWeb() {
  try {
    await window.api?.openTolkWeb?.()
  } catch (e) {
    console.error('Failed to open Tolk web:', e)
  }
  showTolkModal.value = false
}

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

// Force slider update when lastConnectionId changes (tab may appear/disappear)
watch(lastConnectionId, async () => {
  await nextTick()
  // Trigger reactivity by forcing re-evaluation
  const filter = currentClientFilter.value
  currentClientFilter.value = ''
  await nextTick()
  currentClientFilter.value = filter
})

// Load data function
async function loadData() {
  await Promise.all([loadConnections(), loadSettings()])
  await loadLastConnection()
  
  // Set initial filter: always "all" by default (shows all connection types)
  // "recent" only shows if there's a lastConnectionId
  currentClientFilter.value = 'all'
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

// Alert Notification state
const alert = reactive({
  show: false,
  message: ''
})

function showAlert(message) {
  alert.message = message
  alert.show = true
  setTimeout(() => {
    alert.show = false
  }, 3000)
}

// Connection modal
function openConnectionModal(connection = null) {
  if (connection) {
    editingConnection.value = { ...connection }
  } else {
    let type = 'rdp'
    // For "recent" filter, use the last connection's type if available
    // If no last connection (empty list), default to 'horizon'
    if (currentClientFilter.value === 'recent') {
      type = lastConnection.value?.type || 'horizon'
    } else if (currentClientFilter.value && currentClientFilter.value !== 'all' && currentClientFilter.value !== 'recent') {
      type = currentClientFilter.value
    }
    editingConnection.value = { type }
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

// RuDesktop launch handler
async function handleRudesktopLaunched(data) {
  if (data?.deviceId) {
    try {
      await navigator.clipboard.writeText(data.deviceId)
      showToast(`RuDesktop запущен. ID ${data.deviceId} скопирован`, 'success')
    } catch (e) {
      showToast(`RuDesktop запущен. ID: ${data.deviceId}`, 'success')
    }
  } else {
    showToast('RuDesktop запущен', 'success')
  }
}

// RuDesktop download handler
async function handleRudesktopDownload() {
  try {
    if (window.api?.openRudesktopDownload) {
      await window.api.openRudesktopDownload()
    }
  } catch (e) {
    console.error('Failed to open RuDesktop download:', e)
  }
  showRudesktopModal.value = false
}

// VPN connect handler
function handleVpnConnected(data) {
  showToast('VPN подключен', 'success')
  if (sidebarNavRef.value?.loadVpnStatus) {
    sidebarNavRef.value.loadVpnStatus()
  }
}

// VPN button click handler
async function handleVpnClick() {
  try {
    const statusResult = await window.api.vpnStatus()
    if (statusResult.success && statusResult.data?.connected) {
      const result = await window.api.vpnDisconnect()
      if (result.success) {
        showToast('VPN отключен', 'success')
        if (sidebarNavRef.value?.loadVpnStatus) {
          sidebarNavRef.value.loadVpnStatus()
        }
      }
    } else {
      showVpnModal.value = true
    }
  } catch (e) {
    console.error('VPN click error:', e)
    showVpnModal.value = true
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
  showAlert('Данные сохранены')

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
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  position: relative;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 360px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  animation: modalSlideIn 200ms ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 22px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
}

.modal-body p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-primary);
  color: #0b1220;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-primary-hover);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-secondary);
}

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
  border-radius: 16px;
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
  border-radius: 16px;
  flex-shrink: 0;
  -webkit-user-select: none;
  user-select: none;
}

.header-mark {
  width: 30px;
  height: 30px;
  margin-left: 14px;
  -webkit-user-drag: none;
  pointer-events: none;
}

.header-logo {
  height: 28px;
  width: auto;
  margin-left: 10px;
  margin-bottom: 10px;
  -webkit-user-drag: none;
}

.header h1 {
  font-size: 24px;
  margin-inline: 12px;
  font-weight: 400;
  color: var(--text-primary);
}

.header-symbol {
  color: var(--accent-danger);
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
  border-radius: 16px;
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
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.view-header h2 {
  font-size: 24px;
  font-weight: 600;
}

.view-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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

#add-connection-btn {
  width: 221px;
  height: 40px;
  min-width: 88px;
  min-height: 40px;
  gap: 2px;
  padding: 4px 16px;
  border-radius: 999px;
  background: #212124;
  color: var(--text-inverse);
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

#add-connection-btn:hover {
  background: #2a2a2e;
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
  align-items: center;
  gap: 8px;
  padding: 2px;
  background: var(--bg-primary);
  border-radius: 20px;
  width: fit-content;
  height: 40px;
  border: 1px solid var(--border-color);
  position: relative;
  flex-shrink: 0;
}

.tab-slider {
  position: absolute;
  top: 1px;
  left: 0;
  height: 36px;
  background: var(--tab-slider-bg);
  border: 0.5px solid var(--tab-slider-border);
  border-radius: 20px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  z-index: 0;
}

.client-tab {
  padding: 8px 24px;
  border: none;
  background: transparent;
  color: var(--tab-text-inactive);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 20px;
  transition: color 0.2s ease;
  position: relative;
  z-index: 1;
  white-space: nowrap;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.client-tab:hover {
  color: var(--tab-text-inactive);
}

.client-tab.active {
  color: var(--tab-text-active);
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
}
</style>
