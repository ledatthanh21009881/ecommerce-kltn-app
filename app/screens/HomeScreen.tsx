"use client"

import React, { useState, useEffect, useCallback } from "react"
import { View, ScrollView, StyleSheet, RefreshControl, Dimensions, Animated } from "react-native"
import { Text, Card, FAB, IconButton } from "react-native-paper"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { useOrderContext } from "../context/OrderContext"
import { useAuthContext } from "../context/AuthContext"
import { useNotificationBanner } from "../context/NotificationBannerContext"
import { notificationService } from "../services/notificationService"
import OrderCard from "../../components/OrderCard"
import LoadingOverlay from "../../components/LoadingOverlay"
import ErrorMessage from "../../components/ErrorMessage"
import StatsCard from "../../components/StatsCard"
import QuickAction from "../../components/QuickAction"
import EmptyState from "../../components/EmptyState"
import { theme, spacing, shadows, borderRadius } from "../../styles/theme"
import { LinearGradient } from 'expo-linear-gradient'

const { width } = Dimensions.get('window')

export default function HomeScreen() {
  const navigation = useNavigation()
  const { orders, loading, error, refreshOrders } = useOrderContext()
  const { user } = useAuthContext()
  const { showBanner } = useNotificationBanner()
  const [refreshing, setRefreshing] = useState(false)
  const [fadeAnim] = useState(new Animated.Value(0))
  const [unreadCount, setUnreadCount] = useState(0)
  const lastCheckedNotificationId = React.useRef<number | null>(null)
  const previousUnreadCount = React.useRef<number>(0)

  const checkAndShowNewNotification = useCallback(async () => {
    try {
      // Get latest unread notification
      const notifications = await notificationService.getNotifications({
        page: 1,
        limit: 1,
        is_read: false,
      })

      if (notifications.length > 0) {
        const latestNotification = notifications[0]
        
        // Only show banner if this is a new notification (not shown before)
        if (latestNotification.notification_id !== lastCheckedNotificationId.current) {
          console.log('[HomeScreen] Found new notification, showing banner:', latestNotification)
          
          lastCheckedNotificationId.current = latestNotification.notification_id
          
          showBanner({
            title: latestNotification.title || 'Thông báo mới',
            message: latestNotification.message || 'Bạn có thông báo mới',
            orderId: latestNotification.payload?.order_id,
            notificationId: latestNotification.notification_id,
          })
        }
      }
    } catch (error) {
      console.error('[HomeScreen] Error checking new notification:', error)
    }
  }, [showBanner])

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount()
      const previousCount = previousUnreadCount.current
      previousUnreadCount.current = count
      setUnreadCount(count)

      // If unread count increased, check for new notifications and show banner
      if (count > previousCount && count > 0) {
        console.log('[HomeScreen] Unread count increased, checking for new notifications...')
        await checkAndShowNewNotification()
      }
    } catch (error) {
      console.error('[HomeScreen] Error loading unread count:', error)
    }
  }, [checkAndShowNewNotification])

  useFocusEffect(
    React.useCallback(() => {
      refreshOrders()
      loadUnreadCount()
      // Also check for new notifications when screen focuses
      checkAndShowNewNotification()
      // Tạm thời tắt animation để test
      // Animated.timing(fadeAnim, {
      //   toValue: 1,
      //   duration: 800,
      //   useNativeDriver: true,
      // }).start()
    }, [refreshOrders, loadUnreadCount, checkAndShowNewNotification]),
  )

  // Poll for new notifications every 10 seconds when screen is focused
  useEffect(() => {
    const interval = setInterval(() => {
      loadUnreadCount()
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [loadUnreadCount])

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshOrders()
    await loadUnreadCount()
    setRefreshing(false)
  }

  const waitingOrders = orders.filter((order) => order.shippingStatus === "new_request")
  const acceptedOrders = orders.filter((order) => order.shippingStatus === "accepted")
  const needingAttention = [...waitingOrders, ...acceptedOrders]
  const deliveringOrders = orders.filter((order) =>
    ["picked_up", "delivering", "arrived"].includes(order.shippingStatus),
  )
  const completedToday = orders.filter((order) => {
    const today = new Date().toDateString()
    const orderDate = new Date(order.createdAt).toDateString()
    return order.shippingStatus === "completed" && orderDate === today
  })

  const recentOrders = orders.slice(0, 3)

  if (loading && orders.length === 0) {
    return <LoadingOverlay message="Đang tải đơn hàng..." />
  }

  if (error && orders.length === 0) {
    return <ErrorMessage message={error} onRetry={refreshOrders} />
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerContent}>
              <Text variant="headlineMedium" style={styles.greeting}>
                Xin chào, {user?.name}! 👋
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Hôm nay bạn có {needingAttention.length + deliveringOrders.length} đơn cần xử lý
              </Text>
            </View>
            <View style={styles.notificationButtonContainer}>
              <IconButton
                icon="bell-outline"
                iconColor="white"
                size={24}
                onPress={async () => {
                  await loadUnreadCount()
                  navigation.navigate('Notification' as never)
                }}
                style={styles.notificationButton}
              />
              {unreadCount > 0 && (
                <View style={styles.badgeContainer}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount.toString()}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <StatsCard
              title="Chờ xác nhận"
              value={waitingOrders.length}
              icon="hand-front-right"
              color={theme.colors.pending}
              backgroundColor={theme.colors.warningContainer}
            />
            <StatsCard
              title="Đang giao"
              value={deliveringOrders.length}
              icon="truck-delivery-outline"
              color={theme.colors.delivering}
              backgroundColor={theme.colors.infoContainer}
            />
            <StatsCard
              title="Hoàn thành"
              value={completedToday.length}
              icon="check-circle-outline"
              color={theme.colors.completed}
              backgroundColor={theme.colors.successContainer}
              subtitle="Hôm nay"
            />
          </View>

          {/* Quick Actions */}
          <Card style={styles.quickActionsCard}>
            <Card.Title 
              title="Thao tác nhanh" 
              titleStyle={styles.cardTitle}
              left={(props) => <IconButton {...props} icon="lightning-bolt" iconColor={theme.colors.primary} />}
            />
            <Card.Content>
              <View style={styles.quickActionsGrid}>
                <QuickAction
                  icon="map-marker"
                  label="Bản đồ"
                  onPress={() => {}}
                  color={theme.colors.info}
                />
                <QuickAction
                  icon="camera"
                  label="Chụp ảnh"
                  onPress={() => {}}
                  color={theme.colors.success}
                />
                <QuickAction
                  icon="phone"
                  label="Gọi điện"
                  onPress={() => {}}
                  color={theme.colors.warning}
                />
                <QuickAction
                  icon="chart-line"
                  label="Thống kê"
                  onPress={() => {}}
                  color={theme.colors.tertiary}
                />
              </View>
            </Card.Content>
          </Card>

          {/* Recent Orders */}
          <Card style={styles.recentOrdersCard}>
            <Card.Title 
              title="Đơn hàng gần nhất" 
              titleStyle={styles.cardTitle}
              left={(props) => <IconButton {...props} icon="package-variant" iconColor={theme.colors.primary} />}
              right={(props) => (
                <IconButton 
                  {...props} 
                  icon="arrow-right" 
                  iconColor={theme.colors.primary}
                  onPress={() => navigation.navigate("Đơn hàng" as never)}
                />
              )}
            />
            <Card.Content>
              {recentOrders.length > 0 ? (
                recentOrders.map((order, index) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={() => navigation.navigate("OrderDetail" as never, { orderId: order.id } as never)}
                  />
                ))
              ) : (
                <EmptyState
                  icon="package-variant-closed"
                  title="Chưa có đơn hàng nào"
                  message="Các đơn hàng mới sẽ xuất hiện ở đây"
                />
              )}
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      <FAB 
        icon="refresh" 
        style={styles.fab} 
        onPress={onRefresh} 
        loading={refreshing}
        color="white"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
    paddingRight: spacing.md,
  },
  greeting: {
    color: "white",
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: "white",
    opacity: 0.9,
  },
  notificationButtonContainer: {
    position: 'relative',
    marginLeft: spacing.sm,
  },
  notificationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
  },
  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
  },
  badge: {
    backgroundColor: theme.colors.error || '#FF3B30',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: spacing.lg,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  quickActionsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  recentOrdersCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },

  fab: {
    position: "absolute",
    margin: spacing.lg,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.round,
    ...shadows.large,
  },
})
