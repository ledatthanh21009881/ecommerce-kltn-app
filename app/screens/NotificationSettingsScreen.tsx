"use client"

import { useCallback, useState } from "react"
import { View, ScrollView, StyleSheet, RefreshControl } from "react-native"
import { Text, Card, Divider, Switch } from "react-native-paper"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import HeaderBar from "../../components/HeaderBar"
import {
  loadNotificationSoundPrefs,
  setSoundOrdersEnabled,
  setSoundMessagesEnabled,
  getCachedSoundOrders,
  getCachedSoundMessages,
} from "../services/notificationSoundSettings"
import { theme, spacing, borderRadius, shadows } from "../../styles/theme"

export default function NotificationSettingsScreen() {
  const navigation = useNavigation<any>()
  const [soundOrders, setSoundOrders] = useState(true)
  const [soundMessages, setSoundMessages] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    await loadNotificationSoundPrefs()
    setSoundOrders(getCachedSoundOrders())
    setSoundMessages(getCachedSoundMessages())
  }, [])

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  return (
    <View style={styles.container}>
      <HeaderBar title="Cài đặt thông báo" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Chuông thông báo
            </Text>
            <Text variant="bodySmall" style={styles.hint}>
              Áp dụng khi ứng dụng đang mở và nhận thông báo đẩy (đơn hàng / tin nhắn).
            </Text>
            <Divider style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text variant="bodyLarge" style={styles.label}>
                  Đơn hàng
                </Text>
                <Text variant="bodySmall" style={styles.sub}>
                  Phát âm thanh khi có thông báo đơn (gán đơn, từ chối, …)
                </Text>
              </View>
              <Switch
                value={soundOrders}
                onValueChange={(v) => {
                  setSoundOrders(v)
                  void setSoundOrdersEnabled(v)
                }}
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text variant="bodyLarge" style={styles.label}>
                  Tin nhắn
                </Text>
                <Text variant="bodySmall" style={styles.sub}>
                  Phát âm thanh khi có tin nhắn mới từ khách
                </Text>
              </View>
              <Switch
                value={soundMessages}
                onValueChange={(v) => {
                  setSoundMessages(v)
                  void setSoundMessagesEnabled(v)
                }}
              />
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: {
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  sectionTitle: {
    fontWeight: "700",
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  hint: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  divider: {
    marginVertical: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  label: {
    fontWeight: "600",
    color: theme.colors.onSurface,
  },
  sub: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
})
