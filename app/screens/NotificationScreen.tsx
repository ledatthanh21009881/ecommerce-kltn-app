"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { View, StyleSheet, RefreshControl, TouchableOpacity, Pressable } from "react-native"
import { Text, Card, ActivityIndicator, Chip } from "react-native-paper"
import { useNavigation } from "@react-navigation/native"
import { notificationService } from "../services/notificationService"
import { useAuthContext } from "../context/AuthContext"
import HeaderBar from "../../components/HeaderBar"
import EmptyState from "../../components/EmptyState"
import { theme, spacing, shadows, borderRadius } from "../../styles/theme"
import { FlatList } from "react-native"
import { Notification } from "../../lib/types"

type NotifyTab = "messages" | "orders"

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

/** Luôn dạng `21:08 27-04-2026` */
function formatNotificationTime(dateString: string): string {
  try {
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return dateString
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())} ${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`
  } catch {
    return dateString
  }
}

/** Ẩn placeholder [Image]/[Ảnh] trong dòng preview thông báo */
function formatNotificationBody(message: string): string {
  if (!message?.trim()) return message
  return message
    .replace(/\[Image\]/gi, "Đã gửi ảnh")
    .replace(/\[Ảnh\]/g, "Đã gửi ảnh")
    .replace(/\[Video\]/gi, "Đã gửi video")
}

function isChatNotification(n: Notification): boolean {
  const t = (n.type || "").toLowerCase()
  if (t === "new_chat_message" || t.includes("chat_message")) return true
  const p = n.payload
  if (p && (p as { type?: string }).type === "new_chat_message") return true
  return false
}

export default function NotificationScreen() {
  const navigation = useNavigation<any>()
  const { user } = useAuthContext()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [tab, setTab] = useState<NotifyTab>("orders")

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await notificationService.getNotifications({ limit: 80 })
      setNotifications(data)
    } catch (error) {
      console.error("[NotificationScreen] Error loading notifications:", error)
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
      console.error("[NotificationScreen] Error loading unread count:", error)
    }
  }

  useEffect(() => {
    loadNotifications()
    loadUnreadCount()
  }, [])

  const onRefresh = useCallback(() => {
    loadNotifications()
    loadUnreadCount()
  }, [])

  const messageItems = useMemo(() => notifications.filter(isChatNotification), [notifications])
  const orderItems = useMemo(() => notifications.filter((n) => !isChatNotification(n)), [notifications])

  const listData = tab === "messages" ? messageItems : orderItems

  const navigateToChat = (notification: Notification) => {
    const p = notification.payload
    const convId = p?.conversation_id != null ? Number(p.conversation_id) : NaN
    if (!Number.isFinite(convId) || convId <= 0) return

    const shipperUid = Number(user?.id)
    const customerUid = p?.customer_user_id != null ? Number(p.customer_user_id) : NaN
    const orderNum = p?.order_id != null ? Number(p.order_id) : NaN
    const title =
      (typeof p?.customer_name === "string" && p.customer_name.trim()) ||
      (notification.message || "").split(":")[0]?.trim() ||
      "Khách hàng"

    navigation.navigate("Main", {
      screen: "Chat",
      params: {
        screen: "ChatDetail",
        params: {
          conversationId: convId,
          title,
          role: "Khách hàng",
          customerUserId: Number.isFinite(customerUid) && customerUid > 0 ? customerUid : undefined,
          shipperUserId: Number.isFinite(shipperUid) && shipperUid > 0 ? shipperUid : undefined,
          orderNumericId: Number.isFinite(orderNum) && orderNum > 0 ? orderNum : undefined,
          orderId: Number.isFinite(orderNum) && orderNum > 0 ? String(orderNum) : undefined,
          orderLabel: Number.isFinite(orderNum) && orderNum > 0 ? `#${orderNum}` : undefined,
        },
      },
    })
  }

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
      await notificationService.markAsRead(notification.notification_id)
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notification.notification_id ? { ...n, is_read: true } : n)),
      )
      await loadUnreadCount()
    }

    if (isChatNotification(notification)) {
      navigateToChat(notification)
      return
    }

    if (notification.payload?.order_id) {
      navigation.navigate("OrderDetail" as never, {
        orderId: notification.payload.order_id.toString(),
      } as never)
    }
  }

  const renderNotification = ({ item }: { item: Notification }) => {
    return (
      <TouchableOpacity onPress={() => handleNotificationPress(item)}>
        <Card style={[styles.notificationCard, !item.is_read && styles.unreadCard]}>
          <Card.Content>
            <View style={styles.notificationHeader}>
              <Text variant="titleMedium" style={styles.notificationTitle}>
                {item.title}
              </Text>
              {!item.is_read && (
                <Chip mode="flat" compact style={styles.unreadChip} textStyle={styles.unreadChipText}>
                  Mới
                </Chip>
              )}
            </View>
            <Text variant="bodyMedium" style={styles.notificationMessage}>
              {formatNotificationBody(item.message)}
            </Text>
            <Text variant="bodySmall" style={styles.notificationTime}>
              {formatNotificationTime(item.created_at)}
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
            <Chip mode="flat" compact style={styles.badgeChip} textStyle={styles.badgeChipText}>
              {unreadCount} mới
            </Chip>
          ) : undefined
        }
      />

      <View style={styles.segmentWrap}>
        <View style={styles.tabRail} accessibilityRole="tablist">
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "messages" }}
            onPress={() => setTab("messages")}
            style={({ pressed }) => [
              styles.tabSlot,
              tab === "messages" && styles.tabSlotActive,
              pressed && styles.tabSlotPressed,
            ]}
          >
            <Text
              variant="labelLarge"
              style={[styles.tabLabel, tab === "messages" ? styles.tabLabelActive : styles.tabLabelInactive]}
            >
              Tin nhắn
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "orders" }}
            onPress={() => setTab("orders")}
            style={({ pressed }) => [
              styles.tabSlot,
              tab === "orders" && styles.tabSlotActive,
              pressed && styles.tabSlotPressed,
            ]}
          >
            <Text
              variant="labelLarge"
              style={[styles.tabLabel, tab === "orders" ? styles.tabLabelActive : styles.tabLabelInactive]}
            >
              Đơn hàng
            </Text>
          </Pressable>
        </View>
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : listData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={tab === "messages" ? "message-text-outline" : "package-variant"}
            title={tab === "messages" ? "Chưa có thông báo tin nhắn" : "Chưa có thông báo đơn hàng"}
            message={
              tab === "messages"
                ? "Khi khách nhắn tin, thông báo sẽ hiện ở đây. Chạm để mở cuộc trò chuyện."
                : "Thông báo gán đơn mới sẽ hiện ở đây."
            }
          />
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderNotification}
          keyExtractor={(item) => `${tab}-${item.notification_id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[theme.colors.primary]} />
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
  segmentWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  /** Thay SegmentedButtons — không viền đen, kiểu iOS segment mềm */
  tabRail: {
    flexDirection: "row",
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surfaceVariant,
    padding: 4,
    gap: 4,
  },
  tabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tabSlotActive: {
    backgroundColor: theme.colors.surface,
    ...shadows.small,
  },
  tabSlotPressed: {
    opacity: 0.92,
  },
  tabLabel: {
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  tabLabelInactive: {
    color: theme.colors.textSecondary,
    fontWeight: "500",
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
    ...shadows.small,
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
