import { useEffect } from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createStackNavigator } from "@react-navigation/stack"
import * as SplashScreen from "expo-splash-screen"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useAuthContext } from "../context/AuthContext"
import { useNotificationBanner } from "../context/NotificationBannerContext"
import TopBannerNotification from "../../components/TopBannerNotification"
import { theme } from "../../styles/theme"

// Screens
import LoginScreen from "../screens/LoginScreen"
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen"
import VerifyOTPScreen from "../screens/VerifyOTPScreen"
import ResetPasswordScreen from "../screens/ResetPasswordScreen"
import HomeScreen from "../screens/HomeScreen"
import OrderListScreen from "../screens/OrderListScreen"
import OrderDetailScreen from "../screens/OrderDetailScreen"
import CameraScreen from "../screens/CameraScreen"
import ProfileScreen from "../screens/ProfileScreen"
import LoadingScreen from "../screens/LoadingScreen"
import NotificationScreen from "../screens/NotificationScreen"
import ShippingGuideScreen from "../screens/ShippingGuideScreen"
import ChatDetailScreen from "../screens/ChatDetailScreen"
import DeliveryHistoryScreen from "../screens/DeliveryHistoryScreen"
import NotificationSettingsScreen from "../screens/NotificationSettingsScreen"

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

function OrderStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrderList" component={OrderListScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
    </Stack.Navigator>
  )
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="Notification" component={NotificationScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
    </Stack.Navigator>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string

          switch (route.name) {
            case "Đơn hàng":
              iconName = focused ? "home" : "home-outline"
              break
            case "Đang làm":
              iconName = focused ? "truck-delivery" : "truck-delivery-outline"
              break
            case "Tài khoản":
              iconName = focused ? "account" : "account-outline"
              break
            default:
              iconName = "circle"
          }

          return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Đơn hàng" component={HomeStack} />
      <Tab.Screen
        name="Đang làm"
        component={OrderStack}
        initialParams={{ filter: "delivering" }}
        listeners={({ navigation }) => ({
          /**
           * Tab đã focus nhưng stack đang ở ChatDetail / chi tiết… — bấm lại «Đang làm» để về danh sách đơn.
           * Không reset khi chuyển từ tab khác sang (preserve stack).
           */
          tabPress: (e) => {
            const tabState = navigation.getState()
            if (!tabState?.routes || typeof tabState.index !== "number") return

            const currentTab = tabState.routes[tabState.index]
            if (currentTab?.name !== "Đang làm") return

            const nested = currentTab.state as { index?: number } | undefined
            const stackIdx = nested?.index ?? 0
            if (stackIdx <= 0) return

            e.preventDefault()
            navigation.navigate({
              name: "Đang làm",
              merge: true,
              params: {
                screen: "OrderList",
                params: { filter: "delivering" },
              },
            } as never)
          },
        })}
      />
      <Tab.Screen name="Tài khoản" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const { user, isLoading } = useAuthContext()
  const { bannerVisible, bannerData, hideBanner } = useNotificationBanner()
  const navigation = useNavigation<any>()

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync()
    }
  }, [isLoading])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="ShippingGuide" component={ShippingGuideScreen} />
            <Stack.Screen name="DeliveryHistory" component={DeliveryHistoryScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="VerifyOTPScreen" component={VerifyOTPScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
      {user && (
        <TopBannerNotification
          visible={bannerVisible}
          title={bannerData?.title || ''}
          message={bannerData?.message || ''}
          orderId={bannerData?.orderId}
          onPress={() => {
            if (bannerData?.chatNavigation) {
              const c = bannerData.chatNavigation
              navigation.navigate("Main", {
                screen: "Đang làm",
                params: {
                  screen: "ChatDetail",
                  params: {
                    conversationId: c.conversationId,
                    title: c.title,
                    customerUserId: c.customerUserId,
                    shipperUserId: c.shipperUserId,
                    orderNumericId: c.orderNumericId,
                    orderId: c.orderId,
                    orderLabel: c.orderLabel,
                  },
                },
              })
            } else if (bannerData?.orderId != null) {
              navigation.navigate("Main", {
                screen: "Đơn hàng",
                params: {
                  screen: "OrderDetail",
                  params: { orderId: String(bannerData.orderId) },
                },
              })
            }
          }}
          onDismiss={hideBanner}
          autoHideDuration={12000}
        />
      )}
    </>
  )
}
