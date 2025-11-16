import React from "react"
import { View, ScrollView, StyleSheet } from "react-native"
import { Card, Text, IconButton } from "react-native-paper"
import { useNavigation } from "@react-navigation/native"
import HeaderBar from "../../components/HeaderBar"
import { theme, spacing, borderRadius, shadows } from "../../styles/theme"
import { getShippingStatusConfig } from "../constants/shippingStatus"
import type { ShippingStatus } from "../../lib/types"

const FLOW: ShippingStatus[] = [
	"new_request",
	"accepted",
	"picked_up",
	"delivering",
	"arrived",
	"delivered",
	"completed",
]

export default function ShippingGuideScreen() {
	const navigation = useNavigation<any>()
	return (
		<View style={styles.container}>
			<HeaderBar title="Hướng dẫn giao hàng" onBack={() => navigation.goBack()} />
			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<Card style={styles.card}>
					<Card.Title
						title="Tiến trình giao hàng"
						left={(props) => (
							<IconButton
								{...props}
								icon="timeline-clock-outline"
								iconColor={theme.colors.primary}
							/>
						)}
					/>
					<Card.Content>
						{FLOW.map((status) => {
							const cfg = getShippingStatusConfig(status)
							return (
								<View key={status} style={styles.row}>
									<View style={[styles.iconWrap, { borderColor: cfg.color }]}>
										<IconButton icon={cfg.icon as any} size={18} iconColor={cfg.color} />
									</View>
									<View style={styles.texts}>
										<Text variant="titleSmall" style={[styles.title, { color: theme.colors.textPrimary }]}>
											{cfg.label}
										</Text>
										<Text variant="bodySmall" style={styles.desc}>
											{cfg.description}
										</Text>
									</View>
								</View>
							)
						})}
					</Card.Content>
				</Card>
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	content: {
		flex: 1,
	},
	card: {
		margin: spacing.lg,
		borderRadius: borderRadius.lg,
		backgroundColor: theme.colors.surface,
		...shadows.medium,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: spacing.sm,
	},
	iconWrap: {
		width: 36,
		height: 36,
		borderRadius: 18,
		borderWidth: 1.5,
		justifyContent: "center",
		alignItems: "center",
		marginRight: spacing.md,
	},
	texts: {
		flex: 1,
	},
	title: {
		fontWeight: "700",
	},
	desc: {
		color: theme.colors.textSecondary,
	},
})

