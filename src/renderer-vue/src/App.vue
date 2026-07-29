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
          <section v-show="currentView === 'connections'" class="view">
            <div class="view-header">
              <div class="client-tabs" ref="clientTabsRef">
                <div class="tab-slider" :style="clientSliderStyle"></div>
                <button class="client-tab" :class="{ active: currentClientFilter === 'recent' }"
                  @click="currentClientFilter = 'recent'" v-if="recentConnectionIds.length > 0" ref="tabRecent">
                  Недавнее
                </button>
                <button class="client-tab" :class="{ active: currentClientFilter === 'all' }"
                  @click="currentClientFilter = 'all'" ref="tabAll">Все</button>
                <button class="client-tab" :class="{ active: currentClientFilter === 'rdp' }"
                  @click="currentClientFilter = 'rdp'" ref="tabRdp">ПУРМС</button>
                <button class="client-tab" :class="{ active: currentClientFilter === 'horizon' }"
                  @click="currentClientFilter = 'horizon'" ref="tabHorizon">VDI VMWare</button>
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

          <section v-show="currentView === 'settings'" class="view">
            <div class="view-header">
              <h2>Настройки</h2>
            </div>
            <SettingsView :settings="settings" @save="handleSaveSettings" @reset-default-connections="handleResetDefaultConnections" />
          </section>

          <section v-show="currentView === 'network'" class="view">
            <div class="view-header">
              <h2>Проверка сети</h2>
            </div>
            <NetworkCheckView :settings="settings" />
          </section>

          <section v-show="currentView === 'help'" class="view">
            <div class="view-header">
              <h2>Помощь</h2>
            </div>
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
      @confirm="handleRudesktopDownload"
    />

    <!-- VPN Connect Modal -->
    <VpnConnectModal 
      v-if="showVpnModal" 
      :default-username="defaultUsername"
      @close="showVpnModal = false"
      @connect="handleVpnConnected"
    />

    <!-- A-Chat not found modal -->
    <RudesktopNotFoundModal
      v-if="showAChatModal"
      :show="showAChatModal"
      title="А-Чат"
      message="Приложение А-Чат не установлено. Хотите открыть веб-версию?"
      confirm-label="Да"
      cancel-label="Нет"
      @close="showAChatModal = false"
      @confirm="openAChatWeb"
    />

    <!-- Tolk not found modal -->
    <RudesktopNotFoundModal
      v-if="showTolkModal"
      :show="showTolkModal"
      title="Толк"
      message="Приложение Толк не установлено. Хотите открыть веб-версию?"
      confirm-label="Да"
      cancel-label="Нет"
      @close="showTolkModal = false"
      @confirm="openTolkWeb"
    />

    <!-- Toast -->
    <div v-if="toast.show" :class="['toast', `toast-${toast.type}`]">
      <div class="toast-badge">
        <div class="toast-badge-circle">
          <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10.5L8 14.5L16 5.5" stroke="rgba(255,255,255,0.94)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="toast.type === 'error'" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M6 6L14 14M14 6L6 14" stroke="rgba(255,255,255,0.94)" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10.5L8 14.5L16 5.5" stroke="rgba(255,255,255,0.94)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <div class="toast-text">
        <span class="toast-title">{{ toast.message }}</span>
      </div>
    </div>

    <!-- Alert Notification -->
    <AlertNotification :show="alert.show" :message="alert.message" @close="alert.show = false" />

    <!-- Confirm Dialog -->
    <div v-if="confirm.show" class="modal-overlay" @click.self="confirmCancel">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>{{ confirm.title }}</h3>
          <button class="modal-close" @click="confirmCancel">&times;</button>
        </div>
        <div class="modal-body">
          <p>{{ confirm.message }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="confirmCancel">Отмена</button>
          <button class="btn btn-primary" @click="confirmOk">Подтвердить</button>
        </div>
      </div>
    </div>

    <!-- Dev Panel -->
    <DevPanel :visible="showDevPanel" @close="showDevPanel = false" @show="handleDevShow" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useConnections, useSettings, useLauncher, useTheme } from './composables'
import { appApi, externalApi, launchersApi, trackingApi } from './api'
import ConnectionsList from './components/ConnectionsList.vue'
import SidebarNav from './components/SidebarNav.vue'
import { SettingsView } from './components/settings'
import NetworkCheckView from './components/NetworkCheckView.vue'
import HelpView from './components/HelpView.vue'
import ConnectionModal from './components/ConnectionModal.vue'
import FirstRunModal from './components/FirstRunModal.vue'
import InstallDialog from './components/InstallDialog.vue'
import AlertNotification from './components/AlertNotification.vue'
import DevPanel from './components/DevPanel.vue'
import RudesktopNotFoundModal from './components/RudesktopNotFoundModal.vue'
import VpnConnectModal from './components/VpnConnectModal.vue'
import versionData from '../../version.js'
import headerLogoBlack from './assets/icons/logo-black.svg'
import headerLogoWhite from './assets/icons/logo-white.svg'
import headerMarkBlack from './assets/icons/arc-black.svg'
import headerMarkWhite from './assets/icons/arc-white.svg'

const appVersion = ref(versionData.version)
const sidebarNavRef = ref(null)
const sliderReEval = ref(0)

// Composables
const { theme, toggleTheme, initTheme } = useTheme()
const { 
  connections, 
  filteredConnections, 
  currentClientFilter, 
  recentConnectionIds,
  lastConnectionId,
  lastConnection,
  loadConnections, 
  loadRecentConnections,
  pushRecentConnection,
  saveConnection, 
  deleteConnection, 
  resetDefaultConnections,
  getUserCredentials 
} = useConnections()
const { settings, isFirstRun, loadSettings, saveSettings } = useSettings()
const { launchConnection, launchVpn } = useLauncher()

// Dev panel
const showDevPanel = ref(false)

function handleDevShow(target) {
  switch (target) {
    case 'firstrun': isFirstRun.value = true; break
    case 'connection': openConnectionModal(); break
    case 'vpn': showVpnModal.value = true; break
    case 'rudesktop': showRudesktopModal.value = true; break
    case 'install': showInstallDialog.value = true; break
    case 'achat': showAChatModal.value = true; break
    case 'tolk': showTolkModal.value = true; break
  }
  showDevPanel.value = false
}

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
    await externalApi.openAChatWeb()
  } catch (e) {
    console.error('Failed to open A-Chat web:', e)
  }
  showAChatModal.value = false
}

async function openTolkWeb() {
  try {
    await externalApi.openTolkWeb()
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
  // Force re-evaluation via sliderReEval (used for tab appear/disappear)
  void sliderReEval.value
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

// Force slider re-evaluation when recentConnectionIds changes (tab may appear/disappear)
watch(recentConnectionIds, () => {
  nextTick().then(() => { sliderReEval.value++ })
}, { deep: true })

// Load data function
async function loadData() {
  await Promise.all([loadConnections(), loadSettings()])
  await loadRecentConnections()
  
  // Set initial filter: "recent" if user has connected before, otherwise "all"
  currentClientFilter.value = lastConnectionId.value ? 'recent' : 'all'
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

// Confirm dialog
const confirm = reactive({
  show: false,
  title: '',
  message: '',
  resolve: null
})

function showConfirm(title, message) {
  return new Promise((resolve) => {
    confirm.title = title
    confirm.message = message
    confirm.show = true
    confirm.resolve = resolve
  })
}

function confirmOk() {
  confirm.show = false
  if (confirm.resolve) confirm.resolve(true)
}

function confirmCancel() {
  confirm.show = false
  if (confirm.resolve) confirm.resolve(false)
}

// Connection modal
function openConnectionModal(connection = null) {
  if (connection) {
    editingConnection.value = { ...connection }
  } else {
    let type
    if (currentClientFilter.value && currentClientFilter.value !== 'all' && currentClientFilter.value !== 'recent') {
      type = currentClientFilter.value
    } else if (currentClientFilter.value === 'recent') {
      type = lastConnection.value?.type || 'horizon'
    } else {
      type = connections.value.length === 0 ? 'horizon' : (lastConnection.value?.type || 'rdp')
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
  const ok = await showConfirm('Удаление подключения', 'Вы уверены, что хотите удалить это подключение?')
  if (!ok) return

  try {
    const result = await deleteConnection(id)
    if (result.success) {
      // If we were on the "Недавнее" tab and it no longer has a connection, switch to "Все"
      if (currentClientFilter.value === 'recent' && recentConnectionIds.value.length === 0) {
        currentClientFilter.value = 'all'
      }
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

  let result
  try {
    result = await launchConnection(conn, settings.value)
  } finally {
    await pushRecentConnection(id)
    currentClientFilter.value = 'recent'
  }

  const found = !!(connections.value.find(c => c.id === id))
  showToast(
    `id="${id}" lastId="${lastConnectionId.value}" found=${found} filter=${currentClientFilter.value} conns=${connections.value.length}`,
    'success'
  )

  if (result && result.success) {
    setTimeout(() => showToast('Клиент запущен', 'success'), 100)
  } else if (result?.needsInstall) {
    pendingInstallClient.value = result.clientType
    showInstallDialog.value = true
  } else {
    setTimeout(() => showToast(result?.error || 'Ошибка запуска', 'error'), 100)
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
    await externalApi.openRudesktopDownload()
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
    const status = await launchersApi.vpnStatus()
    if (status?.connected) {
      await launchersApi.vpnDisconnect()
      showToast('VPN отключен', 'success')
      if (sidebarNavRef.value?.loadVpnStatus) {
        sidebarNavRef.value.loadVpnStatus()
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
  trackingApi.trackTabView(view)
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
  const ok = await showConfirm('Сброс подключений', 'Сбросить стандартные подключения к заводским настройкам?\n\nПользовательские подключения не будут затронуты.')
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

function handleKeydown(e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    showDevPanel.value = !showDevPanel.value
  }
}

// Initialize
onMounted(async () => {
  initTheme()
  await loadData()

  // Load app version from main process
  try {
    const version = await appApi.getVersion()
    if (version) appVersion.value = version
  } catch (e) {
    // Ignore - version will use default value
  }

  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
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
  background: var(--bg-tertiary);
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
  color: var(--text-primary);
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
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
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
  background: var(--bg-tertiary);
  color: var(--text-inverse);
}

.btn-primary:hover {
  background: var(--bg-hover);
  opacity: 1;
}

#add-connection-btn {
  height: 40px;
  min-width: 88px;
  min-height: 40px;
  gap: 2px;
  padding: 4px 16px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-inverse);
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  white-space: nowrap;
}

#add-connection-btn:hover {
  background: var(--bg-hover);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-inverse);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.btn-danger {
  background: var(--bg-tertiary);
  color: var(--text-inverse);
}

.btn-danger:hover {
  background: var(--bg-hover);
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
  max-width: 100%;
  height: 40px;
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
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
  background: var(--bg-tertiary);
  color: var(--text-inverse);
  border: 1px solid transparent;
}

.btn-vpn:hover {
  background: var(--bg-hover);
  border-color: transparent;
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
