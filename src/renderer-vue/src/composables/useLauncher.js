import { useIpc } from './useIpc'
import { useConnections } from './useConnections'

/**
 * Launcher composable
 * Handles launching connections (RDP, Horizon, Citrix, VPN)
 * Includes installation checking for Horizon and Citrix
 */
export function useLauncher() {
  const { unwrapIpc } = useIpc()
  const { applyCredentialsToConnection } = useConnections()

  function extractNeedsInstall(result, fallbackClientType) {
    if (!result || typeof result !== 'object') return null
    if (result.needsInstall) {
      return {
        success: false,
        error: 'not_installed',
        clientType: result.clientType || fallbackClientType,
        needsInstall: true
      }
    }

    const details = result.details
    if (details && typeof details === 'object' && details.needsInstall) {
      return {
        success: false,
        error: 'not_installed',
        clientType: details.clientType || fallbackClientType,
        needsInstall: true
      }
    }

    return null
  }

  function isPlainObject(v) {
    return v && typeof v === 'object' && !Array.isArray(v)
  }

  function deepMerge(a, b) {
    if (!isPlainObject(a)) return JSON.parse(JSON.stringify(b ?? {}))
    if (!isPlainObject(b)) return JSON.parse(JSON.stringify(a ?? {}))

    const out = { ...a }
    for (const k of Object.keys(b)) {
      const av = a[k]
      const bv = b[k]
      if (isPlainObject(av) && isPlainObject(bv)) out[k] = deepMerge(av, bv)
      else out[k] = bv
    }
    return out
  }

  /**
   * Check if client is installed (for Horizon and Citrix)
   * @param {string} clientType - 'horizon' or 'citrix'
   * @returns {Promise<{installed: boolean, path: string|null}>}
   */
  async function checkClientInstalled(clientType) {
    try {
      if (!window.api?.checkClientInstalled) {
        return { installed: true } // Assume installed if API not available (browser mode)
      }
      const result = unwrapIpc(await window.api.checkClientInstalled(clientType))
      return result
    } catch (error) {
      console.error(`Error checking ${clientType} installation:`, error)
      return { installed: true } // Assume installed on error to not block launch
    }
  }

  async function launchConnection(conn, settings) {
    if (!conn) {
      return { success: false, error: 'Connection not found' }
    }

    try {
      const plainConnection = JSON.parse(JSON.stringify(conn))
      const connectionWithCreds = applyCredentialsToConnection(plainConnection, settings)
      const globalSettings = JSON.parse(JSON.stringify(settings))

      let clientSettings = {}
      if (plainConnection.clientSettings) {
        clientSettings = plainConnection.clientSettings
      }

      const mergedSettings = {
        ...globalSettings,
        [plainConnection.type]: {
          ...deepMerge((globalSettings[plainConnection.type] || {}), clientSettings)
        }
      }

      // Check installation for Horizon and Citrix
      if (plainConnection.type === 'horizon' || plainConnection.type === 'citrix') {
        const installStatus = await checkClientInstalled(plainConnection.type)
        if (!installStatus.installed) {
          return {
            success: false,
            error: 'not_installed',
            clientType: plainConnection.type,
            needsInstall: true
          }
        }
      }

      let result

      switch (plainConnection.type) {
        case 'rdp':
          result = await window.api.launchRdp(connectionWithCreds, mergedSettings)
          if (result?.success && window.api?.trackConnectionLaunch) {
            window.api.trackConnectionLaunch('rdp', true)
          }
          break

        case 'horizon':
          result = await window.api.launchHorizon(connectionWithCreds, mergedSettings)
          {
            const needsInstallResult = extractNeedsInstall(result, 'horizon')
            if (needsInstallResult) return needsInstallResult
          }
          if (result?.success && window.api?.trackConnectionLaunch) {
            window.api.trackConnectionLaunch('horizon', true)
          }
          break

        case 'citrix':
          result = await window.api.launchCitrix(connectionWithCreds, mergedSettings)
          {
            const needsInstallResult = extractNeedsInstall(result, 'citrix')
            if (needsInstallResult) return needsInstallResult
          }
          if (result?.success && window.api?.trackConnectionLaunch) {
            window.api.trackConnectionLaunch('citrix', true)
          }
          break

        default:
          return {
            success: false,
            error: `Unsupported connection type: ${plainConnection.type}`
          }
      }

      return result || { success: false, error: 'Unknown error' }
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('Launch error:', errorMsg)
      if (window.api?.log) {
        window.api.log('error', `launchConnection failed: ${errorMsg}`)
      }
      if (window.api?.trackError) {
        window.api.trackError({ message: errorMsg, stack: error?.stack })
      }
      return { success: false, error: errorMsg }
    }
  }

  async function launchVpn() {
    try {
      if (!window.api?.launchVpn) {
        return { success: false, error: 'VPN доступен только при запуске в приложении (Electron)' }
      }
      const result = await window.api.launchVpn()
      if (result?.success && window.api?.trackConnectionLaunch) {
        window.api.trackConnectionLaunch('vpn', true)
      }
      return result
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('VPN launch error:', errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  return {
    launchConnection,
    launchVpn,
    checkClientInstalled
  }
}
