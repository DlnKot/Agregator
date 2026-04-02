import { useIpc } from './useIpc'
import { useConnections } from './useConnections'

/**
 * Launcher composable
 * Handles launching connections (RDP, Horizon, Citrix, VPN)
 */
export function useLauncher() {
  const { unwrapIpc } = useIpc()
  const { applyCredentialsToConnection } = useConnections()

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
          if (result?.success && window.api?.trackConnectionLaunch) {
            window.api.trackConnectionLaunch('horizon', true)
          }
          break

        case 'citrix':
          result = await window.api.launchCitrix(connectionWithCreds, mergedSettings)
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
    launchVpn
  }
}
