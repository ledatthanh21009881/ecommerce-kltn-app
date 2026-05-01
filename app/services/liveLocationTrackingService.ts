import AsyncStorage from "@react-native-async-storage/async-storage"
import { apiClient } from "./apiClient"
import { locationService } from "./locationService"

type TrackingPayload = {
  order_id: string
  latitude: number
  longitude: number
  recorded_at: string
  accuracy?: number
  heading?: number
  speed?: number
}

// Send GPS location to backend more frequently (every ~5 seconds).
const TRACKING_INTERVAL_MS = 5000

class LiveLocationTrackingService {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private activeOrderId: string | null = null
  private isSending = false

  async startTracking(orderId: string) {
    if (!orderId) return

    if (this.activeOrderId === orderId && this.intervalId) {
      return
    }

    this.stopTracking()
    this.activeOrderId = orderId

    await this.sendCurrentLocation(orderId)

    this.intervalId = setInterval(() => {
      if (!this.activeOrderId) return
      void this.sendCurrentLocation(this.activeOrderId)
    }, TRACKING_INTERVAL_MS)
  }

  stopTracking(orderId?: string) {
    if (orderId && this.activeOrderId && this.activeOrderId !== orderId) {
      return
    }

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.activeOrderId = null
  }

  getActiveOrderId() {
    return this.activeOrderId
  }

  private async sendCurrentLocation(orderId: string) {
    if (this.isSending) return
    this.isSending = true

    try {
      const hasPermission = await locationService.ensurePermission()
      if (!hasPermission) {
        return
      }

      const position = await locationService.getCurrentPosition()
      const payload: TrackingPayload = {
        order_id: orderId,
        latitude: position.latitude,
        longitude: position.longitude,
        recorded_at: new Date().toISOString(),
      }

      await this.postLocation(payload)
    } catch (error) {
      console.warn("[LiveLocationTracking] Failed to send location:", error)
    } finally {
      this.isSending = false
    }
  }

  private async postLocation(payload: TrackingPayload) {
    try {
      await apiClient.post("/api/v1/shipper/location", payload)
      return
    } catch {
      // Fallback for existing backend route that needs shipper id in path.
    }

    const userRaw = await AsyncStorage.getItem("userData")
    if (!userRaw) {
      throw new Error("Missing user data for tracking fallback endpoint")
    }

    const user = JSON.parse(userRaw)
    const shipperId = user?.id ?? user?.user_id
    if (!shipperId) {
      throw new Error("Missing shipper id for tracking fallback endpoint")
    }

    await apiClient.post(`/api/backend/v1/shippers/${shipperId}/location`, payload)
  }
}

export const liveLocationTrackingService = new LiveLocationTrackingService()
