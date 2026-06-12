// app/(phone)/configuracoes/backup.jsx
// @ts-nocheck
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	ActivityIndicator,
	Alert,
	ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useThemeColor } from "@/hooks/useThemeColor";
import {
	exportBackupAsJson,
	exportBackupAsExcel,
} from "@/src/features/backup/exportLocalBackup";

const APP_ICON = require("@/assets/images/splash-fisiovet.png");

function FormatIcon({ type, border }) {
	const isExcel = type === "excel";

	return (
		<View style={[styles.fileIcon, { borderColor: border }]}>
			<View style={styles.fileFold} />

			<Text
				style={[
					styles.fileExtension,
					{ color: isExcel ? "#15803D" : "#2563EB" },
				]}
			>
				{isExcel ? "XLSX" : "JSON"}
			</Text>
		</View>
	);
}

function FormatCard({
	title,
	subtitle,
	type,
	onPress,
	disabled,
	text,
	subtle,
	border,
}) {
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			style={({ pressed }) => [
				styles.formatCard,
				{
					borderColor: border,
					opacity: disabled ? 0.55 : pressed ? 0.72 : 1,
				},
			]}
		>
			<FormatIcon type={type} border={border} />

			<View style={styles.formatMain}>
				<Text style={[styles.formatTitle, { color: text }]}>
					{title}
				</Text>

				<Text style={[styles.formatSubtitle, { color: subtle }]}>
					{subtitle}
				</Text>
			</View>

			<Ionicons name="chevron-forward" size={18} color={subtle} />
		</Pressable>
	);
}

function LoadingOverlay({ visible, title, subtitle }) {
	if (!visible) return null;

	return (
		<View style={styles.overlay}>
			<View style={styles.overlayCard}>
				<ActivityIndicator size="large" color="#FFFFFF" />

				<Text style={styles.overlayTitle}>{title}</Text>

				{!!subtitle && <Text style={styles.overlaySubtitle}>{subtitle}</Text>}
			</View>
		</View>
	);
}

export default function BackupScreen() {
	const navigation = useNavigation();
	const insets = useSafeAreaInsets();

	const text = useThemeColor({}, "text");
	const tint = useThemeColor({}, "tint");
	const bg = useThemeColor({}, "background");

	const subtle = useThemeColor(
		{
			light: "#6B7280",
			dark: "#9AA0A6",
		},
		"text"
	);

	const border = useThemeColor(
		{
			light: "rgba(15,23,42,0.08)",
			dark: "rgba(255,255,255,0.12)",
		},
		"border"
	);

	const [exporting, setExporting] = useState(false);
	const [exportingLabel, setExportingLabel] = useState("");

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: true,
			headerTitle: "Backup local",
			headerLargeTitle: false,
			headerTintColor: tint,
			headerStyle: { backgroundColor: bg },
			headerTitleStyle: {
				color: tint,
				fontWeight: "800",
			},
			headerLeft: () => (
				<Pressable
					onPress={() => {
						if (navigation.canGoBack()) {
							navigation.goBack();
							return;
						}

						router.replace("/configuracoes");
					}}
					hitSlop={12}
					style={({ pressed }) => [
						styles.navBackButton,
						{ opacity: pressed ? 0.55 : 1 },
					]}
					accessibilityRole="button"
					accessibilityLabel="Voltar"
				>
					<Ionicons name="chevron-back" size={26} color={tint} />
				</Pressable>
			),
		});
	}, [navigation, tint, bg]);

	const runExport = useCallback(async (type) => {
		try {
			setExporting(true);
			setExportingLabel(type === "json" ? "Gerando JSON…" : "Gerando Excel…");

			Haptics.selectionAsync().catch(() => {});

			if (type === "json") {
				await exportBackupAsJson();
			} else {
				await exportBackupAsExcel();
			}

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
				() => {}
			);
		} catch (error) {
			console.log("Erro ao exportar backup:", error);

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
				() => {}
			);

			Alert.alert(
				"Backup local",
				error?.message || "Não foi possível exportar os dados."
			);
		} finally {
			setExporting(false);
			setExportingLabel("");
		}
	}, []);

	return (
		<SafeAreaView
			style={[styles.safe, { backgroundColor: bg }]}
			edges={["left", "right"]}
		>
			<ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingBottom: Math.max(insets.bottom, 0) + 24 },
				]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.hero}>
					<Image
						source={APP_ICON}
						style={styles.heroImage}
						contentFit="contain"
					/>

					<Text style={[styles.title, { color: text }]}>
						Exportar dados
					</Text>

					<Text style={[styles.description, { color: subtle }]}>
						Salve uma cópia local dos dados cadastrados no FisioVet. Você pode
						compartilhar o arquivo, salvar no iCloud, Google Drive ou enviar por
						e-mail.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: subtle }]}>
						FORMATOS DISPONÍVEIS
					</Text>

					<FormatCard
						title="JSON completo"
						subtitle="Arquivo técnico com a estrutura mais fiel ao banco de dados."
						type="json"
						onPress={() => runExport("json")}
						disabled={exporting}
						text={text}
						subtle={subtle}
						border={border}
					/>

					<FormatCard
						title="Excel organizado"
						subtitle="Planilha com abas para tutores, pacientes, agenda, exames e resumo."
						type="excel"
						onPress={() => runExport("excel")}
						disabled={exporting}
						text={text}
						subtle={subtle}
						border={border}
					/>
				</View>

				<View style={[styles.infoBox, { borderColor: border }]}>
					<Ionicons name="information-circle-outline" size={20} color={tint} />

					<Text style={[styles.infoText, { color: subtle }]}>
						Os arquivos anexados aos exames não são baixados nesta exportação.
						O backup inclui os dados e metadados, como nome, tipo, URL e paciente
						vinculado.
					</Text>
				</View>
			</ScrollView>

			<LoadingOverlay
				visible={exporting}
				title={exportingLabel || "Exportando…"}
				subtitle="Preparando arquivo para compartilhamento"
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
	},

	navBackButton: {
		width: 40,
		height: 40,
		marginLeft: -6,
		alignItems: "center",
		justifyContent: "center",
	},

	content: {
		paddingHorizontal: 16,
		paddingTop: 18,
		gap: 22,
	},

	hero: {
		alignItems: "center",
		paddingHorizontal: 8,
	},

	heroImage: {
		width: 98,
		height: 98,
		marginBottom: 10,
	},

	title: {
		fontSize: 26,
		fontWeight: "850",
		letterSpacing: -0.5,
		textAlign: "center",
	},

	description: {
		fontSize: 14,
		lineHeight: 20,
		textAlign: "center",
		marginTop: 8,
	},

	section: {
		gap: 12,
	},

	sectionTitle: {
		fontSize: 12,
		fontWeight: "800",
		letterSpacing: 0.5,
		marginLeft: 2,
	},

	formatCard: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 18,
		padding: 14,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		backgroundColor: "#FFFFFF",
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 10,
		shadowOffset: {
			width: 0,
			height: 4,
		},
		elevation: 1,
	},

	fileIcon: {
		width: 46,
		height: 54,
		borderRadius: 12,
		borderWidth: StyleSheet.hairlineWidth,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "flex-end",
		paddingBottom: 9,
		overflow: "hidden",
	},

	fileFold: {
		position: "absolute",
		top: 0,
		right: 0,
		width: 15,
		height: 15,
		borderLeftWidth: StyleSheet.hairlineWidth,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(15,23,42,0.10)",
		backgroundColor: "rgba(15,23,42,0.035)",
		borderBottomLeftRadius: 5,
	},

	fileExtension: {
		fontSize: 10,
		fontWeight: "900",
		letterSpacing: 0.2,
	},

	formatMain: {
		flex: 1,
		minWidth: 0,
	},

	formatTitle: {
		fontSize: 15,
		fontWeight: "850",
		letterSpacing: -0.2,
	},

	formatSubtitle: {
		fontSize: 13,
		lineHeight: 18,
		marginTop: 3,
	},

	infoBox: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 16,
		padding: 12,
		flexDirection: "row",
		gap: 10,
	},

	infoText: {
		flex: 1,
		fontSize: 12,
		lineHeight: 17,
	},

	overlay: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		backgroundColor: "rgba(0,0,0,0.42)",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 1000,
	},

	overlayCard: {
		backgroundColor: "#111827",
		paddingVertical: 18,
		paddingHorizontal: 18,
		borderRadius: 18,
		minWidth: 240,
		alignItems: "center",
	},

	overlayTitle: {
		color: "#FFFFFF",
		marginTop: 10,
		fontWeight: "850",
		fontSize: 15,
	},

	overlaySubtitle: {
		color: "#9CA3AF",
		marginTop: 7,
		fontSize: 12,
		textAlign: "center",
	},
});