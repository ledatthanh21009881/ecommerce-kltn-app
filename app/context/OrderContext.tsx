"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { orderService } from "../services/orderService"
import type { Order, ShippingStatus } from "../../lib/types"
import { locationService } from "../services/locationService"

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
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Không thể lấy hàng")
    }
  }

  const startDelivery = async (orderId: string) => {
    try {
      await orderService.startDelivery(orderId)
      await syncOrderById(orderId)
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
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Không thể giao hàng")
    }
  }

  const completeOrder = async (orderId: string) => {
    try {
      await orderService.completeOrder(orderId)
      await syncOrderById(orderId)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Không thể hoàn tất đơn hàng")
    }
  }

  const rejectOrder = async (orderId: string, note: string) => {
    try {
      await orderService.rejectOrder(orderId, note)
      await syncOrderById(orderId)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Không thể từ chối đơn hàng")
    }
  }

  const fetchOrderById = async (orderId: string) => {
    return syncOrderById(orderId)
  }

  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        loadingMore,
        error,
        pagination,
        currentFilter,
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
