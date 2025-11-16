import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Card, Text, IconButton } from 'react-native-paper'
import { theme, spacing, shadows, borderRadius } from '../styles/theme'

interface StatsCardProps {
  title: string
  value: number
  icon: string
  color: string
  backgroundColor: string
  subtitle?: string
}

export default function StatsCard({ 
  title, 
  value, 
  icon, 
  color, 
  backgroundColor,
  subtitle 
}: StatsCardProps) {
  return (
    <Card style={[styles.card, { backgroundColor }]}>
      <Card.Content style={styles.content}>
        <View style={styles.iconContainer}>
          <IconButton
            icon={icon}
            iconColor={color}
            size={24}
            style={[styles.icon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
          />
        </View>
        <View style={styles.textContainer}>
          <Text variant="headlineLarge" style={[styles.value, { color }]}>
            {value}
          </Text>
          <Text variant="bodyMedium" style={[styles.title, { color }]}>
            {title}
          </Text>
          {subtitle && (
            <Text variant="bodySmall" style={[styles.subtitle, { color, opacity: 0.8 }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  content: {
    padding: spacing.md,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.sm,
  },
  icon: {
    margin: 0,
  },
  textContainer: {
    alignItems: 'center',
  },
  value: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  title: {
    textAlign: 'center',
    fontWeight: '500',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
})
