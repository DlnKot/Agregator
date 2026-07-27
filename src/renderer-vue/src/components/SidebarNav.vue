<template>
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <!-- Upper block: Main navigation -->
      <div class="nav-section">
        <button class="nav-item" :class="{ active: currentView === 'connections' }"
          @click="$emit('view-change', 'connections')">
          <img class="nav-item-icon" :src="connectionIcon" alt="">
          Подключения
        </button>
        <button class="nav-item" :class="{ active: currentView === 'settings' }"
          @click="$emit('view-change', 'settings')">
          <img class="nav-item-icon" :src="settingsIcon" alt="">
          Настройки
        </button>

        <!-- Tolk button -->
        <button class="nav-item" @click="handleTolkClick" :disabled="tolkStatus.loading">
          <img class="nav-item-icon" :src="tolkIcon" alt="">
          <span v-if="tolkStatus.loading">Загрузка...</span>
          <span v-else>Толк</span>
        </button>

        <!-- A-Chat button -->
        <button class="nav-item" @click="handleAChatClick" :disabled="aChatStatus.loading">
          <img class="nav-item-icon" :src="achatIcon" alt="">
          <span v-if="aChatStatus.loading">Загрузка...</span>
          <span v-else>А-Чат</span>
        </button>
      </div>

      <!-- Lower block: App launchers -->
      <div class="nav-section nav-section-launchers">

        <button class="nav-item" :class="{ active: currentView === 'help' }" @click="$emit('view-change', 'help')">
          <img class="nav-item-icon" :src="helpIcon" alt="">
          Помощь
        </button>
        <button class="nav-item" :class="{ active: currentView === 'network' }"
          @click="$emit('view-change', 'network')">
          <img class="nav-item-icon" :src="networkIcon" alt="">
          Проверка сети
        </button>

        <!-- RuDesktop launcher button -->
        <div class="nav-item launcher-btn" @click="handleRudesktopClick">
          <div class="launcher-icon">
            <img :src="rudesktopIcon" alt="">
          </div>
          <div class="launcher-info">
            <span class="launcher-name">RuDesktop</span>
            <span v-if="rudesktopStatus.installed" class="launcher-status">
              {{ rudesktopStatus.deviceId || 'ID не получен' }}
            </span>
            <span v-else class="launcher-status not-installed">Не установлено</span>
          </div>
          <button class="launcher-refresh" @click.stop="loadRudesktopStatus" :class="{ loading: isLoadingStatus }"
            title="Обновить статус">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>

        <!-- VPN launcher button -->
        <div class="nav-item launcher-btn"
          :class="{ 'vpn-connected': vpnStatus.connected, loading: vpnStatus.loading, disabled: vpnStatus.platform === 'win32' && !vpnStatus.clientInstalled && !vpnStatus.connected }"
          @click="handleVpnClick">
          <div class="launcher-icon">
            <img :src="vpnIcon" alt="">
          </div>
          <div class="launcher-info">
            <span class="launcher-name">VPN</span>
            <span v-if="vpnStatus.connected" class="launcher-status connected">Подключено</span>
            <span v-else-if="vpnStatus.clientInstalled || vpnStatus.platform === 'macos'"
              class="launcher-status">Нажмите для запуска</span>
            <span v-else class="launcher-status not-installed">Клиент не найден</span>
          </div>
          <button class="launcher-refresh" @click.stop="loadVpnStatus" :class="{ loading: vpnStatus.loading }"
            title="Обновить статус">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Confirm disconnect overlay -->
      <div class="confirm-overlay" v-if="showConfirm" @click.self="cancelDisconnect">
        <div class="confirm-dialog">
          <p class="confirm-title">Отключение от VPN</p>
          <div class="confirm-actions">
            <button class="btn-ghost" @click="cancelDisconnect">Отмена</button>
            <button class="btn-primary" @click="confirmDisconnect">Отключиться</button>
          </div>
        </div>
      </div>
    </nav>

    <div class="sidebar-footer">
      <button class="theme-toggle" type="button" @click="$emit('toggle-theme')"
        :title="theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'">
        <span class="theme-toggle-icon" aria-hidden="true">
          <img v-if="theme === 'dark'" :src="lightThemeIcon" alt="">
          <img v-else :src="darkThemeIcon" alt="">
        </span>
        <span class="theme-toggle-text">{{ theme === 'dark' ? 'Светлая тема' : 'Темная тема' }}</span>
      </button>
      <span class="version">v{{ appVersion }}</span>
    </div>
  </aside>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { launchersApi, appApi } from '../api'
import connectionIcon from '../assets/icons/connection-icon.svg'
import settingsIcon from '../assets/icons/settings-icon.svg'
import tolkIcon from '../assets/icons/tolk-icon.svg'
import achatIcon from '../assets/icons/achat-icon.svg'
import helpIcon from '../assets/icons/help-icon.svg'
import networkIcon from '../assets/icons/network-icon.svg'
import rudesktopIcon from '../assets/icons/rudesktop-icon.svg'
import vpnIcon from '../assets/icons/vpn-icon.svg'
import darkThemeIcon from '../assets/icons/dark-theme-icon.svg'
import lightThemeIcon from '../assets/icons/ligth-theme-icon.svg'

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

const showConfirm = ref(false)

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
    const result = await launchersApi.getRudesktopStatus()
    rudesktopStatus.installed = result.installed
    rudesktopStatus.deviceId = result.deviceId
  } catch (e) {
    console.error('Failed to get RuDesktop status:', e)
  } finally {
    isLoadingStatus.value = false
  }
}

let vpnStatusLoading = false

async function loadVpnStatus() {
  if (vpnStatusLoading) return
  vpnStatusLoading = true
  try {
    const platform = await appApi.getPlatform()
    vpnStatus.platform = platform || 'win32'

    if (vpnStatus.platform === 'macos') {
      vpnStatus.clientInstalled = true
      const status = await launchersApi.vpnStatus()
      vpnStatus.connected = status?.connected || false
    } else {
      const client = await launchersApi.vpnClientStatus()
      vpnStatus.clientInstalled = client?.client_installed || false
      const status = await launchersApi.vpnStatus()
      vpnStatus.connected = status?.connected || false
    }
  } catch (e) {
    console.error('Failed to get VPN status:', e)
  } finally {
    vpnStatusLoading = false
  }
}

async function handleVpnClick() {
  if (vpnStatus.platform === 'macos' || vpnStatus.platform === 'win32') {
    if (!vpnStatus.clientInstalled) {
      console.error('VPN client not installed')
      return
    }
    if (vpnStatus.connected) {
      showConfirm.value = true
    } else {
      emit('show-vpn-modal')
    }
  }
}

function confirmDisconnect() {
  showConfirm.value = false
  vpnStatus.connected = false
  // Fire-and-forget: disconnect runs in background, don't block UI
  launchersApi.vpnDisconnect().catch(() => {})
}

function cancelDisconnect() {
  showConfirm.value = false
}

async function handleRudesktopClick() {
  if (!rudesktopStatus.installed) {
    emit('show-rudesktop-modal')
    return
  }

  try {
    const data = await launchersApi.launchRudesktop()
    emit('rudesktop-launched', data)
    await loadRudesktopStatus()
  } catch (e) {
    console.error('Failed to launch RuDesktop:', e)
    emit('show-rudesktop-modal')
  }
}

async function handleAChatClick() {
  aChatStatus.loading = true
  try {
    await launchersApi.launchAChat()
  } catch (e) {
    emit('show-achat-modal')
  } finally {
    aChatStatus.loading = false
  }
}

async function handleTolkClick() {
  tolkStatus.loading = true
  try {
    await launchersApi.launchTolk()
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
  justify-content: space-between;
  flex-shrink: 0;
  min-height: 0;
}

.sidebar-nav {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px 16px;
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
  font-size: 18px;
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
  gap: 8px;
  padding: 12px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 500;
  letter-spacing: normal / 18;
  cursor: pointer;
  border-radius: 20px;
  transition: var(--transition);
  text-align: left;
  width: 100%;
  height: 56px;
}

.nav-item-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  filter: var(--icon-filter, none);
}

.nav-item:hover {
  background: var(--item-hover-bg);
  color: var(--text-primary);
  transition: var(--transition);
  opacity: 1;
}

.nav-item.active {
  background: var(--item-active-bg);
  color: var(--text-primary);
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

/* Launcher button styles */
.launcher-btn {
  padding: 12px;
  height: 56px;
  color: var(--text-primary);
  position: relative;
}

.launcher-btn:hover {
  background: var(--item-hover-bg);
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
  width: 32px;
  height: 32px;
  color: var(--text-primary);
  flex-shrink: 0;
}

.launcher-icon img {
  filter: var(--icon-filter, none);
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
  background: var(--item-hover-bg);
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
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
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
  background: var(--toggle-hover-bg, var(--bg-tertiary));
  color: var(--text-inverse);
}

.theme-toggle-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle-icon img,
.theme-toggle-icon svg {
  width: 18px;
  height: 18px;
  display: block;
  filter: var(--icon-filter, none);
  opacity: var(--toggle-icon-opacity, 1);
  transition: var(--transition);
}

.theme-toggle:hover .theme-toggle-icon img,
.theme-toggle:hover .theme-toggle-icon svg {
  opacity: 1;
}

.theme-toggle-text {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

/* Confirm disconnect dialog */
.confirm-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.confirm-dialog {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 28px 32px;
  width: 320px;
  box-shadow: 0 14px 38px rgba(17, 24, 39, 0.14);
  animation: confirmFadeIn 200ms ease;
}

@keyframes confirmFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.confirm-title {
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 700;
  font-size: 18px;
  line-height: 24px;
  color: rgba(3, 3, 6, 0.88);
  margin: 0 0 24px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.confirm-actions .btn-ghost,
.confirm-actions .btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 20px;
  min-width: 104px;
  height: 44px;
  border: none;
  border-radius: 999px;
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 500;
  font-size: 15px;
  line-height: 20px;
  cursor: pointer;
  transition: opacity 150ms ease;
  white-space: nowrap;
}

.confirm-actions .btn-ghost {
  background: transparent;
  border: 1px solid rgba(4, 4, 21, 0.47);
  color: rgba(3, 3, 6, 0.88);
}

.confirm-actions .btn-ghost:hover {
  opacity: 0.85;
}

.confirm-actions .btn-primary {
  background: #212124;
  color: rgba(255, 255, 255, 0.94);
}

.confirm-actions .btn-primary:hover {
  opacity: 0.9;
}

/* ---- Dark Theme ---- */
html[data-theme="dark"] .confirm-dialog {
  background: var(--bg-secondary);
}

html[data-theme="dark"] .confirm-title {
  color: var(--text-primary);
}

html[data-theme="dark"] .confirm-actions .btn-ghost {
  border-color: var(--border-color);
  color: var(--text-primary);
}
</style>
