<template>
  <div v-if="show" class="modal-backdrop" @mousedown="onOverlayMouseDown" @click="onOverlayClick">
    <div class="modal" @mousedown.stop @click.stop>
      <div class="modal-header">
        <div class="header-spacer"></div>
        <button class="modal-close-btn" @click="$emit('close')" aria-label="Закрыть">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="system-message">
          <div class="message-graphic">
            <div class="icon-view">
              <img :src="iconSrc" alt="" class="app-icon" />
            </div>
          </div>

          <h2 class="message-title">{{ title }}</h2>

          <p class="message-subtitle">{{ message }}</p>

          <div class="message-actions">
            <button class="btn btn-primary" @click="$emit('confirm')">{{ confirmLabel }}</button>
            <button class="btn btn-ghost" @click="$emit('close')">{{ cancelLabel }}</button>
          </div>
        </div>
      </div>

      <div class="modal-footer"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import iconPath from '../assets/icons/Not-installed-icon.png'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'RuDesktop не установлен' },
  message: { type: String, default: 'Приложение RuDesktop не найдено на вашем компьютере. Хотите открыть сайт для загрузки?' },
  confirmLabel: { type: String, default: 'Да' },
  cancelLabel: { type: String, default: 'Нет' }
})

defineEmits(['close', 'confirm'])

const iconSrc = iconPath

const overlayMouseDown = ref(false)
const overlayDown = ref({ x: 0, y: 0 })

function onOverlayMouseDown(e) {
  overlayMouseDown.value = true
  overlayDown.value = { x: e.clientX || 0, y: e.clientY || 0 }
}

function onOverlayClick(e) {
  if (!overlayMouseDown.value) return
  overlayMouseDown.value = false
  const sel = window.getSelection?.()?.toString?.() || ''
  if (sel) return
  const dx = Math.abs((e.clientX || 0) - (overlayDown.value.x || 0))
  const dy = Math.abs((e.clientY || 0) - (overlayDown.value.y || 0))
  if (dx > 3 || dy > 3) return
  emit('close')
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: 600px;
  background: var(--bg-secondary, #FFFFFF);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 14px 38px rgba(17, 24, 39, 0.14);
  animation: modalSlideIn 200ms ease;
  overflow: hidden;
}

@keyframes modalSlideIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---- Header ---- */
.modal-header {
  padding: 28px 28px 0;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-end;
  flex-shrink: 0;
}

.header-spacer {
  flex: 1;
}

.modal-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  background: transparent;
  color: var(--text-primary, rgba(3, 3, 6, 0.88));
  border-radius: 50px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 150ms ease;
}

.modal-close-btn:hover {
  background: var(--bg-tertiary, rgba(0, 0, 0, 0.06));
}

/* ---- Body ---- */
.modal-body {
  padding: 0 40px;
  flex: 1;
  overflow-y: auto;
}

.system-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 24px 24px;
}

.message-graphic {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 0 24px;
}

.icon-view {
  width: 80px;
  min-width: 80px;
  max-width: 80px;
  height: 80px;
  min-height: 80px;
  max-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-icon {
  width: 80px;
  height: 80px;
  object-fit: contain;
}

.message-title {
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 700;
  font-size: 22px;
  line-height: 26px;
  text-align: center;
  color: var(--text-primary, rgba(3, 3, 6, 0.88));
  margin: 0 0 16px;
  width: 100%;
}

.message-subtitle {
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 24px;
  text-align: center;
  color: var(--text-secondary, rgba(3, 3, 6, 0.88));
  margin: 0 0 12px;
  width: 100%;
}

.message-actions {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 0 0;
  width: 100%;
}

/* ---- Footer ---- */
.modal-footer {
  height: 40px;
  flex-shrink: 0;
}

/* ---- Buttons ---- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 20px;
  min-width: 104px;
  height: 48px;
  min-height: 48px;
  border: none;
  border-radius: 999px;
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 500;
  font-size: 16px;
  line-height: 20px;
  letter-spacing: -0.05px;
  cursor: pointer;
  transition: opacity 150ms ease;
  white-space: nowrap;
}

.btn:hover {
  opacity: 0.9;
}

.btn-primary {
  background: #212124;
  color: rgba(255, 255, 255, 0.94);
}

.btn-ghost {
  background: rgba(15, 25, 55, 0.1);
  backdrop-filter: blur(40px);
  color: var(--text-primary, rgba(3, 3, 6, 0.88));
}
</style>
