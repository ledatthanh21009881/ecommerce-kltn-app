"use client"

import React, { useCallback, useEffect, useState } from "react"
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native"
import { Text, Card, Avatar, Chip, ActivityIndicator } from "react-native-paper"
import { useFocusEffect, useNavigation } from "@react-navigation/native"
import HeaderBar from "../../components/HeaderBar"
import { theme, spacing, borderRadius } from "../../styles/theme"
import { chatService, ConversationItem, shipperConversationNavMeta } from "../services/chatService"

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

/** Giờ:phút trước, ngày-tháng-năm sau — ví dụ `21:08 27-04-2026` */
function formatConversationListTime(raw: string | undefined | null): string {
  if (!raw?.trim()) return ""
  const s = raw.trim()
  let d: Date
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    d = new Date(s.replace(" ", "T"))
  } else {
    d = new Date(s)
  }
  if (Number.isNaN(d.getTime())) return s.length > 16 ? s.slice(0, 16) : s
  const h = pad2(d.getHours())
  const min = pad2(d.getMinutes())
  const day = pad2(d.getDate())
  const mo = pad2(d.getMonth() + 1)
  const y = d.getFullYear()
  return `${h}:${min} ${day}-${mo}-${y}`
}

export default function ChatListScreen() {
  const navigation = useNavigation<any>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [conversations, setConversations] = useState<ConversationItem[]>([])

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations(undefined, { myShipperConversations: true })
      setConversations(data)
    } catch (error) {
      console.error("[ChatListScreen] Failed to load conversations:", error)
      setConversations([])
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await loadConversations()
      setLoading(false)
    })()
  }, [loadConversations])

  useFocusEffect(
    useCallback(() => {
      void loadConversations()
    }, [loadConversations]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadConversations()
    setRefreshing(false)
  }, [loadConversations])

  return (
    <View style={styles.container}>
      <HeaderBar title="Tin nhan" />

      <View style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => String(item.conversation_id)}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
              </View>
            }
            renderItem={({ item }) => {
              const fullName = `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Khách hàng"
              const unread = Number(item.unread_count || 0)
              const orderMeta = shipperConversationNavMeta(item.label)
              const preview = (item.last_message || "").trim()
              return (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("ChatDetail", {
                      conversationId: item.conversation_id,
                      title: fullName,
                      role: "Khách hàng",
                      customerUserId: item.customer_id,
                      ...orderMeta,
                    })
                  }
                >
                  <Card style={styles.itemCard}>
                    <Card.Content style={styles.itemContent}>
                      <Avatar.Text
                        size={44}
                        label={fullName.slice(0, 1).toUpperCase()}
                        style={styles.avatar}
                        color="white"
                      />
                      <View style={styles.mainInfo}>
                        <View style={styles.rowTop}>
                          <Text
                            variant="titleMedium"
                            style={styles.title}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {fullName}
                          </Text>
                          <Text variant="bodySmall" style={styles.time}>
                            {formatConversationListTime(item.last_message_time)}
                          </Text>
                        </View>
                        <View style={styles.rowBottom}>
                          <Chip compact style={styles.customerChip}>
                            Khách hàng
                          </Chip>
                          <Text numberOfLines={1} variant="bodySmall" style={styles.lastMessage}>
                            {preview || "Chưa có tin nhắn"}
                          </Text>
                        </View>
                      </View>
                      {unread > 0 ? (
                        <View style={styles.unreadBubble}>
                          <Text style={styles.unreadText}>{unread}</Text>
                        </View>
                      ) : null}
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              )
            }}
          />
        )}
      </View>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: theme.colors.textSecondary,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  itemCard: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
  },
  mainInfo: {
    flex: 1,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  time: {
    flexShrink: 0,
    color: theme.colors.textSecondary,
    textAlign: "right",
  },
  lastMessage: {
    flex: 1,
    color: theme.colors.textSecondary,
  },
  customerChip: {
    backgroundColor: theme.colors.successContainer,
  },
  unreadBubble: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: theme.colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
})
