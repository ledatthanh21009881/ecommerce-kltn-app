import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createStackNavigator } from "@react-navigation/stack"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useAuthContext } from "../context/AuthContext"
import { useNotificationBanner } from "../context/NotificationBannerContext"
import TopBannerNotification from "../../components/TopBannerNotification"

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

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

function OrderStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrderList" component={OrderListScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Camera" component={CameraScreen} />
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
            case "Đã giao":
              iconName = focused ? "check-circle" : "check-circle-outline"
              break
            case "Tài khoản":
              iconName = focused ? "account" : "account-outline"
              break
            default:
              iconName = "circle"
          }

          return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />
        },
        tabBarActiveTintColor: "#2196F3",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Đơn hàng" component={HomeStack} />
      <Tab.Screen name="Đang làm" children={() => <OrderStack />} initialParams={{ filter: "delivering" }} />
      <Tab.Screen name="Đã giao" children={() => <OrderStack />} initialParams={{ filter: "completed" }} />
      <Tab.Screen name="Tài khoản" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const { user, isLoading } = useAuthContext()
  const { bannerVisible, bannerData, hideBanner } = useNotificationBanner()
  const navigation = useNavigation<any>()

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
            if (bannerData?.orderId) {
              navigation.navigate('Main', {
                screen: 'Đơn hàng',
                params: {
                  screen: 'OrderDetail',
                  params: { orderId: bannerData.orderId },
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
