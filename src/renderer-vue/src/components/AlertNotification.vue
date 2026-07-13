<template>
  <Teleport to="body">
    <div v-if="show" :class="['alert-notification', `alert-${type}`]">
      <div class="alert-badge">
        <div class="alert-badge-circle">
          <svg v-if="type === 'success'" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10.5L8 14.5L16 5.5" stroke="rgba(255,255,255,0.94)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="type === 'error'" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M6 6L14 14M14 6L6 14" stroke="rgba(255,255,255,0.94)" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <svg v-else-if="type === 'warning'" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 6V12M10 14.5V14.51" stroke="rgba(255,255,255,0.94)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 2L18 17H2L10 2Z" stroke="rgba(255,255,255,0.94)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="type === 'info'" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.94)" stroke-width="2"/>
            <path d="M10 8V14M10 6V6.01" stroke="rgba(255,255,255,0.94)" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
      <div class="alert-text">
        <span class="alert-title">{{ message }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  message: { type: String, default: '' },
  type: { type: String, default: 'success', validator: (v) => ['success', 'error', 'warning', 'info'].includes(v) }
})

defineEmits(['close'])
</script>

<style scoped>
.alert-notification {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 4px 0 4px 16px;
  position: fixed;
  right: 24px;
  bottom: 24px;
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

.alert-badge {
  padding: 12px 12px 12px 0;
  flex-shrink: 0;
}

.alert-badge-circle {
  width: 24px;
  min-width: 24px;
  max-width: 24px;
  height: 24px;
  min-height: 24px;
  max-height: 24px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-success .alert-badge-circle {
  background: #0CC44D;
}

.alert-error .alert-badge-circle {
  background: #E54545;
}

.alert-warning .alert-badge-circle {
  background: #F5A623;
}

.alert-info .alert-badge-circle {
  background: #3B82F6;
}

.alert-badge-circle svg {
  display: block;
}

.alert-text {
  padding: 14px 16px 14px 0;
  flex: 1;
  min-width: 0;
}

.alert-title {
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 700;
  font-size: 16px;
  line-height: 20px;
  color: rgba(255, 255, 255, 0.94);
  display: block;
}
</style>
