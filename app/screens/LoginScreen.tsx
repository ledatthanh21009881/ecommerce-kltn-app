"use client"

import { useState } from "react"
import { View, StyleSheet, Alert, Dimensions, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native"
import { Text, TextInput, Button, Card, IconButton } from "react-native-paper"
import { useNavigation } from "@react-navigation/native"
import { useAuthContext } from "../context/AuthContext"
import { theme, spacing, shadows, borderRadius } from "../../styles/theme"
import { LinearGradient } from 'expo-linear-gradient'

const { width, height } = Dimensions.get('window')

export default function LoginScreen() {
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthContext()
  const navigation = useNavigation()

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin")
      return
    }

    setLoading(true)
    try {
      await login(phone, password)
    } catch (error: any) {
      // Show the actual error message from the server
      const errorMessage = error?.message || "Số điện thoại hoặc mật khẩu không đúng"
      console.error("Login error:", error)
      Alert.alert("Lỗi đăng nhập", errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPassword" as never)
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
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <IconButton
                icon="truck-delivery"
                iconColor="white"
                size={48}
                style={styles.logoIcon}
              />
            </View>
            <Text variant="displaySmall" style={styles.title}>
              Delivery App
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Hệ thống quản lý giao hàng thông minh
            </Text>
          </View>

          {/* Login Form */}
          <Card style={styles.formCard}>
            <Card.Content style={styles.form}>
              <View style={styles.formHeader}>
                <Text variant="headlineSmall" style={styles.formTitle}>
                  Đăng nhập
                </Text>
                <Text variant="bodyMedium" style={styles.formSubtitle}>
                  Vui lòng nhập thông tin để tiếp tục
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Số điện thoại"
                  value={phone}
                  onChangeText={setPhone}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={styles.input}
                  left={<TextInput.Icon icon="phone" iconColor={theme.colors.primary} />}
                  outlineColor={theme.colors.border}
                  activeOutlineColor={theme.colors.primary}
                />

                <TextInput
                  label="Mật khẩu"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock" iconColor={theme.colors.primary} />}
                  right={
                    <TextInput.Icon 
                      icon={showPassword ? "eye-off" : "eye"} 
                      iconColor={theme.colors.textSecondary}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  outlineColor={theme.colors.border}
                  activeOutlineColor={theme.colors.primary}
                />
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading}
                  style={styles.loginButton}
                  contentStyle={styles.buttonContent}
                  icon="login"
                >
                  Đăng nhập
                </Button>

                <TouchableOpacity 
                  onPress={handleForgotPassword}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={styles.forgotPasswordText}>
                    Quên mật khẩu?
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Text variant="bodySmall" style={styles.footerText}>
                  Ứng dụng dành cho nhân viên giao hàng
                </Text>
                <Text variant="bodySmall" style={styles.footerText}>
                  © 2024 Delivery App
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
  logoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.round,
    padding: spacing.md,
    marginBottom: spacing.lg,
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
  formHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  formTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  formSubtitle: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  buttonContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
})
