import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"
import type { DeliveryUser } from "../../lib/types"

// Backend API base URL - will be auto-detected
// This will be set dynamically based on detected server IP

interface LoginResponse {
  success: boolean
  message: string
  status_code: number
  data: {
    token: string
    refresh_token: string
    shipper: {
      user_id: number
      account_id: number
      phone: string
      first_name: string
      last_name: string
      email: string
      avatar_url: string | null
      vehicle_info: string | null
      rating: number
      on_time_delivery_pct: number
      total_delivered: number
      is_available: boolean
      status: string
    }
  }
}

interface ApiError {
  success: false
  message: string
  status_code: number
  errors?: any
}

class AuthService {
  private currentApiBaseUrl: string | null = null
  private readonly defaultPort = 8000
  private readonly defaultLanHost = "192.168.1.6"

  private normalizeBaseUrl(url: string): string {
    return url.trim().replace(/\/+$/, "")
  }

  private buildBaseUrl(host: string): string {
    return `http://${host}:${this.defaultPort}`
  }

  // Get API base URL - auto-detect if not set
  async getApiBaseUrl(): Promise<string> {
    if (this.currentApiBaseUrl) {
      return this.currentApiBaseUrl
    }

    // In web dev, always use local backend to avoid stale saved server IP.
    if (__DEV__ && Platform.OS === 'web') {
      this.currentApiBaseUrl = this.buildBaseUrl("localhost")
      return this.currentApiBaseUrl
    }

    // 0) Prefer explicit env override if provided at build time (Expo public env)
    const envApi = (process.env as any)?.EXPO_PUBLIC_API_URL
    if (envApi && typeof envApi === 'string' && envApi.trim().length > 0) {
      this.currentApiBaseUrl = this.normalizeBaseUrl(envApi)
      return this.currentApiBaseUrl
    }

    // Try to get saved IP from AsyncStorage
    const savedApiUrl = await AsyncStorage.getItem("apiBaseUrl")
    if (savedApiUrl) {
      this.currentApiBaseUrl = this.normalizeBaseUrl(savedApiUrl)
      return this.currentApiBaseUrl
    }

    // If no saved IP, use default based on platform
    if (__DEV__) {
      if (Platform.OS === 'android') {
        // Android emulator can always access host machine with 10.0.2.2.
        // Real devices should use LAN IP and can be auto-detected on retry.
        return this.buildBaseUrl("10.0.2.2")
      } else {
        // iOS
        return this.buildBaseUrl("localhost")
      }
    }
    // For preview/internal builds without env, default to LAN HTTP.
    return this.buildBaseUrl(this.defaultLanHost)
  }

  // Get server config from endpoint
  async getServerConfig(baseUrl: string): Promise<{ apiUrl: string; serverIp: string }> {
    try {
      const response = await this.fetchWithTimeout(
        `${baseUrl}/api/mobile/v1/config`,
        { method: "GET" },
        5000 // 5 seconds timeout
      )

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const result = await response.json()
      if (result.success && result.data) {
        return {
          apiUrl: result.data.api_url,
          serverIp: result.data.server_ip
        }
      }
      throw new Error("Invalid response from server")
    } catch (error: any) {
      throw new Error(`Cannot get server config: ${error.message}`)
    }
  }

  // Auto-detect server IP by trying multiple possible IPs
  async detectServerIP(): Promise<string> {
    console.log("[AuthService] Starting server IP detection...")

    // Deduplicated list of candidate hosts
    const possibleHosts: string[] = []

    // 1) Try saved IP first
    const savedIP = await AsyncStorage.getItem("serverIP")
    if (savedIP) {
      possibleHosts.push(savedIP.trim())
    }

    // 2) Add platform common hosts
    if (Platform.OS === 'android') {
      possibleHosts.push("10.0.2.2")
      possibleHosts.push(this.defaultLanHost)
    } else {
      possibleHosts.push("localhost")
    }

    const uniqueHosts = [...new Set(possibleHosts.filter(Boolean))]

    // 3) Try candidates directly
    for (const host of uniqueHosts) {
      try {
        const baseUrl = this.buildBaseUrl(host)
        console.log(`[AuthService] Trying to get config from: ${baseUrl}`)
        const config = await this.getServerConfig(baseUrl)

        const normalizedApi = this.normalizeBaseUrl(config.apiUrl)
        await AsyncStorage.setItem("serverIP", config.serverIp.trim())
        await AsyncStorage.setItem("apiBaseUrl", normalizedApi)
        this.currentApiBaseUrl = normalizedApi

        console.log(`[AuthService] Server IP detected: ${config.serverIp}`)
        return normalizedApi
      } catch (error) {
        console.log(`[AuthService] Failed to connect to ${host}:`, error)
        continue
      }
    }

    // 4) Fallback scan common LAN ranges
    const commonRanges = [
      "192.168.1", "192.168.0", "192.168.2",
      "10.0.0", "172.27", "172.28"
    ]

    for (const range of commonRanges) {
      // Keep scan bounded to avoid very long login waits.
      for (let i = 1; i <= 254; i += 16) {
        const testHost = `${range}.${i}`
        try {
          const baseUrl = this.buildBaseUrl(testHost)
          console.log(`[AuthService] Scanning: ${baseUrl}`)
          const config = await this.getServerConfig(baseUrl)

          const normalizedApi = this.normalizeBaseUrl(config.apiUrl)
          await AsyncStorage.setItem("serverIP", config.serverIp.trim())
          await AsyncStorage.setItem("apiBaseUrl", normalizedApi)
          this.currentApiBaseUrl = normalizedApi

          console.log(`[AuthService] Server IP detected via scan: ${config.serverIp}`)
          return normalizedApi
        } catch (error) {
          continue
        }
      }
    }
    
    throw new Error("Không tìm thấy server. Vui lòng kiểm tra backend có đang chạy không.")
  }

  // Helper function to add timeout to fetch
  private async fetchWithTimeout(url: string, options: RequestInit, timeout: number = 15000): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error("Request timeout: Không nhận được phản hồi từ server sau 15 giây")
      }
      throw error
    }
  }

  async login(phone: string, password: string): Promise<{ user: DeliveryUser; token: string; refreshToken: string }> {
    let lastError: any = null
    let apiBaseUrl = await this.getApiBaseUrl()

    // At most 2 attempts: current URL then one auto-detected URL.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        console.log(`[AuthService] Attempting login to: ${apiBaseUrl}/api/mobile/v1/auth/login`)
        console.log(`[AuthService] Phone: ${phone}`)

        const response = await this.fetchWithTimeout(
          `${apiBaseUrl}/api/mobile/v1/auth/login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ phone, password }),
          },
          15000 // 15 seconds timeout
        )

        console.log(`[AuthService] Response received: ${response.status} ${response.statusText}`)

        // Check if response is JSON
        const contentType = response.headers.get("content-type")
        console.log(`[AuthService] Content-Type: ${contentType}`)

        let result: LoginResponse | ApiError
        try {
          // Clone response to read text for logging, then parse JSON
          const responseClone = response.clone()
          const responseText = await responseClone.text()
          console.log(`[AuthService] Response body: ${responseText.substring(0, 200)}...`)

          if (!contentType || !contentType.includes("application/json")) {
            console.error(`[AuthService] Non-JSON response: ${responseText}`)
            throw new Error(`Server trả về lỗi: ${response.status} ${response.statusText}`)
          }

          // Parse the original response
          result = await response.json()
          console.log(`[AuthService] Parsed result - success: ${result.success}`)
        } catch (parseError: any) {
          console.error(`[AuthService] JSON parse error:`, parseError)
          throw new Error("Không thể đọc phản hồi từ server. Vui lòng thử lại.")
        }

        if (!response.ok || !result.success) {
          const errorMessage = result.message || "Đăng nhập thất bại"
          console.error(`[AuthService] Login failed: ${errorMessage}`)
          throw new Error(errorMessage)
        }

        if (!result.success || !result.data) {
          console.error(`[AuthService] Invalid response structure:`, result)
          throw new Error("Phản hồi không hợp lệ từ server")
        }

        const { token, refresh_token, shipper } = result.data

        // Save tokens to AsyncStorage
        await AsyncStorage.setItem("authToken", token)
        await AsyncStorage.setItem("refreshToken", refresh_token)
        await AsyncStorage.setItem("userData", JSON.stringify(shipper))

        // Convert shipper data to DeliveryUser format
        const user: DeliveryUser = {
          id: shipper.user_id.toString(),
          name: `${shipper.first_name} ${shipper.last_name}`,
          phone: shipper.phone,
          avatar: shipper.avatar_url || undefined,
          joinDate: new Date().toISOString().split("T")[0], // You might want to get this from backend
          totalDeliveries: shipper.total_delivered,
          email: shipper.email,
        }

        console.log(`[AuthService] Login successful for user: ${user.name}`)
        return { user, token, refreshToken: refresh_token }
      } catch (error: any) {
        console.error(`[AuthService] Login error:`, error)
        lastError = error

        const isNetworkError = error.message && (
          error.message.includes("timeout") ||
          error.message.includes("Network request failed") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError")
        )

        const canRetryWithDetection =
          isNetworkError &&
          attempt === 0 &&
          !(__DEV__ && Platform.OS === 'web')

        if (canRetryWithDetection) {
          console.log("[AuthService] Network error detected, attempting to auto-detect server IP...")
          try {
            apiBaseUrl = await this.detectServerIP()
            console.log(`[AuthService] Retrying login with detected IP: ${apiBaseUrl}`)
            continue
          } catch (detectError) {
            console.error("[AuthService] Failed to detect server IP:", detectError)
          }
        }
      }
    }

    const error = lastError
    if (error?.message && error.message.includes("timeout")) {
      throw new Error("Kết nối quá lâu. Vui lòng kiểm tra:\n1. Backend có đang chạy không\n2. URL API: " + apiBaseUrl + "\n3. Nếu dùng thiết bị thật, hãy dùng IP máy tính")
    }

    if (error?.message && (error.message.includes("Network request failed") || error.message.includes("Failed to fetch") || error.message.includes("NetworkError"))) {
      throw new Error("Không thể kết nối đến server. Vui lòng:\n1. Kiểm tra backend có đang chạy không\n2. Kiểm tra URL API: " + apiBaseUrl + "\n3. Nếu dùng thiết bị thật, hãy dùng IP máy tính thay vì localhost")
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error(error?.message || "Không thể kết nối đến server. Vui lòng thử lại sau.")
  }

  async getCurrentUser(): Promise<DeliveryUser> {
    const token = await AsyncStorage.getItem("authToken")
    if (!token) {
      throw new Error("Không tìm thấy token")
    }

    // For now, return user from AsyncStorage if saved
    // In the future, you can call /api/mobile/v1/auth/me endpoint
    const userData = await AsyncStorage.getItem("userData")
    if (userData) {
      return JSON.parse(userData)
    }

    throw new Error("Không tìm thấy thông tin người dùng")
  }

  async refreshToken(): Promise<{ token: string; refreshToken: string }> {
    const refreshToken = await AsyncStorage.getItem("refreshToken")
    if (!refreshToken) {
      throw new Error("Không tìm thấy refresh token")
    }

    try {
      const apiBaseUrl = await this.getApiBaseUrl()
      const response = await fetch(`${apiBaseUrl}/api/mobile/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      const result: LoginResponse | ApiError = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Refresh token thất bại")
      }

      if (!result.success || !result.data) {
        throw new Error("Phản hồi không hợp lệ từ server")
      }

      const { access_token, refresh_token: newRefreshToken } = result.data as any

      // Save new tokens
      await AsyncStorage.setItem("authToken", access_token || result.data.token)
      await AsyncStorage.setItem("refreshToken", newRefreshToken)

      return {
        token: access_token || result.data.token,
        refreshToken: newRefreshToken,
      }
    } catch (error: any) {
      // If refresh fails, clear tokens
      await AsyncStorage.removeItem("authToken")
      await AsyncStorage.removeItem("refreshToken")
      throw error
    }
  }

  async logout(): Promise<void> {
    // Clear tokens from AsyncStorage
    await AsyncStorage.removeItem("authToken")
    await AsyncStorage.removeItem("refreshToken")
    await AsyncStorage.removeItem("userData")
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const apiBaseUrl = await this.getApiBaseUrl()
      console.log(`[AuthService] Requesting OTP for email: ${email}`)
      
      const response = await this.fetchWithTimeout(
        `${apiBaseUrl}/api/mobile/v1/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        },
        15000
      )

      const result: LoginResponse | ApiError = await response.json()
      console.log(`[AuthService] Forgot password response: ${response.status}, success: ${result.success}`)

      if (!response.ok || !result.success) {
        const errorMessage = result.message || "Không thể gửi mã OTP"
        throw new Error(errorMessage)
      }
    } catch (error: any) {
      console.error(`[AuthService] Forgot password error:`, error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error(error.message || "Không thể gửi mã OTP. Vui lòng thử lại sau.")
    }
  }

  async verifyOTP(email: string, otp: string): Promise<void> {
    try {
      const apiBaseUrl = await this.getApiBaseUrl()
      const cleanEmail = (email || "").trim().toLowerCase()
      const cleanOtp = String((otp || "")).replace(/\s/g, "")
      console.log(`[AuthService] Verifying OTP for email: ${cleanEmail}, otpLen: ${cleanOtp.length}`)
      
      const response = await this.fetchWithTimeout(
        `${apiBaseUrl}/api/mobile/v1/auth/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: cleanEmail, otp: cleanOtp }),
        },
        15000
      )

      const result: LoginResponse | ApiError = await response.json()
      console.log(`[AuthService] Verify OTP response: ${response.status}, success: ${result.success}`)

      if (!response.ok || !result.success) {
        const errorMessage = result.message || "Mã OTP không hợp lệ"
        throw new Error(errorMessage)
      }
    } catch (error: any) {
      console.error(`[AuthService] Verify OTP error:`, error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error(error.message || "Không thể xác minh mã OTP. Vui lòng thử lại sau.")
    }
  }

  async resetPassword(email: string, otp: string, newPassword: string, confirmPassword: string): Promise<void> {
    try {
      const apiBaseUrl = await this.getApiBaseUrl()
      console.log(`[AuthService] Resetting password for email: ${email}`)
      
      const response = await this.fetchWithTimeout(
        `${apiBaseUrl}/api/mobile/v1/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, otp, new_password: newPassword, confirm_password: confirmPassword }),
        },
        15000
      )

      const result: LoginResponse | ApiError = await response.json()
      console.log(`[AuthService] Reset password response: ${response.status}, success: ${result.success}`)

      if (!response.ok || !result.success) {
        const errorMessage = result.message || "Không thể đặt lại mật khẩu"
        throw new Error(errorMessage)
      }
    } catch (error: any) {
      console.error(`[AuthService] Reset password error:`, error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error(error.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại sau.")
    }
  }
}

export const authService = new AuthService()
