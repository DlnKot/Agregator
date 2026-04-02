import { ref } from 'vue'
import { useIpc } from './useIpc'

/**
 * Auto-update composable
 * Handles checking, downloading, and installing updates
 */
export function useAutoUpdate() {
  const { unwrapIpc } = useIpc()

  const updateStatus = ref({
    updateAvailable: false,
    updateDownloaded: false,
    version: null,
    macReleaseUrl: null
  })

  const updateProgress = ref({
    percent: 0,
    bytesPerSecond: 0,
    transferred: 0,
    total: 0
  })

  const updateError = ref(null)

  function initAutoUpdater() {
    if (window.api?.onAutoUpdateEvent) {
      window.api.onAutoUpdateEvent(({ event, data }) => {
        switch (event) {
          case 'update-available':
            updateStatus.value.updateAvailable = true
            updateStatus.value.version = data.version
            updateStatus.value.macReleaseUrl = data.macReleaseUrl || null
            break
          case 'download-progress':
            updateProgress.value = data
            break
          case 'update-downloaded':
            updateStatus.value.updateDownloaded = true
            updateStatus.value.version = data.version
            updateStatus.value.macReleaseUrl = data.macReleaseUrl || updateStatus.value.macReleaseUrl || null
            break
          case 'update-error':
            updateError.value = data.message
            break
        }
      })
    }
  }

  async function checkForUpdates() {
    updateError.value = null
    try {
      const result = await window.api.checkForUpdates()
      if (window.api?.log) {
        window.api.log('info', `checkForUpdates result: ${JSON.stringify(result)}`)
      }
      if (result?.success === false) updateError.value = result.error || 'Update check failed'
      return result
    } catch (error) {
      const errorMsg = error.message
      updateError.value = errorMsg
      if (window.api?.log) {
        window.api.log('error', `checkForUpdates failed: ${errorMsg}`)
      }
      return { success: false, error: errorMsg }
    }
  }

  async function downloadUpdate() {
    updateError.value = null
    try {
      const result = await window.api.downloadUpdate()
      if (window.api?.log) {
        window.api.log('info', `downloadUpdate result: ${JSON.stringify(result)}`)
      }
      if (result?.success === false) updateError.value = result.error || 'Download failed'
      return result
    } catch (error) {
      const errorMsg = error.message
      updateError.value = errorMsg
      if (window.api?.log) {
        window.api.log('error', `downloadUpdate failed: ${errorMsg}`)
      }
      return { success: false, error: errorMsg }
    }
  }

  function installUpdate() {
    window.api.installUpdate()
  }

  return {
    updateStatus,
    updateProgress,
    updateError,
    initAutoUpdater,
    checkForUpdates,
    downloadUpdate,
    installUpdate
  }
}
