// src/screens/tutores/Form.jsx
// @ts-nocheck
import React, {
	useState,
	useRef,
	useMemo,
	useEffect,
	useCallback,
} from "react";
import {
	View,
	Text,
	Alert,
	ActivityIndicator,
	Platform,
	KeyboardAvoidingView,
	Pressable,
	ScrollView,
	StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { router, useNavigation, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
	addTutor,
	deleteTutor,
	updateTutor,
	fetchTutor,
} from "@/src/store/slices/tutoresSlice";
import { useThemeColor } from "@/hooks/useThemeColor";
import ThemedTextInput from "@/components/ui/ThemedTextInput";
import { fetchAddressByCep } from "@/src/services/cep";
import { geocodeAddress } from "@/src/services/geocoding";
import { maskCep, maskPhone } from "@/src/utils/masks";
import { IconSymbol } from "@/components/ui/IconSymbol";

const onlyDigits = (v) => String(v || "").replace(/\D/g, "");

const trimOrNull = (v) => {
	const s = String(v ?? "").trim();
	return s ? s : null;
};

const upperUf = (v) =>
	String(v || "")
		.replace(/[^a-zA-Z]/g, "")
		.toUpperCase()
		.slice(0, 2);

const isEmail = (v) => {
	const value = String(v || "").trim();
	if (!value) return true;
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

function hasAnyAddressField(endereco) {
	return Object.values(endereco || {}).some((v) => String(v ?? "").trim());
}

function hasMinimumAddressForGeocode(endereco) {
	return Boolean(endereco?.logradouro || endereco?.cidade || endereco?.cep);
}

function FormSection({ title, helper, children }) {
	return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>{title}</Text>
				{!!helper && <Text style={styles.sectionHelper}>{helper}</Text>}
			</View>

			<View style={styles.sectionCard}>{children}</View>
		</View>
	);
}

function Field({ label, helper, error, children }) {
	return (
		<View style={styles.field}>
			{!!label && <Text style={styles.fieldLabel}>{label}</Text>}

			{children}

			{!!error ? (
				<Text style={styles.fieldError}>{error}</Text>
			) : helper ? (
				<Text style={styles.fieldHelper}>{helper}</Text>
			) : null}
		</View>
	);
}

function Divider() {
	return <View style={styles.divider} />;
}

export default function TutorForm() {
	const navigation = useNavigation();
	const dispatch = useDispatch();
	const insets = useSafeAreaInsets();

	const { id: rawId } = useLocalSearchParams();
	const id = rawId ? (Array.isArray(rawId) ? rawId[0] : String(rawId)) : null;

	const tutor = useSelector((s) => (id ? s.tutores.byId[id] : null));

	useEffect(() => {
		if (id && !tutor) dispatch(fetchTutor(id));
	}, [id, tutor, dispatch]);

	const bg = useThemeColor({}, "background");
	const tint = useThemeColor({}, "tint");

	const emailRef = useRef(null);
	const cepRef = useRef(null);
	const numeroRef = useRef(null);
	const telefoneRef = useRef(null);
	const logradouroRef = useRef(null);
	const bairroRef = useRef(null);
	const cidadeRef = useRef(null);
	const ufRef = useRef(null);
	const complementoRef = useRef(null);

	const [nome, setNome] = useState(tutor?.nome || "");
	const [telefone, setTelefone] = useState(tutor?.telefone || "");
	const [email, setEmail] = useState(tutor?.email || "");

	const [cep, setCep] = useState(tutor?.endereco?.cep || "");
	const [logradouro, setLogradouro] = useState(tutor?.endereco?.logradouro || "");
	const [numero, setNumero] = useState(tutor?.endereco?.numero || "");
	const [bairro, setBairro] = useState(tutor?.endereco?.bairro || "");
	const [cidade, setCidade] = useState(tutor?.endereco?.cidade || "");
	const [uf, setUf] = useState(tutor?.endereco?.uf || "");
	const [complemento, setComplemento] = useState(
		tutor?.endereco?.complemento || ""
	);

	const [observacoes, setObservacoes] = useState(tutor?.observacoes || "");

	const [loadingCep, setLoadingCep] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [cepTouched, setCepTouched] = useState(false);
	const [cepFound, setCepFound] = useState(false);

	useEffect(() => {
		if (!tutor) return;

		setNome(tutor?.nome || "");
		setTelefone(tutor?.telefone || "");
		setEmail(tutor?.email || "");

		setCep(tutor?.endereco?.cep || "");
		setLogradouro(tutor?.endereco?.logradouro || "");
		setNumero(tutor?.endereco?.numero || "");
		setBairro(tutor?.endereco?.bairro || "");
		setCidade(tutor?.endereco?.cidade || "");
		setUf(tutor?.endereco?.uf || "");
		setComplemento(tutor?.endereco?.complemento || "");

		setObservacoes(tutor?.observacoes || "");
	}, [tutor?.id]);

	const phoneDigits = useMemo(() => onlyDigits(telefone), [telefone]);
	const cepDigits = useMemo(() => onlyDigits(cep), [cep]);

	const validation = useMemo(() => {
		const nameOk = !!nome.trim();
		const phoneOk =
			!phoneDigits || (phoneDigits.length >= 10 && phoneDigits.length <= 11);
		const emailOk = isEmail(email);
		const cepOk = !cepDigits || cepDigits.length === 8;
		const ufClean = upperUf(uf);
		const ufOk = !ufClean || ufClean.length === 2;

		return {
			nameOk,
			phoneOk,
			emailOk,
			cepOk,
			ufOk,
			isValid: nameOk && phoneOk && emailOk && cepOk && ufOk,
		};
	}, [nome, phoneDigits, email, cepDigits, uf]);

	const firstError = useMemo(() => {
		if (!validation.nameOk) return "Informe pelo menos o nome do tutor.";
		if (!validation.phoneOk) {
			return "Telefone opcional, mas precisa ter 10–11 dígitos com DDD quando preenchido.";
		}
		if (!validation.emailOk) return "E-mail inválido.";
		if (!validation.cepOk) {
			return "CEP opcional, mas precisa ter 8 dígitos quando preenchido.";
		}
		if (!validation.ufOk) {
			return "UF opcional, mas precisa ter 2 letras quando preenchida.";
		}
		return null;
	}, [validation]);

	const isSubmitDisabled = submitting || loadingCep || !validation.isValid;

	const confirmDelete = useCallback(() => {
		if (!id) return;

		Alert.alert("Excluir", "Deseja excluir este tutor?", [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Excluir",
				style: "destructive",
				onPress: async () => {
					await dispatch(deleteTutor(id));
					router.dismiss();
					router.replace("/tutores");
				},
			},
		]);
	}, [dispatch, id]);

	useEffect(() => {
		navigation.setOptions({
			headerLargeTitle: false,
			headerBackTitleVisible: false,
			headerTitle: id ? tutor?.nome || "Editar Tutor" : "Novo Tutor",
			headerLeft: () => (
				<Pressable
					onPress={() => navigation.goBack()}
					hitSlop={10}
					accessibilityLabel="Cancelar"
					style={{ marginRight: 10 }}
				>
					<IconSymbol name="chevron.left" size={24} />
				</Pressable>
			),
			headerRight: () =>
				id ? (
					<Pressable
						onPress={confirmDelete}
						hitSlop={10}
						accessibilityLabel="Excluir tutor"
					>
						<IconSymbol name="trash" size={24} />
					</Pressable>
				) : null,
		});
	}, [navigation, id, tutor?.nome, confirmDelete]);

	const onChangeCep = useCallback(async (value) => {
		const digits = onlyDigits(value);

		setCepTouched(true);
		setCepFound(false);
		setCep(digits);

		if (!digits) return;
		if (digits.length < 8) return;

		try {
			setLoadingCep(true);

			const addr = await fetchAddressByCep(digits);

			setLogradouro(addr?.logradouro || "");
			setBairro(addr?.bairro || "");
			setCidade(addr?.cidade || "");
			setUf(addr?.uf || "");
			setComplemento(addr?.complemento || "");
			setCepFound(true);

			numeroRef.current?.focus();
		} catch (err) {
			setCepFound(false);

			Alert.alert(
				"CEP",
				err?.message ||
					"Não foi possível buscar o CEP. Você pode preencher o endereço manualmente."
			);
		} finally {
			setLoadingCep(false);
		}
	}, []);

	function normalizeGoogleAddress(components = []) {
		const get = (type) => {
			const c = components.find((x) => x.types?.includes(type));
			return c
				? { long: c.long_name, short: c.short_name }
				: { long: "", short: "" };
		};

		const streetNumber = get("street_number");
		const route = get("route");
		const neighborhood = get("sublocality")?.long
			? get("sublocality")
			: get("neighborhood");
		const locality = get("locality");
		const admin1 = get("administrative_area_level_1");
		const postal = get("postal_code");
		const country = get("country");

		return {
			street_number: streetNumber.long || null,
			route: route.long || null,
			neighborhood: neighborhood.long || null,
			sublocality: get("sublocality").long || null,
			locality: locality.long || null,
			admin_area_level_1: admin1.short || admin1.long || null,
			country: country.short || country.long || null,
			postal_code: postal.long || null,
		};
	}

	const onSubmit = useCallback(async () => {
		if (submitting) return;

		if (!validation.isValid) {
			if (firstError) Alert.alert("Validação", firstError);
			return;
		}

		setSubmitting(true);

		try {
			const enderecoBase = {
				cep: cepDigits || null,
				logradouro: trimOrNull(logradouro),
				numero: trimOrNull(numero),
				bairro: trimOrNull(bairro),
				cidade: trimOrNull(cidade),
				uf: trimOrNull(upperUf(uf)),
				complemento: trimOrNull(complemento),
			};

			let geoEnriched = null;
			let enderecoFinal = { ...enderecoBase };

			const shouldTryGeocode =
				hasAnyAddressField(enderecoBase) &&
				hasMinimumAddressForGeocode(enderecoBase);

			if (shouldTryGeocode) {
				try {
					const geo = await geocodeAddress(enderecoBase);
					const normalized = normalizeGoogleAddress(
						geo?.raw?.address_components || []
					);

					const vp = geo?.raw?.geometry?.viewport;
					const navigationPoints = geo?.raw?.navigation_points;

					enderecoFinal = {
						...enderecoBase,
						formatted: geo?.formattedAddress || null,
						normalized,
					};

					geoEnriched = {
						lat: geo?.lat ?? null,
						lng: geo?.lng ?? null,
						placeId: geo?.placeId ?? null,
						precision:
							geo?.precision || geo?.raw?.geometry?.location_type || null,
						types: geo?.raw?.types || [],
						viewport: vp
							? {
									northeast: {
										lat: vp?.northeast?.lat ?? null,
										lng: vp?.northeast?.lng ?? null,
									},
									southwest: {
										lat: vp?.southwest?.lat ?? null,
										lng: vp?.southwest?.lng ?? null,
									},
							  }
							: null,
						navigationPoints: navigationPoints || null,
						provider: "google",
						retrievedAt: Date.now(),
						raw: geo?.raw || null,
					};
				} catch (e) {
					console.warn("Geocoding falhou:", e?.message);
					geoEnriched = null;

					Alert.alert(
						"Atenção",
						"O tutor será salvo sem coordenadas de mapa. Você pode complementar o endereço depois."
					);
				}
			}

			const payload = {
				nome: nome.trim(),
				telefone: phoneDigits || null,
				email: trimOrNull(email),
				endereco: enderecoFinal,
				geo: geoEnriched,
				observacoes: trimOrNull(observacoes),
			};

			if (id) {
				await dispatch(
					updateTutor({
						id,
						patch: payload,
					})
				).unwrap();

				Alert.alert("Sucesso", "Tutor atualizado!");
			} else {
				await dispatch(addTutor(payload)).unwrap();

				Alert.alert("Sucesso", "Tutor cadastrado!");
			}

			router.back();
		} catch (err) {
			console.error("Erro ao salvar tutor:", err);

			Alert.alert(
				"Erro",
				err?.message ||
					"Não foi possível salvar o tutor. Tente novamente ou verifique sua conexão."
			);
		} finally {
			setSubmitting(false);
		}
	}, [
		submitting,
		validation.isValid,
		firstError,
		cepDigits,
		logradouro,
		numero,
		bairro,
		cidade,
		uf,
		complemento,
		nome,
		phoneDigits,
		email,
		observacoes,
		id,
		dispatch,
	]);

	return (
		<KeyboardAvoidingView
			style={[styles.root, { backgroundColor: bg }]}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
		>
			<View style={styles.body}>
				<ScrollView
					contentContainerStyle={[
						styles.content,
						{ paddingBottom: 120 + insets.bottom },
					]}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<FormSection
						title="Dados básicos"
						helper="Apenas o nome é obrigatório. Os demais dados podem ser preenchidos depois."
					>
						<Field label="Nome do tutor" error={!validation.nameOk ? firstError : null}>
							<ThemedTextInput
								placeholder="Ex.: Maria Souza"
								value={nome}
								onChangeText={setNome}
								returnKeyType="next"
								onSubmitEditing={() => telefoneRef.current?.focus()}
								style={styles.input}
							/>
						</Field>

						<Divider />

						<Field
							label="Telefone"
							helper="Opcional. Use DDD para facilitar contato por WhatsApp."
							error={!validation.phoneOk ? firstError : null}
						>
							<ThemedTextInput
								placeholder="(00) 00000-0000"
								ref={telefoneRef}
								value={maskPhone(telefone)}
								onChangeText={(v) => setTelefone(onlyDigits(v))}
								keyboardType="phone-pad"
								returnKeyType="next"
								onSubmitEditing={() => emailRef.current?.focus()}
								style={styles.input}
							/>
						</Field>

						<Divider />

						<Field
							label="E-mail"
							helper="Opcional. Útil para envio de lembretes e documentos."
							error={!validation.emailOk ? firstError : null}
						>
							<ThemedTextInput
								placeholder="email@exemplo.com"
								value={email}
								ref={emailRef}
								onChangeText={setEmail}
								keyboardType="email-address"
								autoCapitalize="none"
								returnKeyType="next"
								onSubmitEditing={() => cepRef.current?.focus()}
								style={styles.input}
							/>
						</Field>
					</FormSection>

					<FormSection
						title="Endereço"
						helper="Digite o CEP para preencher automaticamente. Se não souber, salve agora e complete depois."
					>
						<Field
							label="CEP"
							error={!validation.cepOk ? firstError : null}
							helper={
								cepTouched && cepDigits.length > 0 && cepDigits.length < 8
									? "Continue digitando para buscar o endereço."
									: cepFound
									? "Endereço encontrado. Confira o número e complemento."
									: "Opcional."
							}
						>
							<View style={styles.inputWithIcon}>
								<ThemedTextInput
									placeholder="00000-000"
									ref={cepRef}
									value={maskCep(cep)}
									onChangeText={onChangeCep}
									keyboardType="number-pad"
									maxLength={9}
									style={[styles.input, { paddingRight: 38 }]}
									returnKeyType="next"
									onSubmitEditing={() => numeroRef.current?.focus()}
								/>

								<View style={styles.inputRightIcon}>
									{loadingCep ? (
										<ActivityIndicator size="small" />
									) : cepFound ? (
										<Ionicons name="checkmark-circle" size={20} color="#16A34A" />
									) : (
										<Ionicons name="search-outline" size={19} color="#9CA3AF" />
									)}
								</View>
							</View>
						</Field>

						<Divider />

						<Field label="Logradouro">
							<ThemedTextInput
								placeholder="Rua, avenida, estrada..."
								ref={logradouroRef}
								value={logradouro}
								onChangeText={setLogradouro}
								returnKeyType="next"
								onSubmitEditing={() => numeroRef.current?.focus()}
								style={styles.input}
							/>
						</Field>

						<Divider />

						<View style={styles.twoColumns}>
							<View style={{ flex: 0.8 }}>
								<Field label="Número">
									<ThemedTextInput
										placeholder="Nº"
										ref={numeroRef}
										value={numero}
										onChangeText={setNumero}
										keyboardType="number-pad"
										returnKeyType="next"
										onSubmitEditing={() => bairroRef.current?.focus()}
										style={styles.input}
									/>
								</Field>
							</View>

							<View style={{ flex: 1.2 }}>
								<Field label="Bairro">
									<ThemedTextInput
										placeholder="Bairro"
										ref={bairroRef}
										value={bairro}
										onChangeText={setBairro}
										returnKeyType="next"
										onSubmitEditing={() => cidadeRef.current?.focus()}
										style={styles.input}
									/>
								</Field>
							</View>
						</View>

						<Divider />

						<View style={styles.twoColumns}>
							<View style={{ flex: 1.35 }}>
								<Field label="Cidade">
									<ThemedTextInput
										placeholder="Cidade"
										ref={cidadeRef}
										value={cidade}
										onChangeText={setCidade}
										returnKeyType="next"
										onSubmitEditing={() => ufRef.current?.focus()}
										style={styles.input}
									/>
								</Field>
							</View>

							<View style={{ flex: 0.65 }}>
								<Field
									label="UF"
									error={!validation.ufOk ? firstError : null}
								>
									<ThemedTextInput
										placeholder="UF"
										ref={ufRef}
										value={uf}
										onChangeText={(v) => setUf(upperUf(v))}
										autoCapitalize="characters"
										maxLength={2}
										returnKeyType="next"
										onSubmitEditing={() => complementoRef.current?.focus()}
										style={styles.input}
									/>
								</Field>
							</View>
						</View>

						<Divider />

						<Field label="Complemento">
							<ThemedTextInput
								placeholder="Casa, apto, referência..."
								ref={complementoRef}
								value={complemento}
								onChangeText={setComplemento}
								returnKeyType="done"
								style={styles.input}
							/>
						</Field>
					</FormSection>

					<FormSection
						title="Observações"
						helper="Campo livre para preferências, restrições, comportamento do tutor ou anotações úteis."
					>
						<ThemedTextInput
							placeholder="Anotações gerais sobre o tutor..."
							value={observacoes}
							onChangeText={setObservacoes}
							multiline
							numberOfLines={4}
							style={[styles.input, styles.textArea]}
						/>
					</FormSection>

					{!!firstError && (
						<Text style={styles.bottomHint}>
							{firstError}
						</Text>
					)}
				</ScrollView>
			</View>

			<SafeAreaView edges={["bottom"]} style={styles.footerSafe}>
				<View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
					<Pressable
						onPress={onSubmit}
						disabled={isSubmitDisabled}
						style={({ pressed }) => [
							styles.saveButton,
							{
								backgroundColor: isSubmitDisabled ? "#A7B4C8" : tint,
								opacity: pressed ? 0.9 : 1,
							},
						]}
					>
						{submitting ? (
							<>
								<ActivityIndicator color="#fff" />
								<Text style={styles.saveButtonText}>Salvando…</Text>
							</>
						) : (
							<>
								<Ionicons name="checkmark" size={18} color="#fff" />
								<Text style={styles.saveButtonText}>
									{id ? "Salvar alterações" : "Salvar tutor"}
								</Text>
							</>
						)}
					</Pressable>

					<Text style={styles.footerHint}>
						{loadingCep
							? "Buscando endereço pelo CEP…"
							: "Você pode completar os dados do tutor depois."}
					</Text>
				</View>
			</SafeAreaView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},

	body: {
		flex: 1,
	},

	content: {
		paddingHorizontal: 16,
		paddingTop: 14,
		gap: 16,
	},

	section: {
		gap: 8,
	},

	sectionHeader: {
		paddingHorizontal: 2,
	},

	sectionTitle: {
		fontSize: 18,
		fontWeight: "800",
		color: "#111827",
		letterSpacing: -0.2,
	},

	sectionHelper: {
		marginTop: 3,
		fontSize: 12,
		lineHeight: 17,
		color: "#6B7280",
	},

	sectionCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(15,23,42,0.10)",
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},

	field: {
		gap: 6,
	},

	fieldLabel: {
		fontSize: 13,
		fontWeight: "700",
		color: "#374151",
	},

	fieldHelper: {
		fontSize: 11,
		lineHeight: 15,
		color: "#6B7280",
	},

	fieldError: {
		fontSize: 11,
		lineHeight: 15,
		color: "#DC2626",
		fontWeight: "600",
	},

	divider: {
		height: 1,
		backgroundColor: "rgba(148,163,184,0.20)",
		marginVertical: 10,
	},

	input: {
		minHeight: 44,
		borderRadius: 12,
		fontSize: 15,
	},

	inputWithIcon: {
		position: "relative",
	},

	inputRightIcon: {
		position: "absolute",
		right: 12,
		top: 0,
		bottom: 0,
		justifyContent: "center",
		alignItems: "center",
	},

	twoColumns: {
		flexDirection: "row",
		gap: 10,
		alignItems: "flex-start",
	},

	textArea: {
		minHeight: 104,
		textAlignVertical: "top",
		paddingTop: 12,
	},

	bottomHint: {
		fontSize: 12,
		lineHeight: 17,
		color: "#6B7280",
		paddingHorizontal: 2,
	},

	footerSafe: {
		backgroundColor: "rgba(255,255,255,0.96)",
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "rgba(15,23,42,0.10)",
	},

	footer: {
		paddingHorizontal: 16,
		paddingTop: 10,
		backgroundColor: "rgba(255,255,255,0.96)",
	},

	saveButton: {
		height: 50,
		borderRadius: 15,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 8,
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 4,
	},

	saveButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "800",
	},

	footerHint: {
		marginTop: 7,
		textAlign: "center",
		fontSize: 11,
		color: "#6B7280",
	},
});