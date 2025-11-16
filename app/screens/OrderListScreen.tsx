"use client"

import { useState, useEffect, useCallback } from "react"
import { View, StyleSheet, Dimensions, RefreshControl, ScrollView, TouchableOpacity } from "react-native"
import { Text, Card, ActivityIndicator } from "react-native-paper"
import { useNavigation, useRoute } from "@react-navigation/native"
import { useOrderContext } from "../context/OrderContext"
import OrderCard from "../../components/OrderCard"
import HeaderBar from "../../components/HeaderBar"
import EmptyState from "../../components/EmptyState"
import { theme, spacing, shadows, borderRadius } from "../../styles/theme"
import { FlatList } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import type { ShippingStatus } from "../../lib/types"

const { width } = Dimensions.get('window')

type OrderFilter = "all" | ShippingStatus

type FilterButton = {
  value: OrderFilter
  label: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  checkedColor: string
  uncheckedColor: string
}

export default function OrderListScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute()
  const { orders, loading, loadingMore, pagination, error, refreshOrders, loadMoreOrders } = useOrderContext()

  const routeParams = (route.params as { filter?: OrderFilter } | undefined)
  const initialFilter: OrderFilter = routeParams?.filter ?? "all"
  const [filter, setFilter] = useState<OrderFilter>(initialFilter)

  useEffect(() => {
    // Load orders on mount
    refreshOrders(filter === "all" ? undefined : filter)
  }, [])

  useEffect(() => {
    // Refresh when filter changes
    refreshOrders(filter === "all" ? undefined : filter)
  }, [filter])

  const onRefresh = useCallback(() => {
    refreshOrders(filter === "all" ? undefined : filter)
  }, [filter, refreshOrders])

  const onEndReached = useCallback(() => {
    if (pagination.hasMore && !loadingMore) {
      loadMoreOrders()
    }
  }, [pagination.hasMore, loadingMore, loadMoreOrders])

  const getFilterButtons = (): FilterButton[] => [
    { 
      value: "all", 
      label: "Tất cả",
      icon: "package-variant",
      checkedColor: theme.colors.primary,
      uncheckedColor: theme.colors.textSecondary,
    },
    { 
      value: "new_request", 
      label: "Chờ xác nhận",
      icon: "hand-front-right",
      checkedColor: theme.colors.pending,
      uncheckedColor: theme.colors.textSecondary,
    },
    { 
      value: "accepted", 
      label: "Đã nhận",
      icon: "clipboard-check-outline",
      checkedColor: theme.colors.primary,
      uncheckedColor: theme.colors.textSecondary,
    },
    { 
      value: "picked_up", 
      label: "Đã lấy hàng",
      icon: "box",
      checkedColor: theme.colors.info,
      uncheckedColor: theme.colors.textSecondary,
    },
    { 
      value: "delivering", 
      label: "Đang giao",
      icon: "truck-delivery-outline",
      checkedColor: theme.colors.delivering,
      uncheckedColor: theme.colors.textSecondary,
    },
    { 
      value: "arrived", 
      label: "Đã đến nơi",
      icon: "map-marker-check-outline",
      checkedColor: theme.colors.warning,
      uncheckedColor: theme.colors.textSecondary,
    },
    { 
      value: "delivered", 
      label: "Đã giao xong",
      icon: "clipboard-check-outline",
      checkedColor: theme.colors.success,
      uncheckedColor: theme.colors.textSecondary,
    },
    { 
      value: "completed", 
      label: "Hoàn tất",
      icon: "check-decagram",
      checkedColor: theme.colors.completed,
      uncheckedColor: theme.colors.textSecondary,
    },
  ]

  const getStatusCount = (status: OrderFilter) => {
    if (status === "all") return pagination.total || orders.length
    return orders.filter(order => order.shippingStatus === status).length
  }

  return (
    <View style={styles.container}>
      <HeaderBar title="Danh sách đơn hàng" />

      {/* Filter Section */}
      <Card style={styles.filterCard}>
        <Card.Content>
          <View style={styles.filterHeader}>
            <Text variant="titleMedium" style={styles.filterTitle}>
              Lọc theo trạng thái
            </Text>
            <Text variant="bodySmall" style={styles.orderCount}>
              {getStatusCount(filter)} đơn hàng
            </Text>
          </View>
          
          <View style={styles.filterChipsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsContent}
            >
              {getFilterButtons().map((btn) => {
                const isActive = filter === btn.value
                const count = getStatusCount(btn.value)
                return (
                  <TouchableOpacity
                    key={btn.value}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isActive ? btn.checkedColor + "22" : theme.colors.surfaceVariant,
                        borderColor: isActive ? btn.checkedColor : "transparent",
                      },
                    ]}
                    onPress={() => setFilter(btn.value)}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons
                      name={btn.icon as any}
                      size={18}
                      color={isActive ? btn.checkedColor : theme.colors.textSecondary}
                      style={styles.filterChipIcon}
                    />
                    <Text
                      style={[
                        styles.filterChipLabel,
                        { color: isActive ? theme.colors.textPrimary : theme.colors.textSecondary },
                      ]}
                    >
                      {btn.label}
                    </Text>
                    {typeof count === "number" && (
                      <View
                        style={[
                          styles.filterChipBadge,
                          { backgroundColor: isActive ? btn.checkedColor : theme.colors.surface },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipBadgeText,
                            { color: isActive ? "white" : theme.colors.textSecondary },
                          ]}
                        >
                          {count > 99 ? "99+" : count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </Card.Content>
      </Card>

      {/* Orders List */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => navigation.navigate("OrderDetail" as never, { orderId: item.id } as never)}
          />
        )}
        contentContainerStyle={styles.ordersListContent}
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Card style={styles.emptyCard}>
                <Card.Content>
                  {error ? (
                    <EmptyState
                      icon="alert-circle-outline"
                      title="Có lỗi xảy ra"
                      message={error}
                    />
                  ) : (
                    <EmptyState
                      icon="package-variant-closed"
                      title="Không có đơn hàng nào"
                      message={
                        filter === "all" 
                          ? "Chưa có đơn hàng nào trong hệ thống"
                          : `Không có đơn hàng nào ở trạng thái "${getFilterButtons().find(btn => btn.value === filter)?.label}"`
                      }
                    />
                  )}
                </Card.Content>
              </Card>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  filterCard: {
    margin: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...shadows.medium,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filterTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  orderCount: {
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    fontWeight: '500',
  },
  filterChipsWrapper: {
    marginTop: spacing.xs,
  },
  filterChipsContent: {
    paddingRight: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
    borderWidth: 1.5,
  },
  filterChipIcon: {
    marginRight: spacing.xs,
  },
  filterChipLabel: {
    fontWeight: '600',
  },
  filterChipBadge: {
    marginLeft: spacing.xs,
    minWidth: 24,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    alignItems: 'center',
  },
  filterChipBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ordersList: {
    flex: 1,
  },
  ordersListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyCard: {
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...shadows.medium,
    width: '100%',
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },

})
