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
        <div class="connection-header-left">
          <span :class="['connection-type', conn.type]">{{ getTypeLabel(conn.type) }}</span>
          <span :class="['connection-status', conn.isUserModified ? 'user-modified' : 'default']">
            {{ conn.isUserModified ? 'Пользовательские' : 'Рекомендуемые' }}
          </span>
        </div>
        <div class="connection-actions">
          <button class="btn btn-icon" @click="$emit('launch', conn.id)" title="Подключиться">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
          <button class="btn btn-icon" @click="$emit('edit', conn)" :title="conn.isDefault ? 'Переименовать' : 'Редактировать'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button v-if="!conn.isDefault" class="btn btn-icon" @click="$emit('delete', conn.id)" title="Удалить">
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

<style scoped>
.connections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  overflow: visible;
}

.connection-card {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  padding: 20px;
  transition: var(--transition);
  cursor: pointer;
}

.connection-card:hover {
  border-color: var(--border-light);
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.connection-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.connection-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.connection-type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.connection-type.rdp {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.connection-type.horizon {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.connection-type.citrix {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.connection-status {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
}

.connection-status.default {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.connection-status.user-modified {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.connection-actions {
  display: flex;
  gap: 4px;
}

.connection-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.connection-host {
  font-size: 13px;
  color: var(--text-primary);
  opacity: 0.8;
  margin-bottom: 12px;
}

.connection-description {
  font-size: 12px;
  color: var(--text-muted);
  opacity: 0.8;
  margin-bottom: 16px;
}

/* Buttons */
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

.btn-icon {
  padding: 8px;
  background: transparent;
  color: var(--text-primary);
}

.btn-icon:hover {
  background: var(--bg-tertiary);
  stroke: var(--text-inverse);
  color: var(--text-inverse);
}


.btn-empty-add {
  min-width: 220px;
  justify-content: center;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-state svg {
  width: 80px;
  height: 80px;
  color: var(--text-muted);
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.empty-state p {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}
</style>
