import { useEffect } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { PaperProvider } from "react-native-paper"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { OrderProvider } from "./app/context/OrderContext"
import { AuthProvider } from "./app/context/AuthContext"
import { NotificationBannerProvider } from "./app/context/NotificationBannerContext"
import AppNavigator from "./app/navigation/AppNavigator"
import { loadNotificationSoundPrefs } from "./app/services/notificationSoundSettings"
import { theme } from "./styles/theme"
import ErrorBoundary from "./components/ErrorBoundary"

export default function App() {
  useEffect(() => {
    void loadNotificationSoundPrefs()
  }, [])

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NotificationBannerProvider>
            <AuthProvider>
              <OrderProvider>
                <NavigationContainer>
                  <AppNavigator />
                  <StatusBar style="light" />
                </NavigationContainer>
              </OrderProvider>
            </AuthProvider>
          </NotificationBannerProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
