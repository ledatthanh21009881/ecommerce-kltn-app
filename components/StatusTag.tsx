import { Chip } from "react-native-paper"
import type { Order } from "../lib/types"
import { theme, borderRadius } from "../styles/theme"

interface StatusTagProps {
  status: Order["status"]
}

export default function StatusTag({ status }: StatusTagProps) {
  const getStatusConfig = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return {
          label: "Chờ giao",
          backgroundColor: theme.colors.warningContainer,
          textColor: theme.colors.pending,
          icon: "clock-outline",
        }
      case "delivering":
        return {
          label: "Đang giao",
          backgroundColor: theme.colors.infoContainer,
          textColor: theme.colors.delivering,
          icon: "truck-delivery-outline",
        }
      case "completed":
        return {
          label: "Hoàn thành",
          backgroundColor: theme.colors.successContainer,
          textColor: theme.colors.completed,
          icon: "check-circle-outline",
        }
      case "cancelled":
        return {
          label: "Đã hủy",
          backgroundColor: theme.colors.errorContainer,
          textColor: theme.colors.cancelled,
          icon: "close-circle-outline",
        }
      default:
        return {
          label: "Không xác định",
          backgroundColor: theme.colors.surfaceVariant,
          textColor: theme.colors.textSecondary,
          icon: "help-circle-outline",
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Chip 
      icon={config.icon}
      style={{ 
        backgroundColor: config.backgroundColor,
        borderRadius: borderRadius.round,
      }} 
      textStyle={{ 
        color: config.textColor, 
        fontSize: 12,
        fontWeight: '600',
      }} 
      compact
    >
      {config.label}
    </Chip>
  )
}
