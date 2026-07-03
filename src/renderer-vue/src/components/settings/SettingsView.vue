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
      <GeneralSettings 
        v-if="activeTab === 'general'" 
        :settings="localSettings"
        @reset-default-connections="$emit('reset-default-connections')"
      />
      <RdpSettings v-if="activeTab === 'rdp'" :settings="localSettings" />
      <HorizonSettings v-if="activeTab === 'horizon'" :settings="localSettings" />
      <CitrixSettings v-if="activeTab === 'citrix'" :settings="localSettings" />
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
import { appApi, updatesApi } from '../../api'
import versionData from '../../../../version.js'
import './settings-forms.css'

import GeneralSettings from './GeneralSettings.vue'
import RdpSettings from './RdpSettings.vue'
import HorizonSettings from './HorizonSettings.vue'
import CitrixSettings from './CitrixSettings.vue'
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
    const version = await appApi.getVersion()
    if (version) appVersion.value = version
  } catch (e) {
    // Ignore
  }

  try {
    const status = await updatesApi.getUpdateStatus()
    if (status) updateStatus.value = status
  } catch (e) {
    // Ignore
  }

  // Fix slider position on first open
  await fixSliderOnMount()
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
  { id: 'general', label: 'Общие' },
  { id: 'rdp', label: 'RDP' },
  { id: 'horizon', label: 'Horizon' },
  { id: 'citrix', label: 'Citrix' },
  { id: 'updates', label: 'Обновление' }
]

const activeTab = ref('general')

// Settings tabs slider
const settingsTabsRef = ref(null)
const tabRefs = ref({})

function setTabRef(id, el) {
  if (el) {
    tabRefs.value[id] = el
  }
}

const sliderStyle = computed(() => {
  if (!settingsTabsRef.value) return { opacity: '0' }

  const currentTabEl = tabRefs.value[activeTab.value]
  if (!currentTabEl) return { opacity: '0' }

  const containerRect = settingsTabsRef.value.getBoundingClientRect()
  const tabRect = currentTabEl.getBoundingClientRect()

  return {
    width: `${tabRect.width}px`,
    transform: `translateX(${tabRect.left - containerRect.left}px)`,
    opacity: '1'
  }
})

// Force slider recalculation on mount — fixes first-open positioning
async function fixSliderOnMount() {
  await nextTick()
  const current = activeTab.value
  activeTab.value = ''
  await nextTick()
  activeTab.value = current
}

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
  padding: 2px;
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  width: fit-content;
  max-width: 100%;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border-color);
  height: 40px;
}

.tab-slider {
  position: absolute;
  top: 1px;
  left: 0;
  height: 36px;
  background: var(--tab-slider-bg);
  border: 0.5px solid var(--tab-slider-border);
  border-radius: var(--radius-xl);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}

.settings-tab {
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

.settings-tab:hover {
  color: var(--tab-text-inactive);
}

.settings-tab.active {
  color: var(--tab-text-active);
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
