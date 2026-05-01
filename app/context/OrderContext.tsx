"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { orderService, type ShipperOrderShippingTotals } from "../services/orderService"
import type { Order, ShippingStatus } from "../../lib/types"
import { locationService } from "../services/locationService"
import { liveLocationTrackingService } from "../services/liveLocationTrackingService"

interface OrderContextType {
  orders: Order[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
  currentFilter: ShippingStatus | null
  /** Tổng đơn theo filter API — dùng cho badge chip, không phụ thuộc list `orders` hiện tại */
  shippingTotals: ShipperOrderShippingTotals | null
  refreshShippingTotals: () => Promise<void>
  refreshOrders: (filter?: ShippingStatus) => Promise<void>
  loadMoreOrders: () => Promise<void>
  acceptOrder: (orderId: string) => Promise<void>
  pickupOrder: (orderId: string, photoUri: string) => Promise<void>
  startDelivery: (orderId: string) => Promise<void>
  arriveOrder: (orderId: string) => Promise<void>
  deliverOrder: (orderId: string, photoUri: string) => Promise<void>
  completeOrder: (orderId: string) => Promise<void>
  rejectOrder: (orderId: string, note: string) => Promise<void>
  fetchOrderById: (orderId: string) => Promise<Order | null>
  setPreferredTrackingOrder: (orderId: string | null) => void
}

const OrderContext = createContext<OrderContextType | undefined>(undefined)

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasMore: false,
  })
  const [currentFilter, setCurrentFilter] = useState<ShippingStatus | null>(null)
  const [preferredTrackingOrderId, setPreferredTrackingOrderId] = useState<string | null>(null)
  const [shippingTotals, setShippingTotals] = useState<ShipperOrderShippingTotals | null>(null)

  const isTrackableStatus = (status: ShippingStatus | undefined) =>
    !!status && ["picked_up", "delivering", "arrived"].includes(status)

  const getOrderActivityTime = (order: Order) => {
    const ts = order.shippingStatusUpdatedAt || order.updatedAt || order.createdAt
    const t = new Date(ts || 0).getTime()
    return Number.isFinite(t) ? t : 0
  }

  useEffect(() => {
    const preferredOrder = preferredTrackingOrderId
      ? orders.find((order) => order.id === preferredTrackingOrderId && isTrackableStatus(order.shippingStatus))
      : null

    const activeOrder = preferredOrder ?? [...orders]
      .filter((order) => isTrackableStatus(order.shippingStatus))
      .sort((a, b) => getOrderActivityTime(b) - getOrderActivityTime(a))[0]

    if (activeOrder?.id) {
      void liveLocationTrackingService.startTracking(activeOrder.id)
      return
    }

    liveLocationTrackingService.stopTracking()
  }, [orders, preferredTrackingOrderId])

  useEffect(() => {
    return () => {
      liveLocationTrackingService.stopTracking()
    }
  }, [])

  const refreshShippingTotals = useCallback(async () => {
    try {
      const totals = await orderService.getShipperOrdersShippingTotals()
      setShippingTotals(totals)
    } catch {
      /* giữ totals cũ nếu lỗi */
    }
  }, [])

  const refreshOrders = useCallback(async (filter?: ShippingStatus) => {
    setLoading(true)
    setError(null)
    setCurrentFilter(filter || null)
    try {
      const result = await orderService.getOrders({
        shippingStatus: filter || undefined,
        page: 1,
        limit: pagination.limit,
      })
      setOrders(result.orders)
      setPagination({
        page: result.pagination.page || 1,
        limit: result.pagination.limit || 20,
        total: result.pagination.total || 0,
        totalPages: result.pagination.totalPages || 1,
        hasMore: (result.pagination.page || 1) < (result.pagination.totalPages || 1),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setLoading(false)
    }
  }, [pagination.limit])

  const loadMoreOrders = useCallback(async () => {
    if (loadingMore || !pagination.hasMore) {
      return
    }

    setLoadingMore(true)
    try {
      const nextPage = pagination.page + 1
      const result = await orderService.getOrders({
        shippingStatus: currentFilter || undefined,
        page: nextPage,
        limit: pagination.limit,
      })
      setOrders((prev) => [...prev, ...result.orders])
      setPagination({
        page: result.pagination.page || nextPage,
        limit: result.pagination.limit || 20,
        total: result.pagination.total || 0,
        totalPages: result.pagination.totalPages || 1,
        hasMore: (result.pagination.page || nextPage) < (result.pagination.totalPages || 1),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải thêm đơn hàng")
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, pagination.hasMore, pagination.page, pagination.limit, currentFilter])

  const syncOrderById = useCallback(async (orderId: string) => {
    const detail = await orderService.getOrderById(orderId)
    if (detail) {
      setOrders((prev) => {
        const exists = prev.some((order) => order.id === detail.id)
        if (exists) {
          return prev.map((order) => (order.id === detail.id ? { ...order, ...detail } : order))
        }
        return [detail, ...prev]
      })
    }
    return detail
  }, [])

  const acceptOrder = async (orderId: string) => {
    try {
      await orderService.acceptOrder(orderId)
      await syncOrderById(orderId)
      setPreferredTrackingOrderId(orderId)
      liveLocationTrackingService.stopTracking(orderId)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Không thể nhận đơn hàng")
    }
  }

  const pickupOrder = async (orderId: string, photoUri: string) => {
    if (!photoUri) {
      throw new Error("Vui lòng chụp ảnh xác nhận khi lấy hàng")
    }

    try {
      const coords = await locationService.getCurrentPosition()
      await orderService.pickupOrder(orderId, {
        photoUrl: photoUri,
        latitude: coords.latitude,
        longitude: coords.longitude,
      })
      await syncOrderById(orderId)
      setPreferredTrackingOrderId(orderId)
      await liveLocationTrackingService.startTracking(orderId)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Không thể lấy hàng")
    }
  }

  const startDelivery = async (orderId: string) => {
    try {
      await orderService.startDelivery(orderId)
      await syncOrderById(orderId)
      setPreferredTrackingOrderId(orderId)
      await liveLocationTrackingService.startTracking(orderId)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Không thể bắt đầu giao hàng")
    }
  }

  const arriveOrder = async (orderId: string) => {
    try {
      const coords = await locationService.getCurrentPosition()
      await orderService.arriveOrder(orderId, {
        latitude: coords.latitude,
        longitude: coords.longitude,
      })
      await syncOrderById(orderId)
      setPreferredTrackingOrderId(orderId)
      await liveLocationTrackingService.startTracking(orderId)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Không thể xác nhận tới điểm giao")
    }
  }

  const deliverOrder = async (orderId: string, photoUri: string) => {
    if (!photoUri) {
      throw new Error("Cần chụp ảnh xác nhận khi giao hàng")
    }

    try {
      const coords = await locationService.getCurrentPosition()
      await orderService.deliverOrder(orderId, {
        photoUrl: photoUri,
        latitude: coords.latitude,
        longitude: coords.longitude,
      })
      await syncOrderById(orderId)
      setPreferredTrackingOrderId(orderId)
      await liveLocationTrackingService.startTracking(orderId)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Không thể giao hàng")
    }
  }

  const completeOrder = async (orderId: string) => {
    try {
      await orderService.completeOrder(orderId)
      await syncOrderById(orderId)
      if (preferredTrackingOrderId === orderId) {
        setPreferredTrackingOrderId(null)
      }
      liveLocationTrackingService.stopTracking(orderId)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Không thể hoàn tất đơn hàng")
    }
  }

  const rejectOrder = async (orderId: string, note: string) => {
    try {
      await orderService.rejectOrder(orderId, note)
      await syncOrderById(orderId)
      if (preferredTrackingOrderId === orderId) {
        setPreferredTrackingOrderId(null)
      }
      liveLocationTrackingService.stopTracking(orderId)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Không thể từ chối đơn hàng")
    }
  }

  const fetchOrderById = async (orderId: string) => {
    return syncOrderById(orderId)
  }

  const setPreferredTrackingOrder = useCallback((orderId: string | null) => {
    setPreferredTrackingOrderId(orderId)
    if (!orderId) {
      liveLocationTrackingService.stopTracking()
      return
    }
    const order = orders.find((item) => item.id === orderId)
    if (order && isTrackableStatus(order.shippingStatus)) {
      void liveLocationTrackingService.startTracking(orderId)
    }
  }, [orders])

  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        loadingMore,
        error,
        pagination,
        currentFilter,
        shippingTotals,
        refreshShippingTotals,
        refreshOrders,
        loadMoreOrders,
        acceptOrder,
        pickupOrder,
        startDelivery,
        arriveOrder,
        deliverOrder,
        completeOrder,
        rejectOrder,
        fetchOrderById,
        setPreferredTrackingOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  )
}

export function useOrderContext() {
  const context = useContext(OrderContext)
  if (context === undefined) {
    throw new Error("useOrderContext must be used within an OrderProvider")
  }
  return context
}
