"use client"

import React, { useCallback, useEffect, useState } from "react"
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native"
import { Text, Card, Avatar, Chip, ActivityIndicator } from "react-native-paper"
import { useNavigation } from "@react-navigation/native"
import HeaderBar from "../../components/HeaderBar"
import { theme, spacing, borderRadius } from "../../styles/theme"
import { chatService, ConversationItem } from "../services/chatService"

function shipperOrderMetaFromLabel(label?: string): { orderId?: string; orderLabel?: string } {
  const m = (label || "").match(/^shipper:\d+:order:(\d+)$/)
  if (!m?.[1]) return {}
  return { orderId: m[1], orderLabel: `#${m[1]}` }
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
              const orderMeta = shipperOrderMetaFromLabel(item.label)
              return (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("ChatDetail", {
                      conversationId: item.conversation_id,
                      title: fullName,
                      role: "Khách hàng",
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
                          <Text variant="titleMedium" style={styles.title}>
                            {fullName}
                          </Text>
                          <Text variant="bodySmall" style={styles.time}>
                            {item.last_message_time || ""}
                          </Text>
                        </View>
                        <View style={styles.rowBottom}>
                          <Chip compact style={styles.customerChip}>
                            Khách hàng
                          </Chip>
                          <Text numberOfLines={1} variant="bodySmall" style={styles.lastMessage}>
                            {item.last_message || "Chưa có tin nhắn"}
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
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  time: {
    color: theme.colors.textSecondary,
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
