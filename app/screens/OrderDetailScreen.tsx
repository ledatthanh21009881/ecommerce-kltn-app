"use client"

import React, { useEffect, useState } from "react"
import { View, ScrollView, StyleSheet, Alert, Linking, Platform } from "react-native"
import { Text, Card, Button, Divider, IconButton, Chip } from "react-native-paper"
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
  } = useOrderContext()

  const { orderId } = route.params as { orderId: string }
  const [order, setOrder] = useState<Order | null>(orders.find((o) => o.id === orderId) ?? null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    const updated = orders.find((o) => o.id === orderId)
    if (updated) {
      setOrder(updated)
    }
  }, [orders, orderId])

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true
      fetchOrderById(orderId).then((detail) => {
        if (detail && isActive) {
          setOrder(detail)
        }
      })
      return () => {
        isActive = false
      }
    }, [orderId, fetchOrderById]),
  )

  const handleAction = async (key: string, action: () => Promise<void>, successMessage?: string) => {
    setActionLoading(key)
    try {
      await action()
      await fetchOrderById(orderId)
      if (successMessage) {
        Alert.alert("Thành công", successMessage)
      }
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
  const handleCompleteOrder = () =>
    handleAction("complete", () => completeOrder(orderId), "Đã hoàn tất đơn hàng")

  const handleRejectOrder = () => {
    Alert.alert(
      "Từ chối đơn hàng",
      "Bạn có chắc chắn muốn từ chối đơn này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: () =>
            handleAction("reject", () => rejectOrder(orderId, "Shipper từ chối nhận đơn")),
        },
      ],
      { cancelable: false },
    )
  }

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
              onPress={handleRejectOrder}
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
          <Card.Title
            title="Thông tin khách hàng"
            titleStyle={styles.cardTitle}
            left={(props) => <IconButton {...props} icon="account" iconColor={theme.colors.primary} />}
          />
          <Card.Content>
            <View style={styles.infoRow}>
              <IconButton icon="account-circle" iconColor={theme.colors.textSecondary} size={20} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.infoLabel}>Tên khách hàng</Text>
                <Text variant="bodyLarge" style={styles.infoValue}>{order.customerName}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <IconButton icon="map-marker" iconColor={theme.colors.textSecondary} size={20} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.infoLabel}>Địa chỉ giao hàng</Text>
                <Text variant="bodyLarge" style={styles.infoValue}>{order.address}</Text>
              </View>
              <IconButton
                icon="map"
                mode="contained"
                containerColor={theme.colors.primary}
                iconColor="white"
                size={20}
                onPress={openMaps}
                style={styles.mapButton}
              />
            </View>

            <View style={styles.infoRow}>
              <IconButton icon="phone" iconColor={theme.colors.textSecondary} size={20} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.infoLabel}>Số điện thoại</Text>
                <Text variant="bodyLarge" style={styles.infoValue}>{order.phone}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <IconButton icon="clock-outline" iconColor={theme.colors.textSecondary} size={20} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.infoLabel}>Thời gian đặt hàng</Text>
                <Text variant="bodyLarge" style={styles.infoValue}>{new Date(order.createdAt).toLocaleString("vi-VN")}</Text>
              </View>
            </View>

            {order.notes && (
              <View style={styles.infoRow}>
                <IconButton icon="note-text" iconColor={theme.colors.textSecondary} size={20} style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text variant="bodySmall" style={styles.infoLabel}>Ghi chú</Text>
                  <Text variant="bodyLarge" style={styles.infoValue}>{order.notes}</Text>
                </View>
              </View>
            )}
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
    </View>
  )
}

const styles = StyleSheet.create({
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
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
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
 