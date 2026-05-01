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
  }
}
