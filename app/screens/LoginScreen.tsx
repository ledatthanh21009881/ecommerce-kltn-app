"use client"

import { useState, useCallback } from "react"
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native"
import { Text, TextInput, Button, Card } from "react-native-paper"
import { useNavigation } from "@react-navigation/native"
import { useAuthContext } from "../context/AuthContext"
import { authService } from "../services/authService"
import { theme, spacing, shadows, borderRadius } from "../../styles/theme"
import { LinearGradient } from "expo-linear-gradient"

export default function LoginScreen() {
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { login } = useAuthContext()
  const navigation = useNavigation()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      if (__DEV__) {
        try {
          await authService.detectServerIP()
        } catch {
          // ignore — dev-only server discovery
        }
      }
    } finally {
      setRefreshing(false)
    }
  }, [])

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin")
      return
    }

    setLoading(true)
    try {
      await login(phone, password)
    } catch (error: any) {
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <LinearGradient colors={[theme.colors.gradientStart, theme.colors.gradientEnd]} style={styles.background}>
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
              <Text variant="headlineMedium" style={styles.title}>
                VIVIENNE DELIVERY
              </Text>
              <Text variant="bodyLarge" style={styles.subtitle}>
                Hệ thống quản lý giao hàng thông minh
              </Text>
            </View>

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
                    left={<TextInput.Icon icon="phone" color={theme.colors.primary} />}
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
                    left={<TextInput.Icon icon="lock" color={theme.colors.primary} />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? "eye-off" : "eye"}
                        color={theme.colors.textSecondary}
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

                  <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
                    <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                  <Text variant="bodySmall" style={styles.footerText}>
                    Ứng dụng dành cho nhân viên giao hàng
                  </Text>
                  <Text variant="bodySmall" style={styles.footerText}>
                    © 2026 Viviene Delivery
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
  },
  title: {
    color: "white",
    fontWeight: "bold",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    color: "white",
    opacity: 0.9,
    textAlign: "center",
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
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  formTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  formSubtitle: {
    color: theme.colors.textSecondary,
    textAlign: "center",
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
    alignItems: "center",
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    gap: spacing.xs,
  },
  footerText: {
    color: theme.colors.textTertiary,
    textAlign: "center",
  },
})
