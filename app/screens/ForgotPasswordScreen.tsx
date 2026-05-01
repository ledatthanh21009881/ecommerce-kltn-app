"use client"

import { useState, useCallback } from "react"
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from "react-native"
import { Text, TextInput, Button, Card, IconButton } from "react-native-paper"
import { useNavigation } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"
import type { AuthStackParamList } from "../navigation/authStackTypes"
import { authService } from "../services/authService"
import { theme, spacing, shadows, borderRadius } from "../../styles/theme"
import { LinearGradient } from "expo-linear-gradient"

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList, "ForgotPassword">>()

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

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert("Lỗi", "Vui lòng nhập email")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert("Lỗi", "Email không hợp lệ")
      return
    }

    setLoading(true)
    try {
      await authService.forgotPassword(email)
      let navigated = false
      const goToVerifyScreen = () => {
        if (navigated) return
        navigated = true
        navigation.navigate("VerifyOTPScreen", { email })
      }
      Alert.alert(
        "Thành công",
        "Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate to VerifyOTPScreen with email
              goToVerifyScreen()
            },
          },
        ]
      )
      // RN Web can miss Alert button callbacks; keep mobile behavior and add web fallback.
      if (Platform.OS === "web") {
        setTimeout(goToVerifyScreen, 400)
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Không thể gửi mã OTP. Vui lòng thử lại sau."
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
                Quên mật khẩu
              </Text>
              <Text variant="bodyLarge" style={styles.subtitle}>
                Nhập email để nhận mã xác nhận
              </Text>
            </View>

            <Card style={styles.formCard}>
              <Card.Content style={styles.form}>
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    style={styles.input}
                    left={<TextInput.Icon icon="email" color={theme.colors.primary} />}
                    outlineColor={theme.colors.border}
                    activeOutlineColor={theme.colors.primary}
                  />
                </View>

                <View style={styles.buttonContainer}>
                  <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading}
                    style={styles.submitButton}
                    contentStyle={styles.buttonContent}
                    icon="send"
                  >
                    Gửi mã OTP
                  </Button>
                </View>

                <View style={styles.footer}>
                  <Text variant="bodySmall" style={styles.footerText}>
                    Mã OTP sẽ được gửi đến email của bạn và có hiệu lực trong 10 phút
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
  inputContainer: {
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  buttonContainer: {
    marginBottom: spacing.lg,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
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

