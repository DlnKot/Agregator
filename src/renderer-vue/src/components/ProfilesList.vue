<template>
  <div v-if="profiles.length === 0" class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
    <h3>Нет профилей</h3>
    <p>Создайте профиль для группировки подключений</p>
  </div>
  
  <div v-else class="profiles-grid">
    <div 
      v-for="profile in profiles" 
      :key="profile.id" 
      class="profile-card"
    >
      <div class="profile-info">
        <h4>{{ escapeHtml(profile.name) }}</h4>
        <p>{{ profile.connections?.length || 0 }} подключений</p>
      </div>
      <div class="profile-actions">
        <button class="btn btn-sm btn-secondary" @click="$emit('launch', profile.id)">Запустить все</button>
        <button class="btn btn-sm btn-icon" @click="$emit('edit', profile)" title="Редактировать">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-icon" @click="$emit('delete', profile.id)" title="Удалить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  profiles: {
    type: Array,
    default: () => []
  },
  connections: {
    type: Array,
    default: () => []
  }
})

defineEmits(['launch', 'edit', 'delete'])

function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
</script>
