import { ref, computed } from 'vue'
import { useIpc } from './useIpc'
import { useConnections } from './useConnections'
import { useSettings } from './useSettings'
import { useLauncher } from './useLauncher'
import { useAutoUpdate } from './useAutoUpdate'
import { useTheme } from './useTheme'

/**
 * Main app composable
 * Provides unified access to all app functionality
 * 
 * For better tree-shaking, import specific composables directly:
 * - useConnections
 * - useSettings
 * - useLauncher
 * - useAutoUpdate
 * - useTheme
 */
export function useApp() {
  const connectionsComposable = useConnections()
  const settingsComposable = useSettings()
  const launcherComposable = useLauncher()
  const autoUpdateComposable = useAutoUpdate()
  const themeComposable = useTheme()

  async function loadData() {
    connectionsComposable.isLoading.value = true

    try {
      if (!window.api) {
        connectionsComposable.connections.value = []
        settingsComposable.settings.value = { user: { domain: '', username: '' } }
        settingsComposable.isFirstRun.value = true
        return
      }

      const [conns, s] = await Promise.all([
        window.api.getConnections(),
        window.api.getSettings()
      ])

      const { unwrapIpc } = useIpc()
      const connsData = unwrapIpc(conns)
      const settingsData = unwrapIpc(s)

      connectionsComposable.connections.value = connsData
      settingsComposable.settings.value = settingsData

      if (!settingsData?.user?.username) {
        settingsComposable.isFirstRun.value = true
      }

    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('Error loading data:', errorMsg)
      if (window.api?.log) {
        window.api.log('error', `loadData failed: ${errorMsg}`)
      }
      settingsComposable.isFirstRun.value = true
    } finally {
      connectionsComposable.isLoading.value = false
    }
  }

  return {
    // Connections
    connections: connectionsComposable.connections,
    filteredConnections: connectionsComposable.filteredConnections,
    currentClientFilter: connectionsComposable.currentClientFilter,
    
    // Settings
    settings: settingsComposable.settings,
    isFirstRun: settingsComposable.isFirstRun,
    
    // Loading state
    isLoading: connectionsComposable.isLoading,
    
    // Auto-update state
    updateStatus: autoUpdateComposable.updateStatus,
    updateProgress: autoUpdateComposable.updateProgress,
    updateError: autoUpdateComposable.updateError,
    
    // Theme
    theme: themeComposable.theme,
    isDark: themeComposable.isDark,
    
    // Methods
    loadData,
    saveConnection: connectionsComposable.saveConnection,
    deleteConnection: connectionsComposable.deleteConnection,
    resetDefaultConnections: connectionsComposable.resetDefaultConnections,
    saveSettings: settingsComposable.saveSettings,
    launchConnection: launcherComposable.launchConnection,
    launchVpn: launcherComposable.launchVpn,
    getUserCredentials: connectionsComposable.getUserCredentials,
    applyCredentialsToConnection: connectionsComposable.applyCredentialsToConnection,
    
    // Auto-update methods
    initAutoUpdater: autoUpdateComposable.initAutoUpdater,
    checkForUpdates: autoUpdateComposable.checkForUpdates,
    downloadUpdate: autoUpdateComposable.downloadUpdate,
    installUpdate: autoUpdateComposable.installUpdate,
    
    // Theme methods
    toggleTheme: themeComposable.toggleTheme,
    initTheme: themeComposable.initTheme
  }
}

// Re-export individual composables for direct use
export { useIpc } from './useIpc'
export { useConnections } from './useConnections'
export { useSettings } from './useSettings'
export { useLauncher } from './useLauncher'
export { useAutoUpdate } from './useAutoUpdate'
export { useTheme } from './useTheme'
