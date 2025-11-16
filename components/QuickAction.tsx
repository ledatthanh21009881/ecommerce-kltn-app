import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text, IconButton } from 'react-native-paper'
import { theme, spacing, borderRadius } from '../styles/theme'

interface QuickActionProps {
  icon: string
  label: string
  onPress: () => void
  color?: string
}

export default function QuickAction({ 
  icon, 
  label, 
  onPress, 
  color = theme.colors.primary 
}: QuickActionProps) {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <IconButton
          icon={icon}
          iconColor={color}
          size={28}
          style={styles.icon}
        />
      </View>
      <Text variant="bodySmall" style={styles.label}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    borderRadius: borderRadius.round,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    minHeight: 60,
  },
  icon: {
    margin: 0,
  },
  label: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
})
