import { ref } from 'vue'
import { useIpc } from './useIpc'

/**
 * Installer composable
 * Handles client installation checking and downloading
 */
export function useInstaller() {
  const { unwrapIpc } = useIpc()

  const showInstallDialog = ref(false)
  const pendingClientType = ref(null)

  /**
   * Check if client is installed
   * @param {string} clientType - 'horizon' or 'citrix'
   * @returns {Promise<{installed: boolean, path: string|null}>}
   */
  async function checkInstalled(clientType) {
    try {
      if (!window.api?.checkClientInstalled) {
        return { installed: false, path: null }
      }
      const result = unwrapIpc(await window.api.checkClientInstalled(clientType))
      return result
    } catch (error) {
      console.error(`Error checking ${clientType} installation:`, error)
      return { installed: false, path: null, error: error?.message }
    }
  }

  /**
   * Check if distribution already downloaded
   * @param {string} clientType - 'horizon' or 'citrix'
   * @returns {Promise<{exists: boolean, path: string|null}>}
   */
  async function checkDownloaded(clientType) {
    try {
      if (!window.api?.checkDistributionDownloaded) {
        return { exists: false, path: null }
      }
      const result = unwrapIpc(await window.api.checkDistributionDownloaded(clientType))
      return result
    } catch (error) {
      console.error(`Error checking ${clientType} download:`, error)
      return { exists: false, path: null }
    }
  }

  /**
   * Download distribution
   * @param {string} clientType - 'horizon' or 'citrix'
   * @returns {Promise<{success: boolean, path: string|null}>}
   */
  async function downloadClient(clientType) {
    try {
      if (!window.api?.downloadDistribution) {
        return { success: false, error: 'Not available in browser' }
      }
      const result = unwrapIpc(await window.api.downloadDistribution(clientType))
      return { success: true, path: result.path }
    } catch (error) {
      console.error(`Error downloading ${clientType}:`, error)
      return { success: false, error: error?.message }
    }
  }

  /**
   * Open installer file
   * @param {string} filePath - Path to installer file
   */
  async function openInstaller(filePath) {
    try {
      if (window.api?.openInstaller) {
        await window.api.openInstaller(filePath)
        return { success: true }
      }
      return { success: false, error: 'Not available' }
    } catch (error) {
      console.error('Error opening installer:', error)
      return { success: false, error: error?.message }
    }
  }

  /**
   * Show install dialog for a client type
   * @param {string} clientType - 'horizon' or 'citrix'
   */
  function promptInstall(clientType) {
    pendingClientType.value = clientType
    showInstallDialog.value = true
  }

  /**
   * Check if client is installed, prompt install if not
   * @param {string} clientType - 'horizon' or 'citrix'
   * @returns {Promise<{canLaunch: boolean, path: string|null}>}
   */
  async function ensureInstalled(clientType) {
    const installStatus = await checkInstalled(clientType)
    
    if (installStatus.installed) {
      return { canLaunch: true, path: installStatus.path, status: 'installed' }
    }

    // Check if already downloaded
    const downloadStatus = await checkDownloaded(clientType)
    if (downloadStatus.exists) {
      return { canLaunch: false, path: downloadStatus.path, status: 'downloaded' }
    }

    // Need to download
    return { canLaunch: false, path: null, status: 'not_installed' }
  }

  return {
    showInstallDialog,
    pendingClientType,
    checkInstalled,
    checkDownloaded,
    downloadClient,
    openInstaller,
    promptInstall,
    ensureInstalled
  }
}
