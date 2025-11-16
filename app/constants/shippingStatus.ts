import type { ShippingStatus } from "../../lib/types"
import { theme } from "../../styles/theme"

export interface ShippingStatusConfig {
  label: string
  description: string
  color: string
  backgroundColor: string
  icon: string
}

export const SHIPPING_STATUS_FLOW: ShippingStatus[] = [
  "new_request",
  "accepted",
  "picked_up",
  "delivering",
  "arrived",
  "delivered",
  "completed",
]

export const shippingStatusConfig: Record<ShippingStatus, ShippingStatusConfig> = {
  new_request: {
    label: "Chờ xác nhận",
    description: "Đơn hàng mới, cần nhận hoặc từ chối",
    color: theme.colors.pending,
    backgroundColor: theme.colors.warningContainer,
    icon: "hand-front-right",
  },
  accepted: {
    label: "Đã nhận đơn",
    description: "Bạn đã nhận đơn, chuẩn bị lấy hàng",
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
    icon: "clipboard-check-outline",
  },
  picked_up: {
    label: "Đã lấy hàng",
    description: "Đã xác nhận lấy hàng thành công",
    color: theme.colors.info,
    backgroundColor: theme.colors.infoContainer,
    icon: "box",
  },
  delivering: {
    label: "Đang giao",
    description: "Đơn đang trên đường giao cho khách",
    color: theme.colors.delivering,
    backgroundColor: theme.colors.infoContainer,
    icon: "truck-delivery-outline",
  },
  arrived: {
    label: "Đã đến điểm giao",
    description: "Bạn đã đến vị trí khách hàng",
    color: theme.colors.warning,
    backgroundColor: theme.colors.warningContainer,
    icon: "map-marker-check-outline",
  },
  delivered: {
    label: "Đã giao xong",
    description: "Đã chụp ảnh xác nhận giao hàng",
    color: theme.colors.success,
    backgroundColor: theme.colors.successContainer,
    icon: "image-check",
  },
  completed: {
    label: "Hoàn tất",
    description: "Đơn hàng đã hoàn thành",
    color: theme.colors.completed,
    backgroundColor: theme.colors.successContainer,
    icon: "check-decagram",
  },
  rejected: {
    label: "Đã từ chối",
    description: "Đơn hàng đã bị từ chối",
    color: theme.colors.cancelled,
    backgroundColor: theme.colors.errorContainer,
    icon: "close-circle-outline",
  },
}

export function getShippingStatusConfig(status: ShippingStatus): ShippingStatusConfig {
  return shippingStatusConfig[status] ?? shippingStatusConfig.new_request
}

