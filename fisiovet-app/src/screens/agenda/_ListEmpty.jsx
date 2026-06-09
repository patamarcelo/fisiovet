// src/screens/agenda/_ListEmpty.jsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";

export function EmptyAgendaCard({
	title = "Nenhum evento encontrado",
	subtitle = "Ajuste os filtros ou adicione um novo evento.",
	actionLabel = "Adicionar evento",
	hasFilters = false,
	onClearFilters,
}) {
	const text = useThemeColor({}, "text");
	const subtle = useThemeColor({ light: "#6B7280", dark: "#9AA0A6" }, "text");
	const border = useThemeColor(
		{ light: "rgba(0,0,0,0.08)", dark: "rgba(255,255,255,0.12)" },
		"border"
	);

	return (
		<View style={styles.wrap}>
			<View style={[styles.card, { borderColor: border }]}>
				<View style={styles.iconWrap}>
					<Ionicons name="calendar-outline" size={26} color="#0A84FF" />
				</View>

				<Text style={[styles.title, { color: text }]}>{title}</Text>

				<Text style={[styles.sub, { color: subtle }]}>{subtitle}</Text>

				<View style={styles.actions}>
					{hasFilters && (
						<Pressable
							onPress={onClearFilters}
							style={({ pressed }) => [
								styles.secondaryBtn,
								pressed && { opacity: 0.82 },
							]}
							accessibilityRole="button"
							accessibilityLabel="Limpar filtros"
						>
							<Ionicons name="filter-outline" size={15} color="#0A84FF" />
							<Text style={styles.secondaryText}>Limpar filtros</Text>
						</Pressable>
					)}

					<Pressable
						onPress={() => router.push("/(modals)/agenda-new")}
						style={({ pressed }) => [
							styles.primaryBtn,
							pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
						]}
						accessibilityRole="button"
						accessibilityLabel="Adicionar evento"
					>
						<IconSymbol name="plus" size={14} color="#fff" />
						<Text style={styles.primaryText}>{actionLabel}</Text>
					</Pressable>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 16,
		paddingTop: 22,
		paddingBottom: 36,
	},

	card: {
		width: "100%",
		maxWidth: 430,
		borderWidth: 1,
		borderRadius: 20,
		paddingHorizontal: 18,
		paddingVertical: 22,
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 3,
	},

	iconWrap: {
		width: 60,
		height: 60,
		borderRadius: 30,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(10,132,255,0.10)",
		marginBottom: 12,
	},

	title: {
		fontSize: 17,
		fontWeight: "850",
		textAlign: "center",
	},

	sub: {
		fontSize: 13,
		textAlign: "center",
		lineHeight: 18,
		marginTop: 6,
		marginBottom: 14,
	},

	actions: {
		width: "100%",
		gap: 10,
	},

	primaryBtn: {
		height: 44,
		borderRadius: 14,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		backgroundColor: "#0A84FF",
	},

	primaryText: {
		color: "#FFFFFF",
		fontWeight: "850",
	},

	secondaryBtn: {
		height: 42,
		borderRadius: 14,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		backgroundColor: "rgba(10,132,255,0.08)",
		borderWidth: 1,
		borderColor: "rgba(10,132,255,0.18)",
	},

	secondaryText: {
		color: "#0A84FF",
		fontWeight: "800",
	},
});