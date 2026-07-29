<template>
  <div class="settings-section">
    <h3>Настройки VMware Horizon</h3>

    <!-- Сессия -->
    <div class="settings-group">
      <div class="group-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
        </svg>
        <span>Сессия</span>
      </div>
      <div class="group-body">
        <div class="form-row">
          <div class="form-group flex-1">
            <label for="horizon-protocol">Протокол</label>
            <select id="horizon-protocol" v-model="localSettings.horizon.desktopProtocol">
              <option value="">По умолчанию</option>
              <option value="RDP">RDP</option>
              <option value="PCoIP">PCoIP</option>
              <option value="Blast">Blast</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="horizon-layout">Экран</label>
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
        </div>
      </div>
    </div>

    <!-- Поведение -->
    <div class="settings-group">
      <div class="group-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>Поведение</span>
      </div>
      <div class="group-body">
        <div class="toggle-row">
          <label class="toggle-item">
            <span>Автоподключение при одном ресурсе</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.horizon.singleAutoConnect">
              <span class="toggle-slider"></span>
            </label>
          </label>
        </div>
      </div>
    </div>

    <!-- Дополнительно -->
    <div class="settings-group">
      <div class="group-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span>Дополнительно</span>
      </div>
      <div class="group-body">
        <div class="form-group">
          <label for="horizon-path">Путь к VMware Horizon</label>
          <input type="text" id="horizon-path" v-model="localSettings.horizon.customPath"
            placeholder="C:\Program Files\VMware\...\vmware-view.exe">
        </div>
        <div class="form-group">
          <label for="horizon-custom">Дополнительные флаги</label>
          <textarea id="horizon-custom" v-model="localSettings.horizon.customFlags" rows="3"
            placeholder="Дополнительные флаги"></textarea>
        </div>
      </div>
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
