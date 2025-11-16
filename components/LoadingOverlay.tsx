import { View, StyleSheet } from "react-native"
import { ActivityIndicator, Text, Card } from "react-native-paper"
import { theme, spacing, shadows, borderRadius } from "../styles/theme"

interface LoadingOverlayProps {
  message?: string
}

export default function LoadingOverlay({ message = "Đang tải..." }: LoadingOverlayProps) {
  return (
    <View style={styles.container}>
      <Card style={styles.loadingCard}>
        <Card.Content style={styles.loadingContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyLarge" style={styles.message}>
            {message}
          </Text>
        </Card.Content>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    padding: spacing.lg,
  },
  loadingCard: {
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...shadows.medium,
    minWidth: 200,
  },
  loadingContent: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  message: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
})
