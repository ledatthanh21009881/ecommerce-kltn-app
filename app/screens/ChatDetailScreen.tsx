"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Animated,
  Image,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Text, TextInput, IconButton, Card, ActivityIndicator } from "react-native-paper"
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import AsyncStorage from "@react-native-async-storage/async-storage"
import HeaderBar from "../../components/HeaderBar"
import { theme, spacing, borderRadius } from "../../styles/theme"
import { chatService, MessageItem, type MessageMediaPayload } from "../services/chatService"
import { getMessengerWebSocketUrl } from "../services/messengerSocket"

type PendingImageDraft = {
  id: string
  uri: string
  mime: string
  fname: string
  webFile?: File | null
}

function mapPickerAssetToDraft(
  asset: {
    uri: string
    mimeType?: string | null
    fileName?: string | null
    file?: File | null
  },
  index: number,
): PendingImageDraft {
  let mime = (asset.mimeType || "image/jpeg").toLowerCase()
  if (mime === "image" || !mime.includes("/")) mime = "image/jpeg"
  if (mime === "image/jpg") mime = "image/jpeg"
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : "jpg"
  const fname = asset.fileName?.trim() || `chat-${Date.now()}-${index}.${ext}`
  return {
    id: `p-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`,
    uri: asset.uri,
    mime,
    fname,
    webFile: asset.file ?? null,
  }
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

/** Giờ:phút trước, ngày/tháng/năm sau — ví dụ `21:06 27/04/2026` */
function formatSentAt(raw: string | undefined): string {
  if (!raw?.trim()) return ""
  const s = raw.trim()
  let d: Date
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    d = new Date(s.replace(" ", "T"))
  } else {
    d = new Date(s)
  }
  if (Number.isNaN(d.getTime())) return s
  const h = pad2(d.getHours())
  const min = pad2(d.getMinutes())
  const day = pad2(d.getDate())
  const mo = pad2(d.getMonth() + 1)
  const y = d.getFullYear()
  return `${h}:${min} ${day}/${mo}/${y}`
}

function localSqlDateTime(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

/** Web/backend đôi khi lưu caption giả dạng [Image] / [Ảnh] — không hiển thị trong bubble khi đã có media. */
function isMediaPlaceholderCaption(text: string | undefined): boolean {
  const t = (text || "").trim()
  if (!t) return false
  return /^\[(Image|Ảnh|Video)\]$/i.test(t)
}

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
  const insets = useSafeAreaInsets()
  const { width: winW, height: winH } = useWindowDimensions()
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const {
    title = "Cuoc tro chuyen",
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
  const [pendingImages, setPendingImages] = useState<PendingImageDraft[]>([])
  const [imageZoomUri, setImageZoomUri] = useState<string | null>(null)
  const [listRefreshing, setListRefreshing] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const convRef = useRef<number | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingSentRef = useRef(false)
  const peerTypingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canSend = useMemo(
    () => input.trim().length > 0 || pendingImages.length > 0,
    [input, pendingImages.length],
  )

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

  const onRefreshMessages = useCallback(async () => {
    const cid = activeConversationId
    if (!cid) return
    setListRefreshing(true)
    try {
      await loadMessagesFor(cid)
      await chatService.markConversationRead(cid)
    } finally {
      setListRefreshing(false)
    }
  }, [activeConversationId, loadMessagesFor])

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
        await chatService.markConversationRead(conv)
      } else {
        setMessages([])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [customerUserId, shipperUserId, orderNumericId, conversationId, loadMessagesFor])

  useFocusEffect(
    useCallback(() => {
      const cid = activeConversationId
      if (cid && cid > 0) {
        void chatService.markConversationRead(cid)
      }
    }, [activeConversationId]),
  )

  useEffect(() => {
    if (activeConversationId == null || activeConversationId <= 0) {
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
              void chatService.markConversationRead(myConv)
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

      ws.onerror = () => {}

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null
        }
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

  const appendMessageIfNew = useCallback((saved: MessageItem) => {
    setMessages((prev) => {
      const mid = Number(saved.message_id)
      if (prev.some((m) => Number(m.message_id) === mid)) return prev
      return [...prev, saved]
    })
  }, [])

  const relaySavedMessageToPeers = useCallback((saved: MessageItem, convId: number) => {
    const ws = wsRef.current
    if (ws?.readyState !== WebSocket.OPEN) return
    try {
      ws.send(JSON.stringify({ type: "new_message", conversation_id: convId, message: saved }))
    } catch {
      // ignore
    }
  }, [])

  const handleSend = async () => {
    if (!canSend || sending || activeConversationId == null) return
    flushLocalTyping()

    const caption = input.trim()
    const convId = activeConversationId
    const uid = currentUserId ?? 0

    if (pendingImages.length > 0) {
      const drafts = [...pendingImages]
      const tempId = -Date.now()
      const optimistic: MessageItem = {
        message_id: tempId,
        conversation_id: convId,
        sender_id: uid,
        content: caption,
        sent_at: localSqlDateTime(),
        is_read: 0,
        media: drafts.map((d) => ({ url: d.uri, type: d.mime })),
      }
      setPendingImages([])
      setInput("")
      setMessages((prev) => [...prev, optimistic])

      setSending(true)
      try {
        const uploadedPayloads: MessageMediaPayload[] = []
        for (let i = 0; i < drafts.length; i++) {
          const d = drafts[i]
          const uploaded = await chatService.uploadMessageMedia(d.uri, d.mime, d.fname, d.webFile ?? null)
          if (!uploaded) {
            setMessages((prev) => prev.filter((m) => Number(m.message_id) !== tempId))
            Alert.alert("Lỗi", "Không upload được ảnh. Kiểm tra mạng và Cloudinary trên server.")
            return
          }
          uploadedPayloads.push({
            url: uploaded.url,
            type: uploaded.type,
            name: uploaded.name ?? d.fname,
            public_id: uploaded.public_id ?? undefined,
            size: uploaded.size,
          })
        }
        const saved = await chatService.sendMessage(convId, caption, uploadedPayloads)
        if (!saved) {
          setMessages((prev) => prev.filter((m) => Number(m.message_id) !== tempId))
          Alert.alert("Lỗi", "Không gửi được tin kèm ảnh.")
          return
        }
        setMessages((prev) => prev.map((m) => (Number(m.message_id) === tempId ? saved : m)))
        relaySavedMessageToPeers(saved, convId)
      } catch (error) {
        console.error("[ChatDetailScreen] Failed to send image:", error)
        setMessages((prev) => prev.filter((m) => Number(m.message_id) !== tempId))
        Alert.alert("Lỗi", "Không gửi được ảnh.")
      } finally {
        setSending(false)
      }
      return
    }

    setSending(true)
    try {
      const saved = await chatService.sendMessage(convId, caption)
      if (saved) {
        appendMessageIfNew(saved)
        setInput("")
        relaySavedMessageToPeers(saved, convId)
      }
    } catch (error) {
      console.error("[ChatDetailScreen] Failed to send message:", error)
    } finally {
      setSending(false)
    }
  }

  const handlePickImage = async () => {
    if (!activeConversationId || sending) return
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Quyền truy cập", "Ứng dụng cần quyền thư viện ảnh để chọn hình.")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 12,
    })
    if (result.canceled || !result.assets?.length) return

    const newDrafts = result.assets.map((asset, i) => mapPickerAssetToDraft(asset, i))
    setPendingImages((prev) => {
      const seen = new Set(prev.map((p) => p.uri))
      const merged = [...prev]
      for (const d of newDrafts) {
        if (!seen.has(d.uri)) {
          seen.add(d.uri)
          merged.push(d)
        }
      }
      return merged
    })
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
            {orderId ? (
              <View style={styles.orderLinkRow}>
                <Text variant="bodySmall" style={styles.orderText}>
                  Đơn hàng: {orderLabel || `#${orderId}`}
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
          refreshControl={
            <RefreshControl
              refreshing={listRefreshing}
              onRefresh={onRefreshMessages}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
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
            const mediaUrls = (item.media ?? []).map((m) => m.url).filter((u): u is string => Boolean(u))
            const trimmedContent = item.content?.trim() ?? ""
            const hasText = Boolean(trimmedContent) && !isMediaPlaceholderCaption(trimmedContent)
            const multiImg = mediaUrls.length > 1
            return (
              <View style={[styles.messageRow, isMine ? styles.meRow : styles.otherRow]}>
                <View style={[styles.bubble, isMine ? styles.meBubble : styles.otherBubble]}>
                  {mediaUrls.length > 0 ? (
                    <View style={styles.messageImagesRow}>
                      {mediaUrls.map((url, idx) => (
                        <Pressable key={`${item.message_id}-${idx}`} onPress={() => setImageZoomUri(url)}>
                          <Image
                            source={{ uri: url }}
                            style={multiImg ? styles.messageImageMulti : styles.messageImage}
                            resizeMode="cover"
                          />
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  {hasText ? (
                    <Text style={isMine ? styles.meText : styles.otherText}>{trimmedContent}</Text>
                  ) : null}
                  {!hasText && mediaUrls.length === 0 ? (
                    <Text style={isMine ? styles.meText : styles.otherText}>(media)</Text>
                  ) : null}
                  <Text style={[styles.timeText, isMine ? styles.timeTextMine : null]}>{formatSentAt(item.sent_at)}</Text>
                </View>
              </View>
            )
          }}
        />
      )}

      <View style={styles.inputOuter}>
        {pendingImages.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pendingScroll}
            contentContainerStyle={styles.pendingScrollContent}
          >
            {pendingImages.map((p) => (
              <View key={p.id} style={styles.pendingThumbWrap}>
                <Image source={{ uri: p.uri }} style={styles.pendingThumb} resizeMode="cover" />
                <IconButton
                  icon="close-circle"
                  size={20}
                  style={styles.pendingRemoveBtn}
                  onPress={() => setPendingImages((prev) => prev.filter((x) => x.id !== p.id))}
                  accessibilityLabel="Bo anh"
                />
              </View>
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.inputRow}>
          <IconButton
            icon="image-outline"
            size={22}
            mode="contained-tonal"
            disabled={!activeConversationId || sending}
            onPress={handlePickImage}
            accessibilityLabel="Chon anh"
          />
          <TextInput
            mode="outlined"
            placeholder={
              pendingImages.length > 0 ? "Thêm chú thích (tùy chọn)..." : "Nhập tin nhắn..."
            }
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

      <Modal
        visible={imageZoomUri != null}
        transparent
        animationType="fade"
        onRequestClose={() => setImageZoomUri(null)}
      >
        <View style={[styles.zoomRoot, { flex: 1 }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setImageZoomUri(null)} />
          <View
            style={[StyleSheet.absoluteFillObject, { justifyContent: "center", alignItems: "center" }]}
            pointerEvents="box-none"
          >
            {imageZoomUri ? (
              <Image
                source={{ uri: imageZoomUri }}
                style={{ width: winW * 0.92, height: winH * 0.78 }}
                resizeMode="contain"
              />
            ) : null}
          </View>
          <IconButton
            icon="close"
            iconColor="white"
            size={28}
            containerColor="rgba(0,0,0,0.45)"
            style={[styles.zoomCloseBtn, { top: Math.max(insets.top, 12) + 8, right: 12 }]}
            onPress={() => setImageZoomUri(null)}
            accessibilityLabel="Đóng ảnh"
          />
        </View>
      </Modal>
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
  typingBubble: {
    alignSelf: "flex-start",
    maxWidth: "80%",
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
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
  },
  otherBubble: {
    backgroundColor: theme.colors.surfaceVariant,
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
  timeTextMine: {
    color: "rgba(255,255,255,0.88)",
  },
  messageImagesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: borderRadius.sm,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  messageImageMulti: {
    width: 104,
    height: 104,
    borderRadius: borderRadius.sm,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  zoomRoot: {
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  zoomCloseBtn: {
    position: "absolute",
    zIndex: 10,
    margin: 0,
  },
  inputOuter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  pendingScroll: {
    maxHeight: 72,
    marginBottom: spacing.xs,
  },
  pendingScrollContent: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pendingThumbWrap: {
    position: "relative",
    marginRight: spacing.xs,
  },
  pendingThumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.surfaceVariant,
  },
  pendingRemoveBtn: {
    position: "absolute",
    top: -10,
    right: -10,
    margin: 0,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
})
