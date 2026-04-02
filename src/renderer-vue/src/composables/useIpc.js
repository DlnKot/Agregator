/**
 * IPC wrapper composable
 * Provides unwrapIpc helper for handling IPC responses
 */

export function useIpc() {
  function unwrapIpc(res) {
    if (!res || typeof res !== 'object') return res
    if (res.success === false) {
      const err = new Error(res.error || 'IPC request failed')
      err.ipc = res
      throw err
    }
    if (res.success === true && Object.prototype.hasOwnProperty.call(res, 'data')) {
      return res.data
    }
    return res
  }

  return { unwrapIpc }
}
