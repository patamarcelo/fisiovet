// src/screens/pacientes/Detail.jsx
// @ts-nocheck
import React, {
	useEffect,
	useCallback,
	useLayoutEffect,
	useState,
	useMemo,
} from "react";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	Alert,
	ActivityIndicator,
	Modal,
	Platform,
	ActionSheetIOS,
	ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useNavigation } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import * as Haptics from "expo-haptics";

import { fetchPet, selectPetById } from "@/src/store/slices/petsSlice";
import { useThemeColor } from "@/hooks/useThemeColor";
import { IconSymbol } from "@/components/ui/IconSymbol";

import { uploadExamForPet } from "@/src/features/exams/uploadExam";
import { ensureFirebase } from "@/firebase/firebase";
import {
	chooseExamSource,
	takePhotoAsFile,
	pickImageAsFile,
	pickDocumentAsFile,
} from "@/src/features/exams/pickers";
import { clearDraft, createDraft } from "@/src/store/slices/avaliacaoSlice";

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

function formatPeso(pesoKg) {
	if (pesoKg == null || isNaN(pesoKg)) return null;
	return `${pesoKg.toString().replace(".", ",")} kg`;
}

function formatIdade(idade) {
	if (idade == null || isNaN(idade)) return null;
	const n = Number(idade);
	return `${n} ${n === 1 ? "ano" : "anos"}`;
}

function ActionCard({ title, subtitle, icon, onPress, onAdd, border, text, subtle }) {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.card,
				{ borderColor: border },
				pressed && { opacity: 0.86, transform: [{ scale: 0.995 }] },
			]}
			accessibilityRole="button"
			accessibilityLabel={title}
		>
			<View style={styles.cardIcon}>
				<IconSymbol name={icon} size={17} color="#fff" />
			</View>

			<View style={{ flex: 1, minWidth: 0 }}>
				<Text style={[styles.cardTitle, { color: text }]} numberOfLines={1}>
					{title}
				</Text>

				{!!subtitle && (
					<Text style={[styles.cardSubtitle, { color: subtle }]} numberOfLines={1}>
						{subtitle}
					</Text>
				)}
			</View>

			{onAdd && (
				<Pressable
					onPress={(e) => {
						e.stopPropagation();
						onAdd();
					}}
					hitSlop={8}
					accessibilityLabel={`Adicionar em ${title}`}
					style={styles.addBtn}
				>
					<IconSymbol name="plus.circle.fill" size={20} />
				</Pressable>
			)}

			<IconSymbol name="chevron.right" size={14} color={subtle} />
		</Pressable>
	);
}

function UploadOverlay({ visible, progress = 0 }) {
	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			statusBarTranslucent
			presentationStyle={Platform.OS === "ios" ? "overFullScreen" : "fullScreen"}
		>
			<View style={styles.overlay}>
				<View style={styles.overlayCard}>
					<ActivityIndicator size="large" />
					<Text style={styles.overlayTitle}>Enviando… {progress}%</Text>

					<View style={styles.progressTrack}>
						<View style={[styles.progressFill, { width: `${progress}%` }]} />
					</View>

					<Text style={styles.overlaySub}>Não feche o app durante o upload</Text>
				</View>
			</View>
		</Modal>
	);
}

export default function PetDetail() {
	const params = useLocalSearchParams();

	const rawId = Array.isArray(params.id)
		? params.id[0]
		: params.id;

	const rawFrom = Array.isArray(params.from)
		? params.from[0]
		: params.from;

	const rawTutorId = Array.isArray(params.tutorId)
		? params.tutorId[0]
		: params.tutorId;

	const id = rawId ? String(rawId) : null;
	const from = rawFrom ? String(rawFrom) : null;
	const tutorId = rawTutorId ? String(rawTutorId) : null;

	const dispatch = useDispatch();
	const navigation = useNavigation();

	const pet = useSelector((state) => (id ? selectPetById(id)(state) : null));

	const text = useThemeColor({}, "text");
	const tint = useThemeColor({}, "tint");
	const subtle = useThemeColor({ light: "#6B7280", dark: "#9AA0A6" }, "text");
	const border = useThemeColor(
		{ light: "rgba(15,23,42,0.08)", dark: "rgba(255,255,255,0.12)" },
		"border"
	);
	const bg = useThemeColor({}, "background");
	const accent = "#10B981";

	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		if (!id) return;
		if (!pet) dispatch(fetchPet(id));
	}, [dispatch, id, pet]);

	const goBack = useCallback(() => {
		if (from === "tutor") {
			if (router.canDismiss()) {
				router.dismiss();
				return;
			}

			if (tutorId) {
				router.replace({
					pathname: "/(phone)/tutores/[id]",
					params: {
						id: String(tutorId),
					},
				});
				return;
			}
		}

		if (router.canGoBack()) {
			router.back();
			return;
		}

		router.replace("/(phone)/pacientes");
	}, [from, tutorId]);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerTitle: pet?.nome ?? "Pet",
			headerTintColor: tint,
			headerStyle: { backgroundColor: bg },
			headerBackVisible: false,
			headerLargeTitle: false,
			gestureEnabled: true,
			headerLeft: () => (
				<Pressable onPress={goBack} hitSlop={10} accessibilityLabel="Voltar">
					<IconSymbol name="chevron.left" size={20} color={tint} />
				</Pressable>
			),
		});
	}, [navigation, pet?.nome, tint, bg, goBack]);

	const icon = pet?.especie === "gato" ? "cat.fill" : "dog.fill";

	const detailsLine = useMemo(() => {
		if (!pet) return "";
		return [pet.especie, pet.raca, pet.cor].filter(Boolean).join(" • ");
	}, [pet]);

	const metricsLine = useMemo(() => {
		if (!pet) return "";
		return [formatPeso(pet.pesoKg), formatIdade(pet.idade)]
			.filter(Boolean)
			.join(" • ");
	}, [pet]);

	const handleAdd = useCallback(async () => {
		if (!pet) return;

		try {
			const fb = ensureFirebase();

			if (!fb) {
				Alert.alert("Exames", "Falha ao inicializar Firebase.");
				return;
			}

			const { auth, storageInstance } = fb;
			const uid = auth?.currentUser?.uid;

			if (!uid) {
				Alert.alert("Exames", "Usuário não autenticado.");
				return;
			}

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
				petId: String(pet.id),
				tutorId: pet.tutor?.id ? String(pet.tutor.id) : null,
				title: null,
				notes: null,
				file: picked,
				onProgress: (p) => setProgress(p),
			});

			setProgress(100);
			setUploading(false);

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
			Alert.alert("Exames", "Arquivo salvo!");
		} catch (e) {
			setUploading(false);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
			console.log("Erro ao salvar exame:", e);
			Alert.alert("Exames", "Falha ao salvar o arquivo.");
		}
	}, [pet]);

	const handleAddDraft = useCallback(() => {
		if (!pet?.id) return;

		const petId = String(pet.id);

		const startDraft = (tipoKey) => {
			try {
				dispatch(clearDraft({ petId }));
				dispatch(createDraft({ petId, tipo: tipoKey }));

				const formPath = getFormPathByTipo(tipoKey);

				router.push({
					pathname: formPath,
					params: {
						id: petId,
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
					title: "Nova Avaliação",
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

		Alert.alert("Novo registro", "Escolha o tipo de avaliação/formulário", [
			...AVALIACAO_TIPOS.map((t) => ({
				text: t.label,
				onPress: () => startDraft(t.key),
			})),
			{
				text: "Cancelar",
				style: "cancel",
			},
		]);
	}, [dispatch, pet?.id]);

	if (!id) {
		return (
			<SafeAreaView style={[styles.center, { backgroundColor: bg }]} edges={["left", "right"]}>
				<Text style={{ color: subtle }}>Pet inválido.</Text>
			</SafeAreaView>
		);
	}

	if (!pet) {
		return (
			<SafeAreaView style={[styles.center, { backgroundColor: bg }]} edges={["left", "right"]}>
				<ActivityIndicator />
				<Text style={{ color: subtle, marginTop: 10 }}>Carregando pet…</Text>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={["left", "right"]}>
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.header, { borderColor: border }]}>
					<View style={[styles.avatarBig, { backgroundColor: accent }]}>
						<IconSymbol name={icon} size={24} color="#fff" />
					</View>

					<View style={{ flex: 1, minWidth: 0 }}>
						<Text style={[styles.title, { color: text }]} numberOfLines={1}>
							{pet.nome}
						</Text>

						{!!detailsLine && (
							<Text style={[styles.infoText, { color: subtle }]} numberOfLines={1}>
								{detailsLine}
							</Text>
						)}

						{!!metricsLine && (
							<Text style={[styles.infoText, { color: subtle }]} numberOfLines={1}>
								{metricsLine}
							</Text>
						)}
					</View>

					<Pressable
						onPress={() =>
							router.push({
								pathname: "/(modals)/pet-new",
								params: { mode: "edit", id: String(pet.id) },
							})
						}
						hitSlop={10}
						accessibilityRole="button"
						accessibilityLabel="Editar pet"
						style={styles.editBtn}
					>
						<IconSymbol name="pencil.circle.fill" size={27} color={tint} />
					</Pressable>
				</View>

				{pet?.observacoes ? (
					<View
						style={[
							styles.noteCard,
							{
								borderColor: border,
								backgroundColor: "rgba(10,132,255,0.06)",
							},
						]}
					>
						<View style={styles.noteHeader}>
							<IconSymbol name="info.circle.fill" size={16} color={tint} />
							<Text style={{ color: text, fontWeight: "800" }}>Observações</Text>
						</View>

						<Text style={{ color: subtle, lineHeight: 20 }}>{pet.observacoes}</Text>
					</View>
				) : null}

				<View style={styles.grid}>
					<ActionCard
						title={pet.tutor?.nome ? `Tutor: ${pet.tutor.nome}` : "Tutor"}
						subtitle={pet.tutor?.id ? "Ver cadastro do tutor" : "Tutor não vinculado"}
						icon="person.crop.circle.fill"
						border={border}
						text={text}
						subtle={subtle}
						onPress={() => {
							if (!pet?.tutor?.id) {
								Alert.alert("Tutor não vinculado");
								return;
							}

							/*
							 * Pet aberto a partir do tutor:
							 * fecha o modal do pet e revela o tutor que já está embaixo.
							 */
							if (from === "tutor") {
								if (router.canDismiss()) {
									router.dismiss();
									return;
								}

								router.replace({
									pathname: "/(phone)/tutores/[id]",
									params: {
										id: String(tutorId || pet.tutor.id),
									},
								});

								return;
							}

							/*
							 * Pet aberto pela lista de pets:
							 * abre o tutor dentro do grupo de modais,
							 * preservando o detalhe do pet embaixo.
							 */
							router.push({
								pathname: "/(modals)/tutores/[id]/detail",
								params: {
									id: String(pet.tutor.id),
									from: "pet",
									petId: String(pet.id),
								},
							});
						}}
						onAdd={
							pet.tutor?.id
								? undefined
								: () =>
									Alert.alert(
										"Vincular tutor",
										"Escolher/vincular um tutor para este pet"
									)
						}
					/>

					<ActionCard
						title="Avaliações"
						subtitle="Anamnese, neurológica e ortopédica"
						icon="clipboard"
						border={border}
						text={text}
						subtle={subtle}
						onPress={() =>
							router.push({
								pathname: "/(modals)/pets/[id]/avaliacao",
								params: { id: String(pet.id), petName: pet?.nome },
							})
						}
						onAdd={handleAddDraft}
					/>

					<ActionCard
						title="Exames"
						subtitle="Arquivos, fotos e documentos"
						icon="doc.text.fill"
						border={border}
						text={text}
						subtle={subtle}
						onPress={() =>
							router.push({
								pathname: "/(modals)/pets/[id]/exam",
								params: { id: String(pet.id) },
							})
						}
						onAdd={handleAdd}
					/>

					<ActionCard
						title="Agenda"
						subtitle="Criar atendimento para este pet"
						icon="calendar"
						border={border}
						text={text}
						subtle={subtle}
						onPress={() =>
							router.push({
								pathname: "/(modals)/agenda-new",
								params: {
									tutorId: pet.tutor?.id ? String(pet.tutor.id) : "",
									tutorNome: pet.tutor?.nome || "",
									preselectPetId: String(pet.id),
								},
							})
						}
					/>

					<ActionCard
						title="Timeline"
						subtitle="Histórico completo do paciente"
						icon="clock.arrow.circlepath"
						border={border}
						text={text}
						subtle={subtle}
						onPress={() =>
							router.push({
								pathname:
									"/(modals)/pets/[id]/timeline",

								params: {
									id:
										String(pet.id),

									petName:
										pet.nome || "",
								},
							})
						}
					/>

					<ActionCard
						title="Fotos & Vídeos"
						subtitle="Em breve"
						icon="photo.on.rectangle"
						border={border}
						text={text}
						subtle={subtle}
						onPress={() => Alert.alert("Mídia", "Abrir galeria")}
					/>
				</View>
			</ScrollView>

			<UploadOverlay visible={uploading} progress={progress} />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},

	content: {
		padding: 16,
		gap: 16,
		paddingBottom: 28,
	},

	center: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},

	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		padding: 14,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 18,
		backgroundColor: "#FFFFFF",
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},

	avatarBig: {
		width: 52,
		height: 52,
		borderRadius: 26,
		alignItems: "center",
		justifyContent: "center",
	},

	title: {
		fontSize: 21,
		fontWeight: "850",
		letterSpacing: -0.4,
	},

	infoText: {
		marginTop: 2,
		fontSize: 13,
		fontWeight: "500",
	},

	editBtn: {
		alignSelf: "center",
	},

	noteCard: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 16,
		padding: 14,
	},

	noteHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 6,
	},

	grid: {
		gap: 12,
	},

	card: {
		flexDirection: "row",
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		gap: 12,
		padding: 14,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 16,
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 1,
	},

	cardIcon: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(15,23,42,0.82)",
	},

	cardTitle: {
		fontSize: 16,
		fontWeight: "800",
	},

	cardSubtitle: {
		fontSize: 12,
		fontWeight: "500",
		marginTop: 2,
	},

	addBtn: {
		marginRight: 2,
	},

	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.45)",
		alignItems: "center",
		justifyContent: "center",
	},

	overlayCard: {
		backgroundColor: "#111827",
		paddingVertical: 18,
		paddingHorizontal: 16,
		borderRadius: 14,
		minWidth: 220,
		alignItems: "center",
	},

	overlayTitle: {
		color: "white",
		marginTop: 10,
		fontWeight: "800",
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
		backgroundColor: "white",
	},

	overlaySub: {
		color: "#9CA3AF",
		marginTop: 8,
		fontSize: 12,
	},
});