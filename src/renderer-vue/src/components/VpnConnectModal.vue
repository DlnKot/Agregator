<template>
  <div class="modal active">
    <div class="modal-overlay" @click.self="handleOverlayClick"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Подключение к VPN</h2>
      </div>

      <div class="modal-body">
        <p class="modal-desc" v-if="!connecting">Введите пароль для подключения к корпоративной сети</p>

        <p class="vpn-status" v-if="connecting">
          <span class="spinner"><span class="spinner-dot"></span><span class="spinner-dot"></span><span class="spinner-dot"></span></span>
          {{ statusMessage }}
        </p>

        <div v-if="error" class="form-error">{{ error }}</div>

        <form @submit.prevent="connect" v-if="!connecting">
          <button type="submit" style="display:none"></button>
          <div class="input-field">
            <div class="input-field-inner">
              <div class="input-content">
                <label class="input-label">Адрес</label>
                <span class="input-value">{{ address }}</span>
              </div>
              <div class="input-right">
                <div class="chevron-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9L12 15L18 9" stroke="rgba(4,4,21,0.47)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <select v-model="address" class="input-select-hidden" required>
              <option value="mypc.alfabank.ru">mypc.alfabank.ru</option>
              <option value="mycc.alfabank.ru">mycc.alfabank.ru</option>
              <option value="84.201.187.53">резерв</option>
            </select>
          </div>

          <div class="input-field">
            <div class="input-field-inner">
              <div class="input-content">
                <label class="input-label">Учётная запись</label>
                <input type="text" v-model="username" class="input-element" placeholder="u12345" required>
              </div>
            </div>
          </div>

          <div class="input-field">
            <div class="input-field-inner">
              <div class="input-content">
                <label class="input-label">Пароль доменной учётной записи</label>
                <input type="password" v-model="password" class="input-element" placeholder="Пароль от домена" required autocomplete="current-password">
              </div>
            </div>
          </div>

          <div class="input-field">
            <div class="input-field-inner">
              <div class="input-content">
                <label class="input-label">Код Indeed (одноразовый код)</label>
                <input type="password" v-model="indeedCode" class="input-element" placeholder="Код из Indeed" required autocomplete="one-time-code">
              </div>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <div class="modal-footer-content">
          <button class="btn btn-ghost" @click="handleCancel">{{ connecting ? 'Отменить' : 'Отмена' }}</button>
          <button class="btn btn-primary" @click="connect" :disabled="connecting || !username || !password || !indeedCode">
            {{ connecting ? 'Подключение...' : 'Подключиться' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { launchersApi } from '../api'

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
const address = ref('mypc.alfabank.ru')

const connecting = ref(false)
const error = ref('')
const statusMessage = ref('')

let pollTimer = null
const POLL_INTERVAL = 2500
const CONNECT_TIMEOUT = 70000

function stripDomain(fullUsername) {
  if (!fullUsername) return ''
  if (fullUsername.includes('\\')) {
    return fullUsername.split('\\').pop()
  }
  return fullUsername
}

async function connect() {
  if (!username.value || !password.value || !indeedCode.value) return

  connecting.value = true
  error.value = ''
  statusMessage.value = 'Подключение к VPN...'

  try {
    const credentials = {
      username: stripDomain(username.value),
      password: password.value,
      challenge: indeedCode.value,
      address: address.value,
    }
    await launchersApi.vpnConnect(credentials)

    const startTime = Date.now()
    await pollStatus(startTime)
  } catch (e) {
    error.value = e.message || 'Ошибка подключения'
    connecting.value = false
  }
}

async function pollStatus(startTime) {
  const check = async () => {
    try {
      const status = await launchersApi.vpnStatus()
      if (status?.connected) {
        connecting.value = false
        emit('connect', { username: stripDomain(username.value) })
        emit('close')
        return
      }
    } catch (_) {}

    if (Date.now() - startTime > CONNECT_TIMEOUT) {
      error.value = 'Время ожидания подключения истекло'
      connecting.value = false
      return
    }

    pollTimer = setTimeout(check, POLL_INTERVAL)
  }

  pollTimer = setTimeout(check, POLL_INTERVAL)
}

async function handleCancel() {
  clearTimeout(pollTimer)
  pollTimer = null

  if (connecting.value) {
    connecting.value = false
    try {
      await launchersApi.vpnCancel()
    } catch (e) {
      console.error('Failed to cancel VPN:', e)
    }
  }

  emit('close')
}

function handleOverlayClick() {
  if (!connecting.value) emit('close')
}

onUnmounted(() => {
  clearTimeout(pollTimer)
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
}

.modal-content {
  position: relative;
  width: 520px;
  background: #FFFFFF;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 14px 38px rgba(17, 24, 39, 0.14);
  animation: modalSlideIn 200ms ease;
  overflow: hidden;
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

/* ---- Header ---- */
.modal-header {
  padding: 28px 28px 0;
  flex-shrink: 0;
}

.modal-title {
  padding: 12px;
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 700;
  font-size: 22px;
  line-height: 26px;
  letter-spacing: 0.2px;
  color: rgba(3, 3, 6, 0.88);
  margin: 0;
}

/* ---- Body ---- */
.modal-body {
  flex: 1;
  padding: 0 40px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.modal-desc {
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 24px;
  letter-spacing: -0.24px;
  color: rgba(3, 3, 6, 0.88);
  margin: 0 0 16px;
}

/* ---- Status / Spinner ---- */
.vpn-status {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 24px;
  color: rgba(3, 3, 6, 0.88);
  padding: 16px 0;
}

.spinner {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
  padding: 0 2px;
}

.spinner-dot {
  width: 8px;
  height: 8px;
  background: rgba(4, 4, 21, 0.47);
  border-radius: 50%;
  animation: dotBounce 1.4s ease-in-out infinite both;
}

.spinner-dot:nth-child(1) { animation-delay: -0.32s; }
.spinner-dot:nth-child(2) { animation-delay: -0.16s; }
.spinner-dot:nth-child(3) { animation-delay: 0s; }

@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

/* ---- Error ---- */
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
  margin-bottom: 16px;
}

.input-field-inner {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 100%;
  height: 56px;
  min-height: 56px;
  border: 2px solid rgba(4, 4, 21, 0.47);
  border-radius: 10px;
  background: #FFFFFF;
}

.input-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
  padding: 0 12px;
  min-width: 0;
}

.input-label {
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: -0.08px;
  color: rgba(4, 4, 19, 0.55);
  pointer-events: none;
  display: block;
}

.input-value {
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 20px;
  letter-spacing: -0.24px;
  color: rgba(3, 3, 6, 0.88);
}

.input-element {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 20px;
  letter-spacing: -0.24px;
  color: rgba(3, 3, 6, 0.88);
  padding: 0;
}

.input-element::placeholder {
  color: rgba(5, 8, 29, 0.38);
}

.input-element:focus {
  outline: none;
}

.input-right {
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
}

.chevron-icon svg {
  display: block;
}

.input-select-hidden {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  font-size: 16px;
}

.input-select-hidden:focus + .input-field-inner {
  border-color: #2288FA;
}

/* ---- Footer ---- */
.modal-footer {
  padding: 24px 40px 40px;
  flex-shrink: 0;
  background: #FFFFFF;
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

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary {
  background: #212124;
  color: rgba(255, 255, 255, 0.94);
}

.btn-ghost {
  background: transparent;
  border: 1px solid rgba(4, 4, 21, 0.47);
  color: rgba(3, 3, 6, 0.88);
}

/* ---- Dark Theme ---- */
html[data-theme="dark"] .modal-content {
  background: var(--bg-secondary);
  box-shadow: var(--shadow-lg);
}

html[data-theme="dark"] .modal-title,
html[data-theme="dark"] .modal-desc,
html[data-theme="dark"] .vpn-status {
  color: var(--text-primary);
}

html[data-theme="dark"] .input-field-inner {
  background: var(--bg-primary);
  border-color: var(--border-color);
}

html[data-theme="dark"] .input-label {
  color: var(--text-muted);
}

html[data-theme="dark"] .input-value {
  color: var(--text-primary);
}

html[data-theme="dark"] .input-element {
  color: var(--text-primary);
}

html[data-theme="dark"] .input-element::placeholder {
  color: var(--text-muted);
}

html[data-theme="dark"] .input-select-hidden:focus + .input-field-inner {
  border-color: var(--accent-primary);
}

html[data-theme="dark"] .chevron-icon svg path {
  stroke: var(--text-muted);
}

html[data-theme="dark"] .modal-footer {
  background: var(--bg-secondary);
}

html[data-theme="dark"] .btn-ghost {
  border-color: var(--border-color);
  color: var(--text-primary);
}

html[data-theme="dark"] .spinner-dot {
  background: var(--text-muted);
}
</style>
