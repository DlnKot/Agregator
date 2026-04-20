<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-icon">
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M56 20 A40 40 0 0 0 41 100 L56 20" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M66 16 A40 40 0 0 1 51 96 L66 16" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h3 class="modal-title">RuDesktop не установлен</h3>
      <p class="modal-text">Приложение RuDesktop не найдено на вашем компьютере. Хотите открыть сайт для загрузки?</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" @click="$emit('close')">Нет</button>
        <button class="btn btn-primary" @click="$emit('download')">Да</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close', 'download'])
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: modalSlideIn 200ms ease;
}

.modal {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  padding: 32px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: var(--shadow-lg);
}

.modal-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  color: var(--text-primary);
}

.modal-icon svg {
  width: 100%;
  height: 100%;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.modal-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-xl);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-inverse);
  padding: 12px 24px;
}

.btn-secondary:hover {
  background: var(--bg-hover);
  color: var(--text-inverse);
}

.btn-primary {
  background: #a855f7;
  color: white;
}

.btn-primary:hover {
  background: #9333ea;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
