"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface NotificationBannerData {
  title: string
  message: string
  orderId?: number
  notificationId?: number
}

interface NotificationBannerContextType {
  bannerVisible: boolean
  bannerData: NotificationBannerData | null
  showBanner: (data: NotificationBannerData) => void
  hideBanner: () => void
}

const NotificationBannerContext = createContext<NotificationBannerContextType | undefined>(undefined)

export function NotificationBannerProvider({ children }: { children: ReactNode }) {
  const [bannerVisible, setBannerVisible] = useState(false)
  const [bannerData, setBannerData] = useState<NotificationBannerData | null>(null)

  const showBanner = useCallback((data: NotificationBannerData) => {
    console.log('[NotificationBanner] Showing banner:', data)
    setBannerData(data)
    setBannerVisible(true)
  }, [])

  const hideBanner = useCallback(() => {
    setBannerVisible(false)
    // Clear data after animation completes
    setTimeout(() => {
      setBannerData(null)
    }, 300)
  }, [])

  return (
    <NotificationBannerContext.Provider
      value={{
        bannerVisible,
        bannerData,
        showBanner,
        hideBanner,
      }}
    >
      {children}
    </NotificationBannerContext.Provider>
  )
}

export function useNotificationBanner() {
  const context = useContext(NotificationBannerContext)
  if (context === undefined) {
    throw new Error('useNotificationBanner must be used within NotificationBannerProvider')
  }
  return context
}

