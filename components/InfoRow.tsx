import { View, StyleSheet } from "react-native"
import { Text, IconButton } from "react-native-paper"
import { theme, spacing } from "../styles/theme"

interface InfoRowProps {
  icon: string
  label: string
  value: string
  compact?: boolean
}

export default function InfoRow({ icon, label, value, compact = false }: InfoRowProps) {
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <IconButton
          icon={icon}
          iconColor={theme.colors.textSecondary}
          size={16}
          style={styles.compactIcon}
        />
        <Text variant="bodySmall" style={styles.compactText}>
          {label}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <IconButton
        icon={icon}
        iconColor={theme.colors.textSecondary}
        size={20}
        style={styles.icon}
      />
      <View style={styles.content}>
        <Text variant="bodySmall" style={styles.label}>
          {label}
        </Text>
        {value && (
          <Text variant="bodyMedium" style={styles.value}>
            {value}
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  icon: {
    margin: 0,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  label: {
    color: theme.colors.textTertiary,
    marginBottom: spacing.xs,
  },
  value: {
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  compactIcon: {
    margin: 0,
    marginRight: spacing.sm,
  },
  compactText: {
    color: theme.colors.textSecondary,
    flex: 1,
  },
})
