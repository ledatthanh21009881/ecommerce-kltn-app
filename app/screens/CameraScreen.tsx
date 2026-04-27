"use client"

import { useState, useRef, useEffect } from "react"
import { View, StyleSheet, Alert, Image, Platform } from "react-native"
import { Text, Button, IconButton } from "react-native-paper"
import { Camera, CameraView } from "expo-camera"
import { useNavigation, useRoute } from "@react-navigation/native"
import { useOrderContext } from "../context/OrderContext"
import HeaderBar from "../../components/HeaderBar"
import LoadingOverlay from "../../components/LoadingOverlay"

export default function CameraScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { pickupOrder, deliverOrder, completeOrder, fetchOrderById } = useOrderContext()

  const { orderId, action = "deliver" } = route.params as { orderId: string; action?: "pickup" | "deliver" }
  const [type, setType] = useState<"front" | "back">("back")
  const [permission, setPermission] = useState<boolean | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const cameraRef = useRef<CameraView>(null)

  useEffect(() => {
    requestCameraPermission()
  }, [])

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync()
      setPermission(status === 'granted')
    } catch (error) {
      console.error('Camera permission error:', error)
      setPermission(false)
    }
  }

  const handleGoBack = () => {
    if (navigation && navigation.goBack) {
      navigation.goBack()
    }
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync()
        setPhoto(photo.uri)
      } catch (error) {
        Alert.alert("Lỗi", "Không thể chụp ảnh. Vui lòng thử lại.")
      }
    }
  }

  const retakePicture = () => {
    setPhoto(null)
  }

  const handleConfirm = async () => {
    if (!photo) {
      Alert.alert("Lỗi", "Vui lòng chụp ảnh xác nhận")
      return
    }

    const showSuccessAndGoBack = (title: string, message: string) => {
      // Web đôi khi không chạy ổn định callback onPress của Alert.
      if (Platform.OS === "web") {
        Alert.alert(title, message)
        setTimeout(() => {
          handleGoBack()
        }, 120)
        return
      }
      Alert.alert(title, message, [{ text: "OK", onPress: handleGoBack }])
    }

    setLoading(true)
    try {
      if (action === "pickup") {
        await pickupOrder(orderId, photo)
        showSuccessAndGoBack("Thành công", "Đã xác nhận lấy hàng thành công")
      } else {
        // Giao hàng: chụp ảnh + vị trí
        await deliverOrder(orderId, photo)
        await fetchOrderById(orderId)
        // Không auto-complete ở đây để tránh kẹt luồng khi backend/web chặn request tiếp theo.
        showSuccessAndGoBack(
          "Đã giao xong",
          "Ảnh đã gửi thành công. Quay lại chi tiết đơn để vuốt hoàn tất.",
        )
      }
    } catch (error: any) {
      const message =
        typeof error?.message === "string" && error.message.trim()
          ? error.message
          : "Không thể cập nhật trạng thái đơn hàng. Vui lòng thử lại."
      Alert.alert("Lỗi", message)
    } finally {
      setLoading(false)
    }
  }

  const toggleCameraType = () => {
    setType((current) => (current === "back" ? "front" : "back"))
  }

  if (loading) {
    return (
      <LoadingOverlay
        message={action === "pickup" ? "Đang xác nhận lấy hàng..." : "Đang xác nhận giao hàng..."}
      />
    )
  }

  if (permission === null) {
    return <LoadingOverlay message="Đang kiểm tra quyền camera..." />
  }

  if (permission === false) {
    return (
      <View style={styles.container}>
        <HeaderBar
          title={action === "pickup" ? "Chụp ảnh lấy hàng" : "Chụp ảnh giao hàng"}
          onBack={handleGoBack}
        />
        <View style={styles.permissionContainer}>
          <Text style={styles.message}>Cần quyền truy cập camera để chụp ảnh xác nhận</Text>
          <Button mode="contained" onPress={requestCameraPermission}>
            Cấp quyền camera
          </Button>
        </View>
      </View>
    )
  }

  if (photo) {
    return (
      <View style={styles.container}>
        <HeaderBar
          title={action === "pickup" ? "Xác nhận ảnh lấy hàng" : "Xác nhận ảnh giao hàng"}
          onBack={handleGoBack}
        />
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo }} style={styles.preview} />
          <View style={styles.previewActions}>
            <Button mode="outlined" onPress={retakePicture} style={styles.actionButton}>
              Chụp lại
            </Button>
            <Button mode="contained" onPress={handleConfirm} style={styles.actionButton}>
              {action === "pickup" ? "Xác nhận lấy hàng" : "Xác nhận giao hàng"}
            </Button>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <HeaderBar
        title={action === "pickup" ? "Chụp ảnh lấy hàng" : "Chụp ảnh giao hàng"}
        onBack={handleGoBack}
      />
      <View style={styles.cameraWrapper}>
        <CameraView style={styles.camera} facing={type} ref={cameraRef} />
        <View style={styles.cameraOverlay}>
          <View style={styles.topControls}>
            <IconButton icon="camera-flip" size={30} iconColor="white" onPress={toggleCameraType} />
          </View>

          <View style={styles.bottomControls}>
            <View style={styles.captureButtonContainer}>
              <IconButton
                icon="camera"
                size={60}
                iconColor="white"
                style={styles.captureButton}
                onPress={takePicture}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  message: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  cameraWrapper: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    justifyContent: "space-between",
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 20,
    paddingTop: 40,
  },
  bottomControls: {
    padding: 20,
    paddingBottom: 40,
  },
  captureButtonContainer: {
    alignItems: "center",
  },
  captureButton: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 50,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  preview: {
    flex: 1,
    resizeMode: "contain",
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    backgroundColor: "white",
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 10,
  },
})
