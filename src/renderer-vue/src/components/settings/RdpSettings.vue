<template>
  <div class="settings-section">
    <h3>Настройки RDP</h3>

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

    <!-- Подключение -->
    <div class="settings-group">
      <div class="group-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <span>Подключение</span>
      </div>
      <div class="group-body">
        <div class="toggle-row">
          <label class="toggle-item">
            <span>Буфер обмена</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.clipboard">
              <span class="toggle-slider"></span>
            </label>
          </label>
          <label class="toggle-item">
            <span>Подключение дисков</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.driveMapping">
              <span class="toggle-slider"></span>
            </label>
          </label>
          <label class="toggle-item">
            <span>Административная сессия</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.useAdminSession">
              <span class="toggle-slider"></span>
            </label>
          </label>
          <label class="toggle-item">
            <span>Запрашивать учётные данные</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.promptCredentials">
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
          <label class="toggle-item">
            <span>Принтеры</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.redirect.printers">
              <span class="toggle-slider"></span>
            </label>
          </label>
          <label class="toggle-item">
            <span>Смарт-карты</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.redirect.smartcards">
              <span class="toggle-slider"></span>
            </label>
          </label>
        </div>
      </div>
    </div>

    <!-- Производительность -->
    <div class="settings-group">
      <div class="group-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        <span>Производительность</span>
      </div>
      <div class="group-body">
        <div class="toggle-row">
          <label class="toggle-item">
            <span>Обои рабочего стола</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.performance.wallpaper">
              <span class="toggle-slider"></span>
            </label>
          </label>
          <label class="toggle-item">
            <span>Сглаживание шрифтов</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.performance.fontSmoothing">
              <span class="toggle-slider"></span>
            </label>
          </label>
          <label class="toggle-item">
            <span>Композиция рабочего стола</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.performance.desktopComposition">
              <span class="toggle-slider"></span>
            </label>
          </label>
          <label class="toggle-item">
            <span>Анимации меню и окон</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.performance.menuAnimations">
              <span class="toggle-slider"></span>
            </label>
          </label>
          <label class="toggle-item">
            <span>Плавное перетаскивание окон</span>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.rdp.performance.fullWindowDrag">
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
          <label for="rdp-custom">Дополнительные параметры (.rdp строки)</label>
          <textarea id="rdp-custom" v-model="localSettings.rdp.customFlags" rows="3"
            placeholder="Например: audiomode:i:1"></textarea>
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
