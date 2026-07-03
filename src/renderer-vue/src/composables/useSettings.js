import { ref } from 'vue'
import { settingsApi } from '../api'

export function useSettings() {
  const settings = ref({})
  const isFirstRun = ref(false)

  async function loadSettings() {
    try {
      const data = await settingsApi.get()
      settings.value = data || {}
      isFirstRun.value = !data?.user?.username
    } catch (error) {
      console.error('Error loading settings:', error)
      settings.value = {}
    }
  }

  async function saveSettings(newSettings) {
    try {
      await settingsApi.save(newSettings)
      settings.value = { ...newSettings }
      return { success: true }
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('Failed to save settings:', errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  return {
    settings,
    isFirstRun,
    loadSettings,
    saveSettings,
  }
}
