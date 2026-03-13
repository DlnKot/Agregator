<template>
  <div class="modal active" @click.self="$emit('close')">
    <div class="modal-overlay" @click="$emit('close')"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="modal-title">{{ isEditing ? 'Редактировать подключение' : 'Новое подключение' }}</h3>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <form id="connection-form" @submit.prevent="save">
          <input type="hidden" id="connection-id" v-model="form.id">
          
          <div class="form-group">
            <label for="connection-type">Тип подключения</label>
            <select id="connection-type" v-model="form.type" required>
              <option value="rdp">RDP (Remote Desktop)</option>
              <option value="horizon">VMware Horizon</option>
              <option value="citrix">Citrix Workspace</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="connection-name">Название</label>
            <input type="text" id="connection-name" v-model="form.name" required placeholder="Например: Рабочий стол">
          </div>
          
          <div class="form-group">
            <label for="connection-host">Хост / IP адрес</label>
            <input type="text" id="connection-host" v-model="form.host" required placeholder="192.168.1.100 или hostname">
          </div>
          
          <div class="form-group horizon-fields" :style="{ display: form.type === 'horizon' ? 'block' : 'none' }">
            <label for="connection-pool">Desktop Pool</label>
            <input type="text" id="connection-pool" v-model="form.desktopPool" placeholder="Имя пула Horizon">
          </div>
          
          <div class="form-group">
            <label for="connection-username">Учётная запись (domain\username)</label>
            <input type="text" id="connection-username" v-model="form.username" placeholder="DOMAIN\username">
          </div>
          
          <div class="form-group">
            <label for="connection-description">Описание</label>
            <textarea id="connection-description" v-model="form.description" rows="2" placeholder="Описание подключения"></textarea>
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
  connection: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'save'])

const form = reactive({
  id: '',
  type: 'rdp',
  name: '',
  host: '',
  desktopPool: '',
  username: '',
  description: ''
})

const isEditing = computed(() => !!props.connection?.id)

// Initialize form with connection data
watch(() => props.connection, (newVal) => {
  if (newVal) {
    Object.assign(form, {
      id: newVal.id || '',
      type: newVal.type || 'rdp',
      name: newVal.name || '',
      host: newVal.host || '',
      desktopPool: newVal.desktopPool || '',
      username: newVal.username || '',
      description: newVal.description || ''
    })
  } else {
    // Reset form for new connection
    Object.assign(form, {
      id: '',
      type: 'rdp',
      name: '',
      host: '',
      desktopPool: '',
      username: '',
      description: ''
    })
  }
}, { immediate: true })

function save() {
  if (!form.name || !form.host) {
    alert('Заполните обязательные поля')
    return
  }
  
  const connectionData = {
    id: form.id || Date.now().toString(),
    type: form.type,
    name: form.name.trim(),
    host: form.host.trim(),
    desktopPool: form.desktopPool.trim(),
    username: form.username.trim(),
    description: form.description.trim()
  }
  
  emit('save', connectionData)
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
.form-group select,
.form-group textarea {
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
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-group select {
  cursor: pointer;
}
</style>
