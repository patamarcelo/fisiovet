// src/screens/pacientes/info/Exam.jsx
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
	RefreshControl,
	Alert,
	Platform,
	ActionSheetIOS,
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Share,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Stack, useNavigation } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";

import { ensureFirebase } from "@/firebase/firebase";
import { useThemeColor } from "@/hooks/useThemeColor";

import {
	chooseExamSource,
	takePhotoAsFile,
	pickImageAsFile,
	pickDocumentAsFile,
} from "@/src/features/exams/pickers";
import { uploadExamForPet } from "@/src/features/exams/uploadExam";

function isImageMime(mime) {
	return String(mime || "").startsWith("image/");
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

function guessExt(mime = "", url = "") {
	if (mime.includes("pdf")) return "pdf";
	if (mime.includes("png")) return "png";
	if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
	if (mime.includes("gif")) return "gif";
	if (mime.includes("webp")) return "webp";
	if (mime.includes("mp4")) return "mp4";
	if (mime.includes("quicktime")) return "mov";

	try {
		const u = new URL(url);
		const match = (u.pathname || "").match(/\.(\w+)$/);

		if (match) return match[1].toLowerCase();
	} catch {}

	return "bin";
}

function formatBytes(bytes) {
	const n = Number(bytes);

	if (!Number.isFinite(n) || n <= 0) return null;

	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace(".", ",")} KB`;

	return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function getFileKind(file = {}) {
	const mime = file?.mime || "";

	if (isImageMime(mime)) {
		return {
			label: "Imagem",
			icon: "image-outline",
			color: "#10B981",
		};
	}

	if (mime.includes("pdf")) {
		return {
			label: "PDF",
			icon: "document-text-outline",
			color: "#DC2626",
		};
	}

	if (mime.includes("video")) {
		return {
			label: "Vídeo",
			icon: "videocam-outline",
			color: "#7C3AED",
		};
	}

	if (mime.includes("audio")) {
		return {
			label: "Áudio",
			icon: "musical-notes-outline",
			color: "#F59E0B",
		};
	}

	return {
		label: "Arquivo",
		icon: "document-outline",
		color: "#2563EB",
	};
}

async function prepareLocalForShare({ url, mime, title }) {
	if (!url) throw new Error("URL ausente");

	const safeName =
		String(title || "arquivo")
			.trim()
			.replace(/[^\w.-]/g, "_") || "arquivo";

	const ext = guessExt(mime || "", url);
	const local = `${FileSystem.cacheDirectory}${safeName}.${ext}`;

	try {
		const info = await FileSystem.getInfoAsync(local);

		if (info.exists && info.size > 0) return local;
	} catch {}

	const res = await FileSystem.downloadAsync(url, local);

	if (res.status !== 200) {
		throw new Error(`Download falhou: HTTP ${res.status}`);
	}

	return res.uri;
}

function LoadingOverlay({ visible, title, subtitle, progress = null }) {
	if (!visible) return null;

	return (
		<View style={styles.overlay}>
			<View style={styles.overlayCard}>
				<ActivityIndicator size="large" color="#fff" />

				<Text style={styles.overlayTitle}>{title}</Text>

				{progress !== null && (
					<>
						<View style={styles.progressTrack}>
							<View
								style={[
									styles.progressFill,
									{ width: `${Math.max(0, Math.min(100, progress))}%` },
								]}
							/>
						</View>

						<Text style={styles.overlayProgress}>{progress}%</Text>
					</>
				)}

				{!!subtitle && <Text style={styles.overlaySub}>{subtitle}</Text>}
			</View>
		</View>
	);
}

function EmptyExamsCard({ onAdd, tint, text, subtle, border }) {
	return (
		<View style={styles.emptyOuter}>
			<View style={[styles.emptyCard, { borderColor: border }]}>
				<View style={styles.emptyIconWrap}>
					<Ionicons name="document-attach-outline" size={30} color="#FFFFFF" />
				</View>

				<Text style={[styles.emptyTitle, { color: text }]}>
					Nenhum exame anexado
				</Text>

				<Text style={[styles.emptySubtitle, { color: subtle }]}>
					Adicione fotos, PDFs ou documentos para manter o histórico clínico do
					paciente organizado.
				</Text>

				<Pressable
					onPress={onAdd}
					style={({ pressed }) => [
						styles.emptyButton,
						{ backgroundColor: tint },
						pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
					]}
					accessibilityRole="button"
					accessibilityLabel="Adicionar exame"
				>
					<Ionicons name="add" size={18} color="#FFFFFF" />
					<Text style={styles.emptyButtonText}>Adicionar exame</Text>
				</Pressable>
			</View>
		</View>
	);
}

function ExamThumb({ item }) {
	const file = item?.file || {};
	const mime = file?.mime || "";

	if (isImageMime(mime) && file?.downloadURL) {
		return (
			<Image
				source={{ uri: file.downloadURL }}
				style={styles.thumbImage}
				cachePolicy="memory-disk"
				contentFit="cover"
				transition={120}
			/>
		);
	}

	const kind = getFileKind(file);

	return (
		<View style={[styles.thumbIconWrap, { backgroundColor: `${kind.color}14` }]}>
			<Ionicons name={kind.icon} size={25} color={kind.color} />
		</View>
	);
}

function ExamRow({ item, onOpen, onActions, text, subtle, border }) {
	const file = item?.file || {};
	const kind = getFileKind(file);
	const date = toDate(item?.createdAt || item?.updatedAt);
	const title = item?.title || file?.name || "Exame";
	const size = formatBytes(file?.size);

	const meta = [kind.label, size, humanTime(date)].filter(Boolean).join(" • ");

	return (
		<Pressable
			onPress={() => onOpen(item)}
			onLongPress={() => onActions(item)}
			style={({ pressed }) => [
				styles.rowCard,
				{
					borderColor: border,
					backgroundColor: pressed ? "rgba(37,99,235,0.06)" : "#FFFFFF",
				},
			]}
		>
			<ExamThumb item={item} />

			<View style={styles.rowMain}>
				<View style={styles.rowTop}>
					<Text style={[styles.rowTitle, { color: text }]} numberOfLines={1}>
						{title}
					</Text>
				</View>

				<View style={styles.badgeLine}>
					<View style={[styles.kindBadge, { backgroundColor: `${kind.color}14` }]}>
						<Text style={[styles.kindBadgeText, { color: kind.color }]}>
							{kind.label}
						</Text>
					</View>
				</View>

				<Text style={[styles.rowSubtitle, { color: subtle }]} numberOfLines={1}>
					{meta || file?.mime || "Arquivo"}
				</Text>
			</View>

			<Pressable
				onPress={() => onActions(item)}
				hitSlop={12}
				style={({ pressed }) => [
					styles.moreButton,
					pressed && { opacity: 0.55 },
				]}
				accessibilityRole="button"
				accessibilityLabel="Ações do exame"
			>
				<Ionicons name="ellipsis-horizontal-circle" size={23} color={subtle} />
			</Pressable>
		</Pressable>
	);
}

export default function ExamsList() {
	const fb = ensureFirebase() || {};
	const { firestore, auth, storageInstance } = fb;

	const { id: petId } = useLocalSearchParams();
	const navigation = useNavigation();
	const insets = useSafeAreaInsets();

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

	const [isSharing, setIsSharing] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);

	const handleAdd = useCallback(async () => {
		try {
			const liveFb = ensureFirebase();

			if (!liveFb) {
				Alert.alert("Exames", "Falha ao inicializar Firebase.");
				return;
			}

			const { auth, firestore, storageInstance } = liveFb;
			const uid = auth?.currentUser?.uid;

			if (!uid) {
				Alert.alert("Exames", "Usuário não autenticado.");
				return;
			}

			if (!petId) return;

			let tutorId = null;

			try {
				const petSnap = await firestore
					.collection("users")
					.doc(String(uid))
					.collection("pets")
					.doc(String(petId))
					.get();

				if (petSnap.exists) {
					const data = petSnap.data();
					tutorId = data?.tutor?.id ? String(data.tutor.id) : null;
				}
			} catch {}

			const source = await chooseExamSource();

			if (!source) return;

			let picked = null;

			if (source === "camera") picked = await takePhotoAsFile();
			else if (source === "gallery") picked = await pickImageAsFile();
			else if (source === "document") picked = await pickDocumentAsFile();

			if (!picked) return;

			setUploading(true);
			setProgress(0);

			await uploadExamForPet({
				uid,
				petId: String(petId),
				tutorId,
				title: null,
				notes: null,
				file: picked,
				onProgress: (p) => setProgress(p),
			});

			setProgress(100);
			setUploading(false);

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
				() => {}
			);

			Alert.alert("Exames", "Arquivo salvo!");
		} catch (e) {
			setUploading(false);

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
				() => {}
			);

			console.log("Erro ao salvar exame:", e);
			Alert.alert("Exames", "Falha ao salvar o arquivo.");
		}
	}, [petId]);

	useLayoutEffect(() => {
	navigation.setOptions({
		headerShown: true,
		headerTitle: "Exames",
		headerLargeTitle: false,
		headerTintColor: tint,
		headerStyle: { backgroundColor: bg },
		headerTitleStyle: { color: tint, fontWeight: "800" },

		headerLeft: () => (
			<Pressable
				onPress={() => {
					if (navigation.canGoBack()) {
						navigation.goBack();
						return;
					}

					router.replace({
						pathname: "/(phone)/pacientes/[id]",
						params: { id: String(petId) },
					});
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

		headerRight: () => (
			<Pressable
				onPress={handleAdd}
				hitSlop={10}
				style={({ pressed }) => [
					styles.navAddButton,
					{ opacity: pressed ? 0.65 : 1 },
				]}
				accessibilityRole="button"
				accessibilityLabel="Adicionar exame"
			>
				<Ionicons name="add-circle" size={24} color={tint} />
			</Pressable>
		),
	});
}, [navigation, tint, bg, handleAdd, petId]);

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
			.collection("exams");

		const unsub = colRef.orderBy("createdAt", "desc").onSnapshot(
			(snap) => {
				setErr(null);
				setItems(snap?.docs?.map((d) => ({ id: d.id, ...d.data() })) ?? []);
				setLoading(false);
			},
			(e) => {
				console.warn("exams onSnapshot", e);
				setErr(e);
				setItems([]);
				setLoading(false);
			}
		);

		return unsub;
	}, [firestore, auth, petId]);

	const sections = useMemo(() => groupByDay(items), [items]);

	const openPreview = useCallback(
		(item) => {
			const uid = auth?.currentUser?.uid;

			if (!uid || !petId || !item?.id) return;

			Haptics.selectionAsync().catch(() => {});

			router.push({
				pathname: "/(files)/exam-preview",
				params: {
					uid: String(uid),
					petId: String(petId),
					examId: String(item.id),
				},
			});
		},
		[auth, petId]
	);

	const handleShare = useCallback(async (item) => {
		try {
			const url = item?.file?.downloadURL;
			const mime = item?.file?.mime || "";
			const title = item?.title || item?.file?.name || "Exame";

			if (!url) return;

			setIsSharing(true);

			const localUri = await prepareLocalForShare({
				url,
				mime,
				title,
			});

			setIsSharing(false);

			if (Platform.OS !== "web" && (await Sharing.isAvailableAsync())) {
				await Sharing.shareAsync(localUri, {
					mimeType: mime || undefined,
					dialogTitle: title,
				});
			} else {
				await Share.share({
					url: localUri,
					message: localUri,
				});
			}
		} catch (e) {
			console.log("share error", e);
			setIsSharing(false);

			Alert.alert("Compartilhar", "Não foi possível compartilhar este arquivo.");
		}
	}, []);

	const handleDelete = useCallback(
		async (item) => {
			const uid = auth?.currentUser?.uid;

			if (!uid || !petId || !firestore) return;

			Alert.alert("Apagar exame", "Deseja apagar este exame?", [
				{
					text: "Cancelar",
					style: "cancel",
				},
				{
					text: "Apagar",
					style: "destructive",
					onPress: async () => {
						try {
							const path = item?.file?.storagePath;

							if (path && storageInstance) {
								await storageInstance.ref(path).delete();
							}

							await firestore
								.collection("users")
								.doc(String(uid))
								.collection("pets")
								.doc(String(petId))
								.collection("exams")
								.doc(String(item.id))
								.delete();

							Haptics.notificationAsync(
								Haptics.NotificationFeedbackType.Success
							).catch(() => {});
						} catch (e) {
							console.log("delete error", e);

							Haptics.notificationAsync(
								Haptics.NotificationFeedbackType.Error
							).catch(() => {});

							Alert.alert("Apagar", "Falha ao apagar o exame.");
						}
					},
				},
			]);
		},
		[auth, petId, firestore, storageInstance]
	);

	const openActions = useCallback(
		(item) => {
			const options = ["Compartilhar", "Apagar", "Cancelar"];
			const cancelButtonIndex = 2;

			if (Platform.OS === "ios") {
				ActionSheetIOS.showActionSheetWithOptions(
					{
						options,
						destructiveButtonIndex: 1,
						cancelButtonIndex,
					},
					(index) => {
						if (index === 0) handleShare(item);
						else if (index === 1) handleDelete(item);
					}
				);
				return;
			}

			Alert.alert("Exame", "Escolha uma ação", [
				{
					text: "Compartilhar",
					onPress: () => handleShare(item),
				},
				{
					text: "Apagar",
					style: "destructive",
					onPress: () => handleDelete(item),
				},
				{
					text: "Cancelar",
					style: "cancel",
				},
			]);
		},
		[handleShare, handleDelete]
	);

	const onRefresh = useCallback(() => {
		setRefreshing(true);

		// A lista já atualiza em realtime via onSnapshot.
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
					Carregando exames…
				</Text>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["left", "right"]}>
			<Stack.Screen
				options={{
					title: "Exames",
					headerLargeTitle: false,
				}}
			/>

			{err ? (
				<View style={styles.errorBox}>
					<Ionicons name="warning-outline" size={20} color="#DC2626" />
					<Text style={styles.errorText}>Não foi possível carregar os exames.</Text>
				</View>
			) : null}

			<SectionList
				sections={sections}
				keyExtractor={(item) => String(item.id)}
				renderItem={({ item }) => (
					<ExamRow
						item={item}
						onOpen={openPreview}
						onActions={openActions}
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
								Arquivos e exames
							</Text>

							<Text style={[styles.screenSubtitle, { color: subtle }]}>
								{items.length} arquivo{items.length === 1 ? "" : "s"} anexado
								{items.length === 1 ? "" : "s"}
							</Text>
						</View>
					) : null
				}
				ListEmptyComponent={
					<EmptyExamsCard
						onAdd={handleAdd}
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

			<LoadingOverlay
				visible={isSharing}
				title="Preparando…"
				subtitle="Organizando o arquivo para compartilhar"
			/>

			<LoadingOverlay
				visible={uploading}
				title="Enviando…"
				subtitle="Não feche o app durante o upload"
				progress={progress}
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

	thumbImage: {
		width: 56,
		height: 56,
		borderRadius: 14,
		backgroundColor: "#E5E7EB",
	},

	thumbIconWrap: {
		width: 56,
		height: 56,
		borderRadius: 14,
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

	moreButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
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
		borderRadius: 16,
		minWidth: 230,
		alignItems: "center",
	},

	overlayTitle: {
		color: "#FFFFFF",
		marginTop: 10,
		fontWeight: "800",
		fontSize: 15,
	},

	overlaySub: {
		color: "#9CA3AF",
		marginTop: 8,
		fontSize: 12,
		textAlign: "center",
	},

	progressTrack: {
		width: "100%",
		height: 8,
		borderRadius: 999,
		backgroundColor: "rgba(255,255,255,0.15)",
		marginTop: 12,
		overflow: "hidden",
	},

	progressFill: {
		height: "100%",
		backgroundColor: "#FFFFFF",
	},

	overlayProgress: {
		color: "#FFFFFF",
		marginTop: 6,
		fontSize: 12,
		fontWeight: "700",
	},
});