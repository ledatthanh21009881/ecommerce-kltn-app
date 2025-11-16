import { View, StyleSheet, TouchableOpacity, Animated } from "react-native"
import { Card, Text, IconButton, Chip } from "react-native-paper"
import type { Order } from "../lib/types"
import { formatCurrency } from "../lib/utils"
import { theme, spacing, shadows, borderRadius } from "../styles/theme"
import { useState, useRef } from "react"
import { getShippingStatusConfig } from "../app/constants/shippingStatus"

interface OrderCardProps {
  order: Order
  onPress: () => void
}

export default function OrderCard({ order, onPress }: OrderCardProps) {
  const [isPressed, setIsPressed] = useState(false)
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    setIsPressed(true)
    // Tạm thời tắt animation để test
    // Animated.spring(scaleAnim, {
    //   toValue: 0.98,
    //   useNativeDriver: true,
    // }).start()
  }

  const handlePressOut = () => {
    setIsPressed(false)
    // Tạm thời tắt animation để test
    // Animated.spring(scaleAnim, {
    //   toValue: 1,
    //   useNativeDriver: true,
    // }).start()
  }

  const statusConfig = getShippingStatusConfig(order.shippingStatus || "new_request")

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={styles.touchable}
      >
        <Card style={styles.card}>
          <Card.Content style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.orderInfo}>
                <View style={styles.customerRow}>
                  <IconButton
                    icon="account-circle"
                    iconColor={theme.colors.primary}
                    size={20}
                    style={styles.customerIcon}
                  />
                  <Text variant="titleMedium" style={styles.customerName}>
                    {order.customerName}
                  </Text>
                </View>
                <View style={styles.orderIdRow}>
                  <IconButton
                    icon="package-variant"
                    iconColor={theme.colors.textTertiary}
                    size={16}
                    style={styles.orderIdIcon}
                  />
                  <Text variant="bodySmall" style={styles.orderId}>
                    #{order.id}
                  </Text>
                </View>
              </View>
              <View style={styles.statusContainer}>
                <Chip
                  icon={statusConfig.icon as any}
                  textStyle={{ color: statusConfig.color, fontWeight: '600' }}
                  style={[styles.statusChip, { backgroundColor: statusConfig.backgroundColor }]}
                >
                  {statusConfig.label}
                </Chip>
              </View>
            </View>

            {/* Details */}
            <View style={styles.details}>
              <View style={styles.detailRow}>
                <IconButton
                  icon="map-marker"
                  iconColor={theme.colors.textSecondary}
                  size={16}
                  style={styles.detailIcon}
                />
                <Text variant="bodyMedium" style={styles.detailText} numberOfLines={2}>
                  {order.address}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <IconButton
                  icon="phone"
                  iconColor={theme.colors.textSecondary}
                  size={16}
                  style={styles.detailIcon}
                />
                <Text variant="bodyMedium" style={styles.detailText}>
                  {order.phone}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <IconButton
                  icon="clock-outline"
                  iconColor={theme.colors.textSecondary}
                  size={16}
                  style={styles.detailIcon}
                />
                <Text variant="bodyMedium" style={styles.detailText}>
                  {new Date(order.createdAt).toLocaleString("vi-VN")}
                </Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.amountContainer}>
                <Text variant="bodySmall" style={styles.amountLabel}>
                  Tổng tiền:
                </Text>
                <Text variant="titleLarge" style={styles.amount}>
                  {formatCurrency(order.totalAmount)}
                </Text>
              </View>
              <IconButton
                icon="chevron-right"
                iconColor={theme.colors.primary}
                size={24}
                style={styles.arrowIcon}
              />
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  touchable: {
    borderRadius: borderRadius.lg,
  },
  card: {
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...shadows.medium,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  customerIcon: {
    margin: 0,
    marginRight: spacing.xs,
  },
  customerName: {
    fontWeight: "bold",
    color: theme.colors.textPrimary,
    flex: 1,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIdIcon: {
    margin: 0,
    marginRight: spacing.xs,
  },
  orderId: {
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusChip: {
    borderRadius: borderRadius.round,
  },
  details: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    margin: 0,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  detailText: {
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  amountContainer: {
    flex: 1,
  },
  amountLabel: {
    color: theme.colors.textTertiary,
    marginBottom: spacing.xs,
  },
  amount: {
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  arrowIcon: {
    margin: 0,
  },
})
