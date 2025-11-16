export const statusTranslations: Record<string, string> = {
  pending: 'Chờ nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

export function translateStatus(status: string): string {
  return statusTranslations[status] || status
}

export const shippingStatusTranslations: Record<string, string> = {
  new_request: 'Chờ xác nhận',
  accepted: 'Đã nhận đơn',
  picked_up: 'Đã lấy hàng',
  delivering: 'Đang giao',
  arrived: 'Đã đến điểm giao',
  delivered: 'Đã giao xong',
  completed: 'Hoàn tất',
  rejected: 'Đã từ chối',
}

export function translateShippingStatus(status: string): string {
  return shippingStatusTranslations[status] || translateStatus(status)
}

