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
