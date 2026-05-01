"use client"

import React, { useState, useCallback } from "react"
import { View, StyleSheet, RefreshControl, Pressable } from "react-native"
import { Text, ActivityIndicator } from "react-native-paper"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { FlatList } from "react-native"
import HeaderBar from "../../components/HeaderBar"
import OrderCard from "../../components/OrderCard"
import EmptyState from "../../components/EmptyState"
import { orderService } from "../services/orderService"
import { navigateToShipperOrderDetail } from "../../lib/navigationHelpers"
import type { Order, ShippingStatus } from "../../lib/types"
import { theme, spacing, borderRadius } from "../../styles/theme"

type HistoryTab = "completed" | "rejected"

export default function DeliveryHistoryScreen() {
  const navigation = useNavigation<any>()
  const [tab, setTab] = useState<HistoryTab>("completed")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async (isRefresh: boolean) => {
      const shippingStatus: ShippingStatus = tab === "completed" ? "completed" : "rejected"
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      try {
        const { orders: list } = await orderService.getOrders({
          shippingStatus,
          page: 1,
          limit: 50,
        })
        setOrders(list)
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [tab],
  )

  useFocusEffect(
    useCallback(() => {
      void load(false)
    }, [load]),
  )

  const onRefresh = useCallback(() => {
    void load(true)
  }, [load])

  return (
    <View style={styles.container}>
      <HeaderBar title="Lịch sử giao hàng" onBack={() => navigation.goBack()} />

      <View style={styles.tabRail} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "completed" }}
          onPress={() => setTab("completed")}
          style={({ pressed }) => [styles.tabSlot, tab === "completed" && styles.tabSlotActive, pressed && styles.tabPressed]}
        >
          <Text variant="labelLarge" style={[styles.tabLabel, tab === "completed" ? styles.tabActive : styles.tabInactive]}>
            Đã giao
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "rejected" }}
          onPress={() => setTab("rejected")}
          style={({ pressed }) => [styles.tabSlot, tab === "rejected" && styles.tabSlotActive, pressed && styles.tabPressed]}
        >
          <Text variant="labelLarge" style={[styles.tabLabel, tab === "rejected" ? styles.tabActive : styles.tabInactive]}>
            Từ chối
          </Text>
        </Pressable>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={orders.length === 0 ? styles.emptyList : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={tab === "completed" ? "truck-check" : "close-circle-outline"}
              title={tab === "completed" ? "Chưa có đơn đã giao" : "Chưa có đơn từ chối"}
              message={
                tab === "completed"
                  ? "Các đơn bạn hoàn tất giao sẽ hiển thị tại đây."
                  : "Các đơn bạn từ chối nhận giao sẽ hiển thị tại đây."
              }
            />
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => navigateToShipperOrderDetail(navigation, item.id)}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabRail: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.surfaceVariant,
    padding: 4,
  },
  tabSlot: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: borderRadius.sm,
  },
  tabSlotActive: {
    backgroundColor: theme.colors.surface,
  },
  tabPressed: {
    opacity: 0.85,
  },
  tabLabel: {
    fontWeight: "600",
  },
  tabActive: {
    color: theme.colors.primary,
  },
  tabInactive: {
    color: theme.colors.onSurfaceVariant,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    padding: spacing.md,
  },
})
