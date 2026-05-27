<template>
  <div class="modal active">
    <div class="modal-overlay" @click.self="$emit('close')"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Подключение к VPN</h3>
        <button class="modal-close" @click="$emit('close')" :disabled="loading">&times;</button>
      </div>
      <div class="modal-body">
        <p class="vpn-desc" v-if="!loading">Введите пароль для подключения к корпоративной сети</p>
        
        <p class="vpn-status" v-if="loading">
          <span class="spinner"></span>
          {{ statusMessage }}
        </p>

        <div v-if="error" class="vpn-error">
          {{ error }}
        </div>

        <form @submit.prevent="connect" v-if="!loading">
            <div class="form-group">
            <label for="vpn-address">Адрес</label>
            <select
              type="text" 
              id="vpn-address" 
              v-model="address" 
              required
              :disabled="loading">
              <option value="mypc.alfabank.ru">mypc.alfabank.ru</option>
              <option value="mycc.alfabank.ru">mycc.alfabank.ru</option>
              <option value="84.201.187.53">резерв</option>
            </select>
          </div>
          <div class="form-group">
            <label for="vpn-username">Учётная запись</label>
            <input 
              type="text" 
              id="vpn-username" 
              v-model="username" 
              placeholder="u12345"
              required
              :disabled="loading"
            >
          </div>
          
          <div class="form-group">
            <label for="vpn-password">Пароль доменной учётной записи</label>
            <input 
              type="password" 
              id="vpn-password" 
              v-model="password" 
              placeholder="Пароль от домена"
              required
              :disabled="loading"
              autocomplete="current-password"
            >
          </div>

          <div class="form-group">
            <label for="vpn-indeed">Код Indeed (одноразовый код)</label>
            <input 
              type="password" 
              id="vpn-indeed" 
              v-model="indeedCode" 
              placeholder="Код из Indeed"
              required
              :disabled="loading"
              autocomplete="one-time-code"
            >
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="cancelConnection">Отмена</button>
        <button class="btn btn-primary" @click="connect" :disabled="loading || !username || !password || !indeedCode">
          {{ loading ? 'Подключение...' : 'Подключиться' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  defaultUsername: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'connect'])

const username = ref(props.defaultUsername)
const password = ref('')
const indeedCode = ref('')
const loading = ref(false)
const error = ref('')
const address = ref('mypc.alfabank.ru')
const statusMessage = ref('Подключение к VPN...')

function stripDomain(fullUsername) {
  if (!fullUsername) return ''
  if (fullUsername.includes('\\')) {
    return fullUsername.split('\\').pop()
  }
  return fullUsername
}

async function connect() {
  if (!username.value || !password.value || !indeedCode.value) {
    return
  }

  loading.value = true
  error.value = ''
  statusMessage.value = 'Подключение к VPN...'

  try {
    const credentials = {
      username: stripDomain(username.value),
      password: password.value,
      challenge: indeedCode.value,
      address: address.value,
    }
    const result = await window.api.vpnConnect(credentials)
    
    if (result.success) {
      emit('connect', { username: stripDomain(username.value) })
      emit('close')
    } else {
      error.value = result.error || 'Не удалось подключиться к VPN'
    }
  } catch (e) {
    error.value = e.message || 'Ошибка подключения'
  } finally {
    loading.value = false
  }
}

async function cancelConnection() {
  try {
    if (window.api?.vpnCancel) {
      await window.api.vpnCancel()
    }
  } catch (e) {
    console.error('Failed to cancel VPN:', e)
  }
  loading.value = false
  emit('close')
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
  max-width: 420px;
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
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text-primary);
}

.modal-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.vpn-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
  line-height: 1.5;
}

[data-theme="light"] .vpn-desc {
  color: #4a5568;
}

.vpn-status {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-primary);
  font-size: 14px;
  padding: 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top-color: var(--text-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.vpn-error {
  color: var(--accent-danger);
  font-size: 13px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--accent-danger);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
}

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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-primary-hover);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-secondary);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #4a5568;
  margin-bottom: 8px;
}

[data-theme="dark"] .form-group label {
  color: var(--text-secondary);
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  transition: var(--transition);
}

.form-group input::placeholder {
  color: #9ca3af;
}

[data-theme="dark"] .form-group input::placeholder {
  color: var(--text-muted);
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
