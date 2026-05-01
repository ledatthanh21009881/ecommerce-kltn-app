import { apiClient } from "./apiClient"
import type { Order, OrderPaymentInfo, ShippingActionPayload, ShippingStatus } from "../../lib/types"

/** Giống chip lọc trên OrderListScreen — API với limit=1 chỉ để đọc `pagination.total`. */
export const SHIPPER_ORDER_LIST_FILTER_STATUSES = [
  "new_request",
  "accepted",
  "picked_up",
  "delivering",
  "arrived",
  "delivered",
  "completed",
] as const satisfies readonly ShippingStatus[]

export type ShipperOrderShippingTotals = {
  all: number
  byStatus: Record<(typeof SHIPPER_ORDER_LIST_FILTER_STATUSES)[number], number>
}

interface GetOrdersParams {
  status?: string
  shippingStatus?: ShippingStatus
  page?: number
  limit?: number
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface PaginatedResponse {
  success: boolean
  message?: string
  status_code?: number
  data: {
    items: any[]
    pagination: {
      total: number
      per_page: number
      current_page: number
      last_page: number
      from: number
      to: number
    }
  }
}

function parseJSONValue<T>(value: any): T | null {
  if (!value) return null
  try {
    if (typeof value === "string") {
      return JSON.parse(value) as T
    }
    return value as T
  } catch (error) {
    console.warn("[OrderService] Failed to parse JSON value", error)
    return null
  }
}

function mapBackendOrderToOrder(backendOrder: any): Order {
  let destinationLatitude: number | null = null
  let destinationLongitude: number | null = null

  // Parse shipping address
  let address = ""
  if (backendOrder.shipping_address_snapshot) {
    try {
      const addressData = typeof backendOrder.shipping_address_snapshot === 'string' 
        ? JSON.parse(backendOrder.shipping_address_snapshot)
        : backendOrder.shipping_address_snapshot
      if (addressData) {
        const latRaw = addressData.lat ?? addressData.latitude
        const lngRaw = addressData.lng ?? addressData.longitude
        const parsedLat = Number(latRaw)
        const parsedLng = Number(lngRaw)
        if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
          destinationLatitude = parsedLat
          destinationLongitude = parsedLng
        }
        address = [
          addressData.street,
          addressData.ward,
          addressData.district,
          addressData.city
        ].filter(Boolean).join(", ")
      }
    } catch (e) {
      address = backendOrder.shipping_address_snapshot || ""
    }
  }

  if (destinationLatitude == null || destinationLongitude == null) {
    const fallbackLatRaw =
      backendOrder.destination_lat ??
      backendOrder.destinationLatitude ??
      backendOrder.address_lat ??
      backendOrder.latitude
    const fallbackLngRaw =
      backendOrder.destination_lng ??
      backendOrder.destinationLongitude ??
      backendOrder.address_lng ??
      backendOrder.longitude
    const fallbackLat = Number(fallbackLatRaw)
    const fallbackLng = Number(fallbackLngRaw)
    if (Number.isFinite(fallbackLat) && Number.isFinite(fallbackLng)) {
      destinationLatitude = fallbackLat
      destinationLongitude = fallbackLng
    }
  }

  // Map order items
  const products = (backendOrder.items || []).map((item: any) => ({
    id: item.item_id?.toString() || item.variant_id?.toString() || "",
    name: item.product_name_snapshot || item.product_name || "Sản phẩm",
    quantity: item.quantity || 0,
    price: item.unit_price || 0,
  }))

  const shippingEventsRaw = backendOrder.delivery_events ?? backendOrder.shipping_events ?? []
  const shippingProofsRaw = backendOrder.delivery_proofs ?? []

  const shippingEvents = Array.isArray(shippingEventsRaw)
    ? shippingEventsRaw
    : parseJSONValue(shippingEventsRaw) ?? []

  const shippingProofs = Array.isArray(shippingProofsRaw)
    ? shippingProofsRaw
    : parseJSONValue(shippingProofsRaw) ?? []

  const rawCustomerId = backendOrder.customer_id ?? backendOrder.customer_user_id ?? backendOrder.user_id
  const customerUserId =
    rawCustomerId != null && rawCustomerId !== "" && Number.isFinite(Number(rawCustomerId))
      ? Number(rawCustomerId)
      : undefined

  let payment: OrderPaymentInfo | null = null
  const rawPay = backendOrder.payment
  if (rawPay && typeof rawPay === "object") {
    payment = {
      method: rawPay.method != null ? String(rawPay.method) : undefined,
      status: rawPay.status != null ? String(rawPay.status) : undefined,
      paid_amount:
        rawPay.paid_amount != null && rawPay.paid_amount !== ""
          ? Number(rawPay.paid_amount)
          : undefined,
    }
  }

  return {
    id: backendOrder.order_id?.toString() || backendOrder.id?.toString() || "",
    customerUserId,
    customerName: `${backendOrder.first_name || ""} ${backendOrder.last_name || ""}`.trim() || "Khách hàng",
    address: address || backendOrder.address || "",
    phone: backendOrder.phone || "",
    products: products,
    status: backendOrder.status || "pending",
    shippingStatus: (backendOrder.shipping_status || "new_request") as ShippingStatus,
    createdAt: backendOrder.created_at || new Date().toISOString(),
    updatedAt: backendOrder.updated_at,
    notes: backendOrder.note || backendOrder.notes || "",
    totalAmount: backendOrder.total_amount || 0,
    shippingFee: backendOrder.shipping_fee || 0,
    codAmount: backendOrder.cod_amount || 0,
    payment,
    confirmationPhoto: backendOrder.tracking?.photo_proof_url || backendOrder.photo_proof_url,
    shippingStatusUpdatedAt: backendOrder.shipping_status_updated_at,
    shippingEvents,
    shippingProofs,
    destinationLatitude,
    destinationLongitude,
    metadata: backendOrder.metadata || undefined,
  }
}

function buildActionBody(payload?: ShippingActionPayload) {
  const body: Record<string, any> = {}
  if (!payload) return body
  if (payload.note) body.note = payload.note
  if (payload.photoUrl) body.photo_url = payload.photoUrl
  if (typeof payload.latitude === "number") body.latitude = payload.latitude
  if (typeof payload.longitude === "number") body.longitude = payload.longitude
  return body
}

class OrderService {
  async getOrders(filters?: GetOrdersParams): Promise<{ orders: Order[]; pagination: any }> {
    try {
      const params = new URLSearchParams()
      if (filters?.status) {
        params.append("status", filters.status)
      }
      if (filters?.shippingStatus) {
        params.append("shipping_status", filters.shippingStatus)
      }
      if (filters?.page) {
        params.append("page", filters.page.toString())
      }
      if (filters?.limit) {
        params.append("limit", filters.limit.toString())
      }

      const queryString = params.toString()
      const endpoint = `/api/v1/shipper/orders${queryString ? `?${queryString}` : ""}`

      console.log('[OrderService] Fetching orders from:', endpoint)
      const response = await apiClient.get<PaginatedResponse>(endpoint)
      console.log('[OrderService] Response:', JSON.stringify(response, null, 2))

      // Check response structure
      if (!response || typeof response !== 'object') {
        console.error('[OrderService] Invalid response: not an object', response)
        throw new Error("Invalid response format: response is not an object")
      }

      if (!response.success) {
        console.error('[OrderService] Response not successful:', response)
        throw new Error(response.message || "Request failed")
      }

      // Handle case where data might be directly the items array (backward compatibility)
      let items: any[] = []
      let paginationData: any = null

      if (response.data) {
        if (Array.isArray(response.data)) {
          // If data is directly an array
          items = response.data
        } else if (response.data.items && Array.isArray(response.data.items)) {
          // If data has items property (standard paginated response)
          items = response.data.items
          paginationData = response.data.pagination
        }
      }

      if (!Array.isArray(items)) {
        console.error('[OrderService] Items is not an array:', items)
        console.error('[OrderService] Full response:', JSON.stringify(response, null, 2))
        throw new Error("Invalid response format: items is not an array")
      }

      console.log('[OrderService] Found', items.length, 'orders')
      const orders = items.map(mapBackendOrderToOrder)

      return {
        orders,
        pagination: {
          total: paginationData?.total || items.length,
          page: paginationData?.current_page || filters?.page || 1,
          limit: paginationData?.per_page || filters?.limit || 20,
          totalPages: paginationData?.last_page || 1,
        },
      }
    } catch (error: any) {
      console.error('[OrderService] Error fetching orders:', error)
      throw new Error(error.message || "Lỗi kết nối mạng. Vui lòng thử lại.")
    }
  }

  /**
   * Tổng đơn theo từng shipping_status độc lập với list đang hiển thị (pagination.total của từng filter).
   * Dùng cho badge số trên chip lọc.
   */
  async getShipperOrdersShippingTotals(): Promise<ShipperOrderShippingTotals> {
    const allResult = await this.getOrders({ page: 1, limit: 1 })
    const all = typeof allResult.pagination?.total === "number" ? allResult.pagination.total : 0

    const perFiltered = await Promise.all(
      SHIPPER_ORDER_LIST_FILTER_STATUSES.map((shippingStatus) =>
        this.getOrders({ shippingStatus, page: 1, limit: 1 }),
      ),
    )

    const byStatus = {} as ShipperOrderShippingTotals["byStatus"]
    SHIPPER_ORDER_LIST_FILTER_STATUSES.forEach((s, i) => {
      const total = perFiltered[i]?.pagination?.total
      byStatus[s] = typeof total === "number" ? total : 0
    })

    return { all, byStatus }
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`/api/v1/shipper/orders/${orderId}`)

      if (!response.success || !response.data) {
        return null
      }

      return mapBackendOrderToOrder(response.data)
    } catch (error: any) {
      throw new Error(error.message || "Không thể lấy thông tin đơn hàng")
    }
  }

  async acceptOrder(orderId: string): Promise<void> {
    try {
      await this.postShippingAction(orderId, "accept")
    } catch (error: any) {
      throw new Error(error.message || "Không thể nhận đơn hàng")
    }
  }

  async pickupOrder(orderId: string, payload?: ShippingActionPayload): Promise<void> {
    try {
      await this.postShippingAction(orderId, "pickup", payload)
    } catch (error: any) {
      throw new Error(error.message || "Không thể lấy hàng")
    }
  }

  async startDelivery(orderId: string, payload?: ShippingActionPayload): Promise<void> {
    try {
      await this.postShippingAction(orderId, "start-delivery", payload)
    } catch (error: any) {
      throw new Error(error.message || "Không thể bắt đầu giao hàng")
    }
  }

  async arriveOrder(orderId: string, payload?: ShippingActionPayload): Promise<void> {
    try {
      await this.postShippingAction(orderId, "arrive", payload)
    } catch (error: any) {
      throw new Error(error.message || "Không thể xác nhận đã đến điểm giao")
    }
  }

  async deliverOrder(orderId: string, payload?: ShippingActionPayload): Promise<void> {
    try {
      await this.postShippingAction(orderId, "deliver", payload)
    } catch (error: any) {
      throw new Error(error.message || "Không thể giao hàng")
    }
  }

  async completeOrder(orderId: string, payload?: ShippingActionPayload): Promise<void> {
    try {
      await this.postShippingAction(orderId, "complete", payload)
    } catch (error: any) {
      throw new Error(error.message || "Không thể hoàn tất đơn hàng")
    }
  }

  async rejectOrder(orderId: string, note: string): Promise<void> {
    try {
      await this.postShippingAction(orderId, "reject", { note })
    } catch (error: any) {
      throw new Error(error.message || "Không thể từ chối đơn hàng")
    }
  }

  async updateOrderStatus(orderId: string, status: Order["status"], photo?: string): Promise<void> {
    if (status === "processing") {
      await this.acceptOrder(orderId)
    } else if (status === "shipping") {
      await this.pickupOrder(orderId, { photoUrl: photo })
      await this.startDelivery(orderId)
    } else if (status === "completed") {
      await this.deliverOrder(orderId, { photoUrl: photo })
      await this.completeOrder(orderId)
    } else {
      throw new Error(`Không thể cập nhật trạng thái thành ${status}`)
    }
  }

  async uploadPhoto(photoUri: string): Promise<string> {
    // TODO: Implement photo upload to backend
    // For now, return the URI as-is
    return photoUri
  }

  private async postShippingAction(orderId: string, actionPath: string, payload?: ShippingActionPayload) {
    const body = buildActionBody(payload)
    await apiClient.post(`/api/v1/shipper/orders/${orderId}/${actionPath}`, body)
  }
}

export const orderService = new OrderService()
