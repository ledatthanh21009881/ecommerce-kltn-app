"use client"

import { useState } from "react"
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { Text, TextInput, Button, Card, IconButton } from "react-native-paper"
import { useNavigation, useRoute } from "@react-navigation/native"
import { authService } from "../services/authService"
import { theme, spacing, shadows, borderRadius } from "../../styles/theme"
import { LinearGradient } from 'expo-linear-gradient'

export default function ResetPasswordScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const email = (route.params as any)?.email || ""
  const otp = (route.params as any)?.otp || ""
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin")
      return
    }

    if (newPassword.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự")
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp")
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword(email, otp, newPassword, confirmPassword)
      Alert.alert(
        "Thành công",
        "Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập với mật khẩu mới.",
        [
          {
            text: "Đăng nhập",
            onPress: () => {
              // Navigate to Login screen
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" as never }],
              })
            },
          },
        ]
      )
    } catch (error: any) {
      const errorMessage = error?.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại sau."
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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <IconButton
              icon="arrow-left"
              iconColor="white"
              size={24}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
            <View style={styles.logoContainer}>
              <IconButton
                icon="lock-outline"
                iconColor="white"
                size={48}
                style={styles.logoIcon}
              />
            </View>
            <Text variant="displaySmall" style={styles.title}>
              Đặt lại mật khẩu
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Nhập mật khẩu mới cho tài khoản của bạn
            </Text>
          </View>

          {/* Form */}
          <Card style={styles.formCard}>
            <Card.Content style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput
                  label="Mật khẩu mới"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  mode="outlined"
                  secureTextEntry={!showNewPassword}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock" iconColor={theme.colors.primary} />}
                  right={
                    <TextInput.Icon
                      icon={showNewPassword ? "eye-off" : "eye"}
                      iconColor={theme.colors.textSecondary}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    />
                  }
                  outlineColor={theme.colors.border}
                  activeOutlineColor={theme.colors.primary}
                />

                <TextInput
                  label="Xác nhận mật khẩu"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  mode="outlined"
                  secureTextEntry={!showConfirmPassword}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock-check" iconColor={theme.colors.primary} />}
                  right={
                    <TextInput.Icon
                      icon={showConfirmPassword ? "eye-off" : "eye"}
                      iconColor={theme.colors.textSecondary}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  }
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
                  icon="check-circle"
                >
                  Đặt lại mật khẩu
                </Button>
              </View>

              <View style={styles.footer}>
                <Text variant="bodySmall" style={styles.footerText}>
                  Mật khẩu phải có ít nhất 6 ký tự
                </Text>
              </View>
            </Card.Content>
          </Card>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    margin: 0,
  },
  logoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.round,
    padding: spacing.md,
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  },
  logoIcon: {
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
    gap: spacing.md,
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

