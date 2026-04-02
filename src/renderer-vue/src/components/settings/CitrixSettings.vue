<template>
  <div class="settings-section">
    <h3>Настройки Citrix Workspace</h3>

    <div class="form-group">
      <label for="citrix-account">Account name (macOS createaccount name=)</label>
      <input type="text" id="citrix-account" v-model="localSettings.citrix.accountName"
        placeholder="Store или CorpStore">
      <small>На macOS используется для регистрации StoreFront через citrixreceiver://createaccount</small>
    </div>

    <div class="form-group">
      <label for="citrix-resource">Ресурс / Published App (-launch)</label>
      <input type="text" id="citrix-resource" v-model="localSettings.citrix.resourceName"
        placeholder="Например: Desktop">
    </div>

    <div class="form-group">
      <label for="citrix-path">Путь к Citrix Workspace</label>
      <input type="text" id="citrix-path" v-model="localSettings.citrix.customPath"
        placeholder="C:\Program Files (x86)\Citrix\ICA Client\SelfServicePlugin\SelfService.exe">
    </div>

    <div class="form-group">
      <label for="citrix-custom">Дополнительные параметры selfservice</label>
      <textarea id="citrix-custom" v-model="localSettings.citrix.customFlags" rows="3"
        placeholder="Например: -logon"></textarea>
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
