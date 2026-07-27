<template>
  <div class="modal active">
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Первая настройка</h2>
      </div>

      <div class="modal-body">
        <p class="modal-desc">Введите данные вашей учётной записи для автоматического подключения к удалённым рабочим столам</p>

        <div v-if="formError" class="form-error">{{ formError }}</div>

        <div class="form-fields">
          <div class="input-field">
            <div class="input-field-inner">
              <div class="input-content">
                <label class="input-label">Домен</label>
                <span class="input-value">{{ form.domain }}</span>
              </div>
              <div class="input-right">
                <div class="chevron-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9L12 15L18 9" stroke="rgba(4,4,21,0.47)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <select v-model="form.domain" class="input-select-hidden">
              <option value="MOSCOW">MOSCOW</option>
              <option value="REGIONS">REGIONS</option>
              <option value="E-BUSINESS">E-BUSINESS</option>
            </select>
          </div>

          <div class="input-field">
            <div class="input-field-inner">
              <div class="input-content">
                <input
                  type="text"
                  v-model="form.username"
                  class="input-element"
                  placeholder="Имя пользователя"
                />
              </div>
            </div>
          </div>

          <p class="preview-line">Итоговый логин: <strong>{{ previewUsername.toUpperCase() }}</strong></p>
        </div>
      </div>

      <div class="modal-footer">
        <div class="modal-footer-content">
          <button class="btn btn-primary" @click="save">Сохранить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref } from 'vue'

const emit = defineEmits(['save'])

const form = reactive({
  domain: 'MOSCOW',
  username: ''
})

const formError = ref('')

const previewUsername = computed(() => {
  if (form.domain && form.username) {
    return `${form.domain}\\${form.username}`
  }
  return form.username || '...'
})

function save() {
  formError.value = ''
  if (!form.username.trim()) {
    formError.value = 'Введите имя пользователя'
    return
  }
  emit('save', {
    domain: form.domain.trim(),
    username: form.username.trim()
  })
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
  width: 600px;
  min-height: 394px;
  background: #FFFFFF;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 14px 38px rgba(17, 24, 39, 0.14);
  animation: modalSlideIn 200ms ease;
  overflow: hidden;
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

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---- Input Field ---- */
.input-field {
  position: relative;
  width: 100%;
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

/* ---- Preview ---- */
.preview-line {
  font-family: 'Styrene A Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  font-size: 14px;
  line-height: 20px;
  color: rgba(3, 3, 6, 0.88);
  margin: 0;
  padding: 8px 0;
}

.preview-line strong {
  font-weight: 500;
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

.btn-primary {
  background: #212124;
  color: rgba(255, 255, 255, 0.94);
}



/* ---- Animation ---- */
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
</style>
