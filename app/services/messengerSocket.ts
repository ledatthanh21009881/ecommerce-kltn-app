import AsyncStorage from "@react-native-async-storage/async-storage"
import { authService } from "./authService"

const DEFAULT_WS_PORT = "8080"

/**
 * WebSocket URL for Ratchet messenger (default port 8080, same host as REST API).
 * Override with EXPO_PUBLIC_WEBSOCKET_URL (full ws:// or wss:// URL) or AsyncStorage "websocketUrl".
 */
export async function getMessengerWebSocketUrl(): Promise<string> {
  const envFull = (process.env as Record<string, string | undefined>)?.EXPO_PUBLIC_WEBSOCKET_URL
  if (envFull?.trim().startsWith("ws")) {
    return envFull.trim()
  }
  const saved = await AsyncStorage.getItem("websocketUrl")
  if (saved?.trim().startsWith("ws")) {
    return saved.trim()
  }
  const base = await authService.getApiBaseUrl()
  let hostname = "localhost"
  let protocol: "ws" | "wss" = "ws"
  try {
    const u = new URL(base)
    hostname = u.hostname || "localhost"
    protocol = u.protocol === "https:" ? "wss" : "ws"
  } catch {
    // keep defaults
  }
  const port =
    (process.env as Record<string, string | undefined>)?.EXPO_PUBLIC_WEBSOCKET_PORT?.trim() ||
    DEFAULT_WS_PORT
  return `${protocol}://${hostname}:${port}`
}
