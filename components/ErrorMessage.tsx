import { View, StyleSheet } from "react-native"
import { Text, Button, Card, IconButton } from "react-native-paper"
import { theme, spacing, shadows, borderRadius } from "../styles/theme"

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <View style={styles.container}>
      <Card style={styles.errorCard}>
        <Card.Content style={styles.errorContent}>
          <IconButton
            icon="alert-circle"
            iconColor={theme.colors.error}
            size={64}
            style={styles.errorIcon}
          />
          <Text variant="headlineSmall" style={styles.title}>
            Có lỗi xảy ra
          </Text>
          <Text variant="bodyMedium" style={styles.message}>
            {message}
          </Text>
          {onRetry && (
            <Button 
              mode="contained" 
              onPress={onRetry} 
              style={styles.button}
              contentStyle={styles.buttonContent}
              icon="refresh"
            >
              Thử lại
            </Button>
          )}
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
  errorCard: {
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...shadows.medium,
    width: '100%',
    maxWidth: 400,
  },
  errorContent: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorIcon: {
    margin: 0,
  },
  title: {
    color: theme.colors.error,
    fontWeight: "bold",
    textAlign: 'center',
  },
  message: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
})
