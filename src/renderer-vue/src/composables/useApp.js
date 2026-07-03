import { ref, onMounted, onBeforeUnmount } from 'vue'
import { updatesApi, onAutoUpdateEvent, onDownloadProgress } from '../api'

export function useApp() {
const updateStatus = ref('idle')
const updateProgress = ref({})
const updateError = ref(null)

  let cleanupUpdateListener = null
  let cleanupProgressListener = null

  onMounted(() => {
    cleanupUpdateListener = onAutoUpdateEvent((data) => {
      updateStatus.value = data?.status || 'idle'
      updateError.value = data?.error || null
    })
    cleanupProgressListener = onDownloadProgress((data) => {
      updateProgress.value = data || {}
    })
  })

  onBeforeUnmount(() => {
    if (cleanupUpdateListener) cleanupUpdateListener()
    if (cleanupProgressListener) cleanupProgressListener()
  })

  async function initAutoUpdater() {
    // Auto-updater is initialized by Tauri at startup
  }

  async function checkForUpdates() {
    try {
      await updatesApi.checkForUpdates()
    } catch (e) {
      console.error('checkForUpdates failed:', e)
    }
  }

  async function downloadUpdate() {
    try {
      await updatesApi.downloadUpdate()
    } catch (e) {
      console.error('downloadUpdate failed:', e)
    }
  }

  async function installUpdate() {
    try {
      await updatesApi.installUpdate()
    } catch (e) {
      console.error('installUpdate failed:', e)
    }
  }

  return {
    updateStatus,
    updateProgress,
    updateError,
    initAutoUpdater,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  }
}
