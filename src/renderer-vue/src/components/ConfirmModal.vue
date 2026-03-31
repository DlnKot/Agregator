<template>
  <div class="modal active" tabindex="-1" @keydown.esc.prevent="cancel" @keydown.enter.prevent="confirm">
    <div class="modal-overlay" @mousedown="onOverlayMouseDown" @click="onOverlayClick"></div>
    <div class="modal-content" @mousedown.stop @click.stop>
      <div class="modal-header">
        <h3 id="modal-title">{{ title }}</h3>
        <button class="modal-close" type="button" @click="cancel">&times;</button>
      </div>

      <div class="modal-body">
        <p class="modal-text">{{ message }}</p>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" type="button" @click="cancel">{{ cancelText }}</button>
        <button ref="confirmBtn" class="btn btn-primary" type="button" @click="confirm">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Подтверждение'
  },
  message: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: 'ОК'
  },
  cancelText: {
    type: String,
    default: 'Отмена'
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const confirmBtn = ref(null)

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

  cancel()
}

function onWindowMouseUp() {
  overlayMouseDown.value = false
}

function confirm() {
  emit('confirm')
}

function cancel() {
  emit('cancel')
}

onMounted(() => {
  window.addEventListener('mouseup', onWindowMouseUp)
  nextTick(() => {
    try { confirmBtn.value?.focus?.() } catch { /* ignore */ }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('mouseup', onWindowMouseUp)
})
</script>

<style scoped>
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  align-items: center;
  justify-content: center;
}

.modal.active {
  display: flex;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1;
}

.modal-content {
  position: relative;
  z-index: 2;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  animation: modalSlideIn 200ms ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: var(--transition);
}

.modal-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-inverse);
}

.modal-body {
  padding: 24px;
}

.modal-text {
  margin: 0;
  color: var(--text-inverse);
  font-size: 14px;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.btn-primary {
  background: var(--accent-primary);
  color: #0b1220;
}

.btn-primary:hover {
  background: var(--accent-primary-hover);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-inverse);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-primary);
}
</style>
