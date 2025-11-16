"use client"

import { useMemo, useRef, useState } from "react"
import { View, StyleSheet, PanResponder, Animated, LayoutChangeEvent } from "react-native"
import { Text, ActivityIndicator } from "react-native-paper"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { theme, spacing, borderRadius } from "../styles/theme"

interface SlideToConfirmProps {
  label: string
  onComplete: () => Promise<void> | void
  icon?: string
  disabled?: boolean
  loading?: boolean
  backgroundColor?: string
  thumbColor?: string
}

const THUMB_SIZE = 50

export default function SlideToConfirm({
  label,
  onComplete,
  icon = "chevron-double-right",
  disabled = false,
  loading = false,
  backgroundColor = theme.colors.primary,
  thumbColor = "#FFFFFF",
}: SlideToConfirmProps) {
  const translateX = useRef(new Animated.Value(0)).current
  const containerWidthValue = useRef(new Animated.Value(1)).current
  const [containerWidth, setContainerWidth] = useState(0)
  const [isSliding, setIsSliding] = useState(false)

  const maxTranslateX = useMemo(() => {
    return Math.max(containerWidth - THUMB_SIZE - spacing.md, 0)
  }, [containerWidth])

  const resetSlider = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: false,
    }).start(() => setIsSliding(false))
  }

  const triggerComplete = async () => {
    try {
      setIsSliding(true)
      await onComplete()
    } finally {
      resetSlider()
    }
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled && !loading,
        onMoveShouldSetPanResponder: () => !disabled && !loading,
        onPanResponderMove: (_, gesture) => {
          if (disabled || loading) {
            return
          }
          const newValue = Math.min(Math.max(gesture.dx, 0), maxTranslateX)
          translateX.setValue(newValue)
        },
        onPanResponderRelease: (_, gesture) => {
          if (disabled || loading) {
            resetSlider()
            return
          }
          if (gesture.dx >= maxTranslateX * 0.9) {
            Animated.timing(translateX, {
              toValue: maxTranslateX,
              duration: 150,
              useNativeDriver: false,
            }).start(triggerComplete)
          } else {
            resetSlider()
          }
        },
      }),
    [disabled, loading, maxTranslateX],
  )

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width)
    containerWidthValue.setValue(event.nativeEvent.layout.width)
  }

  return (
    <View style={[styles.container, { backgroundColor, opacity: disabled ? 0.5 : 1 }]} onLayout={handleLayout}>
      {/* progress fill behind label */}
      <Animated.View
        style={[
          styles.progress,
          {
            transform: [
              {
                scaleX: Animated.divide(
                  Animated.add(translateX, new Animated.Value(THUMB_SIZE)),
                  containerWidthValue,
                ),
              },
            ],
          },
        ]}
      />

      <Text style={styles.label}>{label}</Text>
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: thumbColor,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
        )}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: spacing.sm,
    borderRadius: borderRadius.round,
    justifyContent: "center",
    overflow: "hidden",
    minHeight: THUMB_SIZE + spacing.sm * 2,
  },
  label: {
    textAlign: "center",
    color: "white",
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.2,
  },
  thumb: {
    position: "absolute",
    left: spacing.sm,
    top: spacing.sm,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },
  progress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: borderRadius.round,
    transform: [{ scaleX: 0 }],
    transformOrigin: "left",
  },
})

