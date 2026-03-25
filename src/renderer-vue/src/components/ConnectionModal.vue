<template>
  <div class="modal active" tabindex="-1" @keydown.esc="$emit('close')">
    <div class="modal-overlay" @mousedown="onOverlayMouseDown" @click="onOverlayClick"></div>
    <div class="modal-content" @mousedown.stop @click.stop>
      <div class="modal-header">
        <h3 id="modal-title">{{ isEditing ? 'Редактировать подключение' : 'Новое подключение' }}</h3>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="isFactory" class="factory-note" role="note" aria-live="polite">
          Это стандартное подключение. Можно изменить только название.
        </div>
        <form id="connection-form" @submit.prevent="save">
          <input type="hidden" id="connection-id" v-model="form.id">

          <div class="form-group">
            <label for="connection-type">Тип подключения</label>
            <select id="connection-type" v-model="form.type" required :disabled="isFactory">
              <option value="rdp">RDP (Remote Desktop)</option>
              <option value="horizon">VMware Horizon</option>
              <option value="citrix">Citrix Workspace</option>
            </select>
          </div>

          <div class="form-group">
            <label for="connection-name">Название</label>
            <input ref="nameInput" type="text" id="connection-name" v-model="form.name" required placeholder="Например: Рабочий стол">
          </div>

          <div class="form-group">
            <label for="connection-host">Хост / IP адрес</label>
            <input type="text" id="connection-host" v-model="form.host" required :disabled="isFactory"
              placeholder="192.168.1.100 или hostname">
          </div>

          <div class="form-group horizon-fields" :style="{ display: form.type === 'horizon' ? 'block' : 'none' }">
            <label for="connection-pool">Desktop Pool (имя пула)</label>
            <input type="text" id="connection-pool" v-model="form.desktopPool" placeholder="workspace-fullwm" :disabled="isFactory">
          </div>

          <div class="form-group citrix-fields" :style="{ display: form.type === 'citrix' ? 'block' : 'none' }">
            <label for="connection-store">Citrix Store URL</label>
            <input type="text" id="connection-store" v-model="form.storeUrl" :disabled="isFactory"
              placeholder="https://store.company.com/Citrix/Store">
          </div>

          <div class="form-group">
            <label for="connection-username">Учётная запись (domain\username)</label>
            <input type="text" id="connection-username" v-model="form.username" placeholder="DOMAIN\username" :disabled="isFactory">
          </div>

          <div class="form-group">
            <label for="connection-description">Описание</label>
            <textarea id="connection-description" v-model="form.description" rows="2"
              placeholder="Описание подключения" :disabled="isFactory"></textarea>
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
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  connection: {
    type: Object,
    default: null
  },
  defaultUsername: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'save'])

const form = reactive({
  id: '',
  factoryId: '',
  type: 'rdp',
  name: '',
  host: '',
  desktopPool: '',
  storeUrl: '',
  username: '',
  description: ''
})

const isFactory = computed(() => !!props.connection?.factoryId || props.connection?.isDefault === true)
const isEditing = computed(() => !!props.connection?.id || !!props.connection?.factoryId)

const nameInput = ref(null)

const overlayMouseDown = ref(false)
const overlayDown = ref({ x: 0, y: 0 })

function onOverlayMouseDown(e) {
  overlayMouseDown.value = true
  overlayDown.value = { x: e.clientX || 0, y: e.clientY || 0 }
}

function onOverlayClick(e) {
  if (!overlayMouseDown.value) return
  overlayMouseDown.value = false

  const sel = window.getSelection?.()?.toString?.() || ''
  if (sel) return

  const dx = Math.abs((e.clientX || 0) - (overlayDown.value.x || 0))
  const dy = Math.abs((e.clientY || 0) - (overlayDown.value.y || 0))
  if (dx > 3 || dy > 3) return

  emit('close')
}

function onWindowMouseUp() {
  overlayMouseDown.value = false
}

// Initialize form with connection data
watch(() => props.connection, (newVal) => {
  if (newVal) {
    Object.assign(form, {
      id: newVal.id || '',
      factoryId: newVal.factoryId || '',
      type: newVal.type || 'rdp',
      name: newVal.name || '',
      host: newVal.host || '',
      desktopPool: newVal.desktopPool || '',
      storeUrl: newVal.storeUrl || '',
      username: newVal.username || '',
      description: newVal.description || ''
    })
  } else {
    // Reset form for new connection - use default username from settings
    Object.assign(form, {
      id: '',
      factoryId: '',
      type: 'rdp',
      name: '',
      host: '',
      desktopPool: '',
      storeUrl: '',
      username: props.defaultUsername || '',
      description: ''
    })
  }

  nextTick(() => {
    try { nameInput.value?.focus?.() } catch { /* ignore */ }
  })
}, { immediate: true })

// Normalize URL - add https:// if missing protocol
function normalizeServerUrl(url) {
  if (!url) return ''
  const trimmed = url.trim()
  // Add https:// if no protocol specified
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'https://' + trimmed
  }
  return trimmed
}

function normalizeCitrixStoreUrl(url) {
  // Keep whatever the user pasted (including /discovery), but normalize scheme and trailing slashes.
  return normalizeServerUrl(url).trim().replace(/\/+$/, '')
}

function save() {
  if (isFactory.value) {
    if (!form.name) {
      alert('Заполните обязательные поля')
      return
    }
    emit('save', { factoryId: form.factoryId, name: form.name.trim() })
    return
  }

  if (!form.name || !form.host) {
    alert('Заполните обязательные поля')
    return
  }

  if (form.type === 'citrix' && !String(form.storeUrl || '').trim()) {
    alert('Заполните обязательные поля')
    return
  }

  // For Horizon connections, normalize server URL (add https:// if missing)
  let normalizedHost = form.host.trim()
  if (form.type === 'horizon') {
    normalizedHost = normalizeServerUrl(form.host)
  }

  const connectionData = {
    id: form.id || Date.now().toString(),
    type: form.type,
    name: form.name.trim(),
    host: normalizedHost,
    desktopPool: form.desktopPool.trim(),
    storeUrl: form.type === 'citrix' ? normalizeCitrixStoreUrl(form.storeUrl || '') : (form.storeUrl || '').trim(),
    username: form.username.trim(),
    description: form.description.trim()
  }

  emit('save', connectionData)
}

onMounted(() => {
  window.addEventListener('mouseup', onWindowMouseUp)
  nextTick(() => {
    try { nameInput.value?.focus?.() } catch { /* ignore */ }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('mouseup', onWindowMouseUp)
})
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
  z-index: 1;
}

.modal-content {
  position: relative;
  z-index: 2;
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

.factory-note {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--accent-warning);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
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
  border-radius: var(--radius-xl);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.btn-primary {
  background: var(--accent-primary);
  color: #0b1220;
}

.btn-primary:hover {
  background: var(--accent-danger);
  color: var(--text-inverse);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-inverse);
}

.btn-secondary:hover {
  background: var(--accent-danger);
  color: var(--text-inverse);
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
  background: var(--bg-secondary);
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
  background: var(--bg-secondary);
}

.form-group select {
  cursor: pointer;
  background: var(--bg-secondary);
}
</style>
