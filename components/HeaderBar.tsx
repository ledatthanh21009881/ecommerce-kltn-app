import type React from "react"
import { StyleSheet } from "react-native"
import { Appbar } from "react-native-paper"
import { theme, shadows } from "../styles/theme"

interface HeaderBarProps {
  title: string
  onBack?: () => void
  actions?: React.ReactNode
}

export default function HeaderBar({ title, onBack, actions }: HeaderBarProps) {
  return (
    <Appbar.Header style={styles.header}>
      {onBack && <Appbar.BackAction onPress={onBack} iconColor="white" />}
      <Appbar.Content 
        title={title} 
        titleStyle={styles.title}
        color="white"
      />
      {actions}
    </Appbar.Header>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.primary,
    ...shadows.medium,
  },
  title: {
    fontWeight: '600',
  },
})
