<template>
  <div class="settings-section">
    <h3>Настройки Citrix Workspace</h3>

    <!-- Параметры подключения -->
    <div class="settings-group">
      <div class="group-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <span>Параметры подключения</span>
      </div>
      <div class="group-body">
        <div class="form-group">
          <label for="citrix-account">Имя учётной записи</label>
          <input type="text" id="citrix-account" v-model="localSettings.citrix.accountName"
            placeholder="Store или CorpStore">
        </div>
        <div class="form-group">
          <label for="citrix-resource">Ресурс / Приложение</label>
          <input type="text" id="citrix-resource" v-model="localSettings.citrix.resourceName"
            placeholder="Например: Desktop">
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
          <label for="citrix-path">Путь к Citrix Workspace</label>
          <input type="text" id="citrix-path" v-model="localSettings.citrix.customPath"
            placeholder="C:\Program Files (x86)\Citrix\ICA Client\SelfServicePlugin\SelfService.exe">
        </div>
        <div class="form-group">
          <label for="citrix-custom">Дополнительные флаги</label>
          <textarea id="citrix-custom" v-model="localSettings.citrix.customFlags" rows="3"
            placeholder="Например: -logon"></textarea>
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
