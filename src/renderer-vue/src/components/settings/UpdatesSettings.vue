<template>
  <div class="settings-section">
    <h3>Автообновление</h3>

    <UpdateStatusCard
      :app-version="appVersion"
      :update-status="updateStatus"
      :update-progress="updateProgress"
      :update-error="updateError"
      :is-checking="isChecking"
      :is-downloading="isDownloading"
      @check="$emit('check-update')"
      @download="$emit('download-update')"
      @install="$emit('install-update')"
    />

    <div class="form-group update-dev-toggle">
      <label for="updates-use-github">Обновления через GitHub</label>
      <label class="toggle">
        <input type="checkbox" id="updates-use-github" v-model="localSettings.updates.useGithub">
        <span class="toggle-slider"></span>
      </label>
      <small>Если включено, проверка обновлений идет через GitHub Releases. Если выключено — через внутренний сервер.</small>
    </div>

    <div class="update-info-text">
      <p>После загрузки обновления приложение будет перезапущено для установки.</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import UpdateStatusCard from './UpdateStatusCard.vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  },
  appVersion: {
    type: String,
    default: ''
  },
  updateStatus: {
    type: Object,
    default: () => ({})
  },
  updateProgress: {
    type: Object,
    default: () => ({})
  },
  updateError: {
    type: String,
    default: null
  },
  isChecking: {
    type: Boolean,
    default: false
  },
  isDownloading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['check-update', 'download-update', 'install-update'])

const localSettings = computed(() => props.settings)
</script>

<style scoped>
.update-dev-toggle {
  margin-top: 20px;
}

.update-info-text {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.update-info-text p {
  margin: 0;
}
</style>
