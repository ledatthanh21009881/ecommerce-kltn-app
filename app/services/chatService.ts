"use client"

import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"
import { apiClient } from "./apiClient"
import { authService } from "./authService"

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
  media?: Array<{ url?: string; type?: string; file_name?: string }>
}

export type MessageMediaPayload = {
  url: string
  type: string
  name?: string
  public_id?: string | null
  size?: number
}

export type UploadedMessageMedia = {
  url: string
  type: string
  name?: string
  public_id?: string | null
  size?: number
  file_name?: string
  file_size?: number
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

/** Parse `shipper:{id}:order:{id}` — dùng khi điều hướng ChatDetail từ list/banner. */
export function shipperConversationNavMeta(label?: string): {
  shipperUserId?: number
  orderNumericId?: number
  orderId?: string
  orderLabel?: string
} {
  const m = (label || "").match(/^shipper:(\d+):order:(\d+)$/)
  if (!m?.[1] || !m?.[2]) return {}
  const orderNumericId = Number(m[2])
  return {
    shipperUserId: Number(m[1]),
    orderNumericId: Number.isFinite(orderNumericId) ? orderNumericId : undefined,
    orderId: m[2],
    orderLabel: `#${m[2]}`,
  }
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

  /** Đánh dấu tin từ khách đã đọc (shipper) — PUT backend mark-read. */
  async markConversationRead(conversationId: number): Promise<boolean> {
    try {
      const res = await apiClient.put<{ success?: boolean }>(
        `/api/backend/v1/conversations/${conversationId}/mark-read`,
        {},
      )
      return Boolean(res?.success)
    } catch (e) {
      console.warn("[ChatService] markConversationRead failed", e)
      return false
    }
  }

  /**
   * Upload ảnh (multipart, field `media`) — cùng endpoint backend với web.
   * Trên web: truyền `webPickedFile` = `asset.file` từ expo-image-picker (RN Web không gửi được {uri}).
   */
  async uploadMessageMedia(
    localUri: string,
    mimeType: string,
    filename: string,
    webPickedFile?: File | null,
  ): Promise<UploadedMessageMedia | null> {
    const base = await authService.getApiBaseUrl()
    const token = await AsyncStorage.getItem("authToken")
    if (!token) return null

    let mt = (mimeType || "image/jpeg").toLowerCase()
    if (mt === "image" || !mt.includes("/")) mt = "image/jpeg"
    if (mt === "image/jpg") mt = "image/jpeg"

    const safeName = filename?.trim() || "photo.jpg"
    const form = new FormData()

    if (Platform.OS === "web") {
      if (webPickedFile && typeof File !== "undefined" && webPickedFile instanceof File) {
        form.append("media", webPickedFile, webPickedFile.name || safeName)
      } else {
        const blobResp = await fetch(localUri)
        const blob = await blobResp.blob()
        form.append("media", blob, safeName)
      }
    } else {
      form.append("media", { uri: localUri, type: mt, name: safeName } as any)
    }

    const res = await fetch(`${base.replace(/\/$/, "")}/api/backend/v1/messages/upload-media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: form,
    })

    const json = (await res.json().catch(() => ({}))) as ApiDataResponse<UploadedMessageMedia> & {
      data?: UploadedMessageMedia
    }
    if (!res.ok || !json?.success || !json.data?.url) {
      console.error("[ChatService] uploadMessageMedia failed", res.status, json)
      return null
    }
    const d = json.data as UploadedMessageMedia
    return {
      url: d.url,
      type: d.type || mt,
      name: d.file_name ?? d.name ?? safeName,
      public_id: d.public_id ?? null,
      size: d.file_size ?? d.size,
    }
  }

  async sendMessage(
    conversationId: number,
    content: string,
    media?: MessageMediaPayload[],
  ): Promise<MessageItem | null> {
    const body: Record<string, unknown> = {
      conversation_id: conversationId,
      content,
    }
    if (media?.length) {
      body.media = media.map((m) => ({
        url: m.url,
        type: m.type,
        name: m.name ?? "image.jpg",
        public_id: m.public_id ?? null,
        size: m.size ?? 0,
      }))
    }
    const res = await apiClient.post<ApiDataResponse<MessageItem>>("/api/backend/v1/messages", body)
    if (!res?.success || !res.data) return null
    return res.data
  }
}

export const chatService = new ChatService()
