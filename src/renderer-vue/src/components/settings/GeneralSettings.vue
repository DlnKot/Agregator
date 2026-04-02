<template>
  <div class="settings-section">
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

    <div class="form-group">
      <label>Стандартные подключения</label>
      <button class="btn btn-secondary" type="button" @click="$emit('reset-default-connections')">
        Сбросить к заводским
      </button>
      <small>Сбросит только переименования стандартных подключений. Пользовательские подключения не затрагиваются.</small>
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

defineEmits(['reset-default-connections'])

const localSettings = computed(() => props.settings)
</script>
