// app/(modals)/avaliacao/avaliacao-ortopedica.jsx
// @ts-nocheck

import React, { useEffect, useState, useCallback } from "react";
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
	StyleSheet,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { ensureFirebase } from "@/firebase/firebase";
import {
	updateDraftField,
	clearDraft,
	replaceDraft,
} from "@/src/store/slices/avaliacaoSlice";

import { exportAvaliacoesPdf } from "@/src/services/avaliacaoPdf";

/* ---------- Firestore ---------- */
function toDate(value) {
	if (!value) {
		return null;
	}

	if (value instanceof Date) {
		return Number.isNaN(value.getTime())
			? null
			: value;
	}

	if (
		typeof value?.toDate ===
		"function"
	) {
		try {
			const date =
				value.toDate();

			return Number.isNaN(
				date.getTime()
			)
				? null
				: date;
		} catch {
			return null;
		}
	}

	if (value?._seconds) {
		const date =
			new Date(
				value._seconds * 1000
			);

		return Number.isNaN(
			date.getTime()
		)
			? null
			: date;
	}

	if (
		typeof value === "number"
	) {
		const date =
			new Date(
				value < 1e12
					? value * 1000
					: value
			);

		return Number.isNaN(
			date.getTime()
		)
			? null
			: date;
	}

	const date =
		new Date(value);

	return Number.isNaN(
		date.getTime()
	)
		? null
		: date;
}

function formatDocumentDate(value) {
	const date =
		toDate(value);

	if (!date) {
		return null;
	}

	return date.toLocaleString(
		"pt-BR",
		{
			day: "2-digit",
			month: "long",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}
	);
}

function serializeDate(value) {
	const date = toDate(value);

	return date
		? date.toISOString()
		: null;
}


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
		createdAt:
			docData?.createdAt ||
			null,

		updatedAt:
			docData?.updatedAt ||
			null,
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
		createdAt:
			serializeDate(
				docData?.createdAt
			),

		updatedAt:
			serializeDate(
				docData?.updatedAt
			),
		title: docData?.title ?? base.title,
		tipo: docData?.tipo ?? docData?.type ?? base.tipo,
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

/* ---------- Helpers ---------- */

const isFilled = (v) => {
	if (v == null) return false;
	if (typeof v === "string") return v.trim().length > 0;
	return !!v;
};

const formatEmpty = (value) => {
	if (!isFilled(value)) return "Não informado";
	return String(value).trim();
};

const hasTrue = (obj) => {
	if (!obj || typeof obj !== "object") return false;
	return Object.values(obj).some(Boolean);
};

const hasAlteredValue = (obj, normalValues = ["normal", "ausente"]) => {
	if (!obj || typeof obj !== "object") return false;
	return Object.values(obj).some((v) => !!v && !normalValues.includes(v));
};

const optionLabel = (options, value) => {
	return options.find((item) => item.value === value)?.label || "Não informado";
};

const localizacaoLabels = {
	membroToracicoDireito: "Membro torácico direito",
	membroToracicoEsquerdo: "Membro torácico esquerdo",
	membroPelvicoDireito: "Membro pélvico direito",
	membroPelvicoEsquerdo: "Membro pélvico esquerdo",
	colunaCervical: "Coluna cervical",
	colunaToracica: "Coluna torácica",
	colunaLombar: "Coluna lombar",
	pelve: "Pelve",
};

const funcionalLabels = {
	levantaSozinho: "Levanta sozinho",
	caminhaSemApoio: "Caminha sem apoio",
	sobeEscadas: "Sobe escadas",
	salta: "Salta",
	escorrega: "Escorrega",
	dificuldadeSentarLevantar: "Dificuldade para sentar/levantar",
};

const condutaLabels = {
	analgesia: "Analgesia / controle de dor",
	exerciciosTerapeuticos: "Exercícios terapêuticos",
	eletroterapia: "Eletroterapia",
	crioterapia: "Crioterapia",
	termoterapia: "Termoterapia",
	orientacaoAmbiental: "Orientação ambiental",
};

const claudicacaoOptions = [
	{ label: "Ausente", value: "ausente" },
	{ label: "Leve", value: "leve" },
	{ label: "Moderada", value: "moderada" },
	{ label: "Intensa", value: "intensa" },
];

const apoioOptions = [
	{ label: "Normal", value: "normal" },
	{ label: "Parcial", value: "parcial" },
	{ label: "Sem apoio", value: "semApoio" },
];

const compensacaoOptions = [
	{ label: "Ausente", value: "ausente" },
	{ label: "Presente", value: "presente" },
];

const nivelDorOptions = [
	{ label: "Leve", value: "leve" },
	{ label: "Moderada", value: "moderada" },
	{ label: "Intensa", value: "intensa" },
];

const respostaPalpacaoOptions = [
	{ label: "Normal", value: "normal" },
	{ label: "Sensível", value: "sensivel" },
	{ label: "Dolorido", value: "dolorido" },
	{ label: "Não permite", value: "naoPermite" },
];

/* ---------- UI Documento ---------- */

function getPetAgeLabel(pet = {}) {
	const directAge =
		pet?.idade ||
		pet?.age;

	if (directAge != null && String(directAge).trim()) {
		return String(directAge);
	}

	const birthDate =
		toDate(
			pet?.dataNascimento ||
			pet?.nascimento ||
			pet?.birthDate
		);

	if (!birthDate) {
		return null;
	}

	const today = new Date();

	let years =
		today.getFullYear() -
		birthDate.getFullYear();

	const monthDifference =
		today.getMonth() -
		birthDate.getMonth();

	if (
		monthDifference < 0 ||
		(
			monthDifference === 0 &&
			today.getDate() <
			birthDate.getDate()
		)
	) {
		years -= 1;
	}

	if (years > 0) {
		return `${years} ano${years === 1 ? "" : "s"}`;
	}

	const months = Math.max(
		0,
		(
			today.getFullYear() -
			birthDate.getFullYear()
		) * 12 +
		today.getMonth() -
		birthDate.getMonth()
	);

	return `${months} mês${months === 1 ? "" : "es"}`;
}

function PetInfoItem({
	icon,
	label,
	value,
}) {
	if (!isFilled(value)) {
		return null;
	}

	return (
		<View style={styles.petInfoItem}>
			<Ionicons
				name={icon}
				size={13}
				color="#64748B"
			/>

			<View style={styles.petInfoText}>
				<Text style={styles.petInfoLabel}>
					{label}
				</Text>

				<Text
					style={styles.petInfoValue}
					numberOfLines={1}
				>
					{String(value)}
				</Text>
			</View>
		</View>
	);
}

function DocumentHeader({
	title,
	createdAt,
	updatedAt,
	pet,
}) {
	const createdText =
		formatDocumentDate(createdAt);

	const updatedText =
		formatDocumentDate(updatedAt);

	const createdDate =
		toDate(createdAt);

	const updatedDate =
		toDate(updatedAt);

	const wasUpdated =
		createdDate &&
		updatedDate &&
		updatedDate.getTime() >
		createdDate.getTime() +
		1000;

	const petName =
		pet?.nome ||
		pet?.name ||
		"Paciente";

	const species =
		pet?.especie ||
		pet?.species ||
		null;

	const breed =
		pet?.raca ||
		pet?.breed ||
		null;

	const sex =
		pet?.sexo ||
		pet?.sex ||
		null;

	const weight =
		pet?.peso != null
			? `${pet.peso} kg`
			: pet?.weight != null
				? `${pet.weight} kg`
				: null;

	const age =
		getPetAgeLabel(pet);

	return (
		<View style={styles.clinicalHeader}>
			<View style={styles.clinicalHeaderTop}>
				<View style={styles.clinicalAvatar}>
					<Ionicons
						name="paw"
						size={22}
						color="#166534"
					/>
				</View>

				<View style={styles.clinicalHeaderMain}>
					<Text style={styles.clinicalEyebrow}>
						PACIENTE
					</Text>

					<Text
						style={styles.clinicalPatientName}
						numberOfLines={1}
					>
						{petName}
					</Text>

					<View style={styles.clinicalMetaLine}>
						{[species, breed]
							.filter(isFilled)
							.map((item, index) => (
								<React.Fragment key={`${item}-${index}`}>
									{index > 0 && (
										<View style={styles.clinicalMetaDot} />
									)}

									<Text style={styles.clinicalMetaText}>
										{item}
									</Text>
								</React.Fragment>
							))}
					</View>
				</View>

				<View style={styles.clinicalTypeBadge}>
					<Ionicons
						name="body-outline"
						size={12}
						color="#166534"
					/>

					<Text style={styles.clinicalTypeBadgeText}>
						ORTOPÉDICA
					</Text>
				</View>
			</View>

			<View style={styles.clinicalDivider} />

			<View style={styles.clinicalInfoRow}>
				<PetInfoItem
					icon="male-female-outline"
					label="Sexo"
					value={sex}
				/>

				<PetInfoItem
					icon="calendar-outline"
					label="Idade"
					value={age}
				/>

				<PetInfoItem
					icon="scale-outline"
					label="Peso"
					value={weight}
				/>
			</View>

			<View style={styles.clinicalDocumentBlock}>
				<Text style={styles.clinicalDocumentEyebrow}>
					DOCUMENTO CLÍNICO
				</Text>

				<Text
					style={styles.clinicalDocumentTitle}
					numberOfLines={2}
				>
					{title ||
						"Avaliação ortopédica"}
				</Text>

				{!!createdText && (
					<View style={styles.clinicalDateRow}>
						<Ionicons
							name="calendar-outline"
							size={12}
							color="#4B5563"
						/>

						<Text style={styles.clinicalDateText}>
							Criado em {createdText}
						</Text>
					</View>
				)}

				{wasUpdated && (
					<Text style={styles.clinicalUpdatedText}>
						Atualizado em {updatedText}
					</Text>
				)}
			</View>
		</View>
	);
}

function DocumentSection({ number, title, children }) {
	return (
		<View style={styles.docSection}>
			<View style={styles.docSectionHeader}>
				{!!number && (
					<View style={styles.docSectionNumber}>
						<Text style={styles.docSectionNumberText}>{number}</Text>
					</View>
				)}

				<Text style={styles.docSectionTitle}>{title}</Text>
			</View>

			<View style={styles.docSectionBody}>{children}</View>
		</View>
	);
}

function DocField({ label, value, multiline = false }) {
	const filled = isFilled(value);

	return (
		<View style={styles.docField}>
			<Text style={styles.docFieldLabel}>{label}</Text>

			<Text
				style={[
					styles.docFieldValue,
					!filled && styles.docFieldEmpty,
					multiline && styles.docFieldMultiline,
				]}
			>
				{formatEmpty(value)}
			</Text>
		</View>
	);
}

function DocSelectedList({ labels, values }) {
	const selected = Object.entries(values || {})
		.filter(([, value]) => Boolean(value))
		.map(([key]) => labels[key])
		.filter(Boolean);

	if (!selected.length) {
		return (
			<Text style={styles.emptyBlock}>
				Nenhum item selecionado.
			</Text>
		);
	}

	return (
		<View style={styles.selectedList}>
			{selected.map((label, index) => (
				<View
					key={label}
					style={[
						styles.selectedRow,
						index !== selected.length - 1 && styles.selectedRowBorder,
					]}
				>
					<View style={styles.selectedIcon}>
						<Ionicons name="checkmark" size={11} color="#15803D" />
					</View>

					<Text style={styles.selectedText}>{label}</Text>
				</View>
			))}
		</View>
	);
}

function DocStatusRow({ label, value, normalValue }) {
	const isNormal = value === normalValue;

	return (
		<View style={styles.statusRow}>
			<Text style={styles.statusLabel} numberOfLines={2}>
				{label}
			</Text>

			<View
				style={[
					styles.statusPill,
					isNormal ? styles.statusPillNormal : styles.statusPillChanged,
				]}
			>
				<View
					style={[
						styles.statusDot,
						isNormal ? styles.statusDotNormal : styles.statusDotChanged,
					]}
				/>

				<Text
					style={[
						styles.statusPillText,
						isNormal ? styles.statusTextNormal : styles.statusTextChanged,
					]}
					numberOfLines={1}
				>
					{value}
				</Text>
			</View>
		</View>
	);
}

function DocumentView({ draft, pet }) {
	return (
		<ScrollView
			contentContainerStyle={styles.documentContent}
			showsVerticalScrollIndicator
		>
			<DocumentHeader
				title={draft?.title}
				createdAt={draft?.createdAt}
				updatedAt={draft?.updatedAt}
				pet={pet}
			/>

			<DocumentSection number="1" title="Queixa e histórico">
				<DocField
					label="Queixa principal"
					value={draft?.textos?.queixaPrincipal}
					multiline
				/>

				<DocField
					label="Histórico ortopédico"
					value={draft?.textos?.historicoOrtopedico}
					multiline
				/>
			</DocumentSection>

			<DocumentSection number="2" title="Localização principal">
				<DocSelectedList
					labels={localizacaoLabels}
					values={draft?.localizacao}
				/>
			</DocumentSection>

			<DocumentSection number="3" title="Inspeção e marcha">
				<DocStatusRow
					label="Claudicação"
					value={optionLabel(claudicacaoOptions, draft?.marcha?.claudicacao || "ausente")}
					normalValue="Ausente"
				/>

				<DocStatusRow
					label="Apoio"
					value={optionLabel(apoioOptions, draft?.marcha?.apoio || "normal")}
					normalValue="Normal"
				/>

				<DocStatusRow
					label="Compensação"
					value={optionLabel(compensacaoOptions, draft?.marcha?.compensacao || "ausente")}
					normalValue="Ausente"
				/>

				<View style={styles.docInlineDivider} />

				<DocField
					label="Inspeção estática"
					value={draft?.textos?.inspecaoEstatica}
					multiline
				/>

				<DocField
					label="Inspeção dinâmica"
					value={draft?.textos?.inspecaoDinamica}
					multiline
				/>
			</DocumentSection>

			<DocumentSection number="4" title="Palpação, dor e amplitude">
				<DocStatusRow
					label="Nível de dor"
					value={optionLabel(nivelDorOptions, draft?.dor?.nivel || "leve")}
					normalValue="Leve"
				/>

				<DocStatusRow
					label="Resposta à palpação"
					value={optionLabel(respostaPalpacaoOptions, draft?.dor?.respostaPalpacao || "normal")}
					normalValue="Normal"
				/>

				<View style={styles.docInlineDivider} />

				<DocField
					label="Palpação"
					value={draft?.textos?.palpacao}
					multiline
				/>

				<DocField
					label="Amplitude de movimento"
					value={draft?.textos?.amplitudeMovimento}
					multiline
				/>

				<DocField
					label="Descrição da dor"
					value={draft?.textos?.dor}
					multiline
				/>
			</DocumentSection>

			<DocumentSection number="5" title="Funcionalidade">
				<DocSelectedList
					labels={funcionalLabels}
					values={draft?.funcional}
				/>
			</DocumentSection>

			<DocumentSection number="6" title="Conduta inicial">
				<DocSelectedList
					labels={condutaLabels}
					values={draft?.conduta}
				/>
			</DocumentSection>

			<DocumentSection number="7" title="Observações gerais">
				<DocField
					label="Informações adicionais"
					value={draft?.textos?.observacoesGerais}
					multiline
				/>
			</DocumentSection>
		</ScrollView>
	);
}

/* ---------- UI Formulário ---------- */

function SectionTitle({ children }) {
	return <Text style={styles.formSectionTitle}>{children}</Text>;
}

function Card({ children, filled = false }) {
	return (
		<View
			style={[
				styles.formCard,
				{
					borderColor: filled ? "#16A34A" : "rgba(0,0,0,0.06)",
				},
			]}
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
				<Text style={styles.inputLabel}>
					{label}
				</Text>
			)}

			<View
				style={[
					styles.textAreaShell,
					{
						minHeight,
						borderColor: filled ? "#16A34A" : "rgba(0,0,0,0.15)",
						backgroundColor: disabled ? "rgba(0,0,0,0.03)" : "white",
					},
				]}
			>
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor="#9CA3AF"
					editable={!disabled}
					multiline
					textAlignVertical="top"
					style={[
						styles.textArea,
						{
							minHeight,
							opacity: disabled ? 0.6 : 1,
						},
					]}
				/>
			</View>
		</View>
	);
}

function CheckboxRow({ label, value, onChange, disabled }) {
	return (
		<TouchableOpacity
			activeOpacity={0.86}
			onPress={() => !disabled && onChange(!value)}
			disabled={disabled}
			style={[
				styles.checkboxRow,
				value && styles.checkboxRowSelected,
				disabled && { opacity: 0.55 },
			]}
		>
			<Text
				style={[
					styles.checkboxLabel,
					value && styles.checkboxLabelSelected,
				]}
				numberOfLines={1}
			>
				{label}
			</Text>

			<View
				style={[
					styles.checkboxBox,
					value && styles.checkboxBoxSelected,
				]}
			>
				{value && (
					<Ionicons name="checkmark" size={15} color="#16A34A" />
				)}
			</View>
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
		<View style={{ marginBottom: 12 }}>
			{!!label && (
				<Text style={styles.inputLabel}>
					{label}
				</Text>
			)}

			{!!subtitle && (
				<Text style={styles.inputSubtitle}>
					{subtitle}
				</Text>
			)}

			<View style={styles.radioWrap}>
				{options.map((opt) => {
					const selected = value === opt.value;

					return (
						<TouchableOpacity
							key={opt.value}
							disabled={disabled}
							activeOpacity={0.88}
							onPress={() => onChange(opt.value)}
							style={[
								styles.radioChip,
								{
									borderColor: selected ? "#2563EB" : "rgba(0,0,0,0.14)",
									backgroundColor: selected ? "rgba(37,99,235,0.08)" : "white",
									opacity: disabled ? 0.6 : 1,
								},
							]}
						>
							<Ionicons
								name={selected ? "radio-button-on" : "radio-button-off"}
								size={16}
								color={selected ? "#2563EB" : "#9CA3AF"}
							/>

							<Text
								style={[
									styles.radioChipText,
									{
										fontWeight: selected ? "750" : "550",
									},
								]}
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

/* ---------- Screen ---------- */

export default function AvaliacaoOrtopedica() {
	const { id: petId, avaliacaoId } = useLocalSearchParams();
	const dispatch = useDispatch();
	const insets = useSafeAreaInsets();

	const { auth, firestore, firestoreModule } = ensureFirebase() || {};

	const isExisting = !!avaliacaoId;

	const draft = useSelector((s) => s.avaliacao?.draftsByPet?.[petId]);

	const [editing, setEditing] = useState(!isExisting);
	const [loading, setLoading] = useState(isExisting);
	const [saving, setSaving] = useState(false);
	const [original, setOriginal] = useState(null);
	const [petData, setPetData] = useState(null);
	const [exportingPdf, setExportingPdf] = useState(false);

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

	useEffect(() => {
		let active = true;

		(async () => {
			if (
				!petId ||
				!firestore ||
				!auth?.currentUser?.uid
			) {
				return;
			}

			try {
				const petSnap =
					await firestore
						.collection("users")
						.doc(String(auth.currentUser.uid))
						.collection("pets")
						.doc(String(petId))
						.get();

				if (!active || !petSnap.exists) {
					return;
				}

				setPetData({
					id: petSnap.id,
					...petSnap.data(),
				});
			} catch (error) {
				console.warn(
					"fetch pet data for PDF",
					error?.message
				);
			}
		})();

		return () => {
			active = false;
		};
	}, [
		petId,
		firestore,
		auth,
	]);

	const buildCurrentEvaluationForPdf = useCallback(() => {
		if (!draft) {
			return null;
		}

		return {
			id:
				String(
					avaliacaoId ||
					draft?.id ||
					"preview"
				),
			title:
				draft?.title?.trim() ||
				"Avaliação ortopédica",
			tipo: "ortopedica",
			type: "ortopedica",
			petId: String(petId),
			createdAt:
				draft?.createdAt ||
				original?.createdAt ||
				null,
			updatedAt:
				draft?.updatedAt ||
				original?.updatedAt ||
				null,
			fields: {
				textos:
					draft?.textos || {},
				localizacao:
					draft?.localizacao || {},
				marcha:
					draft?.marcha || {},
				dor:
					draft?.dor || {},
				funcional:
					draft?.funcional || {},
				conduta:
					draft?.conduta || {},
			},
		};
	}, [
		draft,
		avaliacaoId,
		petId,
		original,
	]);

	const handleExportPdf = useCallback(async () => {
		const evaluation =
			buildCurrentEvaluationForPdf();

		if (!evaluation) {
			Alert.alert(
				"Exportar PDF",
				"Não foi possível preparar esta avaliação."
			);
			return;
		}

		try {
			setExportingPdf(true);

			await exportAvaliacoesPdf({
				evaluations: [evaluation],
				petName:
					petData?.nome ||
					petData?.name ||
					"",
			});
		} catch (error) {
			console.log(
				"export avaliação ortopédica pdf error",
				error
			);

			Alert.alert(
				"Exportar PDF",
				error?.message ||
				"Não foi possível gerar o PDF."
			);
		} finally {
			setExportingPdf(false);
		}
	}, [
		buildCurrentEvaluationForPdf,
		petData,
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

	const goBackToAvaliacaoList = useCallback(() => {
		dispatch(clearDraft({ petId: String(petId) }));

		if (router.canGoBack?.()) {
			router.back();
			return;
		}

		router.replace({
			pathname: "/(modals)/pets/[id]/avaliacao",
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
			pathname: "/(modals)/pets/[id]/avaliacao",
			params: { id: String(petId) },
		});
	}, [dispatch, petId]);

	const handleSave = useCallback(async () => {
		try {
			if (!draft) return;

			if (!auth?.currentUser?.uid) {
				Alert.alert(
					"Avaliação ortopédica",
					"Usuário não autenticado."
				);
				return;
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

				const normalized =
					normalizeOrtopedicaDraft(
						String(petId),
						{
							...payload,

							id:
								String(
									avaliacaoId
								),

							createdAt:
								original?.createdAt ||
								draft?.createdAt ||
								null,

							updatedAt:
								new Date(),
						}
					);

				setOriginal(normalized);

				dispatch(
					replaceDraft({
						petId: String(petId),
						draft: normalized,
					})
				);

				setEditing(false);

				Alert.alert("Avaliação ortopédica", "Alterações salvas!");
				return;
			}

			await saveNewOrtopedica({
				firestore,
				firestoreModule,
				uid,
				petId: String(petId),
				payload,
			});

			Alert.alert("Avaliação ortopédica", "Registro criado!");

			dispatch(clearDraft({ petId: String(petId) }));

			router.replace({
				pathname: "/(modals)/pets/[id]/avaliacao",
				params: { id: String(petId) },
			});
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
								pathname: "/(modals)/pets/[id]/avaliacao",
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

	if (loading) {
		return (
			<>
				<Stack.Screen
					options={{
						title: "Avaliação ortopédica",
						headerBackTitleVisible: false,
						headerLargeTitle: false,
					}}
				/>

				<View style={styles.loadingScreen}>
					<ActivityIndicator />
					<Text style={styles.loadingText}>
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
			style={styles.screen}
		>
			<Stack.Screen
				options={{
					title: editing ? "Editar avaliação" : "Avaliação ortopédica",
					headerLeft: () => {
						if (isExisting && !editing) {
							return (
								<TouchableOpacity
									onPress={goBackToAvaliacaoList}
									style={styles.headerBack}
									hitSlop={10}
								>
									<Ionicons name="chevron-back" size={22} color="#2563EB" />
									<Text style={styles.headerBackText}>
										Voltar
									</Text>
								</TouchableOpacity>
							);
						}

						if (isExisting && editing) {
							return (
								<TouchableOpacity
									onPress={cancelEditing}
									style={styles.headerButton}
									hitSlop={10}
								>
									<Text style={styles.cancelText}>
										Cancelar
									</Text>
								</TouchableOpacity>
							);
						}

						return (
							<TouchableOpacity
								onPress={cancelNew}
								style={styles.headerButton}
								hitSlop={10}
							>
								<Text style={styles.cancelText}>
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
									style={styles.headerButton}
									hitSlop={10}
								>
									<Text style={styles.editText}>
										Editar
									</Text>
								</TouchableOpacity>
							);
						}

						if (isExisting && editing) {
							return (
								<TouchableOpacity
									onPress={handleDelete}
									style={styles.headerButton}
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

			{isExisting && !editing ? (
				<View style={styles.documentMode}>
					<DocumentView
						draft={draft}
						pet={petData}
					/>

					<View style={styles.pdfFooter}>
						<View
							style={[
								styles.pdfFooterInner,
								{
									paddingBottom:
										Math.max(
											insets.bottom,
											14
										) + 10,
								},
							]}
						>
							<TouchableOpacity
								onPress={handleExportPdf}
								disabled={exportingPdf}
								activeOpacity={0.86}
								style={[
									styles.pdfButton,
									exportingPdf && {
										opacity: 0.72,
									},
								]}
							>
								{exportingPdf ? (
									<ActivityIndicator color="#FFFFFF" />
								) : (
									<Ionicons
										name="share-outline"
										size={19}
										color="#FFFFFF"
									/>
								)}

								<Text style={styles.pdfButtonText}>
									{exportingPdf
										? "Gerando PDF..."
										: "Exportar"}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			) : (
				<ScrollView
					contentContainerStyle={styles.formContent}
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
								style={styles.titleInput}
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
								{Object.entries(localizacaoLabels).map(([key, label]) => (
									<CheckboxRow
										key={key}
										label={label}
										value={!!draft?.localizacao?.[key]}
										onChange={(v) => updateLocalizacao(key, v)}
										disabled={disabled}
									/>
								))}
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
									options={claudicacaoOptions}
								/>

								<ChipRadioGroup
									label="Apoio"
									value={draft?.marcha?.apoio || "normal"}
									onChange={(v) => updateMarcha("apoio", v)}
									disabled={disabled}
									options={apoioOptions}
								/>

								<ChipRadioGroup
									label="Compensação"
									value={draft?.marcha?.compensacao || "ausente"}
									onChange={(v) => updateMarcha("compensacao", v)}
									disabled={disabled}
									options={compensacaoOptions}
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
									options={nivelDorOptions}
								/>

								<ChipRadioGroup
									label="Resposta à palpação"
									value={draft?.dor?.respostaPalpacao || "normal"}
									onChange={(v) => updateDor("respostaPalpacao", v)}
									disabled={disabled}
									options={respostaPalpacaoOptions}
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
								{Object.entries(funcionalLabels).map(([key, label]) => (
									<CheckboxRow
										key={key}
										label={label}
										value={!!draft?.funcional?.[key]}
										onChange={(v) => updateFuncional(key, v)}
										disabled={disabled}
									/>
								))}
							</DisabledOverlay>
						</Card>
					</View>

					<View style={{ marginTop: 16 }}>
						<SectionTitle>6. Conduta inicial</SectionTitle>

						<Card filled={condutaFilled}>
							<DisabledOverlay disabled={disabled}>
								{Object.entries(condutaLabels).map(([key, label]) => (
									<CheckboxRow
										key={key}
										label={label}
										value={!!draft?.conduta?.[key]}
										onChange={(v) => updateConduta(key, v)}
										disabled={disabled}
									/>
								))}
							</DisabledOverlay>
						</Card>
					</View>

					<View style={{ marginTop: 16 }}>
						<SectionTitle>7. Observações gerais</SectionTitle>

						<LabeledTextArea
							value={draft?.textos?.observacoesGerais || ""}
							onChangeText={(t) => updateTexto("observacoesGerais", t)}
							placeholder="Achados principais, suspeitas, objetivos terapêuticos, recomendações e observações importantes."
							disabled={disabled}
							minHeight={110}
						/>
					</View>
				</ScrollView>
			)}

			{editing && (
				<View style={styles.saveFooter}>
					<View style={[
						styles.saveFooterInner,
						{
							paddingBottom:
								Math.max(
									insets.bottom,
									14
								) + 12,
						},
					]}>
						<TouchableOpacity
							onPress={handleSave}
							disabled={saving}
							style={[
								styles.saveButton,
								saving && { opacity: 0.82 },
							]}
						>
							{saving ? (
								<>
									<ActivityIndicator color="#fff" />
									<Text style={styles.saveButtonText}>
										Salvando…
									</Text>
								</>
							) : (
								<>
									<Ionicons name="checkmark" size={18} color="#fff" />
									<Text style={styles.saveButtonText}>
										Salvar
									</Text>
								</>
							)}
						</TouchableOpacity>
					</View>
				</View>
			)}
		</KeyboardAvoidingView>
	);
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: "#F3F4F6",
	},

	loadingScreen: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#F3F4F6",
	},

	loadingText: {
		marginTop: 10,
		color: "#6B7280",
		fontWeight: "600",
	},

	headerBack: {
		paddingHorizontal: 8,
		flexDirection: "row",
		alignItems: "center",
	},

	headerBackText: {
		color: "#2563EB",
		fontWeight: "700",
		marginLeft: 3,
	},

	headerButton: {
		paddingHorizontal: 8,
	},

	cancelText: {
		color: "#FF3B30",
		fontWeight: "700",
	},

	editText: {
		color: "#2563EB",
		fontWeight: "700",
	},

	documentContent: {
		paddingHorizontal: 14,
		paddingTop: 12,
		paddingBottom: 156,
	},

	documentMode: {
		flex: 1,
	},

	clinicalHeader: {
		marginBottom: 4,
		paddingHorizontal: 15,
		paddingTop: 15,
		paddingBottom: 14,
		borderRadius: 20,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000000",
		shadowOpacity: 0.06,
		shadowRadius: 12,
		shadowOffset: {
			width: 0,
			height: 5,
		},
		elevation: 2,
	},

	clinicalHeaderTop: {
		flexDirection: "row",
		alignItems: "center",
	},

	clinicalAvatar: {
		width: 48,
		height: 48,
		borderRadius: 16,
		backgroundColor: "rgba(22,163,74,0.10)",
		borderWidth: 1,
		borderColor: "rgba(22,163,74,0.14)",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},

	clinicalHeaderMain: {
		flex: 1,
		minWidth: 0,
	},

	clinicalEyebrow: {
		color: "#16A34A",
		fontSize: 9.5,
		fontWeight: "900",
		letterSpacing: 0.8,
	},

	clinicalPatientName: {
		marginTop: 2,
		color: "#111827",
		fontSize: 20,
		fontWeight: "900",
		letterSpacing: -0.35,
	},

	clinicalMetaLine: {
		minHeight: 17,
		marginTop: 4,
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
	},

	clinicalMetaText: {
		color: "#4B5563",
		fontSize: 11.5,
		fontWeight: "700",
	},

	clinicalMetaDot: {
		width: 3,
		height: 3,
		borderRadius: 2,
		marginHorizontal: 7,
		backgroundColor: "#9CA3AF",
	},

	clinicalTypeBadge: {
		marginLeft: 10,
		paddingHorizontal: 9,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: "rgba(22,163,74,0.08)",
		borderWidth: 1,
		borderColor: "rgba(22,163,74,0.14)",
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},

	clinicalTypeBadgeText: {
		color: "#166534",
		fontSize: 8.5,
		fontWeight: "900",
		letterSpacing: 0.45,
	},

	clinicalDivider: {
		height: StyleSheet.hairlineWidth,
		marginVertical: 12,
		backgroundColor: "rgba(15,23,42,0.08)",
	},

	clinicalInfoRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},

	petInfoItem: {
		flex: 1,
		minWidth: 88,
		minHeight: 38,
		paddingHorizontal: 9,
		paddingVertical: 7,
		borderRadius: 11,
		backgroundColor: "#F9FAFB",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(15,23,42,0.07)",
		flexDirection: "row",
		alignItems: "center",
		gap: 7,
	},

	petInfoText: {
		flex: 1,
		minWidth: 0,
	},

	petInfoLabel: {
		color: "#16A34A",
		fontSize: 8,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.35,
	},

	petInfoValue: {
		marginTop: 1,
		color: "#111827",
		fontSize: 11,
		fontWeight: "800",
	},

	clinicalDocumentBlock: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "rgba(15,23,42,0.08)",
	},

	clinicalDocumentEyebrow: {
		color: "#16A34A",
		fontSize: 9,
		fontWeight: "900",
		letterSpacing: 0.65,
	},

	clinicalDocumentTitle: {
		marginTop: 3,
		color: "#111827",
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "900",
		letterSpacing: -0.2,
	},

	clinicalDateRow: {
		marginTop: 7,
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},

	clinicalDateText: {
		flex: 1,
		color: "#4B5563",
		fontSize: 10.5,
		lineHeight: 14,
		fontWeight: "700",
	},

	clinicalUpdatedText: {
		marginTop: 2,
		marginLeft: 17,
		color: "#6B7280",
		fontSize: 9.5,
		lineHeight: 13,
		fontWeight: "600",
	},

	docSection: {
		backgroundColor: "#FFFFFF",
		borderRadius: 14,
		marginTop: 9,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.055)",
		shadowColor: "#000",
		shadowOpacity: 0.025,
		shadowRadius: 5,
		shadowOffset: { width: 0, height: 2 },
		elevation: 1,
	},

	docSectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingTop: 10,
		paddingBottom: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(0,0,0,0.07)",
	},

	docSectionNumber: {
		width: 20,
		height: 20,
		borderRadius: 7,
		backgroundColor: "rgba(37,99,235,0.10)",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},

	docSectionNumberText: {
		fontSize: 10,
		fontWeight: "900",
		color: "#2563EB",
	},

	docSectionTitle: {
		flex: 1,
		color: "#111827",
		fontSize: 13.6,
		fontWeight: "900",
		letterSpacing: -0.08,
	},

	docSectionBody: {
		paddingHorizontal: 12,
		paddingTop: 10,
		paddingBottom: 5,
	},

	docField: {
		marginBottom: 10,
	},

	docFieldLabel: {
		fontSize: 10.5,
		fontWeight: "850",
		color: "#6B7280",
		textTransform: "uppercase",
		letterSpacing: 0.25,
		marginBottom: 2,
	},

	docFieldValue: {
		fontSize: 12.7,
		lineHeight: 18,
		color: "#111827",
		fontWeight: "550",
	},

	docFieldMultiline: {
		lineHeight: 18.5,
	},

	docFieldEmpty: {
		color: "#A1A1AA",
		fontStyle: "italic",
		fontWeight: "500",
	},

	emptyBlock: {
		color: "#A1A1AA",
		fontStyle: "italic",
		fontWeight: "550",
		fontSize: 12.3,
		paddingBottom: 7,
	},

	selectedList: {
		borderRadius: 11,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "rgba(22,163,74,0.10)",
		backgroundColor: "rgba(22,163,74,0.035)",
		marginBottom: 8,
	},

	selectedRow: {
		minHeight: 32,
		paddingHorizontal: 9,
		paddingVertical: 7,
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
	},

	selectedRowBorder: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(22,163,74,0.16)",
	},

	selectedIcon: {
		width: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: "rgba(22,163,74,0.11)",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},

	selectedText: {
		flex: 1,
		fontSize: 12.7,
		lineHeight: 17,
		color: "#166534",
		fontWeight: "750",
	},

	docInlineDivider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: "rgba(0,0,0,0.07)",
		marginTop: 2,
		marginBottom: 10,
	},

	statusRow: {
		minHeight: 34,
		paddingVertical: 7,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(15,23,42,0.07)",
		flexDirection: "row",
		alignItems: "center",
	},

	statusLabel: {
		flex: 1,
		color: "#111827",
		fontSize: 12.4,
		lineHeight: 16,
		fontWeight: "600",
		marginRight: 10,
	},

	statusPill: {
		minWidth: 76,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		borderWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},

	statusPillNormal: {
		backgroundColor: "rgba(22,163,74,0.035)",
		borderColor: "rgba(22,163,74,0.13)",
	},

	statusPillChanged: {
		backgroundColor: "rgba(245,158,11,0.08)",
		borderColor: "rgba(245,158,11,0.18)",
	},

	statusDot: {
		width: 5,
		height: 5,
		borderRadius: 2.5,
		marginRight: 5,
	},

	statusDotNormal: {
		backgroundColor: "#16A34A",
	},

	statusDotChanged: {
		backgroundColor: "#D97706",
	},

	statusPillText: {
		fontSize: 11,
		fontWeight: "850",
	},

	statusTextNormal: {
		color: "#15803D",
	},

	statusTextChanged: {
		color: "#B45309",
	},

	formContent: {
		padding: 16,
		paddingBottom: 180,
	},

	formSectionTitle: {
		fontWeight: "800",
		fontSize: 16,
		marginBottom: 8,
		color: "#111827",
	},

	formCard: {
		backgroundColor: "white",
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderWidth: 1.5,
	},

	titleInput: {
		height: 44,
		color: "#111827",
		fontWeight: "600",
	},

	inputLabel: {
		fontWeight: "700",
		color: "#111827",
		marginBottom: 6,
	},

	inputSubtitle: {
		fontWeight: "500",
		color: "#6B7280",
		marginBottom: 6,
		fontSize: 10,
	},

	textAreaShell: {
		borderWidth: 1.5,
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: 8,
	},

	textArea: {
		color: "#111827",
		fontWeight: "500",
	},

	checkboxRow: {
		minHeight: 42,
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 7,

		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		backgroundColor: "#FFFFFF",
	},

	checkboxRowSelected: {
		backgroundColor: "rgba(22,163,74,0.025)",
		borderColor: "rgba(22,163,74,0.22)",
	},

	checkboxLabel: {
		flex: 1,
		color: "#111827",
		fontWeight: "550",
		fontSize: 14,
		marginRight: 10,
	},

	checkboxLabelSelected: {
		color: "#0F172A",
		fontWeight: "650",
	},

	checkboxBox: {
		width: 24,
		height: 24,
		borderRadius: 7,
		borderWidth: 2,
		borderColor: "#A3AFBF",
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
	},

	checkboxBoxSelected: {
		borderColor: "#16A34A",
		backgroundColor: "rgba(22,163,74,0.10)",
	},

	radioWrap: {
		flexDirection: "row",
		flexWrap: "wrap",
	},

	radioChip: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 11,
		paddingVertical: 8,
		borderRadius: 999,
		borderWidth: 1.5,
		marginRight: 8,
		marginBottom: 8,
	},

	radioChipText: {
		marginLeft: 6,
		color: "#111827",
	},

	pdfFooter: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(255,255,255,0.97)",
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "rgba(15,23,42,0.10)",
		shadowColor: "#000000",
		shadowOpacity: 0.08,
		shadowRadius: 12,
		shadowOffset: {
			width: 0,
			height: -4,
		},
		elevation: 10,
	},

	pdfFooterInner: {
		paddingHorizontal: 16,
		paddingTop: 12,
	},

	pdfButton: {
		height: 50,
		borderRadius: 15,
		backgroundColor: "#16A34A",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},

	pdfButtonText: {
		color: "#FFFFFF",
		fontSize: 14.5,
		fontWeight: "850",
	},

	saveFooter: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "white",
		borderTopWidth: 1,
		borderTopColor: "rgba(0,0,0,0.08)",
	},

	saveFooterInner: {
		paddingHorizontal: 16,
		paddingTop: 12,
	},

	saveButton: {
		backgroundColor: "#2563EB",
		height: 48,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
	},

	saveButtonText: {
		color: "white",
		fontWeight: "800",
		marginLeft: 7,
	},
	documentDateRow: {
		marginTop: 6,
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},

	documentDateText: {
		flex: 1,
		color: "#6B7280",
		fontSize: 10.5,
		lineHeight: 14,
		fontWeight: "650",
	},

	documentUpdatedText: {
		marginTop: 2,
		marginLeft: 17,
		color: "#9CA3AF",
		fontSize: 9.5,
		lineHeight: 13,
		fontWeight: "550",
	},
});