"use client"

import { useEffect, useState } from "react"
import { View, StyleSheet } from "react-native"
import { Text, ActivityIndicator, Button } from "react-native-paper"

export default function LoadingScreen() {
  const [showError, setShowError] = useState(false)
  const [timer, setTimer] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        const newTime = prev + 1
        if (newTime > 10) {
          // Show error after 10 seconds
          setShowError(true)
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleGoBack = () => {
    // Reset loading state or navigate back
    setShowError(false)
    setTimer(0)
  }

  return (
    <View style={styles.container}>
      <View style={styles.timerContainer}>
        <Text style={styles.timer}>{formatTime(timer)}</Text>
      </View>

      <View style={styles.content}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text variant="headlineSmall" style={styles.title}>
          Opening project...
        </Text>

        {showError && (
          <>
            <Button mode="outlined" onPress={handleGoBack} style={styles.button}>
              Go back
            </Button>

            <Text variant="bodyMedium" style={styles.errorText}>
              This is taking much longer than it should. You might want to check your internet connectivity.
            </Text>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  timerContainer: {
    position: "absolute",
    top: 60,
    left: 20,
  },
  timer: {
    backgroundColor: "#4CAF50",
    color: "white",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 16,
    fontWeight: "bold",
  },
  content: {
    alignItems: "center",
    gap: 20,
  },
  title: {
    marginTop: 20,
    textAlign: "center",
  },
  button: {
    marginTop: 20,
    minWidth: 120,
  },
  errorText: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
    lineHeight: 22,
  },
})
