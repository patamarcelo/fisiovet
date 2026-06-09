// app/(modals)/avaliacao/avaliacao-ortopedica.jsx
// @ts-nocheck
import { useEffect, useState, useCallback } from "react";
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	TextInput,
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Keyboard,
	SafeAreaView,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { ensureFirebase } from "@/firebase/firebase";
import {
	createDraft,
	updateDraftField,
	clearDraft,
	replaceDraft,
} from "@/src/store/slices/avaliacaoSlice";

/* ---------- UI helpers ---------- */

function SectionTitle({ children }) {
	return (
		<Text
			style={{
				fontWeight: "800",
				fontSize: 16,
				marginBottom: 8,
				color: "#111827",
			}}
		>
			{children}
		</Text>
	);
}

function Card({ children, filled = false }) {
	return (
		<View
			style={{
				backgroundColor: "white",
				borderRadius: 12,
				padding: 12,
				borderWidth: 1.5,
				borderColor: filled ? "#16A34A" : "rgba(0,0,0,0.06)",
			}}
		>
			{children}
		</View>
	);
}

function DisabledOverlay({ disabled, children }) {
	if (!disabled) return children;

	return (
		<View style={{ opacity: 0.55 }}>
			<View pointerEvents="none">{children}</View>
		</View>
	);
}

function LabeledTextArea({
	label,
	value,
	onChangeText,
	placeholder,
	disabled,
	minHeight = 80,
}) {
	const filled = !!value?.trim?.();

	return (
		<View style={{ marginBottom: 12 }}>
			{!!label && (
				<Text
					style={{
						fontWeight: "600",
						color: "#111827",
						marginBottom: 6,
					}}
				>
					{label}
				</Text>
			)}

			<View
				style={{
					borderWidth: 1.5,
					borderRadius: 10,
					borderColor: filled ? "#16A34A" : "rgba(0,0,0,0.15)",
					backgroundColor: disabled ? "rgba(0,0,0,0.03)" : "white",
					paddingHorizontal: 10,
					paddingVertical: 8,
				}}
			>
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor="#9CA3AF"
					editable={!disabled}
					multiline
					textAlignVertical="top"
					style={{
						minHeight,
						color: "#111827",
						opacity: disabled ? 0.6 : 1,
					}}
				/>
			</View>
		</View>
	);
}

function CheckboxRow({ label, value, onChange, disabled }) {
	const filled = !!value;

	return (
		<TouchableOpacity
			activeOpacity={0.7}
			onPress={() => (!disabled ? onChange(!value) : null)}
			style={{
				flexDirection: "row",
				alignItems: "center",
				paddingVertical: 8,
			}}
		>
			<Ionicons
				name={value ? "checkbox-outline" : "square-outline"}
				size={20}
				color={filled ? "#16A34A" : "#9CA3AF"}
			/>

			<Text
				style={{
					marginLeft: 10,
					color: "#111827",
					fontWeight: filled ? "600" : "400",
				}}
			>
				{label}
			</Text>
		</TouchableOpacity>
	);
}

function ChipRadioGroup({
	label,
	subtitle,
	value,
	options,
	onChange,
	disabled,
}) {
	return (
		<View style={{ marginBottom: 10 }}>
			{!!label && (
				<Text
					style={{
						fontWeight: "600",
						color: "#111827",
						marginBottom: 6,
					}}
				>
					{label}
				</Text>
			)}

			{!!subtitle && (
				<Text
					style={{
						fontWeight: "400",
						color: "#6B7280",
						marginBottom: 6,
						fontSize: 11,
					}}
				>
					{subtitle}
				</Text>
			)}

			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
				{options.map((opt) => {
					const selected = value === opt.value;

					return (
						<TouchableOpacity
							key={opt.value}
							disabled={disabled}
							onPress={() => onChange(opt.value)}
							style={{
								flexDirection: "row",
								alignItems: "center",
								paddingHorizontal: 12,
								paddingVertical: 8,
								borderRadius: 999,
								borderWidth: 1.5,
								borderColor: selected ? "#2563EB" : "rgba(0,0,0,0.15)",
								backgroundColor: selected ? "rgba(37,99,235,0.08)" : "white",
								opacity: disabled ? 0.6 : 1,
							}}
						>
							<Ionicons
								name={selected ? "radio-button-on" : "radio-button-off"}
								size={16}
								color={selected ? "#2563EB" : "#9CA3AF"}
							/>

							<Text
								style={{
									marginLeft: 6,
									color: "#111827",
									fontWeight: selected ? "700" : "500",
								}}
							>
								{opt.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</View>
	);
}

/* ---------- Firestore helpers ---------- */

async function fetchAvaliacaoOrtopedica({
	firestore,
	uid,
	petId,
	avaliacaoId,
}) {
	const ref = firestore
		.collection("users")
		.doc(String(uid))
		.collection("pets")
		.doc(String(petId))
		.collection("avaliacoes")
		.doc(String(avaliacaoId));

	const snap = await ref.get();

	if (!snap.exists) return null;

	return { id: snap.id, ...snap.data() };
}

export async function saveNewOrtopedica({
	firestore,
	firestoreModule,
	uid,
	petId,
	payload,
}) {
	const col = firestore
		.collection("users")
		.doc(String(uid))
		.collection("pets")
		.doc(String(petId))
		.collection("avaliacoes");

	const ref = col.doc();
	const now = firestoreModule.FieldValue.serverTimestamp();

	await ref.set({
		...payload,
		createdAt: now,
		updatedAt: now,
		type: "ortopedica",
	});

	return ref.id;
}

export async function updateOrtopedica({
	firestore,
	firestoreModule,
	uid,
	petId,
	avaliacaoId,
	payload,
}) {
	const ref = firestore
		.collection("users")
		.doc(String(uid))
		.collection("pets")
		.doc(String(petId))
		.collection("avaliacoes")
		.doc(String(avaliacaoId));

	await ref.update({
		...payload,
		updatedAt: firestoreModule.FieldValue.serverTimestamp(),
	});
}

async function deleteOrtopedica({
	firestore,
	uid,
	petId,
	avaliacaoId,
}) {
	const ref = firestore
		.collection("users")
		.doc(String(uid))
		.collection("pets")
		.doc(String(petId))
		.collection("avaliacoes")
		.doc(String(avaliacaoId));

	await ref.delete();
}

/* ---------- Draft ---------- */

function normalizeOrtopedicaDraft(petId, docData) {
	const base = {
		id: docData?.id,
		petId,
		title: "",
		tipo: "ortopedica",
		textos: {
			queixaPrincipal: "",
			historicoOrtopedico: "",
			inspecaoEstatica: "",
			inspecaoDinamica: "",
			palpacao: "",
			amplitudeMovimento: "",
			dor: "",
			observacoesGerais: "",
		},
		localizacao: {
			membroToracicoDireito: false,
			membroToracicoEsquerdo: false,
			membroPelvicoDireito: false,
			membroPelvicoEsquerdo: false,
			colunaCervical: false,
			colunaToracica: false,
			colunaLombar: false,
			pelve: false,
		},
		marcha: {
			claudicacao: "ausente",
			apoio: "normal",
			compensacao: "ausente",
		},
		dor: {
			nivel: "leve",
			respostaPalpacao: "normal",
		},
		funcional: {
			levantaSozinho: false,
			caminhaSemApoio: false,
			sobeEscadas: false,
			salta: false,
			escorrega: false,
			dificuldadeSentarLevantar: false,
		},
		conduta: {
			analgesia: false,
			exerciciosTerapeuticos: false,
			eletroterapia: false,
			crioterapia: false,
			termoterapia: false,
			orientacaoAmbiental: false,
		},
	};

	const fields = docData?.fields || {};

	return {
		...base,
		title: docData?.title ?? "",
		tipo: docData?.tipo ?? "ortopedica",
		textos: {
			...base.textos,
			...(fields.textos || {}),
		},
		localizacao: {
			...base.localizacao,
			...(fields.localizacao || {}),
		},
		marcha: {
			...base.marcha,
			...(fields.marcha || {}),
		},
		dor: {
			...base.dor,
			...(fields.dor || {}),
		},
		funcional: {
			...base.funcional,
			...(fields.funcional || {}),
		},
		conduta: {
			...base.conduta,
			...(fields.conduta || {}),
		},
	};
}

const hasTrue = (obj) => {
	if (!obj || typeof obj !== "object") return false;
	return Object.values(obj).some(Boolean);
};

const hasAlteredValue = (obj, normalValues = ["normal", "ausente"]) => {
	if (!obj || typeof obj !== "object") return false;
	return Object.values(obj).some((v) => !!v && !normalValues.includes(v));
};

/* ---------- Screen ---------- */

export default function AvaliacaoOrtopedica() {
	const { id: petId, avaliacaoId } = useLocalSearchParams();
	const dispatch = useDispatch();

	const { auth, firestore, firestoreModule } = ensureFirebase() || {};

	const isExisting = !!avaliacaoId;

	const draft = useSelector((s) => s.avaliacao?.draftsByPet?.[petId]);

	const [editing, setEditing] = useState(!isExisting);
	const [loading, setLoading] = useState(isExisting);
	const [saving, setSaving] = useState(false);
	const [original, setOriginal] = useState(null);

	useEffect(() => {
		if (!petId) return;

		if (!isExisting && !draft) {
			const seed = normalizeOrtopedicaDraft(String(petId), null);

			dispatch(
				replaceDraft({
					petId: String(petId),
					draft: seed,
				})
			);
		}
	}, [dispatch, petId, isExisting, draft]);

	useEffect(() => {
		(async () => {
			if (!isExisting || !firestore || !auth?.currentUser?.uid) return;

			try {
				setLoading(true);

				const uid = auth.currentUser.uid;

				const doc = await fetchAvaliacaoOrtopedica({
					firestore,
					uid,
					petId: String(petId),
					avaliacaoId: String(avaliacaoId),
				});

				const seed = normalizeOrtopedicaDraft(String(petId), doc || {});

				setOriginal(seed);

				dispatch(
					replaceDraft({
						petId: String(petId),
						draft: seed,
					})
				);
			} catch (e) {
				console.log("fetch ortopedica error", e);
				Alert.alert("Avaliação ortopédica", "Não foi possível carregar.");
				router.back();
			} finally {
				setLoading(false);
			}
		})();
	}, [
		isExisting,
		firestore,
		auth,
		petId,
		avaliacaoId,
		dispatch,
	]);

	const updateTitle = useCallback(
		(text) => {
			dispatch(
				updateDraftField({
					petId: String(petId),
					path: ["title"],
					value: text,
				})
			);
		},
		[dispatch, petId]
	);

	const updateTexto = useCallback(
		(field, val) => {
			const atual = draft?.textos || {};

			dispatch(
				updateDraftField({
					petId: String(petId),
					path: ["textos"],
					value: { ...atual, [field]: val },
				})
			);
		},
		[dispatch, petId, draft?.textos]
	);

	const updateLocalizacao = useCallback(
		(field, val) => {
			const atual = draft?.localizacao || {};

			dispatch(
				updateDraftField({
					petId: String(petId),
					path: ["localizacao"],
					value: { ...atual, [field]: val },
				})
			);
		},
		[dispatch, petId, draft?.localizacao]
	);

	const updateMarcha = useCallback(
		(field, val) => {
			const atual = draft?.marcha || {};

			dispatch(
				updateDraftField({
					petId: String(petId),
					path: ["marcha"],
					value: { ...atual, [field]: val },
				})
			);
		},
		[dispatch, petId, draft?.marcha]
	);

	const updateDor = useCallback(
		(field, val) => {
			const atual = draft?.dor || {};

			dispatch(
				updateDraftField({
					petId: String(petId),
					path: ["dor"],
					value: { ...atual, [field]: val },
				})
			);
		},
		[dispatch, petId, draft?.dor]
	);

	const updateFuncional = useCallback(
		(field, val) => {
			const atual = draft?.funcional || {};

			dispatch(
				updateDraftField({
					petId: String(petId),
					path: ["funcional"],
					value: { ...atual, [field]: val },
				})
			);
		},
		[dispatch, petId, draft?.funcional]
	);

	const updateConduta = useCallback(
		(field, val) => {
			const atual = draft?.conduta || {};

			dispatch(
				updateDraftField({
					petId: String(petId),
					path: ["conduta"],
					value: { ...atual, [field]: val },
				})
			);
		},
		[dispatch, petId, draft?.conduta]
	);

	const handleSave = useCallback(async () => {
		try {
			if (!draft) return;

			if (!auth?.currentUser?.uid) {
				return Alert.alert(
					"Avaliação ortopédica",
					"Usuário não autenticado."
				);
			}

			const uid = auth.currentUser.uid;

			setSaving(true);

			const payload = {
				title: draft.title?.trim() || "",
				type: "ortopedica",
				tipo: "ortopedica",
				petId: String(petId),
				fields: {
					textos: draft.textos || {},
					localizacao: draft.localizacao || {},
					marcha: draft.marcha || {},
					dor: draft.dor || {},
					funcional: draft.funcional || {},
					conduta: draft.conduta || {},
				},
			};

			if (isExisting) {
				await updateOrtopedica({
					firestore,
					firestoreModule,
					uid,
					petId: String(petId),
					avaliacaoId: String(avaliacaoId),
					payload,
				});

				setOriginal(normalizeOrtopedicaDraft(String(petId), payload));
				setEditing(false);

				Alert.alert("Avaliação ortopédica", "Alterações salvas!");
			} else {
				await saveNewOrtopedica({
					firestore,
					firestoreModule,
					uid,
					petId: String(petId),
					payload,
				});

				Alert.alert("Avaliação ortopédica", "Registro criado!");
			}

			router.replace({
				pathname: "/(phone)/pacientes/[id]/avaliacao",
				params: { id: String(petId) },
			});

			dispatch(clearDraft({ petId: String(petId) }));
		} catch (e) {
			console.log("save ortopedica error", e);
			Alert.alert("Avaliação ortopédica", "Não foi possível salvar.");
		} finally {
			setSaving(false);
		}
	}, [
		draft,
		isExisting,
		avaliacaoId,
		firestore,
		firestoreModule,
		auth,
		petId,
		dispatch,
	]);

	const handleDelete = useCallback(() => {
		if (!isExisting) return;

		const uid = auth?.currentUser?.uid;

		if (!uid) {
			Alert.alert("Avaliação ortopédica", "Usuário não autenticado.");
			return;
		}

		Alert.alert(
			"Apagar avaliação",
			"Tem certeza que deseja apagar este registro?",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Apagar",
					style: "destructive",
					onPress: async () => {
						try {
							await deleteOrtopedica({
								firestore,
								uid,
								petId: String(petId),
								avaliacaoId: String(avaliacaoId),
							});

							dispatch(clearDraft({ petId: String(petId) }));

							router.replace({
								pathname: "/(phone)/pacientes/[id]/avaliacao",
								params: { id: String(petId) },
							});
						} catch (e) {
							console.log("delete ortopedica error", e);

							Alert.alert(
								"Avaliação ortopédica",
								"Não foi possível apagar."
							);
						}
					},
				},
			]
		);
	}, [
		isExisting,
		auth,
		firestore,
		petId,
		avaliacaoId,
		dispatch,
	]);

	const goBackToAvaliacaoList = useCallback(() => {
		dispatch(clearDraft({ petId: String(petId) }));

		if (router.canGoBack?.()) {
			router.back();
			return;
		}

		router.replace({
			pathname: "/(phone)/pacientes/[id]/avaliacao",
			params: { id: String(petId) },
		});
	}, [dispatch, petId]);

	const cancelEditing = useCallback(() => {
		setEditing(false);

		if (original) {
			dispatch(
				replaceDraft({
					petId: String(petId),
					draft: original,
				})
			);
		}
	}, [dispatch, petId, original]);

	const cancelNew = useCallback(() => {
		dispatch(clearDraft({ petId: String(petId) }));

		if (router.canGoBack?.()) {
			router.back();
			return;
		}

		router.replace({
			pathname: "/(phone)/pacientes/[id]/avaliacao",
			params: { id: String(petId) },
		});
	}, [dispatch, petId]);

	if (loading) {
		return (
			<>
				<Stack.Screen
					options={{
						title: "Avaliação Ortopédica",
						headerBackTitleVisible: false,
						headerLargeTitle: false,
					}}
				/>

				<View
					style={{
						flex: 1,
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "#F3F4F6",
					}}
				>
					<ActivityIndicator />
					<Text
						style={{
							marginTop: 10,
							color: "#6B7280",
							fontWeight: "600",
						}}
					>
						Carregando avaliação…
					</Text>
				</View>
			</>
		);
	}

	const disabled = !editing;

	const localizacaoFilled = hasTrue(draft?.localizacao);
	const marchaFilled = hasAlteredValue(draft?.marcha);
	const dorFilled = hasAlteredValue(draft?.dor, ["normal", "leve"]);
	const funcionalFilled = hasTrue(draft?.funcional);
	const condutaFilled = hasTrue(draft?.conduta);

	return (
		<KeyboardAvoidingView
			behavior={Platform.select({
				ios: "padding",
				android: undefined,
			})}
			style={{
				flex: 1,
				backgroundColor: "#F3F4F6",
			}}
		>
			<Stack.Screen
				options={{
					title: "Avaliação Ortopédica",
					headerLeft: () => {
						if (isExisting && !editing) {
							return (
								<TouchableOpacity
									onPress={goBackToAvaliacaoList}
									style={{
										paddingHorizontal: 8,
										flexDirection: "row",
										alignItems: "center",
										gap: 4,
									}}
									hitSlop={10}
								>
									<Ionicons name="chevron-back" size={22} color="#2563EB" />
									<Text
										style={{
											color: "#2563EB",
											fontWeight: "700",
										}}
									>
										Voltar
									</Text>
								</TouchableOpacity>
							);
						}

						if (isExisting && editing) {
							return (
								<TouchableOpacity
									onPress={cancelEditing}
									style={{ paddingHorizontal: 8 }}
									hitSlop={10}
								>
									<Text
										style={{
											color: "#FF3B30",
											fontWeight: "700",
										}}
									>
										Cancelar
									</Text>
								</TouchableOpacity>
							);
						}

						return (
							<TouchableOpacity
								onPress={cancelNew}
								style={{ paddingHorizontal: 8 }}
								hitSlop={10}
							>
								<Text
									style={{
										color: "#FF3B30",
										fontWeight: "700",
									}}
								>
									Cancelar
								</Text>
							</TouchableOpacity>
						);
					},
					headerRight: () => {
						if (isExisting && !editing) {
							return (
								<TouchableOpacity
									onPress={() => setEditing(true)}
									style={{ paddingHorizontal: 8 }}
									hitSlop={10}
								>
									<Text
										style={{
											color: "#2563EB",
											fontWeight: "700",
										}}
									>
										Editar
									</Text>
								</TouchableOpacity>
							);
						}

						if (isExisting && editing) {
							return (
								<TouchableOpacity
									onPress={handleDelete}
									style={{ paddingHorizontal: 8 }}
									accessibilityLabel="Apagar avaliação"
									hitSlop={10}
								>
									<Ionicons name="trash-outline" size={22} color="#FF3B30" />
								</TouchableOpacity>
							);
						}

						return null;
					},
				}}
			/>

			<ScrollView
				contentContainerStyle={{
					padding: 16,
					paddingBottom: 140,
					paddingRight: 8,
				}}
				keyboardShouldPersistTaps="handled"
				onScrollBeginDrag={Keyboard.dismiss}
				showsVerticalScrollIndicator
				indicatorStyle="black"
				scrollEventThrottle={16}
			>
				<SectionTitle>Título</SectionTitle>
				<Card filled={!!draft?.title?.trim?.()}>
					<DisabledOverlay disabled={!editing}>
						<TextInput
							placeholder="Ex.: Avaliação ortopédica inicial, retorno, pós-cirúrgica…"
							placeholderTextColor="#9CA3AF"
							value={draft?.title ?? ""}
							onChangeText={updateTitle}
							editable={editing}
							style={{
								height: 44,
								color: "#111827",
								opacity: editing ? 1 : 0.55,
							}}
						/>
					</DisabledOverlay>
				</Card>

				<View style={{ marginTop: 16 }}>
					<SectionTitle>1. Queixa e histórico</SectionTitle>

					<LabeledTextArea
						label="Queixa principal"
						value={draft?.textos?.queixaPrincipal || ""}
						onChangeText={(t) => updateTexto("queixaPrincipal", t)}
						placeholder="Descreva a queixa principal relatada pelo tutor."
						disabled={disabled}
						minHeight={80}
					/>

					<LabeledTextArea
						label="Histórico ortopédico"
						value={draft?.textos?.historicoOrtopedico || ""}
						onChangeText={(t) => updateTexto("historicoOrtopedico", t)}
						placeholder="Traumas, cirurgias, luxações, fraturas, diagnóstico prévio, evolução do quadro…"
						disabled={disabled}
						minHeight={100}
					/>
				</View>

				<View style={{ marginTop: 16 }}>
					<SectionTitle>2. Localização principal</SectionTitle>

					<Card filled={localizacaoFilled}>
						<DisabledOverlay disabled={disabled}>
							<CheckboxRow
								label="Membro torácico direito"
								value={!!draft?.localizacao?.membroToracicoDireito}
								onChange={(v) => updateLocalizacao("membroToracicoDireito", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Membro torácico esquerdo"
								value={!!draft?.localizacao?.membroToracicoEsquerdo}
								onChange={(v) => updateLocalizacao("membroToracicoEsquerdo", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Membro pélvico direito"
								value={!!draft?.localizacao?.membroPelvicoDireito}
								onChange={(v) => updateLocalizacao("membroPelvicoDireito", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Membro pélvico esquerdo"
								value={!!draft?.localizacao?.membroPelvicoEsquerdo}
								onChange={(v) => updateLocalizacao("membroPelvicoEsquerdo", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Coluna cervical"
								value={!!draft?.localizacao?.colunaCervical}
								onChange={(v) => updateLocalizacao("colunaCervical", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Coluna torácica"
								value={!!draft?.localizacao?.colunaToracica}
								onChange={(v) => updateLocalizacao("colunaToracica", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Coluna lombar"
								value={!!draft?.localizacao?.colunaLombar}
								onChange={(v) => updateLocalizacao("colunaLombar", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Pelve"
								value={!!draft?.localizacao?.pelve}
								onChange={(v) => updateLocalizacao("pelve", v)}
								disabled={disabled}
							/>
						</DisabledOverlay>
					</Card>
				</View>

				<View style={{ marginTop: 16 }}>
					<SectionTitle>3. Inspeção e marcha</SectionTitle>

					<Card filled={marchaFilled}>
						<DisabledOverlay disabled={disabled}>
							<ChipRadioGroup
								label="Claudicação"
								value={draft?.marcha?.claudicacao || "ausente"}
								onChange={(v) => updateMarcha("claudicacao", v)}
								disabled={disabled}
								options={[
									{ label: "Ausente", value: "ausente" },
									{ label: "Leve", value: "leve" },
									{ label: "Moderada", value: "moderada" },
									{ label: "Intensa", value: "intensa" },
								]}
							/>

							<ChipRadioGroup
								label="Apoio"
								value={draft?.marcha?.apoio || "normal"}
								onChange={(v) => updateMarcha("apoio", v)}
								disabled={disabled}
								options={[
									{ label: "Normal", value: "normal" },
									{ label: "Parcial", value: "parcial" },
									{ label: "Sem apoio", value: "semApoio" },
								]}
							/>

							<ChipRadioGroup
								label="Compensação"
								value={draft?.marcha?.compensacao || "ausente"}
								onChange={(v) => updateMarcha("compensacao", v)}
								disabled={disabled}
								options={[
									{ label: "Ausente", value: "ausente" },
									{ label: "Presente", value: "presente" },
								]}
							/>
						</DisabledOverlay>
					</Card>

					<View style={{ height: 12 }} />

					<LabeledTextArea
						label="Inspeção estática"
						value={draft?.textos?.inspecaoEstatica || ""}
						onChangeText={(t) => updateTexto("inspecaoEstatica", t)}
						placeholder="Postura, apoio, assimetria, desvio, edema, atrofia, aumento de volume…"
						disabled={disabled}
						minHeight={90}
					/>

					<LabeledTextArea
						label="Inspeção dinâmica"
						value={draft?.textos?.inspecaoDinamica || ""}
						onChangeText={(t) => updateTexto("inspecaoDinamica", t)}
						placeholder="Marcha, trote, mudança de direção, compensações e alterações funcionais…"
						disabled={disabled}
						minHeight={90}
					/>
				</View>

				<View style={{ marginTop: 16 }}>
					<SectionTitle>4. Palpação, dor e amplitude</SectionTitle>

					<Card filled={dorFilled}>
						<DisabledOverlay disabled={disabled}>
							<ChipRadioGroup
								label="Nível de dor"
								value={draft?.dor?.nivel || "leve"}
								onChange={(v) => updateDor("nivel", v)}
								disabled={disabled}
								options={[
									{ label: "Leve", value: "leve" },
									{ label: "Moderada", value: "moderada" },
									{ label: "Intensa", value: "intensa" },
								]}
							/>

							<ChipRadioGroup
								label="Resposta à palpação"
								value={draft?.dor?.respostaPalpacao || "normal"}
								onChange={(v) => updateDor("respostaPalpacao", v)}
								disabled={disabled}
								options={[
									{ label: "Normal", value: "normal" },
									{ label: "Sensível", value: "sensivel" },
									{ label: "Dolorido", value: "dolorido" },
									{ label: "Não permite", value: "naoPermite" },
								]}
							/>
						</DisabledOverlay>
					</Card>

					<View style={{ height: 12 }} />

					<LabeledTextArea
						label="Palpação"
						value={draft?.textos?.palpacao || ""}
						onChangeText={(t) => updateTexto("palpacao", t)}
						placeholder="Temperatura, edema, dor localizada, crepitação, contratura, sensibilidade muscular/articular…"
						disabled={disabled}
						minHeight={90}
					/>

					<LabeledTextArea
						label="Amplitude de movimento"
						value={draft?.textos?.amplitudeMovimento || ""}
						onChangeText={(t) => updateTexto("amplitudeMovimento", t)}
						placeholder="Flexão/extensão, restrições, dor ao movimento, comparação bilateral…"
						disabled={disabled}
						minHeight={90}
					/>

					<LabeledTextArea
						label="Descrição da dor"
						value={draft?.textos?.dor || ""}
						onChangeText={(t) => updateTexto("dor", t)}
						placeholder="Localização, intensidade, fatores que pioram/melhoram, dor aguda/crônica…"
						disabled={disabled}
						minHeight={80}
					/>
				</View>

				<View style={{ marginTop: 16 }}>
					<SectionTitle>5. Funcionalidade</SectionTitle>

					<Card filled={funcionalFilled}>
						<DisabledOverlay disabled={disabled}>
							<CheckboxRow
								label="Levanta sozinho"
								value={!!draft?.funcional?.levantaSozinho}
								onChange={(v) => updateFuncional("levantaSozinho", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Caminha sem apoio"
								value={!!draft?.funcional?.caminhaSemApoio}
								onChange={(v) => updateFuncional("caminhaSemApoio", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Sobe escadas"
								value={!!draft?.funcional?.sobeEscadas}
								onChange={(v) => updateFuncional("sobeEscadas", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Salta"
								value={!!draft?.funcional?.salta}
								onChange={(v) => updateFuncional("salta", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Escorrega"
								value={!!draft?.funcional?.escorrega}
								onChange={(v) => updateFuncional("escorrega", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Dificuldade para sentar/levantar"
								value={!!draft?.funcional?.dificuldadeSentarLevantar}
								onChange={(v) => updateFuncional("dificuldadeSentarLevantar", v)}
								disabled={disabled}
							/>
						</DisabledOverlay>
					</Card>
				</View>

				<View style={{ marginTop: 16 }}>
					<SectionTitle>6. Conduta inicial</SectionTitle>

					<Card filled={condutaFilled}>
						<DisabledOverlay disabled={disabled}>
							<CheckboxRow
								label="Analgesia / controle de dor"
								value={!!draft?.conduta?.analgesia}
								onChange={(v) => updateConduta("analgesia", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Exercícios terapêuticos"
								value={!!draft?.conduta?.exerciciosTerapeuticos}
								onChange={(v) => updateConduta("exerciciosTerapeuticos", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Eletroterapia"
								value={!!draft?.conduta?.eletroterapia}
								onChange={(v) => updateConduta("eletroterapia", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Crioterapia"
								value={!!draft?.conduta?.crioterapia}
								onChange={(v) => updateConduta("crioterapia", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Termoterapia"
								value={!!draft?.conduta?.termoterapia}
								onChange={(v) => updateConduta("termoterapia", v)}
								disabled={disabled}
							/>
							<CheckboxRow
								label="Orientação ambiental"
								value={!!draft?.conduta?.orientacaoAmbiental}
								onChange={(v) => updateConduta("orientacaoAmbiental", v)}
								disabled={disabled}
							/>
						</DisabledOverlay>
					</Card>
				</View>

				<View style={{ marginTop: 16 }}>
					<SectionTitle>7. Observações gerais</SectionTitle>

					<LabeledTextArea
						label=""
						value={draft?.textos?.observacoesGerais || ""}
						onChangeText={(t) => updateTexto("observacoesGerais", t)}
						placeholder="Achados principais, suspeitas, objetivos terapêuticos, recomendações e observações importantes."
						disabled={disabled}
						minHeight={110}
					/>
				</View>
			</ScrollView>

			{editing && (
				<SafeAreaView
					style={{
						position: "absolute",
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: "white",
						borderTopWidth: 1,
						borderTopColor: "rgba(0,0,0,0.08)",
					}}
				>
					<View style={{ padding: 12 }}>
						<TouchableOpacity
							onPress={handleSave}
							disabled={saving}
							style={{
								backgroundColor: "#2563EB",
								height: 48,
								borderRadius: 12,
								alignItems: "center",
								justifyContent: "center",
								flexDirection: "row",
								opacity: saving ? 0.8 : 1,
							}}
						>
							{saving ? (
								<>
									<ActivityIndicator color="#fff" />
									<Text
										style={{
											color: "white",
											fontWeight: "700",
											marginLeft: 10,
										}}
									>
										Salvando…
									</Text>
								</>
							) : (
								<>
									<Ionicons
										name="checkmark"
										size={18}
										color="#fff"
									/>
									<Text
										style={{
											color: "white",
											fontWeight: "700",
											marginLeft: 6,
										}}
									>
										Salvar
									</Text>
								</>
							)}
						</TouchableOpacity>
					</View>
				</SafeAreaView>
			)}
		</KeyboardAvoidingView>
	);
}