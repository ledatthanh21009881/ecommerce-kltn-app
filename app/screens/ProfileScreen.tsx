import { useState, useCallback } from "react"
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, RefreshControl } from "react-native"
import { Text, Card, Button, Avatar, Divider, Portal, Dialog } from "react-native-paper"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useFocusEffect, useNavigation } from "@react-navigation/native"
import { useAuthContext } from "../context/AuthContext"
import { useOrderContext } from "../context/OrderContext"
import InfoRow from "../../components/InfoRow"
import HeaderBar from "../../components/HeaderBar"
import LoadingOverlay from "../../components/LoadingOverlay"
import { theme, spacing, borderRadius } from "../../styles/theme"

export default function ProfileScreen() {
  const { user, logout, isLoading: authLoading, refreshToken } = useAuthContext()
  const { orders, loading: ordersLoading, refreshOrders, shippingTotals, refreshShippingTotals } = useOrderContext()
  const navigation = useNavigation<any>()
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refreshOrders(), refreshShippingTotals()])
      try {
        await refreshToken()
      } catch {
        /* optional */
      }
    } finally {
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      void refreshShippingTotals()
    }, [refreshShippingTotals]),
  )

  const completedToday = orders.filter((order) => {
    const today = new Date().toDateString()
    const orderDate = new Date(order.createdAt).toDateString()
    return order.status === "completed" && orderDate === today
  })

  const openLogoutDialog = () => setLogoutDialogVisible(true)

  const closeLogoutDialog = () => {
    if (logoutLoading) return
    setLogoutDialogVisible(false)
  }

  const confirmLogout = async () => {
    setLogoutLoading(true)
    try {
      await logout()
      setLogoutDialogVisible(false)
    } catch {
      Alert.alert("Lỗi", "Không thể đăng xuất. Vui lòng thử lại.")
    } finally {
      setLogoutLoading(false)
    }
  }

  if (authLoading || ordersLoading) {
    return <LoadingOverlay message="Đang tải thông tin..." />
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text>Không tìm thấy thông tin người dùng</Text>
      </View>
    )
  }

  /** Tổng đơn shipping_status completed theo API (pagination), không phụ thuộc total_delivered lúc login */
  const totalCompletedShipments =
    typeof shippingTotals?.byStatus.completed === "number"
      ? shippingTotals.byStatus.completed
      : user.totalDeliveries

  return (
    <View style={styles.container}>
      <HeaderBar title="Hồ sơ cá nhân" />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            {user.avatar ? (
              <Avatar.Image size={80} source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <Avatar.Text size={80} label={user.name.charAt(0)} style={styles.avatar} />
            )}
            <Text variant="headlineSmall" style={styles.userName}>
              {user.name}
            </Text>
            <Text variant="bodyMedium" style={styles.userPhone}>
              {user.phone}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Thông tin cá nhân" />
          <Card.Content>
            <InfoRow icon="account" label="Tên đầy đủ" value={user.name} />
            <InfoRow icon="phone" label="Số điện thoại" value={user.phone} />
            <InfoRow
              icon="calendar"
              label="Ngày tham gia"
              value={new Date(user.joinDate).toLocaleDateString("vi-VN")}
            />
            <InfoRow icon="email" label="Email" value={user.email || "Chưa cập nhật"} />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Thống kê giao hàng" />
          <Card.Content>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={[styles.statNumber, { color: "#4CAF50" }]}>
                  {totalCompletedShipments.toLocaleString("vi-VN")}
                </Text>
                <Text variant="bodyMedium" style={styles.statLabel}>
                  Tổng đơn đã giao
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={[styles.statNumber, { color: "#2196F3" }]}>
                  {completedToday.length}
                </Text>
                <Text variant="bodyMedium" style={styles.statLabel}>
                  Hoàn thành hôm nay
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <InfoRow icon="chart-line" label="Tỷ lệ thành công" value="98.5%" />
            <InfoRow icon="star" label="Đánh giá trung bình" value="4.8/5.0" />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title
            title="Lịch sử"
            titleStyle={styles.cardTitle}
            left={(props) => <MaterialCommunityIcons {...props} name="history" size={24} color={theme.colors.primary} />}
          />
          <Card.Content style={styles.settingsContent}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate("DeliveryHistory" as never)}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <MaterialCommunityIcons name="clipboard-text-clock-outline" size={20} color={theme.colors.secondary} />
                </View>
                <Text style={styles.settingItemText}>Lịch sử giao hàng</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title 
            title="Cài đặt" 
            titleStyle={styles.cardTitle}
            left={(props) => <MaterialCommunityIcons {...props} name="cog" size={24} color={theme.colors.primary} />}
          />
          <Card.Content style={styles.settingsContent}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate("NotificationSettings" as never)}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                  <MaterialCommunityIcons name="bell-outline" size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.settingItemText}>Cài đặt thông báo</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <Divider style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate("ShippingGuide" as never)}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.infoContainer }]}>
                  <MaterialCommunityIcons name="timeline-clock-outline" size={20} color={theme.colors.info} />
                </View>
                <Text style={styles.settingItemText}>Tiến trình giao hàng</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <Divider style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() =>
                navigation.navigate("Main", {
                  screen: "Đang làm",
                  params: {
                    screen: "ChatDetail",
                    params: {
                      title: "Hỗ trợ — Admin",
                      supportWithAdmin: true,
                    },
                  },
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.infoContainer }]}>
                  <MaterialCommunityIcons name="help-circle-outline" size={20} color={theme.colors.info} />
                </View>
                <Text style={styles.settingItemText}>Hỗ trợ</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <Divider style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => Alert.alert("Thông tin", "Phiên bản 1.0.0")}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <MaterialCommunityIcons name="information-outline" size={20} color={theme.colors.secondary} />
                </View>
                <Text style={styles.settingItemText}>Về ứng dụng</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </Card.Content>
        </Card>

        <View style={styles.logoutContainer}>
          <Button
            mode="contained"
            icon="logout"
            onPress={openLogoutDialog}
            style={styles.logoutButton}
            buttonColor="#F44336"
          >
            Đăng xuất
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={logoutDialogVisible}
          onDismiss={closeLogoutDialog}
          dismissable={!logoutLoading}
          style={styles.confirmDialog}
        >
          <Dialog.Icon icon="logout" color={theme.colors.primary} />
          <Dialog.Title style={styles.confirmDialogTitle}>Đăng xuất</Dialog.Title>
          <Dialog.Content style={styles.confirmDialogContent}>
            <Text variant="bodyLarge" style={styles.confirmDialogMessage}>
              Bạn có chắc chắn muốn đăng xuất?
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.confirmDialogActions}>
            <Button onPress={closeLogoutDialog} disabled={logoutLoading}>
              Hủy
            </Button>
            <Button
              mode="contained"
              buttonColor="#F44336"
              textColor="#fff"
              onPress={() => void confirmLogout()}
              loading={logoutLoading}
            >
              Đăng xuất
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  confirmDialog: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
  },
  confirmDialogTitle: {
    fontWeight: "700",
    paddingTop: 0,
  },
  confirmDialogContent: {
    paddingTop: 0,
  },
  confirmDialogMessage: {
    color: theme.colors.onSurface,
    lineHeight: 24,
  },
  confirmDialogActions: {
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    margin: 16,
    marginTop: 16,
    elevation: 4,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  },
  profileContent: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatar: {
    marginBottom: 12,
  },
  userName: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  userPhone: {
    color: "#666",
  },
  card: {
    margin: 16,
    marginTop: 0,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.onSurface,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontWeight: "bold",
  },
  statLabel: {
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  settingsContent: {
    paddingVertical: spacing.xs,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  settingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  settingItemText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    fontWeight: "500",
  },
  settingDivider: {
    marginLeft: 56, // Align with text (icon width + margin)
    marginVertical: 0,
  },
  logoutContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  logoutButton: {
    paddingVertical: 8,
  },
})
