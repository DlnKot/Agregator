/**
 * IPC abstraction — wraps Tauri invoke calls.
 * Provides same interface as old window.api for backward compat during migration.
 */
import * as api from '../api'

export function useIpc() {
  function unwrapIpc(result) {
    if (result && typeof result === 'object' && 'success' in result) {
      if (!result.success) throw new Error(result.error || 'IPC error')
      return result.data
    }
    return result
  }

  return {
    api,
    unwrapIpc,
  }
}
