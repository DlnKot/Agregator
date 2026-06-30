<template>
  <Teleport to="body">
    <div v-if="show" class="alert-notification">
      <img :src="greenArrow" alt="" class="alert-icon">
      <span class="alert-message">{{ message }}</span>
      <button class="alert-close" @click="$emit('close')">&times;</button>
    </div>
  </Teleport>
</template>

<script setup>
import greenArrow from '../assets/icons/green-arrow.png'

defineProps({
  show: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: ''
  }
})

defineEmits(['close'])
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
  background: #1C1C1E;
  border-radius: 12px;
  z-index: 3000;
  animation: alertSlideIn 300ms ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
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
}

.alert-message {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
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
