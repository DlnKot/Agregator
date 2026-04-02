import { ref } from 'vue'
import { useIpc } from './useIpc'
import { useConnections } from './useConnections'

/**
 * Settings composable
 * Handles loading and saving application settings
 */
export function useSettings() {
  const { unwrapIpc } = useIpc()
  const { loadConnections } = useConnections()
  
  const settings = ref({})
  const isFirstRun = ref(false)

  async function loadSettings() {
    try {
      if (!window.api) {
        settings.value = { user: { domain: '', username: '' } }
        isFirstRun.value = true
        return
      }

      const s = await window.api.getSettings()
      const settingsData = unwrapIpc(s)
      settings.value = settingsData

      if (!settingsData?.user?.username) {
        isFirstRun.value = true
      }

      return settingsData
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('Error loading settings:', errorMsg)
      if (window.api?.log) {
        window.api.log('error', `loadSettings failed: ${errorMsg}`)
      }
      isFirstRun.value = true
      return null
    }
  }

  async function saveSettings(newSettings) {
    try {
      const plainSettings = JSON.parse(JSON.stringify(newSettings))
      unwrapIpc(await window.api.saveSettings(plainSettings))
      settings.value = plainSettings

      if (window.api?.trackEvent) {
        window.api.trackEvent('settings_save', {})
      }

      return { success: true }
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('Failed to save settings:', errorMsg)
      if (window.api?.log) {
        window.api.log('error', `saveSettings failed: ${errorMsg}`)
      }
      return { success: false, error: errorMsg }
    }
  }

  return {
    settings,
    isFirstRun,
    loadSettings,
    saveSettings
  }
}
