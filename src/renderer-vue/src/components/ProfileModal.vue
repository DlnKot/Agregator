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
