"use client"

import { View, StyleSheet } from "react-native"
import { Text } from "react-native-paper"
import type { ShippingEvent, ShippingStatus } from "../lib/types"
import { shippingStatusConfig, SHIPPING_STATUS_FLOW } from "../app/constants/shippingStatus"
import { theme, spacing } from "../styles/theme"
import { MaterialCommunityIcons } from "@expo/vector-icons"

interface ShippingTimelineProps {
  currentStatus: ShippingStatus
  events?: ShippingEvent[]
}

export default function ShippingTimeline({ currentStatus, events = [] }: ShippingTimelineProps) {
  const eventMap = new Map<ShippingStatus, ShippingEvent>()
  events.forEach((event) => {
    eventMap.set(event.status_to, event)
  })

  return (
    <View style={styles.container}>
      {SHIPPING_STATUS_FLOW.map((status, index) => {
        const config = shippingStatusConfig[status]
        const event = eventMap.get(status)
        const isCompleted = SHIPPING_STATUS_FLOW.indexOf(currentStatus) >= index
        const isCurrent = currentStatus === status

        return (
          <View key={status} style={styles.step}>
            <View style={styles.iconContainer}>
              {index !== 0 && <View style={[styles.connector, isCompleted && styles.connectorActive]} />}
              <View
                style={[
                  styles.statusIcon,
                  {
                    backgroundColor: isCompleted ? config.color : theme.colors.surfaceVariant,
                    borderColor: config.color,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={config.icon as any}
                  size={16}
                  color={isCompleted ? "white" : config.color}
                />
              </View>
              {index !== SHIPPING_STATUS_FLOW.length - 1 && (
                <View style={[styles.connector, isCompleted && styles.connectorActive]} />
              )}
            </View>

            <View style={styles.detail}>
              <Text style={[styles.statusLabel, isCurrent && styles.statusLabelActive]}>{config.label}</Text>
              <Text style={styles.statusDescription}>{config.description}</Text>
              {event?.created_at && (
                <Text style={styles.timestamp}>{new Date(event.created_at).toLocaleString("vi-VN")}</Text>
              )}
              {event?.note && <Text style={styles.note}>Ghi chú: {event.note}</Text>}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    alignItems: "center",
    marginRight: spacing.md,
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.borderLight,
  },
  connectorActive: {
    backgroundColor: theme.colors.primary,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  detail: {
    flex: 1,
  },
  statusLabel: {
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  statusLabelActive: {
    color: theme.colors.textPrimary,
  },
  statusDescription: {
    color: theme.colors.textTertiary,
    fontSize: 12,
  },
  timestamp: {
    marginTop: 4,
    color: theme.colors.textTertiary,
    fontSize: 12,
  },
  note: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontStyle: "italic",
  },
})

