<template>
  <Teleport to="body">
    <div v-if="show" :class="['alert-notification', `alert-${type}`]">
      <span class="alert-icon" v-html="icon"></span>
      <span class="alert-message">{{ message }}</span>
      <button class="alert-close" @click="$emit('close')">&times;</button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'success',
    validator: (v) => ['success', 'error', 'warning', 'info'].includes(v)
  }
})

defineEmits(['close'])

const icons = {
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
}

const icon = computed(() => icons[props.type] || icons.success)
</script>

<style scoped>
.alert-notification {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 4px 0px 4px 16px;
  gap: 12px;
  position: fixed;
  bottom: 24px;
  right: 24px;
  min-width: 231px;
  height: 56px;
  width: auto;
  border-radius: 12px;
  z-index: 3000;
  animation: alertSlideIn 300ms ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.alert-success {
  background: #065f46;
  color: #ffffff;
}

.alert-error {
  background: #991b1b;
  color: #ffffff;
}

.alert-warning {
  background: #92400e;
  color: #ffffff;
}

.alert-info {
  background: #1e3a5f;
  color: #ffffff;
}

@keyframes alertSlideIn {
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.alert-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-icon svg {
  width: 20px;
  height: 20px;
}

.alert-message {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 500;
  color: inherit;
  flex: 1;
  min-width: 0;
}

.alert-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 20px;
  cursor: pointer;
  border-radius: 8px;
  transition: 150ms ease;
  flex-shrink: 0;
}

.alert-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}
</style>
