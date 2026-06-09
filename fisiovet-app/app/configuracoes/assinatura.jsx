// app/(phone)/configuracoes/assinatura.jsx
import React, { useLayoutEffect } from "react";
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { useSelector } from "react-redux";

import {
	selectCurrentLimits,
	selectCurrentPlan,
	selectSubscriptionEnabled,
} from "@/src/store/slices/subscriptionSlice";

import {
	getUsageFromState,
	getUsagePercent,
} from "@/src/utils/subscriptionLimits";

const COLORS = {
	bg: "#F5F5F7",
	card: "#FFFFFF",
	text: "#111827",
	subtle: "#6B7280",
	border: "rgba(15,23,42,0.08)",
	blue: "#0A84FF",
	green: "#16A34A",
	orange: "#F59E0B",
};

function UsageRow({ label, current, limit }) {
	const percent = getUsagePercent(current, limit);
	const reached = limit != null && current >= limit;

	return (
		<View style={styles.usageRow}>
			<View style={styles.usageTop}>
				<Text style={styles.usageLabel}>{label}</Text>
				<Text style={[styles.usageCount, reached && { color: "#EF4444" }]}>
					{current}/{limit ?? "∞"}
				</Text>
			</View>

			<View style={styles.progressTrack}>
				<View
					style={[
						styles.progressFill,
						{
							width: `${limit == null ? 100 : percent}%`,
							backgroundColor: reached ? "#EF4444" : COLORS.blue,
						},
					]}
				/>
			</View>
		</View>
	);
}

function PlanCard({
	title,
	price,
	subtitle,
	features,
	badge,
	highlight,
	disabled,
}) {
	return (
		<View
			style={[
				styles.planCard,
				highlight && styles.planCardHighlight,
			]}
		>
			<View style={styles.planHeader}>
				<View style={{ flex: 1, minWidth: 0 }}>
					<View style={styles.planTitleRow}>
						<Text style={styles.planTitle}>{title}</Text>
						{!!badge && (
							<View style={styles.badge}>
								<Text style={styles.badgeText}>{badge}</Text>
							</View>
						)}
					</View>

					<Text style={styles.planSubtitle}>{subtitle}</Text>
				</View>

				<Text style={styles.planPrice}>{price}</Text>
			</View>

			<View style={styles.features}>
				{features.map((item) => (
					<View key={item} style={styles.featureRow}>
						<Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
						<Text style={styles.featureText}>{item}</Text>
					</View>
				))}
			</View>

			<Pressable
				disabled={disabled}
				style={({ pressed }) => [
					styles.planButton,
					highlight && styles.planButtonHighlight,
					disabled && styles.planButtonDisabled,
					pressed && !disabled && { opacity: 0.88 },
				]}
			>
				<Text
					style={[
						styles.planButtonText,
						highlight && styles.planButtonTextHighlight,
						disabled && !highlight && styles.planButtonTextDisabled,
					]}
				>
					{disabled ? "Em breve" : "Assinar"}
				</Text>
			</Pressable>
		</View>
	);
}

export default function AssinaturaScreen() {
	const navigation = useNavigation();
	const insets = useSafeAreaInsets();

	const enabled = useSelector(selectSubscriptionEnabled);
	const plan = useSelector(selectCurrentPlan);
	const limits = useSelector(selectCurrentLimits);
	const usage = useSelector((state) => getUsageFromState(state));

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: true,
			headerTitle: "Assinatura",
			headerLargeTitle: false,
			headerShadowVisible: false,
		});
	}, [navigation]);

	return (
		<SafeAreaView style={styles.safe} edges={["left", "right"]}>
			<ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingBottom: 28 + Math.max(insets.bottom, 0) },
				]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.hero}>
					<View style={styles.heroIcon}>
						<Ionicons name="sparkles-outline" size={28} color={COLORS.blue} />
					</View>

					<Text style={styles.heroTitle}>Planos FisioVet</Text>

					<Text style={styles.heroSubtitle}>
						Organize tutores, pets e agenda com uma experiência simples para fisioterapia veterinária.
					</Text>

					<View style={styles.statusPill}>
						<Ionicons
							name={enabled ? "lock-open-outline" : "construct-outline"}
							size={14}
							color={enabled ? COLORS.green : COLORS.orange}
						/>
						<Text
							style={[
								styles.statusPillText,
								{ color: enabled ? COLORS.green : COLORS.orange },
							]}
						>
							{enabled ? "Assinaturas ativas" : "Modo pré-lançamento"}
						</Text>
					</View>
				</View>

				<View style={styles.currentCard}>
					<View style={styles.currentHeader}>
						<View>
							<Text style={styles.sectionOverline}>Plano atual</Text>
							<Text style={styles.currentPlan}>
								{plan === "free" ? "Free" : "Premium"}
							</Text>
						</View>

						<View style={styles.freeBadge}>
							<Text style={styles.freeBadgeText}>
								{plan === "free" ? "Grátis" : "Ativo"}
							</Text>
						</View>
					</View>

					<Text style={styles.currentDescription}>
						No plano Free, o app permite testar o fluxo principal com limites controlados.
					</Text>

					<View style={styles.usageBlock}>
						<UsageRow
							label="Tutores"
							current={usage.tutores}
							limit={limits.tutores}
						/>
						<UsageRow
							label="Pets"
							current={usage.pets}
							limit={limits.pets}
						/>
						<UsageRow
							label="Eventos"
							current={usage.eventos}
							limit={limits.eventos}
						/>
					</View>
				</View>

				<Text style={styles.sectionTitle}>Planos disponíveis</Text>

				<PlanCard
					title="Free"
					price="R$ 0"
					subtitle="Para testar o app no dia a dia."
					features={[
						"Até 3 tutores",
						"Até 6 pets",
						"Até 10 eventos",
						"Agenda e cadastros básicos",
					]}
					disabled
				/>

				<PlanCard
					title="Mensal"
					price="R$ 19,90/mês"
					subtitle="Para uso contínuo no consultório."
					badge="Popular"
					highlight
					features={[
						"Tutores ilimitados",
						"Pets ilimitados",
						"Eventos ilimitados",
						"Biblioteca e histórico do paciente",
						"Novos recursos premium",
					]}
					disabled
				/>

				<PlanCard
					title="Anual"
					price="R$ 149,90/ano"
					subtitle="Melhor custo-benefício."
					badge="Economize"
					features={[
						"Tudo do plano mensal",
						"Pagamento anual com desconto",
						"Prioridade em melhorias futuras",
					]}
					disabled
				/>

				<View style={styles.noteCard}>
					<Ionicons name="information-circle-outline" size={18} color={COLORS.blue} />
					<Text style={styles.noteText}>
						Esta tela já está preparada para assinatura, mas a cobrança ainda está desativada nesta versão.
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
		backgroundColor: COLORS.bg,
	},

	content: {
		paddingHorizontal: 16,
		paddingTop: 14,
		gap: 14,
	},

	hero: {
		backgroundColor: COLORS.card,
		borderRadius: 24,
		borderWidth: 1,
		borderColor: COLORS.border,
		padding: 20,
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.07,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 3,
	},

	heroIcon: {
		width: 62,
		height: 62,
		borderRadius: 31,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(10,132,255,0.10)",
		marginBottom: 12,
	},

	heroTitle: {
		fontSize: 22,
		fontWeight: "800",
		color: COLORS.text,
		letterSpacing: -0.4,
	},

	heroSubtitle: {
		marginTop: 8,
		fontSize: 13,
		lineHeight: 19,
		color: COLORS.subtle,
		textAlign: "center",
	},

	statusPill: {
		marginTop: 14,
		paddingHorizontal: 11,
		paddingVertical: 7,
		borderRadius: 999,
		backgroundColor: "rgba(245,158,11,0.10)",
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},

	statusPillText: {
		fontSize: 12,
		fontWeight: "800",
	},

	currentCard: {
		backgroundColor: COLORS.card,
		borderRadius: 22,
		borderWidth: 1,
		borderColor: COLORS.border,
		padding: 16,
	},

	currentHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},

	sectionOverline: {
		fontSize: 11,
		fontWeight: "800",
		color: COLORS.subtle,
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},

	currentPlan: {
		marginTop: 2,
		fontSize: 20,
		fontWeight: "800",
		color: COLORS.text,
	},

	freeBadge: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: "rgba(10,132,255,0.10)",
	},

	freeBadgeText: {
		fontSize: 12,
		fontWeight: "700",
		color: COLORS.blue,
	},

	currentDescription: {
		marginTop: 10,
		fontSize: 13,
		lineHeight: 18,
		color: COLORS.subtle,
	},

	usageBlock: {
		marginTop: 14,
		gap: 12,
	},

	usageRow: {
		gap: 7,
	},

	usageTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},

	usageLabel: {
		fontSize: 13,
		fontWeight: "700",
		color: COLORS.text,
	},

	usageCount: {
		fontSize: 12,
		fontWeight: "800",
		color: COLORS.subtle,
	},

	progressTrack: {
		height: 7,
		borderRadius: 999,
		backgroundColor: "rgba(118,118,128,0.14)",
		overflow: "hidden",
	},

	progressFill: {
		height: "100%",
		borderRadius: 999,
	},

	sectionTitle: {
		marginTop: 4,
		marginHorizontal: 2,
		fontSize: 13,
		fontWeight: "800",
		color: COLORS.subtle,
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},

	planCard: {
		backgroundColor: COLORS.card,
		borderRadius: 22,
		borderWidth: 1,
		borderColor: COLORS.border,
		padding: 16,
	},

	planCardHighlight: {
		borderColor: "rgba(10,132,255,0.30)",
		backgroundColor: "#FFFFFF",
	},

	planHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 12,
	},

	planTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},

	planTitle: {
		fontSize: 17,
		fontWeight: "700",
		color: COLORS.text,
	},

	badge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor: "rgba(10,132,255,0.10)",
	},

	badgeText: {
		fontSize: 10,
		fontWeight: "700",
		color: COLORS.blue,
	},

	planSubtitle: {
		marginTop: 5,
		fontSize: 12,
		lineHeight: 17,
		color: COLORS.subtle,
	},

	planPrice: {
		fontSize: 15,
		fontWeight: "600",
		color: COLORS.blue,
		textAlign: "right",
	},

	features: {
		marginTop: 14,
		gap: 8,
	},

	featureRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},

	featureText: {
		fontSize: 13,
		color: COLORS.text,
		fontWeight: "600",
	},

	planButton: {
		marginTop: 16,
		height: 44,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(118,118,128,0.12)",
	},

	planButtonHighlight: {
		backgroundColor: COLORS.blue,
	},

	planButtonDisabled: {
		opacity: 0.78,
	},

	planButtonText: {
		fontSize: 14,
		fontWeight: "900",
		color: COLORS.subtle,
	},

	planButtonTextHighlight: {
		color: "#FFFFFF",
	},

	planButtonTextDisabled: {
		color: "#6B7280",
	},

	noteCard: {
		borderRadius: 18,
		padding: 14,
		backgroundColor: "rgba(10,132,255,0.08)",
		borderWidth: 1,
		borderColor: "rgba(10,132,255,0.14)",
		flexDirection: "row",
		gap: 9,
	},

	noteText: {
		flex: 1,
		fontSize: 12,
		lineHeight: 17,
		color: COLORS.subtle,
		fontWeight: "600",
	},
});