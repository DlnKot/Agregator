<template>
  <div class="settings-section">
    <h3>Настройки RDP</h3>

    <div class="form-group">
      <label for="rdp-resolution">Разрешение</label>
      <select id="rdp-resolution" v-model="localSettings.rdp.resolution">
        <option value="800x600">800x600</option>
        <option value="1920x1080">1920x1080 (FullHD)</option>
        <option value="1366x768">1366x768</option>
        <option value="1024x768">1024x768</option>
        <option value="1280x720">1280x720 (HD)</option>
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
      <label>Аудио</label>
      <label class="toggle">
        <input type="checkbox" v-model="localSettings.rdp.audio.playback">
        <span class="toggle-slider"></span>
      </label>
      <small>Воспроизведение звука на локальном компьютере</small>
    </div>

    <div class="form-group">
      <label>Микрофон</label>
      <label class="toggle">
        <input type="checkbox" v-model="localSettings.rdp.audio.capture">
        <span class="toggle-slider"></span>
      </label>
      <small>Передача микрофона в удаленную сессию</small>
    </div>

    <div class="form-group">
      <label>Перенаправление</label>
      <label class="toggle">
        <input type="checkbox" v-model="localSettings.rdp.redirect.printers">
        <span class="toggle-slider"></span>
      </label>
      <small>Принтеры</small>
    </div>

    <div class="form-group">
      <label>Смарт-карты</label>
      <label class="toggle">
        <input type="checkbox" v-model="localSettings.rdp.redirect.smartcards">
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="form-group">
      <label>WebAuthn</label>
      <label class="toggle">
        <input type="checkbox" v-model="localSettings.rdp.redirect.webauthn">
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="form-group">
      <label>Производительность</label>
      <label class="toggle">
        <input type="checkbox" v-model="localSettings.rdp.performance.wallpaper">
        <span class="toggle-slider"></span>
      </label>
      <small>Обои</small>
    </div>

    <div class="form-group">
      <label>Сглаживание шрифтов</label>
      <label class="toggle">
        <input type="checkbox" v-model="localSettings.rdp.performance.fontSmoothing">
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="form-group">
      <label>Композиция рабочего стола</label>
      <label class="toggle">
        <input type="checkbox" v-model="localSettings.rdp.performance.desktopComposition">
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="form-group">
      <label>Перетаскивание окна</label>
      <label class="toggle">
        <input type="checkbox" v-model="localSettings.rdp.performance.fullWindowDrag">
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="form-group">
      <label>Анимации меню</label>
      <label class="toggle">
        <input type="checkbox" v-model="localSettings.rdp.performance.menuAnimations">
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="form-group">
      <label for="rdp-custom">Дополнительные параметры (.rdp строки)</label>
      <textarea id="rdp-custom" v-model="localSettings.rdp.customFlags" rows="3"
        placeholder="Например: audiomode:i:1"></textarea>
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
