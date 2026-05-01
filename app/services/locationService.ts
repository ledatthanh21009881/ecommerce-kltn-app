"use client"

import * as Location from "expo-location"

class LocationService {
  private permissionRequested = false

  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync()
    this.permissionRequested = true
    return status === Location.PermissionStatus.GRANTED
  }

  async ensurePermission(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync()
    if (status === Location.PermissionStatus.GRANTED) {
      return true
    }
    return this.requestPermission()
  }

  async getCurrentPosition() {
    const hasPermission = await this.ensurePermission()
    if (!hasPermission) {
      throw new Error("Cần quyền truy cập vị trí để xác nhận trạng thái.")
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }
  }

  async getCurrentPositionWithMeta() {
    const hasPermission = await this.ensurePermission()
    if (!hasPermission) {
      throw new Error("Cần quyền truy cập vị trí để xác nhận trạng thái.")
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? undefined,
      heading: position.coords.heading ?? undefined,
      speed: position.coords.speed ?? undefined,
    }
  }
}

export const locationService = new LocationService()

