"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { authService } from "../services/authService"
import { notificationService } from "../services/notificationService"
import * as Notifications from "expo-notifications"
import type { DeliveryUser } from "../../lib/types"
import { useNotificationBanner } from "./NotificationBannerContext"

interface AuthContextType {
  user: DeliveryUser | null
  isLoading: boolean
  login: (phone: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DeliveryUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const notificationListener = useRef<{ remove: () => void } | null>(null)
  const responseListener = useRef<{ remove: () => void } | null>(null)
  const { showBanner } = useNotificationBanner()

  const setupNotificationHandlers = useCallback(() => {
    // Cleanup previous listeners
    if (notificationListener.current) {
      notificationListener.current.remove()
    }

    // Setup handlers for foreground and background notifications
    const handlers = notificationService.setupNotificationHandlers(
      (notification) => {
        // Notification received in foreground - show banner
        console.log('[AuthContext] Notification received:', notification)
        const data = notification.request.content.data || {}
        const title = notification.request.content.title || 'Thông báo mới'
        const body = notification.request.content.body || 'Bạn có đơn hàng mới'
        
        console.log('[AuthContext] Showing banner with data:', { title, body, orderId: data?.order_id })
        
        showBanner({
          title,
          message: body,
          orderId: data?.order_id,
          notificationId: data?.notification_id,
        })
      },
      (response) => {
        // Notification tapped
        console.log('[AuthContext] Notification tapped:', response)
        const data = response.notification.request.content.data
        if (data?.order_id) {
          // Navigate to order detail - this will be handled by navigation
          // Store order_id for navigation
          AsyncStorage.setItem('pendingNavigationOrderId', data.order_id.toString())
        }
      }
    )

    notificationListener.current = handlers
  }, [showBanner])

  useEffect(() => {
    initializeApp()
  }, [])

  useEffect(() => {
    // Setup notification handlers when user is logged in
    if (user) {
      setupNotificationHandlers()
    }

    // Cleanup on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove()
      }
      if (responseListener.current) {
        responseListener.current.remove()
      }
    }
  }, [user, setupNotificationHandlers])

  const initializeApp = async () => {
    try {
      // In dev mode, always clear cache and detect server IP on app startup
      // This ensures we use the latest IP (192.168.2.134) instead of cached old IP
      if (__DEV__) {
        const savedApiUrl = await AsyncStorage.getItem("apiBaseUrl")
        const currentIP = "http://192.168.2.134:8000"
        
        // If saved URL exists but is different from current IP, clear it
        if (savedApiUrl && savedApiUrl !== currentIP) {
          console.log("[AuthContext] Saved IP differs from current IP, clearing cache...")
          await authService.clearServerCache()
        }
        
        // Always detect server IP in dev mode to ensure we use the latest IP
        console.log("[AuthContext] Detecting server IP...")
        try {
          await authService.detectServerIP()
          console.log("[AuthContext] Server IP detected successfully")
        } catch (error) {
          console.log("[AuthContext] Server IP detection failed, will retry on login:", error)
          // Don't throw error, just log it - will retry on login
        }
      }
    } catch (error) {
      console.error("[AuthContext] Error during initialization:", error)
    } finally {
      // Continue with auth check
      await checkAuthState()
    }
  }

  const refreshToken = async () => {
    try {
      const { token, refreshToken: newRefreshToken } = await authService.refreshToken()
      
      // Get user data from AsyncStorage if available
      const userDataStr = await AsyncStorage.getItem("userData")
      if (userDataStr) {
        const userData = JSON.parse(userDataStr)
        setUser(userData)
      }
    } catch (error) {
      console.error("Token refresh failed:", error)
      // Clear tokens and user data on refresh failure
      await AsyncStorage.removeItem("authToken")
      await AsyncStorage.removeItem("refreshToken")
      await AsyncStorage.removeItem("userData")
      setUser(null)
      throw error
    }
  }

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken")
      if (token) {
        try {
          const userData = await authService.getCurrentUser()
          setUser(userData)
        } catch (error) {
          // If getCurrentUser fails, try to refresh token
          console.log("getCurrentUser failed, attempting token refresh...")
          try {
            await refreshToken()
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError)
            // Clear invalid tokens
            await AsyncStorage.removeItem("authToken")
            await AsyncStorage.removeItem("refreshToken")
            await AsyncStorage.removeItem("userData")
          }
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const registerFCMToken = async () => {
    try {
      // Request permissions
      const hasPermission = await notificationService.requestPermissions()
      if (!hasPermission) {
        console.warn('[AuthContext] Notification permissions not granted')
        return
      }

      // Get FCM token
      const token = await notificationService.getFCMToken()
      if (!token) {
        console.warn('[AuthContext] Failed to get FCM token')
        return
      }

      // Register token with backend
      const registered = await notificationService.registerToken(token)
      if (registered) {
        console.log('[AuthContext] FCM token registered successfully')
      } else {
        console.warn('[AuthContext] Failed to register FCM token with backend')
      }
    } catch (error) {
      console.error('[AuthContext] Error registering FCM token:', error)
    }
  }

  const login = async (phone: string, password: string) => {
    const { user: userData, token, refreshToken: refreshTokenValue } = await authService.login(phone, password)
    
    // Save user data to AsyncStorage for getCurrentUser
    await AsyncStorage.setItem("userData", JSON.stringify(userData))
    
    setUser(userData)

    // Register FCM token after successful login
    await registerFCMToken()
  }

  const logout = async () => {
    // Clear notification handlers
    if (notificationListener.current) {
      notificationListener.current.remove()
      notificationListener.current = null
    }
    if (responseListener.current) {
      responseListener.current.remove()
      responseListener.current = null
    }

    // Clear badge count
    await notificationService.setBadgeCount(0)

    await authService.logout()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, isLoading, login, logout, refreshToken }}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider")
  }
  return context
}
