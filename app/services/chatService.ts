"use client"

import { apiClient } from "./apiClient"

export interface ConversationItem {
  conversation_id: number
  customer_id: number
  first_name?: string
  last_name?: string
  email?: string
  avatar_url?: string | null
  last_message?: string | null
  last_message_time?: string | null
  unread_count?: number
  label?: string
}

export interface MessageItem {
  message_id: number
  conversation_id: number
  sender_id: number
  content: string
  sent_at: string
  is_read: number
  first_name?: string
  last_name?: string
  media?: Array<{ url?: string; type?: string }>
}

type ApiListResponse<T> = {
  success: boolean
  message?: string
  data?: { items?: T[] } | T[]
}

type ApiDataResponse<T> = {
  success: boolean
  message?: string
  data?: T
}

export type ConversationQueryFilters = {
  shipperId?: number
  orderId?: number
  label?: string
  /** Shipper app: only conversations with label shipper:{me}:order:* */
  myShipperConversations?: boolean
}

class ChatService {
  async getConversations(customerId?: number, filters?: ConversationQueryFilters): Promise<ConversationItem[]> {
    const qs = new URLSearchParams()
    if (filters?.myShipperConversations) {
      qs.set("my_shipper_conversations", "1")
    } else if (customerId != null) {
      qs.set("customer_id", String(customerId))
      if (filters?.shipperId != null) qs.set("shipper_id", String(filters.shipperId))
      if (filters?.orderId != null) qs.set("order_id", String(filters.orderId))
      if (filters?.label) qs.set("label", filters.label)
    }
    const query = qs.toString() ? `?${qs.toString()}` : ""
    const res = await apiClient.get<ApiListResponse<ConversationItem>>(`/api/backend/v1/conversations${query}`)
    if (!res?.success) return []
    if (Array.isArray(res.data)) return res.data
    return Array.isArray(res.data?.items) ? res.data.items : []
  }

  /**
   * Same room as web messenger: customer_id + shipper + order → label shipper:{id}:order:{id}
   */
  async ensureShipperOrderConversation(
    customerUserId: number,
    shipperUserId: number,
    orderId: number,
  ): Promise<number | null> {
    const existing = await this.getConversations(customerUserId, {
      shipperId: shipperUserId,
      orderId,
    })
    const first = existing[0]
    if (first?.conversation_id) return Number(first.conversation_id)

    return this.createConversation(customerUserId, {
      shipperId: shipperUserId,
      orderId,
    })
  }

  async createConversation(
    customerId: number,
    opts?: { shipperId?: number; orderId?: number; label?: string },
  ): Promise<number | null> {
    const body: Record<string, unknown> = { customer_id: customerId }
    if (opts?.shipperId != null) body.shipper_id = opts.shipperId
    if (opts?.orderId != null) body.order_id = opts.orderId
    if (opts?.label) body.label = opts.label

    const res = await apiClient.post<ApiDataResponse<{ conversation_id?: number } & ConversationItem>>(
      "/api/backend/v1/conversations",
      body,
    )
    if (!res?.success || !res.data) return null
    const d = res.data as { conversation_id?: number }
    const id = Number(d.conversation_id ?? (res.data as ConversationItem).conversation_id)
    return Number.isFinite(id) && id > 0 ? id : null
  }

  async getMessages(conversationId: number): Promise<MessageItem[]> {
    const res = await apiClient.get<ApiListResponse<MessageItem>>(`/api/backend/v1/conversations/${conversationId}/messages`)
    if (!res?.success) return []
    if (Array.isArray(res.data)) return res.data
    return Array.isArray(res.data?.items) ? res.data.items : []
  }

  async sendMessage(conversationId: number, content: string): Promise<MessageItem | null> {
    const res = await apiClient.post<ApiDataResponse<MessageItem>>("/api/backend/v1/messages", {
      conversation_id: conversationId,
      content,
    })
    if (!res?.success || !res.data) return null
    return res.data
  }
}

export const chatService = new ChatService()
