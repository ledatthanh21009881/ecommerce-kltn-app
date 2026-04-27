/**
 * Điều hướng tới chi tiết đơn trong tab "Đơn hàng" (HomeStack có OrderDetail).
 * Dùng khi đang ở màn hình ngoài tab (Thông báo, Lịch sử, v.v.).
 */
export function navigateToShipperOrderDetail(navigation: { navigate: (name: string, params?: object) => void }, orderId: string) {
  navigation.navigate("Main", {
    screen: "Đơn hàng",
    params: {
      screen: "OrderDetail",
      params: { orderId },
    },
  })
}
