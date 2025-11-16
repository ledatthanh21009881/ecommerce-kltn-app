import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { apiClient } from './apiClient'
import { Notification } from '../../lib/types'

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

class NotificationService {
  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      return finalStatus === 'granted'
    } catch (error) {
      console.error('[NotificationService] Error requesting permissions:', error)
      return false
    }
  }

  /**
   * Get FCM token
   */
  async getFCMToken(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions()
      if (!hasPermission) {
        console.warn('[NotificationService] Notification permissions not granted')
        return null
      }

      // Read projectId from env/config if available; otherwise call without params
      const easProjectId =
        (process.env as any)?.EXPO_PUBLIC_EAS_PROJECT_ID ||
        (Constants as any)?.expoConfig?.extra?.eas?.projectId ||
        (Constants as any)?.easConfig?.projectId

      try {
        const token = easProjectId
          ? await Notifications.getExpoPushTokenAsync({ projectId: easProjectId })
          : await Notifications.getExpoPushTokenAsync()
        return token.data
      } catch (expoTokenError: any) {
        // Fallback for bare/dev-client without EAS projectId: use native device push token (FCM/APNs)
        console.warn('[NotificationService] getExpoPushTokenAsync failed, falling back to getDevicePushTokenAsync:', expoTokenError?.message || expoTokenError)
        const deviceToken = await Notifications.getDevicePushTokenAsync()
        // deviceToken = { type: 'fcm' | 'apns', data: string }
        if (deviceToken?.data && typeof deviceToken.data === 'string') {
          return deviceToken.data
        }
        throw expoTokenError
      }

    } catch (error) {
      console.error('[NotificationService] Error getting FCM token:', error)
      return null
    }
  }

  /**
   * Register FCM token with backend
   */
  async registerToken(token: string): Promise<boolean> {
    try {
      const response = await apiClient.post<{ success: boolean; message?: string }>(
        '/api/v1/shipper/fcm-token',
        { fcm_token: token }
      )

      if (response.success) {
        console.log('[NotificationService] FCM token registered successfully')
        return true
      }

      return false
    } catch (error: any) {
      console.error('[NotificationService] Error registering FCM token:', error)
      return false
    }
  }

  /**
   * Setup notification handlers
   */
  setupNotificationHandlers(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (notification: Notifications.NotificationResponse) => void
  ) {
    // Handle notifications received while app is in foreground
    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[NotificationService] Notification received:', notification)
      if (onNotificationReceived) {
        onNotificationReceived(notification)
      }
    })

    // Handle notification taps
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[NotificationService] Notification tapped:', response)
      if (onNotificationTapped) {
        onNotificationTapped(response)
      }
    })

    return {
      remove: () => {
        receivedListener.remove()
        responseListener.remove()
      },
    }
  }

  /**
   * Get unread notification count from backend
   */
  async getUnreadCount(): Promise<number> {
    try {
      // This endpoint needs to be created in backend
      // For now, we'll fetch notifications and count unread
      const response = await apiClient.get<{
        success: boolean
        data?: { unread_count?: number }
      }>('/api/v1/shipper/notifications/unread-count')

      if (response.success && response.data?.unread_count !== undefined) {
        return response.data.unread_count
      }

      return 0
    } catch (error) {
      console.error('[NotificationService] Error getting unread count:', error)
      return 0
    }
  }

  /**
   * Get notifications list
   */
  async getNotifications(params?: {
    page?: number
    limit?: number
    is_read?: boolean
  }): Promise<Notification[]> {
    try {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.is_read !== undefined) queryParams.append('is_read', params.is_read ? '1' : '0')

      const queryString = queryParams.toString()
      const endpoint = `/api/v1/shipper/notifications${queryString ? `?${queryString}` : ''}`

      const response = await apiClient.get<{
        success: boolean
        data?: Notification[] | { items: Notification[]; pagination: any }
      }>(endpoint)

      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          return response.data
        } else if (response.data.items) {
          return response.data.items
        }
      }

      return []
    } catch (error) {
      console.error('[NotificationService] Error getting notifications:', error)
      return []
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<boolean> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        `/api/v1/shipper/notifications/${notificationId}/read`
      )

      return response.success || false
    } catch (error) {
      console.error('[NotificationService] Error marking notification as read:', error)
      return false
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        '/api/v1/shipper/notifications/mark-all-read'
      )

      return response.success || false
    } catch (error) {
      console.error('[NotificationService] Error marking all as read:', error)
      return false
    }
  }

  /**
   * Get badge count (unread notifications)
   */
  async getBadgeCount(): Promise<number> {
    try {
      const count = await Notifications.getBadgeCountAsync()
      return count || 0
    } catch (error) {
      console.error('[NotificationService] Error getting badge count:', error)
      return 0
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count)
    } catch (error) {
      console.error('[NotificationService] Error setting badge count:', error)
    }
  }
}

export const notificationService = new NotificationService()

