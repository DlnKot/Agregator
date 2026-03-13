<template>
  <div class="settings-container">
    <div class="settings-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="settings-tab" 
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>
    
    <div class="settings-sections">
      <!-- RDP Settings -->
      <div v-if="activeTab === 'rdp'" class="settings-section active" data-section="rdp">
        <h3>Настройки RDP</h3>
        
        <div class="form-group">
          <label for="rdp-resolution">Разрешение</label>
          <select id="rdp-resolution" v-model="localSettings.rdp.resolution">
            <option value="1920x1080">1920x1080</option>
            <option value="1366x768">1366x768</option>
            <option value="1024x768">1024x768</option>
            <option value="fullscreen">Полный экран</option>
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
          <textarea id="rdp-custom" v-model="localSettings.rdp.customFlags" rows="3" placeholder="Например: audiomode:i:1"></textarea>
        </div>
      </div>
      
      <!-- Horizon Settings -->
      <div v-if="activeTab === 'horizon'" class="settings-section active" data-section="horizon">
        <h3>Настройки VMware Horizon</h3>
        
        <div class="form-group">
          <label for="horizon-server">URL сервера (--serverURL)</label>
          <input type="text" id="horizon-server" v-model="localSettings.horizon.serverUrl" placeholder="https://horizon.company.com">
        </div>
        
        <div class="form-group">
          <label for="horizon-desktop">Desktop Name (--desktopName)</label>
          <input type="text" id="horizon-desktop" v-model="localSettings.horizon.desktopName" placeholder="Имя десктопа или пула">
        </div>
        
        <div class="form-group">
          <label for="horizon-app">Application (--appName)</label>
          <input type="text" id="horizon-app" v-model="localSettings.horizon.appName" placeholder="Имя приложения для запуска">
        </div>
        
        <div class="form-group">
          <label for="horizon-username">User Name (--userName)</label>
          <input type="text" id="horizon-username" v-model="localSettings.horizon.userName" placeholder="username">
        </div>
        
        <div class="form-group">
          <label for="horizon-domain">Domain (--domainName)</label>
          <input type="text" id="horizon-domain" v-model="localSettings.horizon.domainName" placeholder="DOMAIN">
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
          <label for="horizon-path">Путь к VMware Horizon (ручное указание)</label>
          <input type="text" id="horizon-path" v-model="localSettings.horizon.customPath" placeholder="C:\Program Files\VMware\...\vmware-view.exe">
        </div>
        
        <div class="form-group">
          <label for="horizon-custom">Дополнительные параметры</label>
          <textarea id="horizon-custom" v-model="localSettings.horizon.customFlags" rows="3" placeholder="Дополнительные флаги"></textarea>
        </div>
      </div>
      
      <!-- Citrix Settings -->
      <div v-if="activeTab === 'citrix'" class="settings-section active" data-section="citrix">
        <h3>Настройки Citrix Workspace</h3>
        
        <div class="form-group">
          <label for="citrix-store">Store URL</label>
          <input type="text" id="citrix-store" v-model="localSettings.citrix.storeUrl" placeholder="https://store.company.com/Citrix/Store">
        </div>
        
        <div class="form-group">
          <label for="citrix-resource">Ресурс / Published App (-launch)</label>
          <input type="text" id="citrix-resource" v-model="localSettings.citrix.resourceName" placeholder="Например: Desktop">
        </div>
        
        <div class="form-group">
          <label for="citrix-path">Путь к Citrix Workspace (ручное указание)</label>
          <input type="text" id="citrix-path" v-model="localSettings.citrix.customPath" placeholder="C:\Program Files\Citrix\...\selfservice.exe">
        </div>
        
        <div class="form-group">
          <label for="citrix-custom">Дополнительные параметры selfservice</label>
          <textarea id="citrix-custom" v-model="localSettings.citrix.customFlags" rows="3" placeholder="Например: -logon"></textarea>
        </div>
      </div>
      
      <!-- General Settings -->
      <div v-if="activeTab === 'general'" class="settings-section active" data-section="general">
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
      </div>
    </div>
    
    <div class="settings-actions">
      <button class="btn btn-primary" @click="saveSettings">Сохранить настройки</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
  settings: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['save'])

const tabs = [
  { id: 'rdp', label: 'RDP' },
  { id: 'horizon', label: 'Horizon' },
  { id: 'citrix', label: 'Citrix' },
  { id: 'general', label: 'Общие' }
]

const activeTab = ref('rdp')

// Default settings structure
const defaultSettings = {
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
    userName: '',
    domainName: '',
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
    resourceName: '',
    customPath: '',
    customFlags: ''
  },
  general: {
    minimizeToTray: false,
    startMinimized: false
  }
}

// Local settings state
const localSettings = reactive(JSON.parse(JSON.stringify(defaultSettings)))

// Watch for settings changes from props
watch(() => props.settings, (newSettings) => {
  if (newSettings && Object.keys(newSettings).length > 0) {
    Object.assign(localSettings, {
      ...defaultSettings,
      ...newSettings
    })
  }
}, { immediate: true, deep: true })

function saveSettings() {
  emit('save', JSON.parse(JSON.stringify(localSettings)))
}
</script>
