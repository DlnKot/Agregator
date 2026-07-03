<template>
  <div class="modal active">
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Первая настройка</h3>
      </div>
      <div class="modal-body">
        <p class="firstrun-desc">Введите данные вашей учётной записи для автоматического подключения к удалённым рабочим столам</p>
        
        <div v-if="formError" class="form-error">{{ formError }}</div>
        <form @submit.prevent="save">
          <div class="form-group">
            <label for="user-domain">Домен</label>
            <select id="user-domain" v-model="form.domain" required>
              <option value="MOSCOW">MOSCOW</option>
              <option value="REGIONS">REGIONS</option>
              <option value="E-BUSINESS">E-BUSINESS</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="user-username">Имя пользователя</label>
            <input 
              type="text" 
              id="user-username" 
              v-model="form.username" 
              placeholder="U_M***"
              required
            >
          </div>
          
          <p class="preview-label">Итоговый логин: <strong>{{ previewUsername.toUpperCase() }}</strong></p>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" @click="save">Сохранить</button>
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

/* Description */
.firstrun-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
  line-height: 1.5;
}

.preview-label {
  font-size: 13px;
  color: var(--text-inverse);
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.preview-label strong {
  color: var(--accent-primary);
}

.form-error {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: var(--radius);
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
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
  color: #0b1220;
}

.btn-primary:hover {
  background: var(--accent-primary-hover);
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

.form-group input,
.form-group select {
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
.form-group select:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-group select {
  cursor: pointer;
}
</style>
