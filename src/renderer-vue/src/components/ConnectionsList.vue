<template>
  <div v-if="connections.length === 0" class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
    <h3>Нет подключений</h3>
    <p>Добавьте первое подключение для быстрого доступа к удалённым рабочим столам</p>
    <button class="btn btn-primary btn-empty-add" @click="$emit('add')">+ Добавить подключение</button>
  </div>
  
  <div v-else class="connections-grid">
    <div 
      v-for="conn in connections" 
      :key="conn.id" 
      class="connection-card"
    >
      <div class="connection-card-header">
        <span :class="['connection-type', conn.type]">{{ getTypeLabel(conn.type) }}</span>
        <div class="connection-actions">
          <button class="btn btn-icon" @click="$emit('launch', conn.id)" title="Подключиться">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
          <button class="btn btn-icon" @click="$emit('edit', conn)" title="Редактировать">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn btn-icon" @click="$emit('delete', conn.id)" title="Удалить">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
      <h3 class="connection-name">{{ escapeHtml(conn.name) }}</h3>
      <p class="connection-host">{{ escapeHtml(conn.host) }}</p>
      <p v-if="conn.description" class="connection-description">{{ escapeHtml(conn.description) }}</p>
      <div class="connection-footer">
        <div class="connection-status">
          <span class="status-dot"></span>
          <span>Готово</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  connections: {
    type: Array,
    default: () => []
  }
})

defineEmits(['launch', 'edit', 'delete', 'add'])

function getTypeLabel(type) {
  const labels = {
    rdp: 'RDP',
    horizon: 'Horizon',
    citrix: 'Citrix'
  }
  return labels[type] || type
}

function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
</script>
