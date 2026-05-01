"use client"

import React, { useEffect, useState } from "react"
import { View, ScrollView, StyleSheet, Alert, Linking, Platform, RefreshControl } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Text, Card, Button, Divider, IconButton, Chip, Portal, Dialog } from "react-native-paper"
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native"
import { useOrderContext } from "../context/OrderContext"
import HeaderBar from "../../components/HeaderBar"
import { formatCurrency } from "../../lib/utils"
import LoadingOverlay from "../../components/LoadingOverlay"
import EmptyState from "../../components/EmptyState"
import { theme, spacing, shadows, borderRadius } from "../../styles/theme"
import { translateShippingStatus } from "../../lib/translations"
import SlideToConfirm from "../../components/SlideToConfirm"
import ShippingTimeline from "../../components/ShippingTimeline"
import { getShippingStatusConfig } from "../constants/shippingStatus"
import type { Order } from "../../lib/types"
import { notificationService } from "../services/notificationService"
import { locationService } from "../services/locationService"

/** Số shipper cần thu COD (ưu tiên cod_amount, không thì tổng đơn). */
function codCollectAmount(order: Order): number {
  const c = Number(order.codAmount ?? 0)
  const t = Number(order.totalAmount ?? 0)
  return c > 0 ? c : t
}

const COMPLETE_DISTANCE_THRESHOLD_METERS = 120

function toFiniteNumber(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function extractDestination(order: Order): { latitude: number; longitude: number } | null {
  const directLat = toFiniteNumber(order.destinationLatitude)
  const directLng = toFiniteNumber(order.destinationLongitude)
  if (directLat != null && directLng != null) {
    return { latitude: directLat, longitude: directLng }
  }

  const metadata = order.metadata ?? {}
  const fallbackLat = toFiniteNumber(
    metadata.destination_lat ?? metadata.destinationLatitude ?? metadata.address_lat ?? metadata.latitude,
  )
  const fallbackLng = toFiniteNumber(
    metadata.destination_lng ?? metadata.destinationLongitude ?? metadata.address_lng ?? metadata.longitude,
  )
  if (fallbackLat != null && fallbackLng != null) {
    return { latitude: fallbackLat, longitude: fallbackLng }
  }
  return null
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earthRadius = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}

export default function OrderDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute()
  const {
    orders,
    loading,
    fetchOrderById,
    acceptOrder,
    startDelivery,
    arriveOrder,
    completeOrder,
    rejectOrder,
    setPreferredTrackingOrder,
  } = useOrderContext()

  const { orderId } = route.params as { orderId: string }
  const [order, setOrder] = useState<Order | null>(orders.find((o) => o.id === orderId) ?? null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectDialogVisible, setRejectDialogVisible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      const detail = await fetchOrderById(orderId)
      if (detail) {
        setOrder(detail)
      }
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const updated = orders.find((o) => o.id === orderId)
    if (updated) {
      setOrder(updated)
    }
  }, [orders, orderId])

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true
      setPreferredTrackingOrder(orderId)
      fetchOrderById(orderId).then((detail) => {
        if (detail && isActive) {
          setOrder(detail)
        }
      })
      return () => {
        isActive = false
        setPreferredTrackingOrder(null)
      }
    }, [orderId, fetchOrderById, setPreferredTrackingOrder]),
  )

  const handleAction = async (
    key: string,
    action: () => Promise<void>,
    successMessage?: string,
    onSuccess?: () => void,
  ) => {
    setActionLoading(key)
    try {
      await action()
      await fetchOrderById(orderId)
      if (successMessage) {
        Alert.alert("Thành công", successMessage)
      }
      if (key === "reject") {
        try {
          const count = await notificationService.getUnreadCount()
          await notificationService.setBadgeCount(count)
        } catch {
          // ignore badge refresh errors
        }
      }
      onSuccess?.()
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không thể cập nhật trạng thái, vui lòng thử lại.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleAcceptOrder = () => handleAction("accept", () => acceptOrder(orderId), "Đã nhận đơn hàng")
  const handleStartDelivery = () =>
    handleAction("start", () => startDelivery(orderId), "Đã bắt đầu giao hàng")
  const handleArriveOrder = () =>
    handleAction("arrive", () => arriveOrder(orderId), "Đã xác nhận tới điểm giao")
  const handleCompleteOrder = async () => {
    if (!order) return
    const destination = extractDestination(order)
    if (!destination) {
      Alert.alert(
        "Chưa thể hoàn tất",
        "Đơn hàng chưa có tọa độ điểm giao. Vui lòng kiểm tra lại địa chỉ có latitude/longitude rồi thử lại.",
      )
      return
    }

    try {
      const current = await locationService.getCurrentPosition()
      const distance = distanceMeters(
        current.latitude,
        current.longitude,
        destination.latitude,
        destination.longitude,
      )
      if (distance > COMPLETE_DISTANCE_THRESHOLD_METERS) {
        Alert.alert(
          "Chưa tới điểm giao",
          `Bạn còn cách điểm giao khoảng ${Math.round(distance)}m. Chỉ có thể vuốt hoàn tất khi ở trong ${COMPLETE_DISTANCE_THRESHOLD_METERS}m.`,
        )
        return
      }
    } catch (error: any) {
      Alert.alert("Không lấy được vị trí", error?.message || "Vui lòng bật GPS rồi thử lại.")
      return
    }

    await handleAction("complete", () => completeOrder(orderId), "Đã hoàn tất đơn hàng")
  }

  const openRejectDialog = () => setRejectDialogVisible(true)

  const closeRejectDialog = () => {
    if (actionLoading === "reject") return
    setRejectDialogVisible(false)
  }

  const confirmRejectFromDialog = () =>
    handleAction(
      "reject",
      () => rejectOrder(orderId, "Shipper từ chối nhận đơn"),
      `Bạn đã từ chối thành công đơn #${orderId}.`,
      () => setRejectDialogVisible(false),
    )

  const openCamera = (action: "pickup" | "deliver") => {
    navigation.navigate("Camera" as never, { orderId, action } as never)
  }

  const openMaps = () => {
    const address = encodeURIComponent(order?.address || "")
    const scheme = Platform.select({ ios: "maps://0,0?q=", android: "geo:0,0?q=" })
    const url = Platform.select({
      ios: `${scheme}${address}`,
      android: `${scheme}${address}`,
      default: `https://www.google.com/maps/search/?api=1&query=${address}`,
    })

    Linking.openURL(url as string).catch(() => {
      Alert.alert("Lỗi", "Không thể mở bản đồ. Vui lòng thử lại sau.")
    })
  }

  /** Chuẩn hóa số cho scheme tel: (bỏ khoảng trắng, giữ + và chữ số). */
  const normalizePhoneForTel = (phone: string) => phone.replace(/\s/g, "").replace(/[^\d+]/g, "")

  const openPhoneDialer = () => {
    const raw = order?.phone?.trim()
    if (!raw) {
      Alert.alert("Thông báo", "Không có số điện thoại khách.")
      return
    }
    const digits = normalizePhoneForTel(raw)
    if (!digits) {
      Alert.alert("Thông báo", "Số điện thoại không hợp lệ.")
      return
    }
    const url = `tel:${digits}`
    Linking.openURL(url).catch(() => {
      Alert.alert("Lỗi", "Không thể mở ứng dụng gọi điện.")
    })
  }

  const openCustomerChat = async () => {
    if (!order) return
    const numericOrderId = Number(order.id)
    const customerUid = order.customerUserId
    if (!customerUid || customerUid <= 0 || !Number.isFinite(numericOrderId) || numericOrderId <= 0) {
      Alert.alert(
        "Chưa có thông tin khách",
        "Vui lòng kéo xuống để tải lại chi tiết đơn, rồi thử mở chat lại.",
      )
      return
    }
    const userRaw = await AsyncStorage.getItem("userData")
    let shipperUid = 0
    if (userRaw) {
      try {
        const parsed = JSON.parse(userRaw)
        shipperUid = Number(parsed?.id ?? parsed?.user_id)
      } catch {
        // ignore
      }
    }
    if (!Number.isFinite(shipperUid) || shipperUid <= 0) {
      Alert.alert("Lỗi", "Chưa đăng nhập hoặc thiếu thông tin tài khoản shipper.")
      return
    }
    navigation.navigate("ChatDetail" as never, {
      customerUserId: customerUid,
      shipperUserId: shipperUid,
      orderNumericId: numericOrderId,
      title: order.customerName || "Khách hàng",
      role: "Khách hàng",
      orderId: order.id,
      orderLabel: `#${order.id}`,
    } as never)
  }

  const renderActions = () => {
    if (!order) return null

    switch (order.shippingStatus) {
      case "new_request":
        return (
          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              icon="check-circle"
              onPress={handleAcceptOrder}
              loading={actionLoading === "accept"}
              style={styles.primaryButton}
            >
              Chấp nhận đơn
            </Button>
            <Button
              mode="outlined"
              icon="close-circle-outline"
              onPress={openRejectDialog}
              disabled={actionLoading !== null}
            >
              Từ chối
            </Button>
          </View>
        )
      case "accepted":
        return (
          <SlideToConfirm
            label="Vuốt để xác nhận đã lấy hàng"
            icon="camera-outline"
            onComplete={async () => openCamera("pickup")}
          />
        )
      case "picked_up":
        return (
          <SlideToConfirm
            label="Vuốt để bắt đầu giao hàng"
            icon="truck-fast"
            onComplete={() => handleStartDelivery()}
            loading={actionLoading === "start"}
          />
        )
      case "delivering":
        return (
          <SlideToConfirm
            label="Vuốt để xác nhận đã đến điểm giao"
            icon="map-marker-check-outline"
            onComplete={() => handleArriveOrder()}
            loading={actionLoading === "arrive"}
          />
        )
      case "arrived":
        return (
          <SlideToConfirm
            label="Vuốt để chụp ảnh giao hàng"
            icon="camera"
            onComplete={async () => openCamera("deliver")}
          />
        )
      case "delivered":
        return (
          <SlideToConfirm
            label="Vuốt để hoàn tất đơn hàng"
            icon="check-decagram"
            onComplete={() => handleCompleteOrder()}
            loading={actionLoading === "complete"}
          />
        )
      case "completed":
        return <Text style={styles.infoNote}>Đơn hàng đã hoàn tất. Cảm ơn bạn!</Text>
      case "rejected":
        return <Text style={styles.infoNote}>Bạn đã từ chối đơn hàng này.</Text>
      default:
        return null
    }
  }

  if (loading && !order) {
    return <LoadingOverlay message="Đang tải thông tin đơn hàng..." />
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <HeaderBar title="Chi tiết đơn hàng" onBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Card.Content>
              <EmptyState
                icon="alert-circle"
                title="Không tìm thấy đơn hàng"
                message="Đơn hàng có thể đã bị xóa hoặc không tồn tại"
                iconColor={theme.colors.error}
              />
            </Card.Content>
          </Card>
        </View>
      </View>
    )
  }

  const statusConfig = getShippingStatusConfig(order.shippingStatus || "new_request")

  return (
    <View style={styles.container}>
      <HeaderBar title="Chi tiết đơn hàng" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Card style={styles.statusCard}>
          <Card.Content style={styles.statusContent}>
            <View style={styles.statusHeader}>
              <View style={styles.statusInfo}>
                <Text variant="titleMedium" style={styles.statusTitle}>
                  Trạng thái vận chuyển
                </Text>
                <Text variant="bodySmall" style={styles.orderIdText}>
                  #{order.id}
                </Text>
              </View>
              <Chip
                icon={statusConfig.icon as any}
                textStyle={{ color: statusConfig.color, fontWeight: "600" }}
                style={[styles.statusChip, { backgroundColor: statusConfig.backgroundColor }]}
              >
                {translateShippingStatus(order.shippingStatus)}
              </Chip>
            </View>
            <Text style={styles.statusDescription}>{statusConfig.description}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.customerHeaderRow}>
              <View style={styles.customerHeaderLeft}>
                <IconButton icon="account" iconColor={theme.colors.primary} size={22} style={styles.customerHeaderIcon} />
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Thông tin khách hàng
                </Text>
              </View>
              <View style={styles.customerActionCol}>
                <IconButton
                  icon="message-text"
                  mode="contained"
                  containerColor={theme.colors.primary}
                  iconColor="white"
                  size={20}
                  onPress={openCustomerChat}
                  style={styles.mapButton}
                  accessibilityLabel={`Nhắn khách hàng về đơn #${order.id}`}
                />
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <IconButton icon="account-circle" iconColor={theme.colors.textSecondary} size={20} style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text variant="bodySmall" style={styles.infoLabel}>Tên khách hàng</Text>
                  <Text variant="bodyLarge" style={styles.infoValue}>{order.customerName}</Text>
                </View>
                <View style={styles.customerActionCol} />
              </View>

              <View style={styles.infoRow}>
                <IconButton icon="map-marker" iconColor={theme.colors.textSecondary} size={20} style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text variant="bodySmall" style={styles.infoLabel}>Địa chỉ giao hàng</Text>
                  <Text variant="bodyLarge" style={styles.infoValue}>{order.address}</Text>
                </View>
                <View style={styles.customerActionCol}>
                  <IconButton
                    icon="map"
                    mode="contained"
                    containerColor={theme.colors.primary}
                    iconColor="white"
                    size={20}
                    onPress={openMaps}
                    style={styles.mapButton}
                    accessibilityLabel="Mở bản đồ"
                  />
                </View>
              </View>

              <View style={styles.infoRow}>
                <IconButton icon="phone" iconColor={theme.colors.textSecondary} size={20} style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text variant="bodySmall" style={styles.infoLabel}>Số điện thoại</Text>
                  <Text variant="bodyLarge" style={styles.infoValue}>{order.phone}</Text>
                </View>
                <View style={styles.customerActionCol}>
                  <IconButton
                    icon="phone"
                    mode="contained"
                    containerColor={theme.colors.primary}
                    iconColor="white"
                    size={20}
                    onPress={openPhoneDialer}
                    style={styles.mapButton}
                    accessibilityLabel="Gọi khách hàng"
                  />
                </View>
              </View>

              <View style={styles.infoRow}>
                <IconButton icon="clock-outline" iconColor={theme.colors.textSecondary} size={20} style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text variant="bodySmall" style={styles.infoLabel}>Thời gian đặt hàng</Text>
                  <Text variant="bodyLarge" style={styles.infoValue}>{new Date(order.createdAt).toLocaleString("vi-VN")}</Text>
                </View>
                <View style={styles.customerActionCol} />
              </View>

              {Boolean(order.notes) && (
                <View style={styles.infoRow}>
                  <IconButton icon="note-text" iconColor={theme.colors.textSecondary} size={20} style={styles.infoIcon} />
                  <View style={styles.infoContent}>
                    <Text variant="bodySmall" style={styles.infoLabel}>Ghi chú</Text>
                    <Text variant="bodyLarge" style={styles.infoValue}>{order.notes}</Text>
                  </View>
                  <View style={styles.customerActionCol} />
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title
            title="Thanh toán"
            titleStyle={styles.cardTitle}
            left={(props) => <IconButton {...props} icon="cash-multiple" iconColor={theme.colors.primary} />}
          />
          <Card.Content>
            {(() => {
              const p = order.payment
              const method = (p?.method || "").toLowerCase()
              const st = (p?.status || "").toLowerCase()

              if (method === "cod" || method === "cash") {
                if (st === "confirmed") {
                  return (
                    <View>
                      <Text variant="bodyLarge" style={styles.payHintOk}>
                        Đã thu COD khi giao hàng
                      </Text>
                      {p?.paid_amount != null && p.paid_amount > 0 ? (
                        <Text variant="bodySmall" style={styles.paySub}>
                          Số đã thu: {formatCurrency(p.paid_amount)}
                        </Text>
                      ) : null}
                    </View>
                  )
                }
                return (
                  <View>
                    <Text variant="bodyMedium" style={styles.payHintWarn}>
                      Tiền mặt khi giao (COD)
                    </Text>
                    <Text variant="headlineSmall" style={styles.payAmount}>
                      Cần thu: {formatCurrency(codCollectAmount(order))}
                    </Text>
                    <Text variant="bodySmall" style={styles.paySub}>
                      Thu từ khách khi bạn hoàn tất giao hàng trên app
                    </Text>
                  </View>
                )
              }

              if (st === "confirmed" || st === "paid" || st === "success") {
                return (
                  <Text variant="bodyLarge" style={styles.payHintOk}>
                    Khách đã thanh toán online — không thu tiền mặt
                  </Text>
                )
              }

              if (p && st === "pending") {
                return (
                  <Text variant="bodyMedium" style={styles.payHintWarn}>
                    Chờ khách thanh toán chuyển khoản / QR
                  </Text>
                )
              }

              if (!p && (order.codAmount ?? 0) > 0) {
                return (
                  <View>
                    <Text variant="bodyMedium" style={styles.payHintWarn}>
                      Tiền mặt khi giao (ước tính)
                    </Text>
                    <Text variant="headlineSmall" style={styles.payAmount}>
                      Cần thu: {formatCurrency(codCollectAmount(order))}
                    </Text>
                  </View>
                )
              }

              return (
                <Text variant="bodySmall" style={styles.paySub}>
                  Kéo xuống để tải lại đơn nếu thiếu thông tin thanh toán
                </Text>
              )
            })()}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title
            title="Sản phẩm"
            titleStyle={styles.cardTitle}
            left={(props) => <IconButton {...props} icon="package-variant" iconColor={theme.colors.primary} />}
          />
          <Card.Content>
            {order.products.map((product, index) => (
              <View key={product.id}>
                <View style={styles.productRow}>
                  <View style={styles.productInfo}>
                    <Text variant="bodyLarge" style={styles.productName}>{product.name}</Text>
                    <Text variant="bodyMedium" style={styles.productQuantity}>Số lượng: {product.quantity}</Text>
                  </View>
                  <Text variant="bodyLarge" style={styles.productPrice}>
                    {formatCurrency(product.price * product.quantity)}
                  </Text>
                </View>
                {index < order.products.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}
            <Divider style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text variant="headlineSmall" style={styles.totalLabel}>Tổng cộng:</Text>
              <Text variant="headlineSmall" style={styles.totalAmount}>{formatCurrency(order.totalAmount)}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title
            title="Cập nhật trạng thái"
            titleStyle={styles.cardTitle}
            left={(props) => <IconButton {...props} icon="update" iconColor={theme.colors.primary} />}
          />
          <Card.Content>{renderActions()}</Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Dialog
          visible={rejectDialogVisible}
          onDismiss={closeRejectDialog}
          dismissable={actionLoading !== "reject"}
          style={styles.rejectDialog}
        >
          <Dialog.Icon icon="help-circle-outline" color={theme.colors.error} />
          <Dialog.Title style={styles.rejectDialogTitle}>Từ chối đơn hàng</Dialog.Title>
          <Dialog.Content style={styles.rejectDialogContent}>
            <Text variant="bodyLarge" style={styles.rejectDialogMessage}>
              {`Bạn có chắc chắn muốn từ chối đơn #${orderId}? Thao tác này không thể hoàn tác.`}
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.rejectDialogActions}>
            <Button onPress={closeRejectDialog} disabled={actionLoading === "reject"}>
              Hủy
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor="#fff"
              onPress={() => void confirmRejectFromDialog()}
              loading={actionLoading === "reject"}
              disabled={actionLoading !== null && actionLoading !== "reject"}
            >
              Từ chối đơn
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  rejectDialog: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
  },
  rejectDialogTitle: {
    fontWeight: "700",
    paddingTop: 0,
  },
  rejectDialogContent: {
    paddingTop: 0,
  },
  rejectDialogMessage: {
    color: theme.colors.onSurface,
    lineHeight: 24,
  },
  rejectDialogActions: {
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  errorCard: {
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...shadows.medium,
  },
  statusCard: {
    margin: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...shadows.medium,
  },
  statusContent: {
    paddingVertical: spacing.md,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statusInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  statusTitle: {
    fontWeight: "bold",
    color: theme.colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statusDescription: {
    marginTop: spacing.sm,
    color: theme.colors.textSecondary,
  },
  orderIdText: {
    color: theme.colors.textSecondary,
  },
  statusChip: {
    borderRadius: borderRadius.round,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...shadows.medium,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "bold",
    flex: 1,
  },
  customerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight,
  },
  customerHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    marginRight: spacing.sm,
  },
  customerHeaderIcon: {
    margin: 0,
    marginRight: spacing.xs,
  },
  /** Cột phải cố định — icon chat / bản đồ / gọi thẳng hàng */
  customerActionCol: {
    width: 48,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  infoSection: {
    width: "100%",
  },
  infoIcon: {
    margin: 0,
    marginRight: spacing.md,
    marginTop: 4,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: theme.colors.textTertiary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  mapButton: {
    margin: 0,
  },
  payHintOk: {
    color: theme.colors.success,
    fontWeight: "600",
  },
  payHintWarn: {
    color: theme.colors.warning,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  payAmount: {
    color: theme.colors.primary,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  paySub: {
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  productInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  productName: {
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  productQuantity: {
    color: theme.colors.textSecondary,
  },
  productPrice: {
    fontWeight: "bold",
    color: theme.colors.textPrimary,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  totalDivider: {
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontWeight: "bold",
    color: theme.colors.textPrimary,
  },
  totalAmount: {
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  infoNote: {
    color: theme.colors.textSecondary,
  },
})
 