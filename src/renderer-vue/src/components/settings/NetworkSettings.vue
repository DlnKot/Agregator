<template>
  <div class="settings-section">
    <h3>Сеть</h3>

    <div class="form-group">
      <label for="net-latency-threshold">Порог задержки (мс)</label>
      <select
        class="select"
        id="net-latency-threshold"
        v-model.number="localSettings.networkCheck.latencyThresholdMs"
      >
        <option :value="50">50</option>
        <option :value="80">80</option>
        <option :value="100">100</option>
        <option :value="150">150</option>
        <option :value="200">200</option>
        <option :value="300">300</option>
        <option :value="500">500</option>
      </select>
      <small>Если средняя задержка (avg) выше порога, будет показано предупреждение о нестабильной связи</small>
    </div>
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
</script>
