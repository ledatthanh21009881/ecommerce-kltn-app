"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { View, StyleSheet, FlatList, Animated } from "react-native"
import { Text, TextInput, IconButton, Card, ActivityIndicator } from "react-native-paper"
import { useNavigation, useRoute } from "@react-navigation/native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import HeaderBar from "../../components/HeaderBar"
import { theme, spacing, borderRadius } from "../../styles/theme"
import { chatService, MessageItem } from "../services/chatService"
import { getMessengerWebSocketUrl } from "../services/messengerSocket"

function TypingDotsBubble() {
  const opacities = useRef([
    new Animated.Value(0.35),
    new Animated.Value(0.35),
    new Animated.Value(0.35),
  ]).current

  useEffect(() => {
    const loops = opacities.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.35, duration: 320, useNativeDriver: true }),
        ]),
      ),
    )
    loops.forEach((l) => l.start())
    return () => loops.forEach((l) => l.stop())
  }, [opacities])

  return (
    <View style={styles.typingBubble}>
      <View style={styles.typingDotsRow}>
        {opacities.map((o, i) => (
          <Animated.View key={i} style={[styles.typingDot, { opacity: o }]} />
        ))}
      </View>
    </View>
  )
}

export default function ChatDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const {
    title = "Cuoc tro chuyen",
    role = "Khách hàng",
    orderId,
    orderLabel,
    conversationId,
    customerUserId,
    shipperUserId,
    orderNumericId,
  } = route.params || {}

  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
  const [peerTyping, setPeerTyping] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const convRef = useRef<number | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingSentRef = useRef(false)
  const peerTypingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canSend = useMemo(() => input.trim().length > 0, [input])

  useEffect(() => {
    convRef.current = activeConversationId
  }, [activeConversationId])

  const sendTypingStopWs = useCallback(() => {
    const convId = convRef.current
    const ws = wsRef.current
    if (!convId || ws?.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: "typing_stop", conversation_id: convId }))
    typingSentRef.current = false
  }, [])

  const sendTypingStartWs = useCallback(() => {
    const convId = convRef.current
    const ws = wsRef.current
    if (!convId || ws?.readyState !== WebSocket.OPEN) return
    if (typingSentRef.current) return
    ws.send(JSON.stringify({ type: "typing_start", conversation_id: convId }))
    typingSentRef.current = true
  }, [])

  const flushLocalTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    if (typingSentRef.current) {
      sendTypingStopWs()
    }
  }, [sendTypingStopWs])

  const bumpPeerTypingFromEvent = useCallback(() => {
    if (peerTypingClearRef.current) {
      clearTimeout(peerTypingClearRef.current)
      peerTypingClearRef.current = null
    }
    setPeerTyping(true)
    peerTypingClearRef.current = setTimeout(() => {
      setPeerTyping(false)
      peerTypingClearRef.current = null
    }, 4000)
  }, [])

  const clearPeerTypingFromEvent = useCallback(() => {
    if (peerTypingClearRef.current) {
      clearTimeout(peerTypingClearRef.current)
      peerTypingClearRef.current = null
    }
    setPeerTyping(false)
  }, [])

  const loadMessagesFor = useCallback(async (convId: number) => {
    try {
      const data = await chatService.getMessages(convId)
      setMessages(data)
    } catch (error) {
      console.error("[ChatDetailScreen] Failed to load messages:", error)
      setMessages([])
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const userRaw = await AsyncStorage.getItem("userData")
      if (userRaw) {
        try {
          const parsed = JSON.parse(userRaw)
          const uid = Number(parsed?.id ?? parsed?.user_id)
          if (Number.isFinite(uid)) setCurrentUserId(uid)
        } catch {
          // ignore
        }
      }

      setLoading(true)
      let conv: number | null = null

      const cust = Number(customerUserId)
      const ship = Number(shipperUserId)
      const ord = Number(orderNumericId)
      if (Number.isFinite(cust) && cust > 0 && Number.isFinite(ship) && ship > 0 && Number.isFinite(ord) && ord > 0) {
        conv = await chatService.ensureShipperOrderConversation(cust, ship, ord)
      } else if (conversationId != null && conversationId !== "") {
        const n = Number(conversationId)
        if (Number.isFinite(n) && n > 0) conv = n
      }

      if (cancelled) return
      setActiveConversationId(conv)
      if (conv) {
        await loadMessagesFor(conv)
      } else {
        setMessages([])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [customerUserId, shipperUserId, orderNumericId, conversationId, loadMessagesFor])

  useEffect(() => {
    if (activeConversationId == null || activeConversationId <= 0) {
      setWsConnected(false)
      return
    }

    let cancelled = false

    const clearReconnect = () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }
    }

    const openSocket = async () => {
      if (cancelled) return
      const token = await AsyncStorage.getItem("authToken")
      if (!token || cancelled) return

      let url: string
      try {
        url = await getMessengerWebSocketUrl()
      } catch {
        url = "ws://localhost:8080"
      }

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (cancelled) {
          try {
            ws.close()
          } catch {
            // ignore
          }
          return
        }
        setWsConnected(true)
        ws.send(JSON.stringify({ type: "auth", token }))
        const cid = convRef.current
        if (cid && cid > 0) {
          ws.send(JSON.stringify({ type: "join_conversation", conversation_id: cid }))
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type?: string
            event?: string
            payload?: { conversation_id?: number; message?: MessageItem; type?: string }
            conversation_id?: number
            message?: MessageItem
          }
          const messageEvent = data.event || data.type
          const myConv = convRef.current

          switch (messageEvent) {
            case "new_message": {
              const raw = data.payload?.message ?? data.message
              const conv = Number(data.payload?.conversation_id ?? data.conversation_id)
              if (!raw || !myConv || conv !== myConv) return
              setMessages((prev) => {
                const mid = Number((raw as MessageItem).message_id)
                if (prev.some((m) => Number(m.message_id) === mid)) return prev
                return [...prev, raw as MessageItem]
              })
              break
            }
            case "typing_indicator": {
              const conv = Number(data.payload?.conversation_id)
              const sub = data.payload?.type
              if (!myConv || conv !== myConv) return
              if (sub === "typing_start") bumpPeerTypingFromEvent()
              else if (sub === "typing_stop") clearPeerTypingFromEvent()
              break
            }
            case "typing_start": {
              const conv = Number(data.conversation_id)
              if (!myConv || conv !== myConv) return
              bumpPeerTypingFromEvent()
              break
            }
            case "typing_stop": {
              const conv = Number(data.conversation_id)
              if (!myConv || conv !== myConv) return
              clearPeerTypingFromEvent()
              break
            }
            default:
              break
          }
        } catch {
          // ignore malformed payloads
        }
      }

      ws.onerror = () => {
        setWsConnected(false)
      }

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null
        }
        setWsConnected(false)
        if (cancelled) return
        clearReconnect()
        reconnectRef.current = setTimeout(() => {
          reconnectRef.current = null
          if (!cancelled) void openSocket()
        }, 3000)
      }
    }

    void openSocket()

    return () => {
      cancelled = true
      clearReconnect()
      flushLocalTyping()
      if (peerTypingClearRef.current) {
        clearTimeout(peerTypingClearRef.current)
        peerTypingClearRef.current = null
      }
      setPeerTyping(false)
      const w = wsRef.current
      wsRef.current = null
      if (w) {
        try {
          const cid = activeConversationId
          if (cid && w.readyState === WebSocket.OPEN) {
            w.send(JSON.stringify({ type: "leave_conversation", conversation_id: cid }))
          }
        } catch {
          // ignore
        }
        try {
          w.close()
        } catch {
          // ignore
        }
      }
      setWsConnected(false)
    }
  }, [activeConversationId, bumpPeerTypingFromEvent, clearPeerTypingFromEvent, flushLocalTyping])

  const handleInputChange = (text: string) => {
    setInput(text)
    const trimmed = text.trim()
    const ws = wsRef.current
    const convId = convRef.current
    if (!convId || ws?.readyState !== WebSocket.OPEN) return

    if (trimmed.length > 0) {
      sendTypingStartWs()
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null
        sendTypingStopWs()
      }, 1500)
    } else {
      sendTypingStopWs()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    }
  }

  const handleSend = async () => {
    if (!canSend || sending || activeConversationId == null) return
    flushLocalTyping()
    setSending(true)
    try {
      const text = input.trim()
      const saved = await chatService.sendMessage(activeConversationId, text)
      if (saved) {
        setMessages((prev) => {
          const mid = Number(saved.message_id)
          if (prev.some((m) => Number(m.message_id) === mid)) return prev
          return [...prev, saved]
        })
        setInput("")
        // Relay giống web — Ratchet gửi tới client khác (khách) trong phòng; không gửi lại sender.
        const ws = wsRef.current
        const cid = activeConversationId
        if (ws?.readyState === WebSocket.OPEN && cid != null) {
          try {
            ws.send(
              JSON.stringify({
                type: "new_message",
                conversation_id: cid,
                message: saved,
              }),
            )
          } catch {
            // ignore
          }
        }
      }
    } catch (error) {
      console.error("[ChatDetailScreen] Failed to send message:", error)
    } finally {
      setSending(false)
    }
  }

  const openOrderDetail = () => {
    if (!orderId) return
    navigation.navigate("Main", {
      screen: "Đơn hàng",
      params: {
        screen: "OrderDetail",
        params: { orderId: String(orderId) },
      },
    })
  }

  return (
    <View style={styles.container}>
      <HeaderBar title={title} onBack={() => navigation.goBack()} />

      <View style={styles.metaBar}>
        <Card style={styles.metaCard}>
          <Card.Content style={styles.metaContent}>
            <Text variant="bodySmall" style={styles.metaText}>
              {`Dang chat voi: ${role}${
                activeConversationId ? (wsConnected ? " · Realtime" : " · Dang ket noi...") : ""
              }`}
            </Text>
            {orderId ? (
              <View style={styles.orderLinkRow}>
                <Text variant="bodySmall" style={styles.orderText}>
                  Lien quan don: {orderLabel || `#${orderId}`}
                </Text>
                <IconButton
                  icon="open-in-new"
                  size={18}
                  onPress={openOrderDetail}
                  style={styles.orderLinkBtn}
                />
              </View>
            ) : null}
          </Card.Content>
        </Card>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator />
        </View>
      ) : !activeConversationId ? (
        <View style={styles.loadingWrap}>
          <Text variant="bodyMedium" style={styles.emptyHint}>
            Khong mo duoc cuoc tro chuyen. Vui long thu lai sau khi tai don hang.
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => String(item.message_id)}
          contentContainerStyle={styles.messagesContent}
          ListFooterComponent={
            peerTyping ? (
              <View style={[styles.messageRow, styles.otherRow]}>
                <TypingDotsBubble />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isMine = currentUserId != null ? Number(item.sender_id) === Number(currentUserId) : false
            return (
              <View style={[styles.messageRow, isMine ? styles.meRow : styles.otherRow]}>
                <View style={[styles.bubble, isMine ? styles.meBubble : styles.otherBubble]}>
                  <Text style={isMine ? styles.meText : styles.otherText}>{item.content || "(media)"}</Text>
                  <Text style={styles.timeText}>{item.sent_at}</Text>
                </View>
              </View>
            )
          }}
        />
      )}

      <View style={styles.inputWrap}>
        <TextInput
          mode="outlined"
          placeholder="Nhap tin nhan..."
          value={input}
          onChangeText={handleInputChange}
          onBlur={flushLocalTyping}
          style={styles.input}
        />
        <IconButton
          icon="send"
          mode="contained"
          containerColor={canSend && !sending && activeConversationId ? theme.colors.primary : "#d9d9d9"}
          iconColor="white"
          onPress={handleSend}
          disabled={!canSend || sending || !activeConversationId}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  metaBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  metaCard: {
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  metaContent: {
    paddingVertical: spacing.xs,
  },
  metaText: {
    color: theme.colors.textSecondary,
  },
  typingBubble: {
    alignSelf: "flex-start",
    maxWidth: "80%",
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderTopLeftRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  typingDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textSecondary,
  },
  orderLinkRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderText: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  orderLinkBtn: {
    margin: 0,
  },
  messagesContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  emptyHint: {
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  messageRow: {
    flexDirection: "row",
  },
  meRow: {
    justifyContent: "flex-end",
  },
  otherRow: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  meBubble: {
    backgroundColor: theme.colors.primary,
    borderTopRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: theme.colors.surfaceVariant,
    borderTopLeftRadius: 4,
  },
  meText: {
    color: "white",
  },
  otherText: {
    color: theme.colors.textPrimary,
  },
  timeText: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textTertiary,
    textAlign: "right",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
})
