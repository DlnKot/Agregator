<template>
  <div class="settings-section">
    <h3>Учётная запись</h3>

    <div class="form-group">
      <label for="user-domain">Домен</label>
      <select id="user-domain" v-model="localSettings.user.domain" required>
        <option value="MOSCOW">MOSCOW</option>
        <option value="REGIONS">REGIONS</option>
        <option value="E-BUSINESS">E-BUSINESS</option>
      </select>
    </div>

    <div class="form-group">
      <label for="user-username">Имя пользователя</label>
      <input type="text" id="user-username" v-model="localSettings.user.username" placeholder="ivanov">
    </div>

    <p class="preview-label">Итоговый логин: <strong>{{ previewUsername.toUpperCase() }}</strong></p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const localSettings = computed(() => props.settings)

const previewUsername = computed(() => {
  const u = localSettings.value.user
  if (u?.domain && u?.username) {
    return `${u.domain}\\${u.username}`
  }
  return u?.username || 'не указан'
})
</script>

<style scoped>
.preview-label {
  font-size: 13px;
  color: var(--text-inverse);
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.preview-label strong {
  color: var(--accent-danger);
}
</style>
