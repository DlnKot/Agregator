<template>
  <div class="settings-container">
    <div class="settings-tabs" ref="settingsTabsRef">
      <div class="tab-slider" :style="sliderStyle"></div>
      <button v-for="tab in tabs" :key="tab.id" 
        class="settings-tab" 
        :class="{ active: activeTab === tab.id }"
        :ref="el => setTabRef(tab.id, el)"
        @click="activeTab = tab.id">
        {{ tab.label }}
      </button>
    </div>

    <div class="settings-sections">
      <UserSettings v-if="activeTab === 'user'" :settings="localSettings" />
      <RdpSettings v-if="activeTab === 'rdp'" :settings="localSettings" />
      <HorizonSettings v-if="activeTab === 'horizon'" :settings="localSettings" />
      <CitrixSettings v-if="activeTab === 'citrix'" :settings="localSettings" />
      <GeneralSettings 
        v-if="activeTab === 'general'" 
        :settings="localSettings"
        @reset-default-connections="$emit('reset-default-connections')"
      />
      <NetworkSettings v-if="activeTab === 'network'" :settings="localSettings" />
      <UpdatesSettings 
        v-if="activeTab === 'updates'" 
        :settings="localSettings"
        :app-version="appVersion"
        :update-status="updateStatus"
        :update-progress="updateProgress"
        :update-error="updateError"
        :is-checking="isChecking"
        :is-downloading="isDownloading"
        @check-update="$emit('check-update')"
        @download-update="$emit('download-update')"
        @install-update="$emit('install-update')"
      />
    </div>

    <div class="settings-actions">
      <button class="btn btn-primary" @click="saveSettings">Сохранить настройки</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useApp } from '../../composables/useApp'
import { useSettingsForm } from './useSettingsForm'
import versionData from '../../../../version.js'
import './settings-forms.css'

import UserSettings from './UserSettings.vue'
import RdpSettings from './RdpSettings.vue'
import HorizonSettings from './HorizonSettings.vue'
import CitrixSettings from './CitrixSettings.vue'
import GeneralSettings from './GeneralSettings.vue'
import NetworkSettings from './NetworkSettings.vue'
import UpdatesSettings from './UpdatesSettings.vue'

const props = defineProps({
  settings: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['save', 'reset-default-connections', 'check-update', 'download-update', 'install-update'])

const {
  updateStatus,
  updateProgress,
  updateError,
  initAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate
} = useApp()

const { localSettings, initSettings, getSettings } = useSettingsForm()

const isChecking = ref(false)
const isDownloading = ref(false)
const appVersion = ref(versionData.version)

onMounted(async () => {
  initAutoUpdater()

  try {
    const res = await window.api?.getVersion?.()
    const version = res && typeof res === 'object' && res.success === true ? res.data : res
    if (version) appVersion.value = version
  } catch (e) {
    // Ignore
  }

  try {
    const res = await window.api?.getUpdateStatus?.()
    const status = res && typeof res === 'object' && res.success === true ? res.data : res
    if (status) updateStatus.value = status
  } catch (e) {
    // Ignore
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

// Settings tabs slider
const settingsTabsRef = ref(null)
const tabRefs = ref({})

function setTabRef(id, el) {
  if (el) {
    tabRefs.value[id] = el
  }
}

const sliderStyle = computed(() => {
  if (!settingsTabsRef.value) return {}
  
  const currentTabEl = tabRefs.value[activeTab.value]
  if (!currentTabEl) return {}
  
  const containerRect = settingsTabsRef.value.getBoundingClientRect()
  const tabRect = currentTabEl.getBoundingClientRect()
  
  return {
    width: `${tabRect.width}px`,
    transform: `translateX(${tabRect.left - containerRect.left}px)`
  }
})

watch(() => props.settings, (newSettings) => {
  initSettings(newSettings)
}, { immediate: true, deep: true })

function saveSettings() {
  emit('save', getSettings())
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
  position: relative;
}

.tab-slider {
  position: absolute;
  top: 4px;
  left: 0;
  height: calc(100% - 8px);
  background: var(--bg-tertiary);
  border-radius: var(--radius-xl);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
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
  transition: color 0.2s ease;
  position: relative;
  z-index: 1;
}

.settings-tab:hover {
  opacity: 1;
}

.settings-tab.active {
  opacity: 1;
  color: var(--text-inverse);
}

.settings-sections {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
}

.settings-actions {
  flex-shrink: 0;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
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
</style>
