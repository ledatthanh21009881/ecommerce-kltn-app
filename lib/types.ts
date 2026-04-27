export type OrderStatus = "pending" | "processing" | "shipping" | "completed" | "cancelled"

export type ShippingStatus =
  | "new_request"
  | "accepted"
  | "picked_up"
  | "delivering"
  | "arrived"
  | "delivered"
  | "completed"
  | "rejected"

export interface ShippingEvent {
  event_id?: number
  status_from?: ShippingStatus | null
  status_to: ShippingStatus
  note?: string | null
  photo_url?: string | null
  latitude?: number | null
  longitude?: number | null
  metadata?: Record<string, any> | null
  created_at: string
}

export interface ShippingProof {
  proof_id?: number
  status: Exclude<ShippingStatus, "new_request" | "accepted" | "rejected">
  photo_url: string
  proof_type: "pickup_photo" | "delivery_photo" | "signature" | "other"
  latitude?: number | null
  longitude?: number | null
  metadata?: Record<string, any> | null
  captured_at: string
}

export interface Order {
  id: string
  /** users.user_id of the buyer; required for shipper–customer messenger thread */
  customerUserId?: number
  customerName: string
  address: string
  phone: string
  products: Product[]
  status: OrderStatus
  shippingStatus: ShippingStatus
  createdAt: string
  updatedAt?: string
  notes?: string
  totalAmount: number
  shippingFee?: number
  codAmount?: number
  confirmationPhoto?: string
  shippingStatusUpdatedAt?: string
  shippingEvents?: ShippingEvent[]
  shippingProofs?: ShippingProof[]
  metadata?: Record<string, any>
}

export interface Product {
  id: string
  name: string
  quantity: number
  price: number
}

export interface DeliveryUser {
  id: string
  name: string
  phone: string
  avatar?: string
  joinDate: string
  totalDeliveries: number
  email?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface Notification {
  notification_id: number
  user_id: number
  type: string
  title: string
  message: string
  payload?: {
    order_id?: number
    conversation_id?: number
    customer_user_id?: number
    customer_name?: string
    type?: string
    [key: string]: any
  }
  is_read: boolean
  created_at: string
  read_at?: string
}

export type ShippingWorkflowAction =
  | "accept"
  | "pickup"
  | "start_delivery"
  | "arrive"
  | "deliver"
  | "complete"
  | "reject"

export interface ShippingActionPayload {
  note?: string
  photoUrl?: string
  latitude?: number
  longitude?: number
}
