<template>
  <div class="settings-section">
    <h3>Настройки VMware Horizon</h3>

    <div class="form-group">
      <label for="horizon-app">Application (--appName)</label>
      <input type="text" id="horizon-app" v-model="localSettings.horizon.appName"
        placeholder="Имя приложения для запуска">
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
      <label for="horizon-path">Путь к VMware Horizon</label>
      <input type="text" id="horizon-path" v-model="localSettings.horizon.customPath"
        placeholder="C:\Program Files\VMware\...\vmware-view.exe">
    </div>

    <div class="form-group">
      <label for="horizon-custom">Дополнительные параметры</label>
      <textarea id="horizon-custom" v-model="localSettings.horizon.customFlags" rows="3"
        placeholder="Дополнительные флаги"></textarea>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const localSettings = computed(() => props.settings)
</script>
