// components/subscription/LimitReachedModal.jsx
import React from "react";
import {
	Modal,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const LABELS = {
	tutores: {
		title: "Limite de tutores atingido",
		description:
			"No plano Free, você pode cadastrar até 3 tutores.",
	},
	pets: {
		title: "Limite de pets atingido",
		description:
			"No plano Free, você pode cadastrar até 6 pets.",
	},
	eventos: {
		title: "Limite de eventos atingido",
		description:
			"No plano Free, você pode cadastrar até 10 eventos na agenda.",
	},
};

export default function LimitReachedModal({
	visible,
	resource,
	current,
	limit,
	onClose,
}) {
	const copy = LABELS[resource] || {
		title: "Limite atingido",
		description: "Você atingiu o limite disponível no plano Free.",
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<View style={styles.card}>
					<View style={styles.iconCircle}>
						<Ionicons name="lock-closed-outline" size={28} color="#0A84FF" />
					</View>

					<Text style={styles.title}>{copy.title}</Text>

					<Text style={styles.description}>
						{copy.description}
					</Text>

					<View style={styles.usagePill}>
						<Text style={styles.usageText}>
							Uso atual: {current}/{limit}
						</Text>
					</View>

					<Text style={styles.helper}>
						Assine para liberar cadastros ilimitados e continuar usando o FisioVet sem travas.
					</Text>

					<Pressable
						onPress={() => {
							onClose?.();
							router.push("/(phone)/configuracoes/assinatura");
						}}
						style={({ pressed }) => [
							styles.primaryButton,
							pressed && { opacity: 0.88 },
						]}
					>
						<Text style={styles.primaryText}>Ver planos</Text>
					</Pressable>

					<Pressable
						onPress={onClose}
						style={({ pressed }) => [
							styles.secondaryButton,
							pressed && { opacity: 0.75 },
						]}
					>
						<Text style={styles.secondaryText}>Agora não</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.35)",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 20,
	},

	card: {
		width: "100%",
		maxWidth: 420,
		borderRadius: 24,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 20,
		paddingVertical: 22,
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 8 },
		elevation: 8,
	},

	iconCircle: {
		width: 62,
		height: 62,
		borderRadius: 31,
		backgroundColor: "rgba(10,132,255,0.10)",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 14,
	},

	title: {
		fontSize: 18,
		fontWeight: "850",
		color: "#111827",
		textAlign: "center",
	},

	description: {
		marginTop: 8,
		fontSize: 13,
		lineHeight: 19,
		color: "#6B7280",
		textAlign: "center",
	},

	usagePill: {
		marginTop: 14,
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 999,
		backgroundColor: "rgba(10,132,255,0.08)",
		borderWidth: 1,
		borderColor: "rgba(10,132,255,0.16)",
	},

	usageText: {
		fontSize: 12,
		fontWeight: "800",
		color: "#0A84FF",
	},

	helper: {
		marginTop: 12,
		fontSize: 12,
		lineHeight: 17,
		color: "#6B7280",
		textAlign: "center",
	},

	primaryButton: {
		marginTop: 18,
		width: "100%",
		height: 48,
		borderRadius: 16,
		backgroundColor: "#0A84FF",
		alignItems: "center",
		justifyContent: "center",
	},

	primaryText: {
		color: "#FFFFFF",
		fontSize: 15,
		fontWeight: "850",
	},

	secondaryButton: {
		marginTop: 10,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
	},

	secondaryText: {
		color: "#6B7280",
		fontSize: 14,
		fontWeight: "750",
	},
});