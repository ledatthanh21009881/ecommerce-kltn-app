/**
 * Params for HomeStack (AppNavigator `HomeStack`).
 */
export type HomeStackParamList = {
  Home: undefined
  OrderDetail: { orderId: string }
  Camera: { orderId: string; action: "pickup" | "deliver" }
  Notification: undefined
  ChatDetail: {
    conversationId?: string | number
    title?: string
    customerUserId?: number
    shipperUserId?: number
    orderNumericId?: number
    orderId?: string
    orderLabel?: string
    /** Khóa ô nhập (đơn hoàn thành / đã hủy sau khi giao). */
    chatReadOnly?: boolean
    /** Chat hỗ trợ với admin Shop (conversation label support). */
    supportWithAdmin?: boolean
  }
}
