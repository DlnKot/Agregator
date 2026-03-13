<template>
  <div class="modal active" @click.self="$emit('close')">
    <div class="modal-overlay" @click="$emit('close')"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="profile-modal-title">{{ isEditing ? 'Редактировать профиль' : 'Новый профиль' }}</h3>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <form id="profile-form" @submit.prevent="save">
          <input type="hidden" id="profile-id" v-model="form.id">
          
          <div class="form-group">
            <label for="profile-name">Название профиля</label>
            <input type="text" id="profile-name" v-model="form.name" required placeholder="Например: Профиль разработчика">
          </div>
          
          <div class="form-group">
            <label for="profile-connections">Подключения</label>
            <select id="profile-connections" v-model="form.connections" multiple size="5">
              <option v-for="conn in connections" :key="conn.id" :value="conn.id">
                {{ conn.name }} ({{ getTypeLabel(conn.type) }})
              </option>
            </select>
            <small>Выберите подключения (Ctrl+клик для множественного выбора)</small>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Отмена</button>
        <button class="btn btn-primary" @click="save">Сохранить</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps({
  profile: {
    type: Object,
    default: null
  },
  connections: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'save'])

const form = reactive({
  id: '',
  name: '',
  connections: []
})

const isEditing = computed(() => !!props.profile?.id)

function getTypeLabel(type) {
  const labels = { rdp: 'RDP', horizon: 'Horizon', citrix: 'Citrix' }
  return labels[type] || type
}

// Initialize form with profile data
watch(() => props.profile, (newVal) => {
  if (newVal) {
    Object.assign(form, {
      id: newVal.id || '',
      name: newVal.name || '',
      connections: newVal.connections || []
    })
  } else {
    Object.assign(form, {
      id: '',
      name: '',
      connections: []
    })
  }
}, { immediate: true })

function save() {
  if (!form.name) {
    alert('Введите название профиля')
    return
  }
  
  const profileData = {
    id: form.id || Date.now().toString(),
    name: form.name.trim(),
    connections: form.connections
  }
  
  emit('save', profileData)
}
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
}

.modal-content {
  position: relative;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 480px;
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
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.modal-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
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

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-primary-hover);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

/* Forms */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-group input[type="text"],
.form-group select {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  transition: var(--transition);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-group select {
  cursor: pointer;
}

.form-group select[multiple] {
  min-height: 120px;
}

.form-group small {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
