"use client"

import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, TouchableOpacity, Dimensions, PanResponder } from 'react-native'
import { Text, IconButton } from 'react-native-paper'
import { theme, spacing, shadows } from '../styles/theme'
import { MaterialCommunityIcons } from '@expo/vector-icons'

const { width } = Dimensions.get('window')

interface TopBannerNotificationProps {
  visible: boolean
  title: string
  message: string
  orderId?: number
  onPress?: () => void
  onDismiss: () => void
  autoHideDuration?: number
}

export default function TopBannerNotification({
  visible,
  title,
  message,
  orderId,
  onPress,
  onDismiss,
  autoHideDuration = 10000, // 10 seconds
}: TopBannerNotificationProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const autoHideTimer = useRef<NodeJS.Timeout | null>(null)
  const wasVisible = useRef(false)

  useEffect(() => {
    if (visible) {
      console.log('[TopBannerNotification] Showing banner, will auto-hide after', autoHideDuration, 'ms')
      wasVisible.current = true
      
      // Slide down animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()

      // Auto hide after duration
      autoHideTimer.current = setTimeout(() => {
        console.log('[TopBannerNotification] Auto-hiding banner after', autoHideDuration, 'ms')
        hideBanner()
      }, autoHideDuration)
    } else if (wasVisible.current) {
      // Only hide if it was visible before (avoid hiding on initial mount)
      hideBanner()
    }

    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current)
      }
    }
  }, [visible, autoHideDuration])

  const hideBanner = () => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current)
      autoHideTimer.current = null
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss()
    })
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          slideAnim.setValue(gestureState.dy)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50 || gestureState.vy < -0.5) {
          hideBanner()
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start()
        }
      },
    })
  ).current

  if (!visible) return null

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.content}
        activeOpacity={0.8}
        onPress={() => {
          if (onPress) {
            onPress()
            hideBanner()
          }
        }}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="bell-ring" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
        <IconButton
          icon="close"
          size={20}
          iconColor={theme.colors.onSurface}
          onPress={hideBanner}
          style={styles.closeButton}
        />
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 40, // Safe area for status bar
    paddingHorizontal: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    ...shadows.large,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  closeButton: {
    margin: 0,
    width: 32,
    height: 32,
  },
})

