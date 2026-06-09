// src/screens/pacientes/info/Avaliacao.jsx
// @ts-nocheck
import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import {
	View,
	Text,
	SectionList,
	Pressable,
	StyleSheet,
	ActivityIndicator,
	Alert,
	Platform,
	ActionSheetIOS,
	RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import * as Haptics from "expo-haptics";

import { ensureFirebase } from "@/firebase/firebase";
import { clearDraft, createDraft } from "@/src/store/slices/avaliacaoSlice";
import { useThemeColor } from "@/hooks/useThemeColor";

const AVALIACAO_TIPOS = [
	{
		key: "rota",
		label: "Anamnese",
		formPath: "/avaliacao/avaliacao-anamnese",
	},
	{
		key: "avaliacao",
		label: "Avaliação Neurológica",
		formPath: "/(modals)/avaliacao/avaliacao-neurologica",
	},
	{
		key: "form",
		label: "Avaliação Ortopédica",
		formPath: "/(modals)/avaliacao/avaliacao-ortopedica",
	},
];

function getFormPathByTipo(tipoKey) {
	const found = AVALIACAO_TIPOS.find((t) => t.key === tipoKey);
	return found?.formPath || "/(modals)/avaliacao-new";
}

function getAvaliacaoKind(item) {
	const type = item?.type;
	const tipo = item?.tipo || item?.fields?.tipo;

	if (type === "neurologica" || tipo === "neurologica") {
		return {
			label: "Neurológica",
			icon: "git-branch-outline",
			color: "#2563EB",
			formPath: "/(modals)/avaliacao/avaliacao-neurologica",
		};
	}

	if (type === "ortopedica" || tipo === "ortopedica") {
		return {
			label: "Ortopédica",
			icon: "body-outline",
			color: "#10B981",
			formPath: "/(modals)/avaliacao/avaliacao-ortopedica",
		};
	}

	return {
		label: "Anamnese",
		icon: "clipboard-outline",
		color: "#7C3AED",
		formPath: "/avaliacao/avaliacao-anamnese",
	};
}

function toDate(value) {
	if (!value) return null;

	if (value instanceof Date) return value;

	if (value?._seconds) return new Date(value._seconds * 1000);

	if (typeof value?.toDate === "function") {
		try {
			return value.toDate();
		} catch {}
	}

	const d = new Date(value);

	return Number.isNaN(d.getTime()) ? null : d;
}

function sameDay(a, b) {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function humanDateLabel(date) {
	if (!date) return "Sem data";

	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);

	if (sameDay(date, today)) return "Hoje";
	if (sameDay(date, yesterday)) return "Ontem";

	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function humanTime(date) {
	if (!date) return "";

	return date.toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function groupByDay(items) {
	const map = new Map();

	for (const item of items || []) {
		const date = toDate(item?.createdAt || item?.updatedAt);
		const key = date
			? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
					2,
					"0"
			  )}-${String(date.getDate()).padStart(2, "0")}`
			: "sem-data";

		if (!map.has(key)) {
			map.set(key, {
				date,
				title: humanDateLabel(date),
				data: [],
			});
		}

		map.get(key).data.push(item);
	}

	return Array.from(map.values())
		.sort((a, b) => {
			const da = a.date?.getTime?.() || 0;
			const db = b.date?.getTime?.() || 0;
			return db - da;
		})
		.map((section) => ({
			...section,
			data: section.data.sort((a, b) => {
				const da = toDate(a?.createdAt || a?.updatedAt)?.getTime?.() || 0;
				const db = toDate(b?.createdAt || b?.updatedAt)?.getTime?.() || 0;
				return db - da;
			}),
		}));
}

function EmptyAvaliacoesCard({ onAdd, tint, text, subtle, border }) {
	return (
		<View style={styles.emptyOuter}>
			<View style={[styles.emptyCard, { borderColor: border }]}>
				<View style={styles.emptyIconWrap}>
					<Ionicons name="clipboard-outline" size={30} color="#FFFFFF" />
				</View>

				<Text style={[styles.emptyTitle, { color: text }]}>
					Nenhuma avaliação registrada
				</Text>

				<Text style={[styles.emptySubtitle, { color: subtle }]}>
					Comece criando uma anamnese, avaliação neurológica ou avaliação
					ortopédica para acompanhar a evolução do paciente.
				</Text>

				<Pressable
					onPress={onAdd}
					style={({ pressed }) => [
						styles.emptyButton,
						{ backgroundColor: tint },
						pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
					]}
					accessibilityRole="button"
					accessibilityLabel="Adicionar avaliação"
				>
					<Ionicons name="add" size={18} color="#FFFFFF" />
					<Text style={styles.emptyButtonText}>Adicionar avaliação</Text>
				</Pressable>
			</View>
		</View>
	);
}

function AvaliacaoRow({ item, onOpen, text, subtle, border }) {
	const kind = getAvaliacaoKind(item);
	const date = toDate(item?.createdAt || item?.updatedAt);
	const title = item?.title?.trim?.() || kind.label;
	const notes =
		item?.fields?.textos?.observacoesGerais ||
		item?.fields?.textos?.queixaPrincipal ||
		item?.fields?.textos?.historicoOrtopedico ||
		item?.fields?.textos?.marcha ||
		"Toque para visualizar ou editar";

	return (
		<Pressable
			onPress={() => onOpen(item)}
			style={({ pressed }) => [
				styles.rowCard,
				{
					borderColor: border,
					backgroundColor: pressed ? "rgba(37,99,235,0.06)" : "#FFFFFF",
				},
			]}
		>
			<View style={[styles.rowIcon, { backgroundColor: kind.color }]}>
				<Ionicons name={kind.icon} size={18} color="#FFFFFF" />
			</View>

			<View style={styles.rowMain}>
				<View style={styles.rowTop}>
					<Text style={[styles.rowTitle, { color: text }]} numberOfLines={1}>
						{title}
					</Text>

					<Text style={[styles.rowTime, { color: subtle }]}>
						{humanTime(date)}
					</Text>
				</View>

				<View style={styles.badgeLine}>
					<View style={[styles.kindBadge, { backgroundColor: `${kind.color}14` }]}>
						<Text style={[styles.kindBadgeText, { color: kind.color }]}>
							{kind.label}
						</Text>
					</View>
				</View>

				<Text style={[styles.rowSubtitle, { color: subtle }]} numberOfLines={2}>
					{notes}
				</Text>
			</View>

			<Ionicons name="chevron-forward" size={18} color={subtle} />
		</Pressable>
	);
}

export default function AvaliacaoList() {
	const { id: petId } = useLocalSearchParams();
	const navigation = useNavigation();
	const dispatch = useDispatch();
	const insets = useSafeAreaInsets();

	const { firestore, auth } = ensureFirebase() || {};

	const text = useThemeColor({}, "text");
	const tint = useThemeColor({}, "tint");
	const bg = useThemeColor({}, "background");
	const subtle = useThemeColor({ light: "#6B7280", dark: "#9AA0A6" }, "text");
	const border = useThemeColor(
		{ light: "rgba(15,23,42,0.08)", dark: "rgba(255,255,255,0.12)" },
		"border"
	);

	const [items, setItems] = useState([]);
	const [err, setErr] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const handleAddDraft = useCallback(() => {
		if (!petId) return;

		const safePetId = String(petId);

		const startDraft = (tipoKey) => {
			try {
				Haptics.selectionAsync().catch(() => {});

				dispatch(clearDraft({ petId: safePetId }));
				dispatch(createDraft({ petId: safePetId, tipo: tipoKey }));

				const formPath = getFormPathByTipo(tipoKey);

				router.push({
					pathname: formPath,
					params: {
						id: safePetId,
						tipo: tipoKey,
					},
				});
			} catch (e) {
				console.log("handleAdd avaliacao error", e);
				Alert.alert("Avaliações", "Não foi possível iniciar uma nova avaliação.");
			}
		};

		const optionLabels = AVALIACAO_TIPOS.map((t) => t.label);
		const cancelIndex = optionLabels.length;

		if (Platform.OS === "ios") {
			ActionSheetIOS.showActionSheetWithOptions(
				{
					title: "Nova avaliação",
					options: [...optionLabels, "Cancelar"],
					cancelButtonIndex: cancelIndex,
				},
				(buttonIndex) => {
					if (buttonIndex === cancelIndex) return;

					const chosen = AVALIACAO_TIPOS[buttonIndex];
					if (chosen) startDraft(chosen.key);
				}
			);
			return;
		}

		Alert.alert("Nova avaliação", "Escolha o tipo de avaliação", [
			...AVALIACAO_TIPOS.map((tipo) => ({
				text: tipo.label,
				onPress: () => startDraft(tipo.key),
			})),
			{
				text: "Cancelar",
				style: "cancel",
			},
		]);
	}, [dispatch, petId]);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: true,
			headerTitle: "Avaliações",
			headerLargeTitle: false,
			headerTintColor: tint,
			headerStyle: { backgroundColor: bg },
			headerTitleStyle: { color: tint, fontWeight: "800" },
			headerRight: () => (
				<Pressable
					onPress={handleAddDraft}
					hitSlop={10}
					style={({ pressed }) => [
						styles.navAddButton,
						{ opacity: pressed ? 0.65 : 1 },
					]}
					accessibilityRole="button"
					accessibilityLabel="Adicionar avaliação"
				>
					<Ionicons name="add-circle" size={24} color={tint} />
				</Pressable>
			),
		});
	}, [navigation, tint, bg, handleAddDraft]);

	useEffect(() => {
		if (!firestore) return;

		const uid = auth?.currentUser?.uid;
		if (!uid || !petId) return;

		setLoading(true);

		const colRef = firestore
			.collection("users")
			.doc(String(uid))
			.collection("pets")
			.doc(String(petId))
			.collection("avaliacoes");

		const unsub = colRef.orderBy("createdAt", "desc").onSnapshot(
			(snap) => {
				setErr(null);
				setItems(snap?.docs?.map((d) => ({ id: d.id, ...d.data() })) ?? []);
				setLoading(false);
			},
			(e) => {
				console.warn("avaliacoes onSnapshot", e);
				setErr(e);
				setItems([]);
				setLoading(false);
			}
		);

		return unsub;
	}, [firestore, auth, petId]);

	const sections = useMemo(() => groupByDay(items), [items]);

	const openAvaliacao = useCallback(
		(item) => {
			if (!item?.id || !petId) return;

			const kind = getAvaliacaoKind(item);

			router.push({
				pathname: kind.formPath,
				params: {
					id: String(petId),
					avaliacaoId: String(item.id),
				},
			});
		},
		[petId]
	);

	const onRefresh = useCallback(() => {
		setRefreshing(true);

		// A tela já está em realtime via onSnapshot.
		// Esse refresh é só feedback visual para o usuário.
		setTimeout(() => setRefreshing(false), 450);
	}, []);

	if (loading) {
		return (
			<SafeAreaView
				style={[styles.center, { backgroundColor: bg }]}
				edges={["left", "right"]}
			>
				<ActivityIndicator />
				<Text style={{ color: subtle, marginTop: 10 }}>
					Carregando avaliações…
				</Text>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["left", "right"]}>
			<Stack.Screen
				options={{
					title: "Avaliações",
					headerLargeTitle: false,
				}}
			/>

			{err ? (
				<View style={styles.errorBox}>
					<Ionicons name="warning-outline" size={20} color="#DC2626" />
					<Text style={styles.errorText}>
						Não foi possível carregar as avaliações.
					</Text>
				</View>
			) : null}

			<SectionList
				sections={sections}
				keyExtractor={(item) => String(item.id)}
				renderItem={({ item }) => (
					<AvaliacaoRow
						item={item}
						onOpen={openAvaliacao}
						text={text}
						subtle={subtle}
						border={border}
					/>
				)}
				renderSectionHeader={({ section }) => (
					<View style={[styles.sectionHeader, { backgroundColor: bg }]}>
						<Text style={[styles.sectionHeaderText, { color: subtle }]}>
							{section.title}
						</Text>

						<Text style={[styles.sectionCount, { color: subtle }]}>
							{section.data.length}
						</Text>
					</View>
				)}
				ListHeaderComponent={
					items.length > 0 ? (
						<View style={styles.listHeader}>
							<Text style={[styles.screenTitle, { color: text }]}>
								Histórico de avaliações
							</Text>

							<Text style={[styles.screenSubtitle, { color: subtle }]}>
								{items.length} registro{items.length === 1 ? "" : "s"} encontrado
								{items.length === 1 ? "" : "s"}
							</Text>
						</View>
					) : null
				}
				ListEmptyComponent={
					<EmptyAvaliacoesCard
						onAdd={handleAddDraft}
						tint={tint}
						text={text}
						subtle={subtle}
						border={border}
					/>
				}
				contentContainerStyle={[
					styles.listContent,
					{
						paddingBottom: Math.max(insets.bottom, 0) + 24,
						flexGrow: 1,
					},
				]}
				stickySectionHeadersEnabled={false}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={tint}
						colors={[tint]}
					/>
				}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
	},

	center: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},

	navAddButton: {
		paddingHorizontal: 6,
		paddingVertical: 4,
	},

	errorBox: {
		marginHorizontal: 16,
		marginTop: 12,
		borderRadius: 14,
		padding: 12,
		backgroundColor: "rgba(220,38,38,0.08)",
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},

	errorText: {
		color: "#DC2626",
		fontWeight: "700",
		flex: 1,
	},

	listContent: {
		paddingHorizontal: 14,
		paddingTop: 10,
	},

	listHeader: {
		paddingHorizontal: 2,
		paddingBottom: 14,
	},

	screenTitle: {
		fontSize: 26,
		fontWeight: "850",
		letterSpacing: -0.5,
	},

	screenSubtitle: {
		fontSize: 13,
		fontWeight: "500",
		marginTop: 3,
	},

	sectionHeader: {
		marginTop: 12,
		marginBottom: 8,
		paddingHorizontal: 4,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	sectionHeaderText: {
		fontSize: 13,
		fontWeight: "800",
		letterSpacing: 0.3,
		textTransform: "uppercase",
	},

	sectionCount: {
		fontSize: 12,
		fontWeight: "700",
	},

	rowCard: {
		minHeight: 92,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 12,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 10,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 1,
	},

	rowIcon: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
	},

	rowMain: {
		flex: 1,
		minWidth: 0,
	},

	rowTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},

	rowTitle: {
		fontSize: 16,
		fontWeight: "800",
		letterSpacing: -0.2,
		flex: 1,
	},

	rowTime: {
		fontSize: 12,
		fontWeight: "700",
	},

	badgeLine: {
		flexDirection: "row",
		marginTop: 6,
	},

	kindBadge: {
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 3,
	},

	kindBadgeText: {
		fontSize: 11,
		fontWeight: "800",
	},

	rowSubtitle: {
		fontSize: 12,
		fontWeight: "500",
		lineHeight: 17,
		marginTop: 6,
	},

	emptyOuter: {
		flex: 1,
		paddingHorizontal: 4,
		paddingTop: 54,
		alignItems: "center",
	},

	emptyCard: {
		width: "100%",
		borderWidth: StyleSheet.hairlineWidth,
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		paddingHorizontal: 20,
		paddingVertical: 24,
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.06,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 8 },
		elevation: 2,
	},

	emptyIconWrap: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: "#111827",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 14,
	},

	emptyTitle: {
		fontSize: 18,
		fontWeight: "850",
		textAlign: "center",
		letterSpacing: -0.3,
	},

	emptySubtitle: {
		fontSize: 13,
		lineHeight: 19,
		textAlign: "center",
		marginTop: 8,
		marginBottom: 18,
	},

	emptyButton: {
		height: 44,
		borderRadius: 14,
		paddingHorizontal: 18,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},

	emptyButtonText: {
		color: "#FFFFFF",
		fontWeight: "800",
		fontSize: 14,
	},
});