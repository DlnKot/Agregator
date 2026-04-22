<template>
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <!-- Upper block: Main navigation -->
      <div class="nav-section">
        <button class="nav-item" :class="{ active: currentView === 'connections' }"
          @click="$emit('view-change', 'connections')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          Подключения
        </button>
        <button class="nav-item" :class="{ active: currentView === 'settings' }"
          @click="$emit('view-change', 'settings')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Настройки
        </button>

        <!-- Tolk button -->
        <button class="nav-item" @click="handleTolkClick" :disabled="tolkStatus.loading">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span v-if="tolkStatus.loading">Загрузка...</span>
          <span v-else>Толк</span>
        </button>

        <!-- A-Chat button -->
        <button class="nav-item" @click="handleAChatClick" :disabled="aChatStatus.loading">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span v-if="aChatStatus.loading">Загрузка...</span>
          <span v-else>А-Чат</span>
        </button>
      </div>

      <!-- Lower block: App launchers -->
      <div class="nav-section nav-section-launchers">

        <button class="nav-item" :class="{ active: currentView === 'help' }" @click="$emit('view-change', 'help')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
            stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
          Помощь
        </button>
        <button class="nav-item" :class="{ active: currentView === 'network' }"
          @click="$emit('view-change', 'network')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19v-7"></path>
            <path d="M8 19v-11"></path>
            <path d="M12 19v-4"></path>
            <path d="M16 19v-9"></path>
            <path d="M20 19v-13"></path>
          </svg>
          Проверка сети
        </button>

        <!-- RuDesktop launcher button -->
        <div class="nav-item launcher-btn" @click="handleRudesktopClick">
          <div class="launcher-icon">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M56 20 A40 40 0 0 0 41 100 L56 20" stroke="currentColor" stroke-width="3" stroke-linecap="round"
                stroke-linejoin="round" />
              <path d="M66 16 A40 40 0 0 1 51 96 L66 16" stroke="currentColor" stroke-width="3" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </div>
          <div class="launcher-info">
            <span class="launcher-name">RuDesktop</span>
            <span v-if="rudesktopStatus.installed" class="launcher-status">
              {{ rudesktopStatus.deviceId || 'ID не получен' }}
            </span>
            <span v-else class="launcher-status not-installed">Не установлено</span>
          </div>
          <button 
            class="launcher-refresh" 
            @click.stop="loadRudesktopStatus" 
            :class="{ loading: isLoadingStatus }"
            title="Обновить статус"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>

        <!-- VPN launcher button -->
        <div 
          class="nav-item launcher-btn" 
          :class="{ 'vpn-connected': vpnStatus.connected, loading: vpnStatus.loading, disabled: vpnStatus.platform === 'win32' && !vpnStatus.clientInstalled && !vpnStatus.connected }"
          @click="handleVpnClick"
        >
          <div class="launcher-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path v-if="vpnStatus.connected" d="M9 12l2 2 4-4"></path>
            </svg>
          </div>
          <div class="launcher-info">
            <span class="launcher-name">VPN</span>
            <span v-if="vpnStatus.connected" class="launcher-status connected">Подключено</span>
            <span v-else-if="vpnStatus.clientInstalled || vpnStatus.platform === 'darwin'" class="launcher-status">Нажмите для запуска</span>
            <span v-else class="launcher-status not-installed">Клиент не найден</span>
          </div>
          <button 
            class="launcher-refresh" 
            @click.stop="loadVpnStatus" 
            :class="{ loading: vpnStatus.loading }"
            title="Обновить статус"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
      </div>
    </nav>

    <div class="sidebar-footer">
      <button class="theme-toggle" type="button" @click="$emit('toggle-theme')"
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
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const props = defineProps({
  currentView: {
    type: String,
    default: 'connections'
  },
  theme: {
    type: String,
    default: 'light'
  },
  appVersion: {
    type: String,
    default: '1.0.0'
  }
})

const emit = defineEmits(['view-change', 'toggle-theme', 'rudesktop-launched', 'show-rudesktop-modal', 'show-vpn-modal', 'show-tolk-modal', 'show-achat-modal'])

const rudesktopStatus = reactive({
  installed: false,
  deviceId: null
})

const vpnStatus = reactive({
  clientInstalled: false,
  connected: false,
  loading: false,
  platform: 'win32'
})

const aChatStatus = reactive({
  installed: false,
  loading: false
})

const tolkStatus = reactive({
  installed: false,
  loading: false
})

const isLoadingStatus = ref(false)

async function loadRudesktopStatus() {
  isLoadingStatus.value = true
  try {
    if (window.api?.getRudesktopStatus) {
      const result = await window.api.getRudesktopStatus()
      if (result.success && result.data) {
        rudesktopStatus.installed = result.data.installed
        rudesktopStatus.deviceId = result.data.deviceId
      }
    }
  } catch (e) {
    console.error('Failed to get RuDesktop status:', e)
  } finally {
    isLoadingStatus.value = false
  }
}

async function loadVpnStatus() {
  try {
    const platformResult = await window.api?.getPlatform?.()
    vpnStatus.platform = platformResult?.success ? platformResult.data : 'win32'
    
    if (vpnStatus.platform === 'darwin') {
      vpnStatus.clientInstalled = true
      if (window.api?.vpnStatus) {
        const statusResult = await window.api.vpnStatus()
        if (statusResult.success) {
          vpnStatus.connected = statusResult.data?.connected || false
        }
      }
    } else {
      if (window.api?.vpnClientStatus) {
        const clientResult = await window.api.vpnClientStatus()
        if (clientResult.success) {
          vpnStatus.clientInstalled = clientResult.data?.installed || false
        }
      }
      if (window.api?.vpnStatus) {
        const statusResult = await window.api.vpnStatus()
        if (statusResult.success) {
          vpnStatus.connected = statusResult.data?.connected || false
        }
      }
    }
  } catch (e) {
    console.error('Failed to get VPN status:', e)
  }
}

async function handleVpnClick() {
  vpnStatus.loading = true
  try {
    if (vpnStatus.platform === 'darwin') {
      const result = await window.api?.launchVpn?.()
      if (result?.success) {
        // On macOS we can't track connection status easily
      }
    } else if (vpnStatus.platform === 'win32') {
      if (!vpnStatus.clientInstalled) {
        console.error('VPN client not installed')
        return
      }
      if (vpnStatus.connected) {
        const result = await window.api.vpnDisconnect()
        if (result.success) {
          vpnStatus.connected = false
        }
      } else {
        emit('show-vpn-modal')
      }
    }
  } catch (e) {
    console.error('VPN toggle error:', e)
  } finally {
    vpnStatus.loading = false
  }
}

async function handleRudesktopClick() {
  // Если не установлен - показать модалку через emit
  if (!rudesktopStatus.installed) {
    emit('show-rudesktop-modal')
    return
  }

  try {
    if (window.api?.launchRudesktop) {
      const result = await window.api.launchRudesktop()
      if (result.success) {
        emit('rudesktop-launched', result.data)
        await loadRudesktopStatus()
      } else if (result.details?.needsInstall) {
        emit('show-rudesktop-modal')
      }
    }
  } catch (e) {
    console.error('Failed to launch RuDesktop:', e)
  }
}

async function handleAChatClick() {
  aChatStatus.loading = true
  try {
    const result = await window.api?.launchAChat?.()
    if (result?.success) {
      return
    }
    emit('show-achat-modal')
  } catch (e) {
    emit('show-achat-modal')
  } finally {
    aChatStatus.loading = false
  }
}

async function handleTolkClick() {
  tolkStatus.loading = true
  try {
    const result = await window.api?.launchTolk?.()
    if (result?.success) {
      return
    }
    emit('show-tolk-modal')
  } catch (e) {
    emit('show-tolk-modal')
  } finally {
    tolkStatus.loading = false
  }
}

onMounted(() => {
  loadRudesktopStatus()
  loadVpnStatus()
})

defineExpose({
  loadRudesktopStatus,
  loadVpnStatus
})
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-radius: 30px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
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

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-section-launchers {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.launchers-header {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  padding: 8px 16px 4px;
  margin-bottom: 4px;
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

.nav-item.placeholder {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-item.placeholder:hover {
  background: transparent;
  color: var(--text-primary);
  opacity: 0.4;
}

.nav-item svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Launcher button styles */
.launcher-btn {
  padding: 10px 16px;
  /* background: var(--bg-tertiary); */
  color: var(--text-primary);
  position: relative;
}

.launcher-btn:hover {
  background: rgba(168, 85, 247, 0.15);
}

.launcher-btn.vpn-connected {
  background: rgba(34, 197, 94, 0.15);
}

.launcher-btn.vpn-connected .launcher-icon {
  color: #22c55e;
}

.launcher-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.launcher-status.connected {
  color: #22c55e;
}

.launcher-icon {
  width: 28px;
  height: 28px;
  color: var(--text-primary);
  flex-shrink: 0;
}

.launcher-icon svg {
  width: 100%;
  height: 100%;
}

.launcher-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.launcher-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.launcher-status {
  font-size: 11px;
  color: var(--text-secondary);
}

.launcher-status.not-installed {
  color: #d97706;
}

.launcher-refresh {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  padding: 4px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transition: var(--transition);
}

.launcher-btn:hover .launcher-refresh {
  opacity: 1;
}

.launcher-refresh:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.launcher-refresh.loading svg {
  animation: spin 1s linear infinite;
}

.launcher-refresh svg {
  width: 100%;
  height: 100%;
  display: block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Sidebar footer */
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
</style>
