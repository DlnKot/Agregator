<template>
  <div class="settings-section">
    <h3>Настройки ПУРМС</h3>

    <!-- Экран -->
    <div class="settings-group">
      <div class="group-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <span>Экран</span>
      </div>
      <div class="group-body">
        <div class="form-row">
          <div class="form-group flex-1">
            <label for="rdp-resolution">Разрешение</label>
            <select id="rdp-resolution" v-model="localSettings.rdp.resolution">
              <option value="800x600">800x600</option>
              <option value="1920x1080">1920x1080 (FullHD)</option>
              <option value="1366x768">1366x768</option>
              <option value="1024x768">1024x768</option>
              <option value="1280x720">1280x720 (HD)</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label for="rdp-colors">Глубина цвета</label>
            <select id="rdp-colors" v-model="localSettings.rdp.colorDepth">
              <option value="32">32 бита</option>
              <option value="24">24 бита</option>
              <option value="16">16 бит</option>
            </select>
          </div>
        </div>
        <div class="toggle-row">
          <label class="toggle-item">
            <span>Полноэкранный режим</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.startFullScreen">
              <span class="toggle-slider"></span>
            </label>
          </label>
          <label class="toggle-item">
            <span>Несколько мониторов</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.multimon">
              <span class="toggle-slider"></span>
            </label>
          </label>
          <label class="toggle-item">
            <span>Растянуть на все мониторы</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.span">
              <span class="toggle-slider"></span>
            </label>
          </label>
        </div>
      </div>
    </div>

    <!-- Аудио и устройства -->
    <div class="settings-group">
      <div class="group-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path d="M11 5L6 9H2v6h4l5 4V5z"/>
          <line x1="19.07" y1="4.93" x2="19.07" y2="4.93"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
        <span>Аудио и устройства</span>
      </div>
      <div class="group-body">
        <div class="toggle-row">
          <label class="toggle-item">
            <span>Воспроизведение звука</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.audio.playback">
              <span class="toggle-slider"></span>
            </label>
          </label>
          <label class="toggle-item">
            <span>Микрофон</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.audio.capture">
              <span class="toggle-slider"></span>
            </label>
          </label>
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
