import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, IconButton } from 'react-native-paper'
import { theme, spacing } from '../styles/theme'

interface EmptyStateProps {
  icon: string
  title: string
  message: string
  iconColor?: string
  iconSize?: number
}

export default function EmptyState({ 
  icon, 
  title, 
  message, 
  iconColor = theme.colors.textTertiary,
  iconSize = 48
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <IconButton
        icon={icon}
        iconColor={iconColor}
        size={iconSize}
        style={styles.icon}
      />
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.message}>
        {message}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  icon: {
    margin: 0,
    marginBottom: spacing.lg,
  },
  title: {
    color: theme.colors.textPrimary,
    marginBottom: spacing.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
})
