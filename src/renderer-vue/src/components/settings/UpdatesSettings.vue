<template>
  <div class="settings-section">
    <h3>Автообновление</h3>

    <div class="settings-group">
      <div class="group-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path d="M23 4v6h-6"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        <span>Состояние</span>
      </div>
      <div class="group-body">
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
      </div>
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
</script>

<style scoped>
.update-info-text {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-top: 16px;
}

.update-info-text p {
  margin: 0;
}
</style>
