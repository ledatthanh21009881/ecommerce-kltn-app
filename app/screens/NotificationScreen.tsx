"use client"

import { useState, useEffect, useCallback } from "react"
import { View, StyleSheet, RefreshControl, TouchableOpacity } from "react-native"
import { Text, Card, ActivityIndicator, Chip } from "react-native-paper"
import { useNavigation } from "@react-navigation/native"
import { notificationService } from "../services/notificationService"
import HeaderBar from "../../components/HeaderBar"
import EmptyState from "../../components/EmptyState"
import { theme, spacing, shadows, borderRadius } from "../../styles/theme"
import { FlatList } from "react-native"
import { Notification } from "../../lib/types"

export default function NotificationScreen() {
  const navigation = useNavigation()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadNotifications()
    loadUnreadCount()
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await notificationService.getNotifications({ limit: 50 })
      setNotifications(data)
    } catch (error) {
      console.error('[NotificationScreen] Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount()
      setUnreadCount(count)
      await notificationService.setBadgeCount(count)
    } catch (error) {
      console.error('[NotificationScreen] Error loading unread count:', error)
    }
  }

  const onRefresh = useCallback(() => {
    loadNotifications()
    loadUnreadCount()
  }, [])

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await notificationService.markAsRead(notification.notification_id)
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === notification.notification_id
            ? { ...n, is_read: true }
            : n
        )
      )
      // Update unread count
      await loadUnreadCount()
    }

    // Navigate to order detail if order_id exists
    if (notification.payload?.order_id) {
      navigation.navigate('OrderDetail' as never, { orderId: notification.payload.order_id.toString() } as never)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInHours * 60)
        return `${diffInMinutes} phút trước`
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)} giờ trước`
      } else if (diffInHours < 48) {
        return 'Hôm qua'
      } else {
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${day}/${month}/${year} ${hours}:${minutes}`
      }
    } catch (error) {
      return dateString
    }
  }

  const renderNotification = ({ item }: { item: Notification }) => {
    return (
      <TouchableOpacity onPress={() => handleNotificationPress(item)}>
        <Card
          style={[
            styles.notificationCard,
            !item.is_read && styles.unreadCard,
          ]}
        >
          <Card.Content>
            <View style={styles.notificationHeader}>
              <Text variant="titleMedium" style={styles.notificationTitle}>
                {item.title}
              </Text>
              {!item.is_read && (
                <Chip
                  mode="flat"
                  compact
                  style={styles.unreadChip}
                  textStyle={styles.unreadChipText}
                >
                  Mới
                </Chip>
              )}
            </View>
            <Text variant="bodyMedium" style={styles.notificationMessage}>
              {item.message}
            </Text>
            <Text variant="bodySmall" style={styles.notificationTime}>
              {formatDate(item.created_at)}
            </Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Thông báo"
        onBack={() => navigation.goBack()}
        actions={
          unreadCount > 0 ? (
            <Chip
              mode="flat"
              compact
              style={styles.badgeChip}
              textStyle={styles.badgeChipText}
            >
              {unreadCount} mới
            </Chip>
          ) : undefined
        }
      />

      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="bell-outline"
            title="Không có thông báo"
            message="Bạn chưa có thông báo nào"
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.notification_id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  notificationCard: {
    marginBottom: spacing.md,
    ...shadows.sm,
    borderRadius: borderRadius.md,
  },
  unreadCard: {
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  notificationTitle: {
    flex: 1,
    fontWeight: "600",
    color: theme.colors.text,
  },
  unreadChip: {
    backgroundColor: theme.colors.primary + "20",
    height: 24,
  },
  unreadChipText: {
    fontSize: 10,
    color: theme.colors.primary,
  },
  notificationMessage: {
    color: theme.colors.textSecondary,
    marginBottom: spacing.xs,
  },
  notificationTime: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  badgeChip: {
    backgroundColor: theme.colors.primary,
    height: 24,
  },
  badgeChipText: {
    fontSize: 12,
    color: "#fff",
  },
})

