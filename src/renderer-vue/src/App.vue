<template>
  <div class="app">
    <div class="app-container">
      <div class="header">
        <h1>Alfa Remote Client</h1>
      </div>
      <div class="app-content">
        <!-- Sidebar -->
        <aside class="sidebar">
          <nav class="sidebar-nav">
            <button class="nav-item" :class="{ active: currentView === 'connections' }"
              @click="currentView = 'connections'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Подключения
            </button>
            <button class="nav-item" :class="{ active: currentView === 'settings' }" @click="currentView = 'settings'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Настройки
            </button>
          </nav>
          <div class="sidebar-footer">
            <span class="version">v{{ appVersion }}</span>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
          <!-- Connections View -->
          <section v-if="currentView === 'connections'" id="connections-view" class="view active">
            <div class="view-header">
              <div class="client-tabs">
                <button class="client-tab" :class="{ active: currentClientFilter === 'all' }"
                  @click="currentClientFilter = 'all'">Все</button>
                <button class="client-tab" :class="{ active: currentClientFilter === 'rdp' }"
                  @click="currentClientFilter = 'rdp'">RDP</button>
                <button class="client-tab" :class="{ active: currentClientFilter === 'horizon' }"
                  @click="currentClientFilter = 'horizon'">Horizon</button>
                <button class="client-tab" :class="{ active: currentClientFilter === 'citrix' }"
                  @click="currentClientFilter = 'citrix'">Citrix</button>
                <button class="client-tab vpn-tab" @click="handleVpnClick">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3"></polyline>
                    <line x1="12" y1="12" x2="20" y2="7.5"></line>
                    <line x1="12" y1="12" x2="12" y2="21"></line>
                    <line x1="12" y1="12" x2="4" y2="7.5"></line>
                  </svg>
                  VPN
                </button>
              </div>
              <button class="btn btn-primary" id="add-connection-btn" @click="openConnectionModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Добавить подключение
              </button>
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

            <SettingsView :settings="settings" @save="handleSaveSettings" />
          </section>
        </main>

      </div>
    </div>





    <!-- Connection Modal -->
    <ConnectionModal v-if="showConnectionModal" :connection="editingConnection" :default-username="defaultUsername"
      @close="closeConnectionModal" @save="handleSaveConnection" />

    <!-- First Run Modal -->
    <!-- TODO: Убрать как закончу переделку интерфейса  -->
    <FirstRunModal v-if="false" @save="handleFirstRunSave" />

    <!-- Toast -->
    <div v-if="toast.show" :class="['toast', toast.type]">
      <span class="toast-message">{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useApp } from './composables/useApp.js'
import ConnectionsList from './components/ConnectionsList.vue'
import SettingsView from './components/SettingsView.vue'
import ConnectionModal from './components/ConnectionModal.vue'
import FirstRunModal from './components/FirstRunModal.vue'

const appVersion = ref('0.0.0')  // Will be loaded from API when running in Electron

const {
  connections,
  settings,
  currentView,
  currentClientFilter,
  filteredConnections,
  isFirstRun,
  loadData,
  saveConnection,
  deleteConnection,
  saveSettings,
  launchConnection,
  getUserCredentials
} = useApp()

// Computed default username from settings
const defaultUsername = computed(() => {
  const creds = getUserCredentials()
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
  editingConnection.value = connection ? { ...connection } : null
  showConnectionModal.value = true
}

function closeConnectionModal() {
  showConnectionModal.value = false
  editingConnection.value = null
}

async function handleSaveConnection(connection) {
  try {
    await saveConnection(connection)
    closeConnectionModal()
    showToast('Подключение сохранено', 'success')
  } catch (error) {
    showToast('Ошибка сохранения', 'error')
  }
}

async function handleDeleteConnection(id) {
  if (!confirm('Вы уверены, что хотите удалить это подключение?')) return

  try {
    await deleteConnection(id)
    showToast('Подключение удалено', 'success')
  } catch (error) {
    showToast('Ошибка удаления', 'error')
  }
}

// Launch handlers
async function handleLaunch(id) {
  const conn = connections.value.find(c => c.id === id)
  if (!conn) return

  const result = await launchConnection(conn)
  if (result && result.success) {
    showToast('Клиент запущен', 'success')
  } else {
    showToast(result?.error || 'Ошибка запуска', 'error')
  }
}

// VPN handler - launching bank VPN
async function handleVpnClick() {
  try {
    // TODO: Implement VPN launch logic
    // This will typically call a VPN connection or script
    // For now, show a placeholder message
    showToast('VPN функция будет реализована в будущих версиях', 'info')
  } catch (error) {
    showToast('Ошибка при подключении к VPN', 'error')
  }
}

// Settings
async function handleSaveSettings(newSettings) {
  try {
    await saveSettings(newSettings)
    showToast('Настройки сохранены', 'success')
  } catch (error) {
    showToast('Ошибка сохранения настроек', 'error')
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
  await loadData()

  // Load app version from main process
  try {
    const version = await window.api.getVersion?.()
    if (version) {
      appVersion.value = version
    }
  } catch (e) {
    // Ignore - version will use default value
  }
})
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
  border-radius: var(--radius);
  /* background: var(--bg-primary); */
  /* box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); */
}

.app-content {
  display: flex;
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  /* height: 100%; */
  background: var(--bg-secondary);
  margin: 10px;
  border-radius: 30px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.header {
  background: var(--bg-secondary);
  padding: 20px 10px;
  margin: 10px;
  display: flex;
  align-items: center;
  border-radius: 30px;
  margin-bottom: 5px;
}

.header h1 {
  font-size: 24px;
  margin-inline: 10px;
  font-weight: 500;
  color: var(--text-primary);
}

.sidebar-nav {
  flex: 1;
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
  color: var(--text-secondary);
  transition: var(--transition);
  opacity: 0.9;
}

.nav-item.active {
  background: var(--accent-danger);
  color: var(--accent-primary);
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
}

.version {
  font-size: 12px;
  margin-inline: 10px;
  color: var(--text-muted);
}

/* Main Content */
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-radius: 30px;
  margin-block: 10px;
  margin-right: 10px;
}

.view {
  /* display: none; */
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  padding: 24px;
}

.view.active {
  display: flex;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.view-header h2 {
  font-size: 24px;
  font-weight: 600;
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
  color: white;
}

.btn-primary:hover {
  background: var(--bg-tertiary);
  opacity: 0.9;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.btn-danger {
  background: var(--accent-danger);
  color: white;
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
  transition: var(--transition);
}

.client-tab:hover {
  color: var(--text-primary);
}

.client-tab.active {
  background: var(--bg-tertiary);
  color: white;
}

.vpn-tab {
  margin-left: auto;
  background: var(--accent-secondary, #e74c3c);
  color: white;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.vpn-tab:hover {
  background: var(--accent-secondary-hover, #c0392b);
  color: white;
}

.vpn-tab svg {
  width: 16px;
  height: 16px;
}

.connections-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}
</style>
