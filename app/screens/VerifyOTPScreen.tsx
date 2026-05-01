"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  ScrollView,
  RefreshControl,
} from "react-native"
import { Text, TextInput, Button, Card, IconButton } from "react-native-paper"
import type { RouteProp } from "@react-navigation/native"
import { useNavigation, useRoute } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"
import type { AuthStackParamList } from "../navigation/authStackTypes"
import { authService } from "../services/authService"
import { theme, spacing, shadows, borderRadius } from "../../styles/theme"
import { LinearGradient } from "expo-linear-gradient"

export default function VerifyOTPScreen() {
  const route = useRoute<RouteProp<AuthStackParamList, "VerifyOTPScreen">>()
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList, "VerifyOTPScreen">>()
  const email = route.params?.email ?? ""
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const inputRefs = useRef<(RNTextInput | null)[]>([])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      if (__DEV__) {
        try {
          await authService.detectServerIP()
        } catch {
          // ignore
        }
      }
    } finally {
      setRefreshing(false)
    }
  }, [])

  // Mask email for display
  const maskEmail = (email: string) => {
    if (!email) return ""
    const [localPart, domain] = email.split("@")
    if (!domain) return email
    const maskedLocal = localPart.length > 2 
      ? localPart.substring(0, 2) + "*".repeat(localPart.length - 2)
      : localPart
    return `${maskedLocal}@${domain}`
  }

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleOTPChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.trim()
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOTPKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const otpCode = otp.join("").trim()
    if (otpCode.length !== 6) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ 6 số")
      return
    }

    setLoading(true)
    try {
      await authService.verifyOTP((email || "").trim().toLowerCase(), otpCode)
      // Navigate to ResetPassword screen with email and OTP
      navigation.navigate("ResetPassword", { email, otp: otpCode })
    } catch (error: any) {
      const errorMessage = error?.message || "Mã OTP không hợp lệ. Vui lòng thử lại."
      Alert.alert("Lỗi", errorMessage)
      // Clear OTP on error
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return

    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setResendCooldown(60) // 60 seconds cooldown
      Alert.alert("Thành công", "Mã OTP mới đã được gửi đến email của bạn")
    } catch (error: any) {
      const errorMessage = error?.message || "Không thể gửi lại mã OTP. Vui lòng thử lại sau."
      Alert.alert("Lỗi", errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.background}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          <View style={styles.inner}>
            <View style={styles.header}>
              <IconButton
                icon="arrow-left"
                iconColor="white"
                size={24}
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              />
              <Text variant="displaySmall" style={styles.title}>
                Xác nhận mã OTP
              </Text>
              <Text variant="bodyLarge" style={styles.subtitle}>
                Nhập mã đã gửi đến {maskEmail(email)}
              </Text>
            </View>

            <Card style={styles.formCard}>
              <Card.Content style={styles.form}>
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref: unknown) => {
                        inputRefs.current[index] = ref as RNTextInput | null
                      }}
                      value={digit}
                      onChangeText={(value) => handleOTPChange(value, index)}
                      onKeyPress={({ nativeEvent }) => handleOTPKeyPress(nativeEvent.key, index)}
                      mode="outlined"
                      keyboardType="number-pad"
                      maxLength={1}
                      style={styles.otpInput}
                      contentStyle={{ textAlign: "center" }}
                      outlineColor={theme.colors.border}
                      activeOutlineColor={theme.colors.primary}
                      autoFocus={index === 0}
                    />
                  ))}
                </View>

                <View style={styles.buttonContainer}>
                  <Button
                    mode="contained"
                    onPress={handleVerify}
                    loading={loading}
                    disabled={loading || otp.join("").length !== 6}
                    style={styles.verifyButton}
                    contentStyle={styles.buttonContent}
                    icon="check-circle"
                  >
                    Xác nhận
                  </Button>

                  <Button
                    mode="text"
                    onPress={handleResendOTP}
                    disabled={loading || resendCooldown > 0}
                    style={styles.resendButton}
                    textColor={theme.colors.primary}
                  >
                    {resendCooldown > 0
                      ? `Gửi lại sau ${resendCooldown}s`
                      : "Gửi lại mã OTP"}
                  </Button>
                </View>

                <View style={styles.footer}>
                  <Text variant="bodySmall" style={styles.footerText}>
                    Mã OTP có hiệu lực trong 10 phút
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: 60,
    justifyContent: "center",
  },
  inner: {
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
    paddingTop: spacing.xl,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    margin: 0,
  },
  title: {
    color: "white",
    fontWeight: "bold",
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: "white",
    opacity: 0.9,
    textAlign: 'center',
  },
  formCard: {
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...shadows.large,
  },
  form: {
    padding: spacing.lg,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  otpInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    height: 60,
  },
  buttonContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  verifyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
  },
  resendButton: {
    marginTop: spacing.sm,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
})

