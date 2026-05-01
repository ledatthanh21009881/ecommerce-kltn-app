/**
 * apiClient calls this when credentials are cleared after refresh failure so AuthProvider
 * can set user=null and show Login (avoids staying on Main with broken loads).
 */

type SessionExpiredFn = () => void

let listener: SessionExpiredFn | null = null

export function registerSessionExpiredHandler(fn: SessionExpiredFn | null) {
  listener = fn
}

export function notifySessionExpired() {
  try {
    listener?.()
  } catch (e) {
    console.warn("[AuthSession] session-expired handler error", e)
  }
}
