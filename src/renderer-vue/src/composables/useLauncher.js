import { launchersApi } from '../api'

export function useLauncher() {
  async function launchConnection(conn, settings) {
    try {
      let result
      switch (conn.type) {
        case 'rdp':
          result = await launchersApi.launchRdp(conn, settings)
          break
        case 'horizon':
          result = await launchersApi.launchHorizon(conn, settings)
          break
        case 'citrix':
          result = await launchersApi.launchCitrix(conn, settings)
          break
        default:
          return { success: false, error: `Unknown connection type: ${conn.type}` }
      }
      return result !== undefined ? result : { success: true }
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('Launch error:', errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  async function launchVpn() {
    try {
      await launchersApi.launchVpn()
      return { success: true }
    } catch (error) {
      return { success: false, error: error?.message || String(error) }
    }
  }

  return {
    launchConnection,
    launchVpn,
  }
}
