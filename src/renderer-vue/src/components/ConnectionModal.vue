<template>
  <div class="modal active" tabindex="-1" @keydown.esc="$emit('close')">
    <div class="modal-overlay" @mousedown="onOverlayMouseDown" @click="onOverlayClick"></div>
    <div class="modal-content" @mousedown.stop @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">{{ isEditing ? 'Редактировать подключение' : 'Новое подключение' }}</h2>
        <button class="modal-close-btn" @click="$emit('close')" aria-label="Закрыть">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div v-if="isFactory" class="factory-note">Это стандартное подключение. Можно изменить только название.</div>
        <div v-if="formError" class="form-error">{{ formError }}</div>

        <form id="connection-form" @submit.prevent="save">
          <input type="hidden" id="connection-id" v-model="form.id">

          <!-- Тип подключения -->
          <div class="input-field">
            <div class="field-container">
              <div class="field-content">
                <span class="field-label">Тип подключения</span>
                <span class="field-value-text">{{ typeLabel }}</span>
              </div>
              <div class="field-right">
                <div class="chevron-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <select v-model="form.type" class="field-select-hidden" :disabled="isFactory">
              <option value="rdp">RDP (Remote Desktop)</option>
              <option value="horizon">VMware Horizon</option>
              <option value="citrix">Citrix Workspace</option>
            </select>
          </div>

          <!-- Название -->
          <div class="input-field">
            <div class="field-container">
              <div class="field-content">
                <span class="field-label">Название</span>
                <input ref="nameInput" type="text" v-model="form.name" class="field-input" placeholder="Например: Рабочий стол" />
              </div>
            </div>
          </div>

          <!-- Хост / IP адрес -->
          <div class="input-field" v-if="form.type !== 'citrix'">
            <div class="field-container">
              <div class="field-content">
                <span class="field-label">Хост / IP адрес</span>
                <input type="text" v-model="form.host" class="field-input" placeholder="192.168.1.100 или hostname" :disabled="isFactory" />
              </div>
            </div>
          </div>

          <!-- Desktop Pool (Horizon only) -->
          <div class="input-field" v-if="form.type === 'horizon'">
            <div class="field-container">
              <div class="field-content">
                <span class="field-label">Desktop Pool</span>
                <input type="text" v-model="form.desktopPool" class="field-input" placeholder="workspace-fullwm" :disabled="isFactory" />
              </div>
            </div>
          </div>

          <!-- Citrix Store URL -->
          <div class="input-field" v-if="form.type === 'citrix'">
            <div class="field-container">
              <div class="field-content">
                <span class="field-label">Citrix Store URL</span>
                <input type="text" v-model="form.storeUrl" class="field-input" placeholder="https://store.company.com/Citrix/Store" :disabled="isFactory" />
              </div>
            </div>
          </div>

          <!-- Citrix App -->
          <div class="input-field" v-if="form.type === 'citrix'">
            <div class="field-container">
              <div class="field-content">
                <span class="field-label">Приложение</span>
                <input type="text" v-model="form.citrixApp" class="field-input" placeholder="CITRIX-VDI Win11" :disabled="isFactory" />
              </div>
            </div>
            <span class="field-hint">Оставьте пустым для открытия списка приложений</span>
          </div>

          <!-- Учётная запись -->
          <div class="input-field">
            <div class="field-container">
              <div class="field-content">
                <span class="field-label">Учётная запись</span>
                <input type="text" v-model="form.username" class="field-input" placeholder="DOMAIN\username" :disabled="isFactory" />
              </div>
            </div>
          </div>

          <!-- Описание -->
          <div class="input-field">
            <div class="field-container field-textarea">
              <div class="field-content">
                <span class="field-label">Описание</span>
                <textarea v-model="form.description" class="field-textarea-input" placeholder="Описание подключения" :disabled="isFactory"></textarea>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <div class="modal-footer-content">
          <button class="btn btn-primary" @click="save">Сохранить</button>
          <button class="btn btn-ghost" @click="$emit('close')">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  connection: { type: Object, default: null },
  defaultUsername: { type: String, default: '' }
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
  citrixApp: '',
  username: '',
  description: ''
})

const formError = ref('')

const isFactory = computed(() => !!props.connection?.factoryId || props.connection?.isDefault === true)
const isEditing = computed(() => !!props.connection?.id || !!props.connection?.factoryId)

const typeLabel = computed(() => {
  const labels = { rdp: 'RDP (Remote Desktop)', horizon: 'VMware Horizon', citrix: 'Citrix Workspace' }
  return labels[form.type] || form.type
})

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
      citrixApp: newVal.citrixApp || '',
      username: newVal.username || '',
      description: newVal.description || ''
    })
  } else {
    Object.assign(form, {
      id: '', factoryId: '', type: 'rdp', name: '', host: '',
      desktopPool: '', storeUrl: '', citrixApp: '',
      username: props.defaultUsername || '', description: ''
    })
  }
  nextTick(() => { try { nameInput.value?.focus?.() } catch { /* ignore */ } })
}, { immediate: true })

function normalizeServerUrl(url) {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'https://' + trimmed
  }
  return trimmed
}

function normalizeCitrixStoreUrl(url) {
  return normalizeServerUrl(url).trim().replace(/\/+$/, '')
}

function save() {
  formError.value = ''

  if (isFactory.value) {
    if (!form.name) { formError.value = 'Заполните обязательные поля'; return }
    emit('save', { ...props.connection, name: form.name.trim() })
    return
  }

  if (!form.name) { formError.value = 'Заполните обязательные поля'; return }

  if (form.type === 'citrix') {
    if (!String(form.storeUrl || '').trim()) { formError.value = 'Укажите Citrix Store URL'; return }
  } else {
    if (!form.host) { formError.value = 'Заполните обязательные поля'; return }
  }

  let normalizedHost = form.host.trim()
  if (form.type === 'horizon') normalizedHost = normalizeServerUrl(form.host)
  if (form.type === 'citrix') normalizedHost = normalizeCitrixStoreUrl(form.storeUrl || '')

  emit('save', {
    id: form.id || Date.now().toString(),
    type: form.type,
    name: form.name.trim(),
    host: normalizedHost,
    desktopPool: form.desktopPool.trim(),
    storeUrl: form.type === 'citrix' ? normalizeCitrixStoreUrl(form.storeUrl || '') : (form.storeUrl || '').trim(),
    citrixApp: form.citrixApp.trim(),
    username: form.username.trim(),
    description: form.description.trim(),
    isUserModified: true
  })
}

onMounted(() => {
  window.addEventListener('mouseup', onWindowMouseUp)
  nextTick(() => { try { nameInput.value?.focus?.() } catch { /* ignore */ } })
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
  width: 600px;
  background: var(--bg-secondary);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  animation: modalSlideIn 200ms ease;
  overflow: hidden;
  max-height: 90vh;
}

@keyframes modalSlideIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---- Header ---- */
.modal-header {
  padding: 28px 28px 0;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  flex-shrink: 0;
}

.modal-title {
  flex: 1;
  padding: 12px;
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 700;
  font-size: 22px;
  line-height: 26px;
  letter-spacing: 0.2px;
  color: var(--text-primary);
  margin: 0;
}

.modal-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(40px);
  border-radius: 50px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 150ms ease;
}

.modal-close-btn {
  color: var(--text-primary);
}

.modal-close-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

html[data-theme="dark"] .modal-close-btn {
  background: rgba(255, 255, 255, 0.06);
}

html[data-theme="dark"] .modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* ---- Body ---- */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 40px;
  pointer-events: auto;
}

.modal-body form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0 12px;
  pointer-events: auto;
}

.factory-note {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.1);
  color: #92400e;
  font-size: 13px;
  font-weight: 500;
}

.form-error {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
}

/* ---- Input Fields ---- */
.input-field {
  position: relative;
  width: 100%;
}

.field-container {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 100%;
  min-height: 56px;
  background: rgba(15, 25, 55, 0.1);
  border-radius: 10px;
}

html[data-theme="dark"] .field-container {
  background: rgba(255, 255, 255, 0.06);
}

.field-container.field-textarea {
  min-height: 80px;
}

.field-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
  padding: 0 12px;
  min-width: 0;
}

.field-label {
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: -0.08px;
  color: var(--text-muted);
  pointer-events: none;
}

.field-value-text {
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 20px;
  letter-spacing: -0.24px;
  color: var(--text-primary);
}

.field-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 20px;
  letter-spacing: -0.24px;
  color: var(--text-primary);
  padding: 0;
}

.field-input::placeholder {
  color: var(--text-muted);
}

.field-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.field-textarea-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 20px;
  letter-spacing: -0.24px;
  color: var(--text-primary);
  padding: 0;
  resize: none;
  min-height: 44px;
}

.field-textarea-input::placeholder {
  color: var(--text-muted);
}

.field-textarea-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.field-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  font-style: italic;
  color: var(--text-muted);
  padding-left: 4px;
}

/* Select override */
.field-select-hidden {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  font-size: 16px;
}

.field-select-hidden:disabled {
  cursor: not-allowed;
}

/* Right addon for select */
.field-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 12px 0 0;
  flex-shrink: 0;
}

.chevron-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.chevron-icon svg {
  display: block;
}

/* ---- Footer ---- */
.modal-footer {
  padding: 24px 40px 40px;
  flex-shrink: 0;
  background: var(--bg-secondary);
  border-radius: 0 0 12px 12px;
}

.modal-footer-content {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16px;
}

/* ---- Buttons ---- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 20px;
  min-width: 104px;
  height: 48px;
  min-height: 48px;
  border: none;
  border-radius: 999px;
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 500;
  font-size: 16px;
  line-height: 20px;
  letter-spacing: -0.05px;
  cursor: pointer;
  transition: opacity 150ms ease;
  white-space: nowrap;
}

.btn:hover {
  opacity: 0.9;
}

.btn-primary {
  background: #212124;
  color: rgba(255, 255, 255, 0.94);
}

html[data-theme="dark"] .btn-primary {
  background: var(--bg-tertiary);
  color: var(--text-inverse);
}

.btn-ghost {
  background: rgba(15, 25, 55, 0.1);
  backdrop-filter: blur(40px);
  color: rgba(3, 3, 6, 0.88);
}

html[data-theme="dark"] .btn-ghost {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}
</style>
