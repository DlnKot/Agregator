<template>
  <div class="app">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1>Alfa Remote Client</h1>
      </div>
      <nav class="sidebar-nav">
        <button 
          class="nav-item" 
          :class="{ active: currentView === 'connections' }"
          @click="currentView = 'connections'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          Подключения
        </button>
        <button 
          class="nav-item" 
          :class="{ active: currentView === 'settings' }"
          @click="currentView = 'settings'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
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
          <h2>Подключения</h2>
          <button class="btn btn-primary" id="add-connection-btn" @click="openConnectionModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Добавить подключение
          </button>
        </div>
        
        <div class="client-tabs">
          <button class="client-tab" :class="{ active: currentClientFilter === 'all' }" @click="currentClientFilter = 'all'">Все</button>
          <button class="client-tab" :class="{ active: currentClientFilter === 'rdp' }" @click="currentClientFilter = 'rdp'">RDP</button>
          <button class="client-tab" :class="{ active: currentClientFilter === 'horizon' }" @click="currentClientFilter = 'horizon'">Horizon</button>
          <button class="client-tab" :class="{ active: currentClientFilter === 'citrix' }" @click="currentClientFilter = 'citrix'">Citrix</button>
        </div>
        
        <div id="connections-list" class="connections-list">
            <ConnectionsList 
              :connections="filteredConnections" 
              @launch="handleLaunch"
              @edit="openConnectionModal"
              @delete="handleDeleteConnection"
              @add="openConnectionModal"
            />
        </div>
      </section>

      <!-- Settings View -->
      <section v-if="currentView === 'settings'" id="settings-view" class="view">
        <div class="view-header">
          <h2>Настройки</h2>
        </div>
        
        <SettingsView 
          :settings="settings" 
          @save="handleSaveSettings"
        />
      </section>
    </main>

    <!-- Connection Modal -->
    <ConnectionModal
      v-if="showConnectionModal"
      :connection="editingConnection"
      :default-username="defaultUsername"
      @close="closeConnectionModal"
      @save="handleSaveConnection"
    />

    <!-- First Run Modal -->
    <FirstRunModal
      v-if="isFirstRun"
      @save="handleFirstRunSave"
    />

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

const appVersion = '0.2.1'

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
})
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header h1 {
  font-size: 18px;
  font-weight: 600;
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
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius);
  transition: var(--transition);
  text-align: left;
  width: 100%;
}

.nav-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--bg-tertiary);
  color: var(--accent-primary);
  border-left: 3px solid var(--accent-primary);
  padding-left: 13px;
}

.nav-item svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.version {
  font-size: 12px;
  color: var(--text-muted);
}

/* Main Content */
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
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
  border-radius: var(--radius);
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
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-primary-hover);
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
  gap: 8px;
  margin-bottom: 20px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  width: fit-content;
}

.client-tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.client-tab:hover {
  color: var(--text-primary);
}

.client-tab.active {
  background: var(--accent-primary);
  color: white;
}

.connections-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}
</style>
