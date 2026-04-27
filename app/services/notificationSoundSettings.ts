import AsyncStorage from "@react-native-async-storage/async-storage"

const KEY_ORDERS = "notif_sound_orders"
const KEY_MESSAGES = "notif_sound_messages"

let cachedOrders = true
let cachedMessages = true

function parseBool(raw: string | null, defaultTrue: boolean): boolean {
  if (raw === null || raw === undefined) return defaultTrue
  return raw === "true"
}

/** Đọc từ storage vào cache (gọi khi khởi động app / mở màn cài đặt). */
export async function loadNotificationSoundPrefs(): Promise<void> {
  try {
    const [o, m] = await Promise.all([AsyncStorage.getItem(KEY_ORDERS), AsyncStorage.getItem(KEY_MESSAGES)])
    cachedOrders = parseBool(o, true)
    cachedMessages = parseBool(m, true)
  } catch {
    cachedOrders = true
    cachedMessages = true
  }
}

export function getCachedSoundOrders(): boolean {
  return cachedOrders
}

export function getCachedSoundMessages(): boolean {
  return cachedMessages
}

export async function setSoundOrdersEnabled(value: boolean): Promise<void> {
  cachedOrders = value
  await AsyncStorage.setItem(KEY_ORDERS, value ? "true" : "false")
}

export async function setSoundMessagesEnabled(value: boolean): Promise<void> {
  cachedMessages = value
  await AsyncStorage.setItem(KEY_MESSAGES, value ? "true" : "false")
}

/** Phân loại payload FCM/data đẩy — khớp logic tin nhắn trên NotificationScreen. */
export function isChatPushPayload(data: Record<string, unknown> | undefined): boolean {
  if (!data || typeof data !== "object") return false
  const type = String(data.type ?? data.notification_type ?? "").toLowerCase()
  if (type === "new_chat_message" || type.includes("chat_message")) return true
  return false
}
