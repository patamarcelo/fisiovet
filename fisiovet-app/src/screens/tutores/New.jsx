//src/screens/tutores/Form.jsx
//@ts-nocheck

import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import {
	ActivityIndicator,
	Alert,
	Keyboard,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";

import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
	KeyboardAwareScrollView,
	KeyboardToolbar,
} from "react-native-keyboard-controller";

import {
	router,
	useLocalSearchParams,
	useNavigation,
} from "expo-router";

import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import {
	addTutor,
	deleteTutor,
	fetchTutor,
	updateTutor,
} from "@/src/store/slices/tutoresSlice";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useSubscriptionGate } from "@/src/hooks/useSubscriptionGate";

import ThemedTextInput from "@/components/ui/ThemedTextInput";

import { fetchAddressByCep } from "@/src/services/cep";
import { geocodeAddress } from "@/src/services/geocoding";

import {
	autocompleteAddress,
	createPlacesSessionToken,
	getAddressDetails,
} from "@/src/services/addressAutocomplete";

import {
	maskCep,
	maskPhone,
} from "@/src/utils/masks";

const onlyDigits = (value) =>
	String(value || "").replace(/\D/g, "");

const trimOrNull = (value) => {
	const text = String(value ?? "").trim();
	return text || null;
};

const upperUf = (value) =>
	String(value || "")
		.replace(/[^a-zA-Z]/g, "")
		.toUpperCase()
		.slice(0, 2);

const isEmail = (value) => {
	const text = String(value || "").trim();

	if (!text) return true;

	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
};

function hasAnyAddressField(address) {
	return Object.values(address || {}).some((value) =>
		String(value ?? "").trim()
	);
}

function hasMinimumAddressForGeocode(address) {
	return Boolean(
		address?.logradouro ||
			address?.cidade ||
			address?.cep
	);
}

function isCepOnlyQuery(value) {
	const text = String(value || "").trim();
	const digits = onlyDigits(text);
	const hasLetters = /[a-zA-ZÀ-ÿ]/.test(text);

	return !hasLetters && digits.length > 0;
}

function FormSection({
	title,
	helper,
	children,
}) {
	return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>
					{title}
				</Text>

				{!!helper && (
					<Text style={styles.sectionHelper}>
						{helper}
					</Text>
				)}
			</View>

			<View style={styles.sectionCard}>
				{children}
			</View>
		</View>
	);
}

function Field({
	label,
	helper,
	error,
	children,
}) {
	return (
		<View style={styles.field}>
			{!!label && (
				<Text style={styles.fieldLabel}>
					{label}
				</Text>
			)}

			{children}

			{!!error ? (
				<Text style={styles.fieldError}>
					{error}
				</Text>
			) : helper ? (
				<Text style={styles.fieldHelper}>
					{helper}
				</Text>
			) : null}
		</View>
	);
}

function Divider() {
	return <View style={styles.divider} />;
}

function LimitScreen({
	gate,
	background,
	text,
	subtle,
	tint,
	onBack,
}) {
	return (
		<SafeAreaView
			style={[
				styles.limitScreen,
				{ backgroundColor: background },
			]}
			edges={["left", "right", "bottom"]}
		>
			<View style={styles.limitContent}>
				<View style={styles.limitIcon}>
					<Ionicons
						name="people-outline"
						size={34}
						color="#0A84FF"
					/>
				</View>

				<Text
					style={[
						styles.limitTitle,
						{ color: text },
					]}
				>
					Limite de tutores atingido
				</Text>

				<Text
					style={[
						styles.limitDescription,
						{ color: subtle },
					]}
				>
					Seu plano Free permite até {gate.limit} tutores.{" "}
					Você já possui {gate.current} cadastrados.
				</Text>

				<View style={styles.limitUsageCard}>
					<View style={styles.limitUsageTop}>
						<Text
							style={[
								styles.limitUsageLabel,
								{ color: text },
							]}
						>
							Tutores cadastrados
						</Text>

						<Text style={styles.limitUsageCount}>
							{gate.current}/{gate.limit}
						</Text>
					</View>

					<View style={styles.limitProgressTrack}>
						<View style={styles.limitProgressFill} />
					</View>
				</View>

				<Pressable
					onPress={gate.openPlans}
					style={({ pressed }) => [
						styles.limitPrimaryButton,
						pressed && { opacity: 0.86 },
					]}
				>
					<Ionicons
						name="star-outline"
						size={18}
						color="#FFFFFF"
					/>

					<Text style={styles.limitPrimaryButtonText}>
						Ver planos
					</Text>
				</Pressable>

				<Pressable
					onPress={onBack}
					style={({ pressed }) => [
						styles.limitSecondaryButton,
						pressed && { opacity: 0.6 },
					]}
				>
					<Text
						style={[
							styles.limitSecondaryButtonText,
							{ color: tint },
						]}
					>
						Voltar
					</Text>
				</Pressable>
			</View>
		</SafeAreaView>
	);
}

export default function TutorForm() {
	const navigation = useNavigation();
	const dispatch = useDispatch();
	const insets = useSafeAreaInsets();

	const { id: rawId } = useLocalSearchParams();

	const id = rawId
		? Array.isArray(rawId)
			? String(rawId[0])
			: String(rawId)
		: null;

	const isEdit = Boolean(id);

	const tutor = useSelector((state) =>
		id
			? state?.tutores?.byId?.[id]
			: null
	);

	const background = useThemeColor({}, "background");
	const text = useThemeColor({}, "text");
	const tint = useThemeColor({}, "tint");

	const subtle = useThemeColor(
		{
			light: "#6B7280",
			dark: "#9AA0A6",
		},
		"text"
	);

	const danger = "#DC2626";
	const success = "#16A34A";

	const tutorGate = useSubscriptionGate("tutores");

	const blockedByPlan =
		!isEdit &&
		!tutorGate.canCreate;

	const nomeRef = useRef(null);
	const emailRef = useRef(null);
	const addressQueryRef = useRef(null);
	const numeroRef = useRef(null);
	const telefoneRef = useRef(null);
	const logradouroRef = useRef(null);
	const bairroRef = useRef(null);
	const cidadeRef = useRef(null);
	const ufRef = useRef(null);
	const complementoRef = useRef(null);
	const observacoesRef = useRef(null);
	const autocompleteTimerRef = useRef(null);
	const sessionTokenRef = useRef(null);

	const [nome, setNome] = useState("");
	const [telefone, setTelefone] = useState("");
	const [email, setEmail] = useState("");

	const [addressQuery, setAddressQuery] = useState("");
	const [cep, setCep] = useState("");
	const [logradouro, setLogradouro] = useState("");
	const [numero, setNumero] = useState("");
	const [bairro, setBairro] = useState("");
	const [cidade, setCidade] = useState("");
	const [uf, setUf] = useState("");
	const [complemento, setComplemento] = useState("");

	const [observacoes, setObservacoes] = useState("");

	const [loadingAddress, setLoadingAddress] = useState(false);
	const [loadingSuggestions, setLoadingSuggestions] = useState(false);
	const [addressFound, setAddressFound] = useState(false);
	const [selectedGeo, setSelectedGeo] = useState(null);
	const [addressSuggestions, setAddressSuggestions] = useState([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (id && !tutor) {
			dispatch(fetchTutor(id));
		}
	}, [dispatch, id, tutor]);

	useEffect(() => {
		if (!tutor) return;

		const currentCep =
			tutor?.endereco?.cep || "";

		const currentFormatted =
			tutor?.endereco?.formatted || "";

		const currentAddressQuery =
			currentCep
				? maskCep(currentCep)
				: currentFormatted ||
					[
						tutor?.endereco?.logradouro,
						tutor?.endereco?.numero,
						tutor?.endereco?.cidade,
						tutor?.endereco?.uf,
					]
						.filter(Boolean)
						.join(", ");

		setNome(tutor?.nome || "");
		setTelefone(tutor?.telefone || "");
		setEmail(tutor?.email || "");

		setAddressQuery(currentAddressQuery);
		setCep(currentCep);
		setLogradouro(tutor?.endereco?.logradouro || "");
		setNumero(tutor?.endereco?.numero || "");
		setBairro(tutor?.endereco?.bairro || "");
		setCidade(tutor?.endereco?.cidade || "");
		setUf(tutor?.endereco?.uf || "");
		setComplemento(tutor?.endereco?.complemento || "");

		setSelectedGeo(tutor?.geo || null);
		setAddressFound(Boolean(currentCep || currentFormatted));

		setObservacoes(tutor?.observacoes || "");
	}, [tutor?.id]);

	useEffect(() => {
		return () => {
			if (autocompleteTimerRef.current) {
				clearTimeout(autocompleteTimerRef.current);
			}
		};
	}, []);

	const goBack = useCallback(() => {
		Keyboard.dismiss();

		if (router.canGoBack()) {
			router.back();
			return;
		}

		router.replace("/(phone)/tutores");
	}, []);

	const phoneDigits = useMemo(
		() => onlyDigits(telefone),
		[telefone]
	);

	const cepDigits = useMemo(
		() => onlyDigits(cep),
		[cep]
	);

	const validation = useMemo(() => {
		const nameOk = Boolean(nome.trim());

		const phoneOk =
			!phoneDigits ||
			(
				phoneDigits.length >= 10 &&
				phoneDigits.length <= 11
			);

		const emailOk = isEmail(email);

		const cepOk =
			!cepDigits ||
			cepDigits.length === 8;

		const ufClean = upperUf(uf);

		const ufOk =
			!ufClean ||
			ufClean.length === 2;

		return {
			nameOk,
			phoneOk,
			emailOk,
			cepOk,
			ufOk,
			isValid:
				nameOk &&
				phoneOk &&
				emailOk &&
				cepOk &&
				ufOk,
		};
	}, [
		nome,
		phoneDigits,
		email,
		cepDigits,
		uf,
	]);

	const firstError = useMemo(() => {
		if (!validation.nameOk) {
			return "Informe pelo menos o nome do tutor.";
		}

		if (!validation.phoneOk) {
			return "Telefone opcional, mas precisa ter 10–11 dígitos com DDD quando preenchido.";
		}

		if (!validation.emailOk) {
			return "E-mail inválido.";
		}

		if (!validation.cepOk) {
			return "CEP opcional, mas precisa ter 8 dígitos quando preenchido.";
		}

		if (!validation.ufOk) {
			return "UF opcional, mas precisa ter 2 letras quando preenchida.";
		}

		return null;
	}, [validation]);

	const isSubmitDisabled =
		submitting ||
		loadingAddress ||
		!validation.isValid;

	const confirmDelete = useCallback(() => {
		if (!id || submitting) return;

		Alert.alert(
			"Excluir tutor",
			`Deseja realmente excluir ${tutor?.nome || "este tutor"}?`,
			[
				{
					text: "Cancelar",
					style: "cancel",
				},
				{
					text: "Excluir",
					style: "destructive",
					onPress: async () => {
						try {
							setSubmitting(true);

							await dispatch(
								deleteTutor(id)
							).unwrap();

							if (router.canGoBack()) {
								router.back();
								return;
							}

							router.replace("/(phone)/tutores");
						} catch (error) {
							Alert.alert(
								"Erro",
								error?.message ||
									"Não foi possível excluir o tutor."
							);
						} finally {
							setSubmitting(false);
						}
					},
				},
			]
		);
	}, [
		dispatch,
		id,
		submitting,
		tutor?.nome,
	]);

	useEffect(() => {
		navigation.setOptions({
			headerLargeTitle: false,
			headerBackTitleVisible: false,
			headerTitleAlign: "center",
			headerTitle: isEdit
				? "Editar tutor"
				: "Novo tutor",

			headerLeftContainerStyle: {
				minWidth: 64,
				paddingLeft: 12,
			},

			headerRightContainerStyle: {
				minWidth: 64,
				paddingRight: 12,
				alignItems: "flex-end",
			},

			headerLeft: () => (
				<Pressable
					onPress={goBack}
					hitSlop={8}
					accessibilityRole="button"
					accessibilityLabel="Fechar"
					style={({ pressed }) => [
						styles.headerActionButton,
						pressed &&
							styles.headerActionButtonPressed,
					]}
				>
					<Ionicons
						name="close"
						size={21}
						color={tint}
					/>
				</Pressable>
			),

			headerRight: isEdit
				? () => (
					<Pressable
						onPress={confirmDelete}
						disabled={submitting}
						hitSlop={8}
						accessibilityRole="button"
						accessibilityLabel="Excluir tutor"
						style={({ pressed }) => [
							styles.headerActionButton,
							styles.headerDeleteButton,
							pressed &&
								styles.headerActionButtonPressed,
							submitting && {
								opacity: 0.4,
							},
						]}
					>
						<Ionicons
							name="trash-outline"
							size={19}
							color="#DC2626"
						/>
					</Pressable>
				)
				: undefined,
		});
	}, [
		navigation,
		isEdit,
		confirmDelete,
		submitting,
		tint,
		goBack,
	]);

	const normalizeGoogleAddress = useCallback((components = []) => {
		const get = (...types) => {
			for (const type of types) {
				const component = components.find((item) =>
					item?.types?.includes(type)
				);

				if (component) {
					return {
						long:
							component.longText ||
							component.long_name ||
							"",
						short:
							component.shortText ||
							component.short_name ||
							"",
					};
				}
			}

			return {
				long: "",
				short: "",
			};
		};

		const streetNumber = get("street_number");
		const route = get("route");

		const neighborhood = get(
			"neighborhood",
			"sublocality_level_1",
			"sublocality"
		);

		const sublocality = get(
			"sublocality_level_1",
			"sublocality"
		);

		const locality = get(
			"locality",
			"postal_town",
			"administrative_area_level_2",
			"sublocality_level_1"
		);

		const adminArea = get(
			"administrative_area_level_1"
		);

		const postalCode = get("postal_code");
		const country = get("country");

		return {
			street_number:
				streetNumber.long || null,
			route:
				route.long || null,
			neighborhood:
				neighborhood.long || null,
			sublocality:
				sublocality.long || null,
			locality:
				locality.long || null,
			admin_area_level_1:
				adminArea.short ||
				adminArea.long ||
				null,
			country:
				country.short ||
				country.long ||
				null,
			postal_code:
				postalCode.long || null,
		};
	}, []);

	const buildGeoPayload = useCallback((geo) => {
		const viewport =
			geo?.raw?.geometry?.viewport;

		const navigationPoints =
			geo?.raw?.navigation_points;

		return {
			lat:
				geo?.lat ??
				null,
			lng:
				geo?.lng ??
				null,
			placeId:
				geo?.placeId ??
				null,
			precision:
				geo?.precision ||
				geo?.raw?.geometry?.location_type ||
				null,
			types:
				geo?.raw?.types ||
				[],
			viewport: viewport
				? {
						northeast: {
							lat:
								viewport?.northeast?.lat ??
								null,
							lng:
								viewport?.northeast?.lng ??
								null,
						},
						southwest: {
							lat:
								viewport?.southwest?.lat ??
								null,
							lng:
								viewport?.southwest?.lng ??
								null,
						},
					}
				: null,
			navigationPoints:
				navigationPoints ||
				null,
			provider: "google",
			retrievedAt: Date.now(),
			raw:
				geo?.raw ||
				null,
		};
	}, []);

	const invalidateSelectedGeo = useCallback(() => {
		setSelectedGeo(null);
		setAddressFound(false);
	}, []);

	const applyGoogleAddress = useCallback(
		(geo, options = {}) => {
			const normalized =
				normalizeGoogleAddress(
					geo?.raw?.address_components || []
				);

			const nextLogradouro =
				normalized?.route ||
				options?.fallbackAddress?.logradouro ||
				"";

			const nextNumero =
				normalized?.street_number ||
				options?.fallbackAddress?.numero ||
				"";

			const nextBairro =
				normalized?.neighborhood ||
				normalized?.sublocality ||
				options?.fallbackAddress?.bairro ||
				"";

			const nextCidade =
				normalized?.locality ||
				options?.fallbackAddress?.cidade ||
				"";

			const nextUf =
				normalized?.admin_area_level_1 ||
				options?.fallbackAddress?.uf ||
				"";

			const nextCep = onlyDigits(
				normalized?.postal_code ||
					options?.fallbackAddress?.cep ||
					""
			);

			setLogradouro(nextLogradouro);
			setNumero(nextNumero);
			setBairro(nextBairro);
			setCidade(nextCidade);
			setUf(nextUf);
			setCep(nextCep);

			setAddressQuery(
				geo?.formattedAddress ||
					(nextCep
						? maskCep(nextCep)
						: options?.originalQuery || "")
			);

			setSelectedGeo(
				buildGeoPayload(geo)
			);

			setAddressFound(true);

			if (!nextNumero) {
				setTimeout(() => {
					numeroRef.current?.focus();
				}, 120);
			}
		},
		[
			normalizeGoogleAddress,
			buildGeoPayload,
		]
	);

	const handleAddressQueryChange = useCallback(
		(value) => {
			invalidateSelectedGeo();

			if (autocompleteTimerRef.current) {
				clearTimeout(autocompleteTimerRef.current);
			}

			const cepMode = isCepOnlyQuery(value);

			if (cepMode) {
				const digits = onlyDigits(value).slice(0, 8);

				setCep(digits);
				setAddressQuery(maskCep(digits));
				setAddressSuggestions([]);
				setShowSuggestions(false);
				setLoadingSuggestions(false);

				return;
			}

			setCep("");
			setAddressQuery(value);

			const query = String(value || "").trim();

			if (query.length < 3) {
				setAddressSuggestions([]);
				setShowSuggestions(false);
				setLoadingSuggestions(false);
				return;
			}

			if (!sessionTokenRef.current) {
				sessionTokenRef.current =
					createPlacesSessionToken();
			}

			autocompleteTimerRef.current = setTimeout(async () => {
				try {
					setLoadingSuggestions(true);

					const results = await autocompleteAddress({
						input: query,
						sessionToken: sessionTokenRef.current,
					});

					setAddressSuggestions(results);
					setShowSuggestions(results.length > 0);
				} catch (error) {
					console.log(
						"Autocomplete de endereço:",
						error?.message
					);

					setAddressSuggestions([]);
					setShowSuggestions(false);
				} finally {
					setLoadingSuggestions(false);
				}
			}, 400);
		},
		[invalidateSelectedGeo]
	);

	const handleSelectSuggestion = useCallback(
		async (suggestion) => {
			try {
				if (autocompleteTimerRef.current) {
					clearTimeout(autocompleteTimerRef.current);
					autocompleteTimerRef.current = null;
				}

				setLoadingAddress(true);
				setShowSuggestions(false);

				const place = await getAddressDetails({
					placeId: suggestion.placeId,
					sessionToken: sessionTokenRef.current,
				});

				const placeComponents =
					place?.addressComponents || [];

				let normalized =
					normalizeGoogleAddress(placeComponents);

				let fallbackGeo = null;

				if (
					!normalized?.locality ||
					!normalized?.postal_code
				) {
					try {
						fallbackGeo = await geocodeAddress({
							logradouro:
								place?.formattedAddress ||
								suggestion.description ||
								"",
						});

						const fallbackNormalized =
							normalizeGoogleAddress(
								fallbackGeo?.raw?.address_components ||
								[]
							);

						normalized = {
							street_number:
								normalized?.street_number ||
								fallbackNormalized?.street_number ||
								null,
							route:
								normalized?.route ||
								fallbackNormalized?.route ||
								null,
							neighborhood:
								normalized?.neighborhood ||
								fallbackNormalized?.neighborhood ||
								null,
							sublocality:
								normalized?.sublocality ||
								fallbackNormalized?.sublocality ||
								null,
							locality:
								normalized?.locality ||
								fallbackNormalized?.locality ||
								null,
							admin_area_level_1:
								normalized?.admin_area_level_1 ||
								fallbackNormalized?.admin_area_level_1 ||
								null,
							country:
								normalized?.country ||
								fallbackNormalized?.country ||
								null,
							postal_code:
								normalized?.postal_code ||
								fallbackNormalized?.postal_code ||
								null,
						};
					} catch (fallbackError) {
						console.warn(
							"Não foi possível completar cidade/CEP:",
							fallbackError?.message
						);
					}
				}

				const nextCep = onlyDigits(
					normalized?.postal_code || ""
				);

				setAddressQuery(
					place?.formattedAddress ||
						suggestion.description ||
						""
				);

				setCep(nextCep);
				setLogradouro(normalized?.route || "");
				setNumero(normalized?.street_number || "");
				setBairro(
					normalized?.neighborhood ||
						normalized?.sublocality ||
						""
				);
				setCidade(normalized?.locality || "");
				setUf(normalized?.admin_area_level_1 || "");

				setSelectedGeo({
					lat:
						place?.location?.latitude ??
						fallbackGeo?.lat ??
						null,
					lng:
						place?.location?.longitude ??
						fallbackGeo?.lng ??
						null,
					placeId:
						place?.id ||
						fallbackGeo?.placeId ||
						suggestion.placeId,
					precision:
						fallbackGeo?.precision ||
						"place",
					types:
						place?.types ||
						fallbackGeo?.raw?.types ||
						[],
					viewport: place?.viewport
						? {
								northeast: {
									lat:
										place.viewport.high?.latitude ??
										null,
									lng:
										place.viewport.high?.longitude ??
										null,
								},
								southwest: {
									lat:
										place.viewport.low?.latitude ??
										null,
									lng:
										place.viewport.low?.longitude ??
										null,
								},
							}
						: null,
					provider: "google_places",
					retrievedAt: Date.now(),
					raw: {
						...place,
						addressComponents:
							placeComponents,
						resolvedAddress:
							normalized,
						geocodingFallback:
							fallbackGeo?.raw || null,
					},
				});

				setAddressFound(true);
				setAddressSuggestions([]);
				setShowSuggestions(false);
				sessionTokenRef.current = null;

				if (!normalized?.street_number) {
					setTimeout(() => {
						numeroRef.current?.focus();
					}, 120);
				}
			} catch (error) {
				Alert.alert(
					"Endereço",
					error?.message ||
						"Não foi possível carregar o endereço selecionado."
				);
			} finally {
				setLoadingAddress(false);
			}
		},
		[
			normalizeGoogleAddress,
		]
	);

	const searchAddress = useCallback(async () => {
		const rawQuery =
			String(addressQuery || "").trim();

		if (!rawQuery) {
			Alert.alert(
				"Endereço",
				"Digite um CEP ou endereço para buscar."
			);

			return;
		}

		const digits = onlyDigits(rawQuery);
		const cepMode = isCepOnlyQuery(rawQuery);

		if (cepMode && digits.length !== 8) {
			Alert.alert(
				"CEP",
				"Digite os 8 dígitos do CEP."
			);

			return;
		}

		try {
			setLoadingAddress(true);
			setAddressFound(false);
			setShowSuggestions(false);
			setAddressSuggestions([]);
			setSelectedGeo(null);

			if (cepMode) {
				const address =
					await fetchAddressByCep(digits);

				setCep(digits);
				setLogradouro(address?.logradouro || "");
				setBairro(address?.bairro || "");
				setCidade(address?.cidade || "");
				setUf(address?.uf || "");
				setComplemento(address?.complemento || "");
				setAddressQuery(maskCep(digits));

				try {
					const geo =
						await geocodeAddress({
							cep: digits,
							logradouro:
								address?.logradouro ||
								null,
							bairro:
								address?.bairro ||
								null,
							cidade:
								address?.cidade ||
								null,
							uf:
								address?.uf ||
								null,
						});

					applyGoogleAddress(geo, {
						fallbackAddress: {
							...address,
							cep: digits,
						},
						originalQuery: maskCep(digits),
					});
				} catch (geoError) {
					console.warn(
						"CEP encontrado, mas geocoding falhou:",
						geoError?.message
					);

					setAddressFound(true);

					setTimeout(() => {
						numeroRef.current?.focus();
					}, 120);
				}

				return;
			}

			const geo =
				await geocodeAddress({
					logradouro: rawQuery,
				});

			if (
				!geo ||
				geo?.lat == null ||
				geo?.lng == null
			) {
				throw new Error(
					"Endereço não encontrado."
				);
			}

			applyGoogleAddress(geo, {
				originalQuery: rawQuery,
			});
		} catch (error) {
			console.warn(
				"Busca de endereço falhou:",
				error?.message
			);

			Alert.alert(
				"Endereço",
				error?.message ||
					"Não foi possível encontrar o endereço. Você pode preencher os campos manualmente."
			);
		} finally {
			setLoadingAddress(false);
		}
	}, [
		addressQuery,
		applyGoogleAddress,
	]);

	const onSubmit = useCallback(async () => {
		if (submitting) return;

		if (!isEdit && !tutorGate.canCreate) {
			tutorGate.showLimitAlert();
			return;
		}

		if (!validation.isValid) {
			if (firstError) {
				Alert.alert(
					"Validação",
					firstError
				);
			}

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

			let geoEnriched =
				selectedGeo ||
				null;

			let enderecoFinal = {
				...enderecoBase,
			};

			const shouldTryGeocode =
				hasAnyAddressField(enderecoBase) &&
				hasMinimumAddressForGeocode(enderecoBase);

			if (
				shouldTryGeocode &&
				!selectedGeo
			) {
				try {
					const geo =
						await geocodeAddress(enderecoBase);

					const normalized =
						normalizeGoogleAddress(
							geo?.raw?.address_components || []
						);

					enderecoFinal = {
						...enderecoBase,
						formatted:
							geo?.formattedAddress ||
							null,
						normalized,
					};

					geoEnriched =
						buildGeoPayload(geo);
				} catch (error) {
					console.warn(
						"Geocoding falhou:",
						error?.message
					);

					Alert.alert(
						"Atenção",
						"O tutor será salvo sem coordenadas de mapa. Você pode complementar o endereço depois."
					);
				}
			} else if (selectedGeo) {
				const rawComponents =
					selectedGeo?.raw?.addressComponents ||
					selectedGeo?.raw?.address_components ||
					[];

				const normalized =
					selectedGeo?.raw?.resolvedAddress ||
					normalizeGoogleAddress(rawComponents);

				enderecoFinal = {
					...enderecoBase,
					formatted:
						selectedGeo?.raw?.formattedAddress ||
						selectedGeo?.raw?.formatted_address ||
						addressQuery ||
						null,
					normalized,
				};
			}

			const payload = {
				nome: nome.trim(),
				telefone: phoneDigits || null,
				email: trimOrNull(email),
				endereco: enderecoFinal,
				geo: geoEnriched,
				observacoes: trimOrNull(observacoes),
			};

			if (isEdit) {
				await dispatch(
					updateTutor({
						id,
						patch: payload,
					})
				).unwrap();

				Alert.alert(
					"Sucesso",
					"Tutor atualizado!"
				);
			} else {
				await dispatch(
					addTutor(payload)
				).unwrap();

				Alert.alert(
					"Sucesso",
					"Tutor cadastrado!"
				);
			}

			goBack();
		} catch (error) {
			console.error(
				"Erro ao salvar tutor:",
				error
			);

			Alert.alert(
				"Erro",
				error?.message ||
					"Não foi possível salvar o tutor. Tente novamente ou verifique sua conexão."
			);
		} finally {
			setSubmitting(false);
		}
	}, [
		submitting,
		isEdit,
		tutorGate.canCreate,
		tutorGate.showLimitAlert,
		validation.isValid,
		firstError,
		cepDigits,
		logradouro,
		numero,
		bairro,
		cidade,
		uf,
		complemento,
		selectedGeo,
		addressQuery,
		nome,
		phoneDigits,
		email,
		observacoes,
		normalizeGoogleAddress,
		buildGeoPayload,
		dispatch,
		id,
		goBack,
	]);

	if (blockedByPlan) {
		return (
			<LimitScreen
				gate={tutorGate}
				background={background}
				text={text}
				subtle={subtle}
				tint={tint}
				onBack={goBack}
			/>
		);
	}

	return (
		<SafeAreaView
			style={[
				styles.root,
				{ backgroundColor: background },
			]}
			edges={[]}
		>
			<View style={styles.shell}>
				<KeyboardAwareScrollView
					style={styles.scroll}
					contentContainerStyle={[
						styles.content,
						{
							paddingBottom:
								148 +
								insets.bottom,
						},
					]}
					bottomOffset={18}
					extraKeyboardSpace={48}
					disableScrollOnKeyboardHide
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="interactive"
					showsVerticalScrollIndicator={false}
				>
					<FormSection
						title="Dados básicos"
						helper="Apenas o nome é obrigatório. Telefone e e-mail ajudam no contato, mas podem ser preenchidos depois."
					>
						<Field
							label="Nome do tutor"
							error={
								!validation.nameOk
									? firstError
									: null
							}
						>
							<ThemedTextInput
								ref={nomeRef}
								placeholder="Ex.: Maria Souza"
								value={nome}
								onChangeText={setNome}
								returnKeyType="next"
								onSubmitEditing={() =>
									telefoneRef.current?.focus()
								}
								style={styles.input}
							/>
						</Field>

						<Divider />

						<Field
							label="Telefone"
							helper="Opcional. Use DDD para facilitar contato por WhatsApp."
							error={
								!validation.phoneOk
									? firstError
									: null
							}
						>
							<ThemedTextInput
								placeholder="(00) 00000-0000"
								ref={telefoneRef}
								value={maskPhone(telefone)}
								onChangeText={(value) =>
									setTelefone(
										onlyDigits(value)
									)
								}
								keyboardType="phone-pad"
								returnKeyType="next"
								onSubmitEditing={() =>
									emailRef.current?.focus()
								}
								style={styles.input}
							/>
						</Field>

						<Divider />

						<Field
							label="E-mail"
							helper="Opcional. Útil para envio de lembretes e documentos."
							error={
								!validation.emailOk
									? firstError
									: null
							}
						>
							<ThemedTextInput
								placeholder="email@exemplo.com"
								ref={emailRef}
								value={email}
								onChangeText={setEmail}
								keyboardType="email-address"
								autoCapitalize="none"
								returnKeyType="next"
								onSubmitEditing={() =>
									addressQueryRef.current?.focus()
								}
								style={styles.input}
							/>
						</Field>
					</FormSection>

					<FormSection
						title="Endereço"
						helper="Digite um CEP ou endereço e toque em buscar. Os campos abaixo continuam editáveis."
					>
						<Field
							label="CEP ou endereço"
							error={
								!validation.cepOk
									? firstError
									: null
							}
							helper={
								addressFound
									? "Endereço selecionado. Confira e complete os dados abaixo."
									: "Digite um CEP ou comece a escrever o endereço."
							}
						>
							<View style={styles.addressSearchContainer}>
								<View style={styles.addressSearchRow}>
									<View style={styles.addressSearchInput}>
										<ThemedTextInput
											placeholder="CEP ou endereço completo"
											ref={addressQueryRef}
											value={addressQuery}
											onChangeText={handleAddressQueryChange}
											onFocus={() => {
												if (addressSuggestions.length > 0) {
													setShowSuggestions(true);
												}
											}}
											autoCapitalize="words"
											autoCorrect={false}
											returnKeyType="search"
											onSubmitEditing={searchAddress}
											style={styles.input}
										/>
									</View>

									<Pressable
										onPress={searchAddress}
										disabled={
											loadingAddress ||
											!addressQuery.trim()
										}
										accessibilityRole="button"
										accessibilityLabel="Buscar endereço"
										style={({ pressed }) => [
											styles.addressSearchButton,
											{
												backgroundColor: tint,
											},
											(
												loadingAddress ||
												!addressQuery.trim()
											) && {
												opacity: 0.45,
											},
											pressed && {
												opacity: 0.72,
											},
										]}
									>
										{loadingAddress ? (
											<ActivityIndicator
												size="small"
												color="#FFFFFF"
											/>
										) : addressFound ? (
											<Ionicons
												name="checkmark"
												size={20}
												color="#FFFFFF"
											/>
										) : (
											<Ionicons
												name="search"
												size={19}
												color="#FFFFFF"
											/>
										)}
									</Pressable>
								</View>

								{loadingSuggestions && (
									<View style={styles.suggestionsLoading}>
										<ActivityIndicator size="small" />
										<Text style={styles.suggestionsLoadingText}>
											Buscando endereços…
										</Text>
									</View>
								)}

								{showSuggestions &&
									addressSuggestions.length > 0 && (
										<View style={styles.suggestionsCard}>
											{addressSuggestions.slice(0, 6).map(
												(suggestion, index) => (
													<Pressable
														key={suggestion.placeId}
														onPress={() =>
															handleSelectSuggestion(
																suggestion
															)
														}
														style={({ pressed }) => [
															styles.suggestionRow,
															index <
																addressSuggestions.length - 1 &&
																styles.suggestionDivider,
															pressed && {
																backgroundColor:
																	"rgba(10,132,255,0.06)",
															},
														]}
													>
														<View style={styles.suggestionIcon}>
															<Ionicons
																name="location-outline"
																size={18}
																color="#0A84FF"
															/>
														</View>

														<View style={styles.suggestionContent}>
															<Text
																style={styles.suggestionMain}
																numberOfLines={1}
															>
																{suggestion.mainText}
															</Text>

															{!!suggestion.secondaryText && (
																<Text
																	style={styles.suggestionSecondary}
																	numberOfLines={2}
																>
																	{suggestion.secondaryText}
																</Text>
															)}
														</View>

														<Ionicons
															name="chevron-forward"
															size={15}
															color="#9CA3AF"
														/>
													</Pressable>
												)
											)}
										</View>
									)}
							</View>
						</Field>

						<Divider />

						<Field label="Logradouro">
							<ThemedTextInput
								ref={logradouroRef}
								placeholder="Rua, avenida, estrada..."
								value={logradouro}
								onChangeText={(value) => {
									invalidateSelectedGeo();
									setLogradouro(value);
								}}
								returnKeyType="next"
								onSubmitEditing={() =>
									numeroRef.current?.focus()
								}
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
										onChangeText={(value) => {
											invalidateSelectedGeo();
											setNumero(value);
										}}
										keyboardType="number-pad"
										returnKeyType="next"
										onSubmitEditing={() =>
											bairroRef.current?.focus()
										}
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
										onChangeText={(value) => {
											invalidateSelectedGeo();
											setBairro(value);
										}}
										returnKeyType="next"
										onSubmitEditing={() =>
											cidadeRef.current?.focus()
										}
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
										onChangeText={(value) => {
											invalidateSelectedGeo();
											setCidade(value);
										}}
										returnKeyType="next"
										onSubmitEditing={() =>
											ufRef.current?.focus()
										}
										style={styles.input}
									/>
								</Field>
							</View>

							<View style={{ flex: 0.65 }}>
								<Field
									label="UF"
									error={
										!validation.ufOk
											? firstError
											: null
									}
								>
									<ThemedTextInput
										placeholder="UF"
										ref={ufRef}
										value={uf}
										onChangeText={(value) => {
											invalidateSelectedGeo();
											setUf(upperUf(value));
										}}
										autoCapitalize="characters"
										maxLength={2}
										returnKeyType="next"
										onSubmitEditing={() =>
											complementoRef.current?.focus()
										}
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
								returnKeyType="next"
								onSubmitEditing={() =>
									observacoesRef.current?.focus()
								}
								style={styles.input}
							/>
						</Field>
					</FormSection>

					<FormSection
						title="Observações"
						helper="Campo livre para preferências, restrições, comportamento do tutor ou anotações úteis."
					>
						<ThemedTextInput
							ref={observacoesRef}
							placeholder="Anotações gerais sobre o tutor..."
							value={observacoes}
							onChangeText={setObservacoes}
							multiline
							numberOfLines={4}
							returnKeyType="default"
							blurOnSubmit={false}
							style={[
								styles.input,
								styles.textArea,
							]}
						/>
					</FormSection>

					{!!firstError && (
						<Text
							style={[
								styles.bottomHint,
								{
									color: validation.nameOk
										? subtle
										: danger,
								},
							]}
						>
							{firstError}
						</Text>
					)}
				</KeyboardAwareScrollView>

				<View
					style={[
						styles.fixedFooter,
						{
							paddingBottom:
								Math.max(
									insets.bottom,
									10
								),
						},
					]}
				>
					<Pressable
						onPress={onSubmit}
						disabled={isSubmitDisabled}
						style={({ pressed }) => [
							styles.saveButton,
							{
								backgroundColor:
									isSubmitDisabled
										? "#A7B4C8"
										: tint,
								opacity: pressed
									? 0.9
									: 1,
							},
						]}
					>
						{submitting ? (
							<>
								<ActivityIndicator color="#fff" />

								<Text style={styles.saveButtonText}>
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

								<Text style={styles.saveButtonText}>
									{isEdit
										? "Salvar alterações"
										: "Salvar tutor"}
								</Text>
							</>
						)}
					</Pressable>

					<Text style={styles.footerHint}>
						{loadingAddress
							? "Buscando endereço…"
							: addressFound
								? "Endereço localizado. Confira os campos antes de salvar."
								: "Você pode completar os dados do tutor depois."}
					</Text>
				</View>

				{Platform.OS === "ios" && (
					<KeyboardToolbar style={styles.keyboardToolbar}>
						<KeyboardToolbar.Content>
							<Text style={styles.keyboardToolbarLabel}>
								Preenchimento do tutor
							</Text>
						</KeyboardToolbar.Content>

						<KeyboardToolbar.Done text="Fechar" />
					</KeyboardToolbar>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},

	shell: {
		flex: 1,
		position: "relative",
	},

	scroll: {
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
		shadowOffset: {
			width: 0,
			height: 5,
		},
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

	addressSearchRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 9,
	},

	addressSearchInput: {
		flex: 1,
		minWidth: 0,
	},

	addressSearchContainer: {
		position: "relative",
	},

	addressSearchButton: {
		width: 46,
		height: 46,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},

	suggestionsLoading: {
		marginTop: 8,
		paddingHorizontal: 10,
		minHeight: 38,
		borderRadius: 12,
		backgroundColor: "rgba(118,118,128,0.07)",
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},

	suggestionsLoadingText: {
		color: "#6B7280",
		fontSize: 12,
		fontWeight: "600",
	},

	suggestionsCard: {
		marginTop: 8,
		borderRadius: 14,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(15,23,42,0.10)",
		backgroundColor: "#FFFFFF",
		overflow: "hidden",
		shadowColor: "#000",
		shadowOpacity: 0.07,
		shadowRadius: 10,
		shadowOffset: {
			width: 0,
			height: 4,
		},
		elevation: 3,
	},

	suggestionRow: {
		minHeight: 58,
		paddingHorizontal: 12,
		paddingVertical: 10,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	suggestionDivider: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(15,23,42,0.08)",
	},

	suggestionIcon: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: "rgba(10,132,255,0.09)",
		alignItems: "center",
		justifyContent: "center",
	},

	suggestionContent: {
		flex: 1,
		minWidth: 0,
	},

	suggestionMain: {
		color: "#111827",
		fontSize: 13,
		fontWeight: "800",
	},

	suggestionSecondary: {
		marginTop: 2,
		color: "#6B7280",
		fontSize: 11,
		lineHeight: 15,
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
		paddingHorizontal: 2,
	},

	fixedFooter: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 50,
		paddingHorizontal: 16,
		paddingTop: 10,
		backgroundColor: "rgba(255,255,255,0.96)",
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "rgba(15,23,42,0.10)",
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 12,
		shadowOffset: {
			width: 0,
			height: -4,
		},
		elevation: 12,
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
		shadowOffset: {
			width: 0,
			height: 5,
		},
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

	headerActionButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(118,118,128,0.10)",
	},

	headerDeleteButton: {
		backgroundColor: "rgba(220,38,38,0.08)",
	},

	headerActionButtonPressed: {
		opacity: 0.62,
		transform: [
			{
				scale: 0.96,
			},
		],
	},

	limitScreen: {
		flex: 1,
	},

	limitContent: {
		flex: 1,
		paddingHorizontal: 24,
		alignItems: "center",
		justifyContent: "center",
	},

	limitIcon: {
		width: 72,
		height: 72,
		borderRadius: 36,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(10,132,255,0.10)",
		marginBottom: 18,
	},

	limitTitle: {
		fontSize: 22,
		fontWeight: "850",
		letterSpacing: -0.4,
		textAlign: "center",
	},

	limitDescription: {
		marginTop: 9,
		maxWidth: 310,
		fontSize: 14,
		lineHeight: 20,
		textAlign: "center",
	},

	limitUsageCard: {
		width: "100%",
		marginTop: 24,
		padding: 15,
		borderRadius: 17,
		backgroundColor: "#FFFFFF",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(15,23,42,0.10)",
	},

	limitUsageTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	limitUsageLabel: {
		fontSize: 13,
		fontWeight: "750",
	},

	limitUsageCount: {
		fontSize: 13,
		fontWeight: "850",
		color: "#EF4444",
	},

	limitProgressTrack: {
		height: 8,
		marginTop: 11,
		borderRadius: 999,
		overflow: "hidden",
		backgroundColor: "rgba(118,118,128,0.14)",
	},

	limitProgressFill: {
		width: "100%",
		height: "100%",
		borderRadius: 999,
		backgroundColor: "#EF4444",
	},

	limitPrimaryButton: {
		width: "100%",
		height: 48,
		marginTop: 20,
		borderRadius: 15,
		backgroundColor: "#0A84FF",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},

	limitPrimaryButtonText: {
		color: "#FFFFFF",
		fontSize: 15,
		fontWeight: "850",
	},

	limitSecondaryButton: {
		height: 44,
		marginTop: 8,
		paddingHorizontal: 20,
		alignItems: "center",
		justifyContent: "center",
	},

	limitSecondaryButtonText: {
		fontSize: 14,
		fontWeight: "750",
	},
	keyboardToolbar: {
		minHeight: 46,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "rgba(60,60,67,0.20)",
		backgroundColor: "rgba(248,248,248,0.98)",
	},

	keyboardToolbarLabel: {
		color: "#6B7280",
		fontSize: 12,
		fontWeight: "650",
	},

});
