import { Component, type ReactNode } from "react"
import { View, StyleSheet } from "react-native"
import { Text, Button } from "react-native-paper"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text variant="headlineMedium" style={styles.title}>
            Ứng dụng gặp lỗi
          </Text>
          <Text variant="bodyMedium" style={styles.message}>
            Đã xảy ra lỗi không mong muốn. Vui lòng khởi động lại ứng dụng.
          </Text>
          <Button mode="contained" onPress={this.handleReset} style={styles.button}>
            Thử lại
          </Button>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
    gap: 16,
  },
  title: {
    color: "#F44336",
    fontWeight: "bold",
    textAlign: "center",
  },
  message: {
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
  },
})
