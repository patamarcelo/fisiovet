// app/(phone)/configuracoes/assinatura.jsx
// @ts-nocheck

import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";

import {
	ActivityIndicator,
	Alert,
	Image,
	Linking,
	Platform,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";

import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
	router,
	useNavigation,
} from "expo-router";

import {
	useDispatch,
	useSelector,
} from "react-redux";

import { Ionicons } from "@expo/vector-icons";

import {
	PLAN_IDS,
	SUBSCRIPTION_SOURCE,
	SUBSCRIPTION_STATUS,
	selectCurrentLimits,
	selectCurrentPlan,
	setSubscriptionStatus,
} from "@/src/store/slices/subscriptionSlice";

import {
	getUsageFromState,
	getUsagePercent,
} from "@/src/utils/subscriptionLimits";

import {
	configureAppleSubscriptions,
	getAppleCustomerInfo,
	getAppleOfferings,
	getPlanFromCustomerInfo,
	getPremiumEntitlement,
	purchaseApplePackage,
	restoreApplePurchases,
} from "@/src/services/subscriptions/appleSubscriptions";

import { useThemeColor } from "@/hooks/useThemeColor";

const HOME_LOGO = require("@/assets/images/splash-fisiovet.png");

const PRIVACY_URL =
	"https://fisiovet.app/privacidade";

const TERMS_URL =
	"https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

const APPLE_SUBSCRIPTIONS_URL =
	"https://apps.apple.com/account/subscriptions";

const COLORS = {
	bg: "#F5F5F7",
	card: "#FFFFFF",
	text: "#111827",
	subtle: "#6B7280",
	border: "rgba(15,23,42,0.08)",
	blue: "#0A84FF",
	green: "#16A34A",
	orange: "#F59E0B",
	red: "#EF4444",
};

function formatDateBR(value) {
	if (!value) return null;

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return new Intl.DateTimeFormat(
		"pt-BR",
		{
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		}
	).format(date);
}

function openExternalUrl(url) {
	Linking.openURL(url).catch(() => {
		Alert.alert(
			"Não foi possível abrir",
			"Tente novamente mais tarde."
		);
	});
}

function UsageRow({
	label,
	current,
	limit,
}) {
	const percent =
		getUsagePercent(
			current,
			limit
		);

	const reached =
		limit != null &&
		current >= limit;

	const unlimited =
		limit == null;

	return (
		<View style={styles.usageRow}>
			<View style={styles.usageTop}>
				<Text style={styles.usageLabel}>
					{label}
				</Text>

				<Text
					style={[
						styles.usageCount,
						reached && {
							color: COLORS.red,
						},
						unlimited && {
							color: COLORS.green,
						},
					]}
				>
					{unlimited
						? `${current} / ilimitado`
						: `${current}/${limit}`}
				</Text>
			</View>

			<View style={styles.progressTrack}>
				<View
					style={[
						styles.progressFill,
						{
							width:
								unlimited
									? "100%"
									: `${percent}%`,

							backgroundColor:
								unlimited
									? COLORS.green
									: reached
										? COLORS.red
										: COLORS.blue,
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
	period,
	subtitle,
	features,
	badge,
	highlight = false,
	current = false,
	disabled = false,
	loading = false,
	buttonLabel = "Assinar",
	onPress,
}) {
	const buttonDisabled =
		disabled ||
		loading ||
		current;

	return (
		<View
			style={[
				styles.planCard,
				highlight &&
					styles.planCardHighlight,
				current &&
					styles.planCardCurrent,
			]}
		>
			<View style={styles.planHeader}>
				<View
					style={{
						flex: 1,
						minWidth: 0,
					}}
				>
					<View style={styles.planTitleRow}>
						<Text style={styles.planTitle}>
							{title}
						</Text>

						{!!badge && (
							<View style={styles.badge}>
								<Text style={styles.badgeText}>
									{badge}
								</Text>
							</View>
						)}

						{current && (
							<View style={styles.currentBadge}>
								<Text style={styles.currentBadgeText}>
									Plano atual
								</Text>
							</View>
						)}
					</View>

					<Text style={styles.planSubtitle}>
						{subtitle}
					</Text>
				</View>

				<View style={styles.priceWrap}>
					<Text style={styles.planPrice}>
						{price}
					</Text>

					{!!period && (
						<Text style={styles.planPeriod}>
							{period}
						</Text>
					)}
				</View>
			</View>

			<View style={styles.features}>
				{features.map((item) => (
					<View
						key={item}
						style={styles.featureRow}
					>
						<Ionicons
							name="checkmark-circle"
							size={16}
							color={COLORS.green}
						/>

						<Text style={styles.featureText}>
							{item}
						</Text>
					</View>
				))}
			</View>

			<Pressable
				onPress={onPress}
				disabled={buttonDisabled}
				accessibilityRole="button"
				style={({ pressed }) => [
					styles.planButton,

					highlight &&
						styles.planButtonHighlight,

					current &&
						styles.planButtonCurrent,

					buttonDisabled &&
						styles.planButtonDisabled,

					pressed &&
						!buttonDisabled && {
							opacity: 0.86,
						},
				]}
			>
				{loading ? (
					<ActivityIndicator
						size="small"
						color={
							highlight
								? "#FFFFFF"
								: COLORS.blue
						}
					/>
				) : (
					<Text
						style={[
							styles.planButtonText,

							highlight &&
								styles.planButtonTextHighlight,

							current &&
								styles.planButtonTextCurrent,
						]}
					>
						{current
							? "Plano atual"
							: buttonLabel}
					</Text>
				)}
			</Pressable>
		</View>
	);
}

function StoreStatusPill({
	storeStatus,
	isPremium,
}) {
	let icon =
		"checkmark-circle-outline";

	let label =
		isPremium
			? "Assinatura Premium ativa"
			: "Planos disponíveis";

	let color =
		isPremium
			? COLORS.green
			: COLORS.blue;

	let backgroundColor =
		isPremium
			? "rgba(22,163,74,0.10)"
			: "rgba(10,132,255,0.10)";

	if (storeStatus === "loading") {
		icon = "sync-outline";
		label =
			"Conectando à App Store";
		color = COLORS.orange;
		backgroundColor =
			"rgba(245,158,11,0.10)";
	}

	if (storeStatus === "error") {
		icon =
			"alert-circle-outline";
		label =
			"App Store indisponível";
		color = COLORS.red;
		backgroundColor =
			"rgba(239,68,68,0.09)";
	}

	return (
		<View
			style={[
				styles.statusPill,
				{ backgroundColor },
			]}
		>
			{storeStatus === "loading" ? (
				<ActivityIndicator
					size="small"
					color={color}
				/>
			) : (
				<Ionicons
					name={icon}
					size={14}
					color={color}
				/>
			)}

			<Text
				style={[
					styles.statusPillText,
					{ color },
				]}
			>
				{label}
			</Text>
		</View>
	);
}

export default function AssinaturaScreen() {
	const navigation =
		useNavigation();

	const dispatch =
		useDispatch();

	const insets =
		useSafeAreaInsets();

	const tint =
		useThemeColor(
			{},
			"tint"
		);

	const user =
		useSelector(
			(state) =>
				state?.user?.user
		);

	const plan =
		useSelector(
			selectCurrentPlan
		);

	const limits =
		useSelector(
			selectCurrentLimits
		);

	const usage =
		useSelector(
			getUsageFromState
		);

	const [storeStatus, setStoreStatus] =
		useState("loading");

	const [errorMessage, setErrorMessage] =
		useState(null);

	const [monthlyPackage, setMonthlyPackage] =
		useState(null);

	const [annualPackage, setAnnualPackage] =
		useState(null);

	const [customerInfo, setCustomerInfo] =
		useState(null);

	const [purchasingPackageId, setPurchasingPackageId] =
		useState(null);

	const [restoring, setRestoring] =
		useState(false);

	const [refreshing, setRefreshing] =
		useState(false);

	const closeScreen =
		useCallback(() => {
			if (router.canGoBack()) {
				router.back();
				return;
			}

			router.replace(
				"/(phone)"
			);
		}, []);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: true,
			headerTitle:
				"Assinatura",
			headerLargeTitle:
				false,
			headerShadowVisible:
				false,

			headerLeft: () => (
				<Pressable
					onPress={closeScreen}
					hitSlop={10}
					accessibilityRole="button"
					accessibilityLabel="Fechar"
					style={({ pressed }) => [
						styles.headerCloseButton,
						pressed &&
							styles.headerCloseButtonPressed,
					]}
				>
					<Ionicons
						name="close"
						size={20}
						color={tint}
					/>
				</Pressable>
			),
		});
	}, [
		navigation,
		closeScreen,
		tint,
	]);

	const applyCustomerInfo =
		useCallback(
			(info) => {
				if (!info) return null;

				setCustomerInfo(info);

				const subscription =
					getPlanFromCustomerInfo(
						info
					);

				dispatch(
					setSubscriptionStatus({
						plan:
							subscription.plan,

						status:
							subscription.status,

						source:
							subscription.source,

						productId:
							subscription.productId,

						currentPeriodEnd:
							subscription.currentPeriodEnd,

						originalTransactionId:
							null,
					})
				);

				return subscription;
			},
			[dispatch]
		);

	const loadStore =
		useCallback(
			async ({
				showFullLoading = true,
			} = {}) => {
				if (
					Platform.OS !==
					"ios"
				) {
					setStoreStatus(
						"error"
					);

					setErrorMessage(
						"Os pagamentos da App Store estão disponíveis somente no iPhone."
					);

					return;
				}

				const uid =
					user?.uid;

				if (!uid) {
					setStoreStatus(
						"error"
					);

					setErrorMessage(
						"Não foi possível identificar sua conta."
					);

					return;
				}

				if (showFullLoading) {
					setStoreStatus(
						"loading"
					);
				}

				setErrorMessage(null);

				try {
					const initialCustomerInfo =
						await configureAppleSubscriptions(
							uid
						);

					applyCustomerInfo(
						initialCustomerInfo
					);

					const result =
						await getAppleOfferings();

					setMonthlyPackage(
						result.monthlyPackage ||
							null
					);

					setAnnualPackage(
						result.annualPackage ||
							null
					);

					if (
						!result.monthlyPackage &&
						!result.annualPackage
					) {
						throw new Error(
							"Os planos ainda não estão disponíveis na App Store."
						);
					}

					setStoreStatus(
						"ready"
					);
				} catch (error) {
					console.warn(
						"Erro ao carregar assinaturas:",
						error
					);

					setStoreStatus(
						"error"
					);

					setErrorMessage(
						error?.message ||
							"Não foi possível carregar os planos da App Store."
					);
				}
			},
			[
				user?.uid,
				applyCustomerInfo,
			]
		);

	useEffect(() => {
		loadStore();
	}, [loadStore]);

	const refreshStore =
		useCallback(async () => {
			try {
				setRefreshing(true);

				const info =
					await getAppleCustomerInfo();

				applyCustomerInfo(info);

				await loadStore({
					showFullLoading:
						false,
				});
			} catch (error) {
				console.warn(
					"Erro ao atualizar assinatura:",
					error
				);
			} finally {
				setRefreshing(false);
			}
		}, [
			applyCustomerInfo,
			loadStore,
		]);

	const handlePurchase =
		useCallback(
			async (
				purchasesPackage
			) => {
				if (
					!purchasesPackage ||
					purchasingPackageId ||
					restoring
				) {
					return;
				}

				const packageId =
					purchasesPackage
						.identifier;

				try {
					setPurchasingPackageId(
						packageId
					);

					const result =
						await purchaseApplePackage(
							purchasesPackage
						);

					if (
						result?.cancelled
					) {
						return;
					}

					const subscription =
						applyCustomerInfo(
							result.customerInfo
						);

					if (
						!subscription
							?.isPremium
					) {
						throw new Error(
							"A compra foi concluída, mas o acesso Premium ainda não foi confirmado."
						);
					}

					/*
					 * Fecha apenas a tela de assinatura.
					 * A tela anterior recalcula o gate e
					 * mostra o formulário automaticamente.
					 */
					closeScreen();
				} catch (error) {
					console.warn(
						"Erro ao comprar assinatura:",
						error
					);

					Alert.alert(
						"Não foi possível assinar",
						error?.message ||
							"Tente novamente ou verifique sua conexão com a App Store."
					);
				} finally {
					setPurchasingPackageId(
						null
					);
				}
			},
			[
				purchasingPackageId,
				restoring,
				applyCustomerInfo,
				closeScreen,
			]
		);

	const handleRestore =
		useCallback(async () => {
			if (
				restoring ||
				purchasingPackageId
			) {
				return;
			}

			try {
				setRestoring(true);

				const info =
					await restoreApplePurchases();

				const subscription =
					applyCustomerInfo(
						info
					);

				if (
					subscription
						?.isPremium
				) {
					Alert.alert(
						"Compra restaurada",
						"Seu acesso Premium foi restaurado com sucesso.",
						[
							{
								text:
									"Continuar",
								onPress:
									closeScreen,
							},
						]
					);

					return;
				}

				Alert.alert(
					"Nenhuma assinatura encontrada",
					"Não encontramos uma assinatura ativa para a conta Apple utilizada neste aparelho."
				);
			} catch (error) {
				console.warn(
					"Erro ao restaurar compras:",
					error
				);

				Alert.alert(
					"Não foi possível restaurar",
					error?.message ||
						"Tente novamente mais tarde."
				);
			} finally {
				setRestoring(false);
			}
		}, [
			restoring,
			purchasingPackageId,
			applyCustomerInfo,
			closeScreen,
		]);

	const handleManageSubscription =
		useCallback(() => {
			const url =
				customerInfo
					?.managementURL ||
				APPLE_SUBSCRIPTIONS_URL;

			openExternalUrl(url);
		}, [
			customerInfo?.managementURL,
		]);

	const premiumEntitlement =
		useMemo(
			() =>
				getPremiumEntitlement(
					customerInfo
				),
			[customerInfo]
		);

	const periodEnd =
		useMemo(
			() =>
				formatDateBR(
					premiumEntitlement
						?.expirationDate
				),
			[
				premiumEntitlement
					?.expirationDate,
			]
		);

	const willRenew =
		Boolean(
			premiumEntitlement
				?.willRenew
		);

	const isPremium =
		plan ===
			PLAN_IDS.MONTHLY ||
		plan ===
			PLAN_IDS.ANNUAL;

	const isMonthly =
		plan ===
		PLAN_IDS.MONTHLY;

	const isAnnual =
		plan ===
		PLAN_IDS.ANNUAL;

	const monthlyPrice =
		monthlyPackage
			?.product
			?.priceString ||
		"R$ 19,90";

	const annualPrice =
		annualPackage
			?.product
			?.priceString ||
		"R$ 149,90";

	const monthlyLoading =
		purchasingPackageId ===
		monthlyPackage?.identifier;

	const annualLoading =
		purchasingPackageId ===
		annualPackage?.identifier;

	const transactionBusy =
		Boolean(
			purchasingPackageId
		) ||
		restoring;

	const currentPlanLabel =
		isAnnual
			? "Premium Anual"
			: isMonthly
				? "Premium Mensal"
				: "Free";

	const currentDescription =
		isPremium
			? willRenew
				? periodEnd
					? `Sua assinatura será renovada automaticamente em ${periodEnd}.`
					: "Sua assinatura Premium está ativa e será renovada automaticamente."
				: periodEnd
					? `Seu acesso Premium permanece ativo até ${periodEnd}.`
					: "Seu acesso Premium está ativo."
			: "Você pode usar os recursos principais do FisioVet dentro dos limites do plano gratuito.";

	return (
		<SafeAreaView
			style={styles.safe}
			edges={[
				"left",
				"right",
			]}
		>
			<ScrollView
				contentContainerStyle={[
					styles.content,
					{
						paddingBottom:
							28 +
							Math.max(
								insets.bottom,
								0
							),
					},
				]}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={refreshStore}
						tintColor={COLORS.blue}
					/>
				}
				showsVerticalScrollIndicator={
					false
				}
			>
				<View style={styles.hero}>
					<View style={styles.heroLogoContainer}>
						<Image
							source={HOME_LOGO}
							style={styles.heroLogo}
							resizeMode="contain"
							accessibilityLabel="Logo FisioVet"
						/>
					</View>

					<Text style={styles.heroTitle}>
						Planos FisioVet
					</Text>

					<Text style={styles.heroSubtitle}>
						Organize tutores, pets e agenda com uma experiência simples para fisioterapia veterinária.
					</Text>

					<StoreStatusPill
						storeStatus={
							storeStatus
						}
						isPremium={
							isPremium
						}
					/>
				</View>

				<View style={styles.currentCard}>
					<View style={styles.currentHeader}>
						<View
							style={{
								flex: 1,
							}}
						>
							<Text style={styles.sectionOverline}>
								Plano atual
							</Text>

							<Text style={styles.currentPlan}>
								{currentPlanLabel}
							</Text>
						</View>

						<View
							style={[
								styles.freeBadge,
								isPremium &&
									styles.premiumBadge,
							]}
						>
							<Text
								style={[
									styles.freeBadgeText,
									isPremium &&
										styles.premiumBadgeText,
								]}
							>
								{isPremium
									? "Ativo"
									: "Grátis"}
							</Text>
						</View>
					</View>

					<Text style={styles.currentDescription}>
						{currentDescription}
					</Text>

					<View style={styles.usageBlock}>
						<UsageRow
							label="Tutores"
							current={
								usage.tutores
							}
							limit={
								limits.tutores
							}
						/>

						<UsageRow
							label="Pets"
							current={
								usage.pets
							}
							limit={
								limits.pets
							}
						/>

						<UsageRow
							label="Eventos"
							current={
								usage.eventos
							}
							limit={
								limits.eventos
							}
						/>
					</View>

					{isPremium && (
						<Pressable
							onPress={
								handleManageSubscription
							}
							style={({ pressed }) => [
								styles.manageButton,
								pressed && {
									opacity: 0.65,
								},
							]}
						>
							<Ionicons
								name="settings-outline"
								size={17}
								color={COLORS.blue}
							/>

							<Text style={styles.manageButtonText}>
								Gerenciar assinatura
							</Text>
						</Pressable>
					)}
				</View>

				<Text style={styles.sectionTitle}>
					Planos disponíveis
				</Text>

				{storeStatus ===
					"error" && (
					<View style={styles.errorCard}>
						<Ionicons
							name="alert-circle-outline"
							size={22}
							color={COLORS.red}
						/>

						<View
							style={{
								flex: 1,
							}}
						>
							<Text style={styles.errorTitle}>
								Não foi possível carregar os planos
							</Text>

							<Text style={styles.errorDescription}>
								{errorMessage}
							</Text>

							<Pressable
								onPress={() =>
									loadStore()
								}
								style={({ pressed }) => [
									styles.retryButton,
									pressed && {
										opacity: 0.7,
									},
								]}
							>
								<Text style={styles.retryButtonText}>
									Tentar novamente
								</Text>
							</Pressable>
						</View>
					</View>
				)}

				<PlanCard
					title="Free"
					price="R$ 0"
					subtitle="Para conhecer e utilizar os principais recursos do app."
					features={[
						"Até 3 tutores",
						"Até 6 pets",
						"Até 10 eventos",
						"Acesso aos dados já cadastrados",
					]}
					current={
						plan ===
						PLAN_IDS.FREE
					}
					disabled
				/>

				<PlanCard
					title="Mensal"
					price={monthlyPrice}
					period="/ mês"
					subtitle="Flexibilidade para usar o FisioVet sem limites."
					badge="Popular"
					highlight
					features={[
						"Tutores ilimitados",
						"Pets ilimitados",
						"Eventos ilimitados",
						"Biblioteca e histórico do paciente",
						"Acesso aos novos recursos Premium",
					]}
					current={isMonthly}
					disabled={
						storeStatus !==
							"ready" ||
						!monthlyPackage ||
						transactionBusy
					}
					loading={
						monthlyLoading
					}
					buttonLabel={
						isAnnual
							? "Mudar para mensal"
							: "Assinar mensal"
					}
					onPress={() =>
						handlePurchase(
							monthlyPackage
						)
					}
				/>

				<PlanCard
					title="Anual"
					price={annualPrice}
					period="/ ano"
					subtitle="O melhor custo-benefício para uso contínuo."
					badge="Melhor valor"
					features={[
						"Tudo do plano mensal",
						"Tutores, pets e eventos ilimitados",
						"Um único pagamento anual",
						"Renovação automática pela App Store",
					]}
					current={isAnnual}
					disabled={
						storeStatus !==
							"ready" ||
						!annualPackage ||
						transactionBusy
					}
					loading={
						annualLoading
					}
					buttonLabel={
						isMonthly
							? "Mudar para anual"
							: "Assinar anual"
					}
					onPress={() =>
						handlePurchase(
							annualPackage
						)
					}
				/>

				<View style={styles.restoreCard}>
					<View style={styles.restoreTextWrap}>
						<Text style={styles.restoreTitle}>
							Já assinou anteriormente?
						</Text>

						<Text style={styles.restoreDescription}>
							Restaure uma assinatura vinculada à sua conta Apple.
						</Text>
					</View>

					<Pressable
						onPress={handleRestore}
						disabled={
							transactionBusy ||
							storeStatus ===
								"loading"
						}
						style={({ pressed }) => [
							styles.restoreButton,

							(
								transactionBusy ||
								storeStatus ===
									"loading"
							) && {
								opacity: 0.5,
							},

							pressed &&
								!transactionBusy && {
									opacity: 0.7,
								},
						]}
					>
						{restoring ? (
							<ActivityIndicator
								size="small"
								color={COLORS.blue}
							/>
						) : (
							<Text style={styles.restoreButtonText}>
								Restaurar compras
							</Text>
						)}
					</Pressable>
				</View>

				<View style={styles.legalCard}>
					<Ionicons
						name="information-circle-outline"
						size={18}
						color={COLORS.blue}
					/>

					<View style={styles.legalTextWrap}>
						<Text style={styles.legalText}>
							O pagamento será cobrado na sua conta Apple após a confirmação. A assinatura é renovada automaticamente, salvo cancelamento com pelo menos 24 horas de antecedência do fim do período atual.
						</Text>

						<Text style={styles.legalText}>
							A renovação será cobrada nas 24 horas anteriores ao término do período vigente. Você pode gerenciar ou cancelar a assinatura nos ajustes da sua conta Apple.
						</Text>

						<View style={styles.legalLinks}>
							<Pressable
								onPress={() =>
									openExternalUrl(
										TERMS_URL
									)
								}
								hitSlop={8}
							>
								<Text style={styles.legalLink}>
									Termos de uso
								</Text>
							</Pressable>

							<View style={styles.legalDot} />

							<Pressable
								onPress={() =>
									openExternalUrl(
										PRIVACY_URL
									)
								}
								hitSlop={8}
							>
								<Text style={styles.legalLink}>
									Política de privacidade
								</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
		backgroundColor:
			COLORS.bg,
	},

	content: {
		paddingHorizontal: 16,
		paddingTop: 14,
		gap: 14,
	},

	hero: {
		backgroundColor:
			COLORS.card,
		borderRadius: 24,
		borderWidth: 1,
		borderColor:
			COLORS.border,
		padding: 20,
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.07,
		shadowRadius: 8,
		shadowOffset: {
			width: 0,
			height: 4,
		},
		elevation: 3,
	},

	heroLogoContainer: {
		width: 88,
		height: 88,
		alignItems: "center",
		justifyContent: "center",
	},

	heroLogo: {
		width: 88,
		height: 88,
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
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},

	statusPillText: {
		fontSize: 12,
		fontWeight: "800",
	},

	currentCard: {
		backgroundColor:
			COLORS.card,
		borderRadius: 22,
		borderWidth: 1,
		borderColor:
			COLORS.border,
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
		textTransform:
			"uppercase",
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
		backgroundColor:
			"rgba(10,132,255,0.10)",
	},

	freeBadgeText: {
		fontSize: 12,
		fontWeight: "700",
		color: COLORS.blue,
	},

	premiumBadge: {
		backgroundColor:
			"rgba(22,163,74,0.10)",
	},

	premiumBadgeText: {
		color: COLORS.green,
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
		justifyContent:
			"space-between",
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
		backgroundColor:
			"rgba(118,118,128,0.14)",
		overflow: "hidden",
	},

	progressFill: {
		height: "100%",
		borderRadius: 999,
	},

	manageButton: {
		marginTop: 16,
		minHeight: 42,
		borderRadius: 13,
		backgroundColor:
			"rgba(10,132,255,0.08)",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 7,
	},

	manageButtonText: {
		color: COLORS.blue,
		fontSize: 13,
		fontWeight: "800",
	},

	sectionTitle: {
		marginTop: 4,
		marginHorizontal: 2,
		fontSize: 13,
		fontWeight: "800",
		color: COLORS.subtle,
		textTransform:
			"uppercase",
		letterSpacing: 0.4,
	},

	planCard: {
		backgroundColor:
			COLORS.card,
		borderRadius: 22,
		borderWidth: 1,
		borderColor:
			COLORS.border,
		padding: 16,
	},

	planCardHighlight: {
		borderColor:
			"rgba(10,132,255,0.30)",
	},

	planCardCurrent: {
		borderColor:
			"rgba(22,163,74,0.26)",
	},

	planHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent:
			"space-between",
		gap: 12,
	},

	planTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 8,
	},

	planTitle: {
		fontSize: 17,
		fontWeight: "800",
		color: COLORS.text,
	},

	badge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor:
			"rgba(10,132,255,0.10)",
	},

	badgeText: {
		fontSize: 10,
		fontWeight: "700",
		color: COLORS.blue,
	},

	currentBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor:
			"rgba(22,163,74,0.10)",
	},

	currentBadgeText: {
		fontSize: 10,
		fontWeight: "800",
		color: COLORS.green,
	},

	planSubtitle: {
		marginTop: 5,
		fontSize: 12,
		lineHeight: 17,
		color: COLORS.subtle,
	},

	priceWrap: {
		alignItems: "flex-end",
	},

	planPrice: {
		fontSize: 16,
		fontWeight: "800",
		color: COLORS.blue,
		textAlign: "right",
	},

	planPeriod: {
		marginTop: 2,
		fontSize: 11,
		fontWeight: "650",
		color: COLORS.subtle,
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
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		color: COLORS.text,
		fontWeight: "600",
	},

	planButton: {
		marginTop: 16,
		height: 46,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor:
			"rgba(10,132,255,0.10)",
	},

	planButtonHighlight: {
		backgroundColor:
			COLORS.blue,
	},

	planButtonCurrent: {
		backgroundColor:
			"rgba(22,163,74,0.10)",
	},

	planButtonDisabled: {
		opacity: 0.68,
	},

	planButtonText: {
		fontSize: 14,
		fontWeight: "900",
		color: COLORS.blue,
	},

	planButtonTextHighlight: {
		color: "#FFFFFF",
	},

	planButtonTextCurrent: {
		color: COLORS.green,
	},

	errorCard: {
		borderRadius: 18,
		padding: 14,
		backgroundColor:
			"rgba(239,68,68,0.07)",
		borderWidth: 1,
		borderColor:
			"rgba(239,68,68,0.16)",
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
	},

	errorTitle: {
		fontSize: 13,
		fontWeight: "850",
		color: COLORS.red,
	},

	errorDescription: {
		marginTop: 4,
		fontSize: 12,
		lineHeight: 17,
		color: COLORS.subtle,
	},

	retryButton: {
		alignSelf: "flex-start",
		marginTop: 9,
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 999,
		backgroundColor:
			"rgba(239,68,68,0.09)",
	},

	retryButtonText: {
		fontSize: 12,
		fontWeight: "800",
		color: COLORS.red,
	},

	restoreCard: {
		borderRadius: 18,
		padding: 14,
		backgroundColor:
			COLORS.card,
		borderWidth: 1,
		borderColor:
			COLORS.border,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},

	restoreTextWrap: {
		flex: 1,
	},

	restoreTitle: {
		fontSize: 13,
		fontWeight: "850",
		color: COLORS.text,
	},

	restoreDescription: {
		marginTop: 3,
		fontSize: 11,
		lineHeight: 16,
		color: COLORS.subtle,
	},

	restoreButton: {
		minWidth: 124,
		minHeight: 38,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor:
			"rgba(10,132,255,0.09)",
		alignItems: "center",
		justifyContent: "center",
	},

	restoreButtonText: {
		fontSize: 12,
		fontWeight: "850",
		color: COLORS.blue,
	},

	legalCard: {
		borderRadius: 18,
		padding: 14,
		backgroundColor:
			"rgba(10,132,255,0.06)",
		borderWidth: 1,
		borderColor:
			"rgba(10,132,255,0.12)",
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 9,
	},

	legalTextWrap: {
		flex: 1,
		gap: 8,
	},

	legalText: {
		fontSize: 11,
		lineHeight: 16,
		color: COLORS.subtle,
		fontWeight: "550",
	},

	legalLinks: {
		marginTop: 2,
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 7,
	},

	legalLink: {
		fontSize: 11,
		fontWeight: "800",
		color: COLORS.blue,
		textDecorationLine:
			"underline",
	},

	legalDot: {
		width: 3,
		height: 3,
		borderRadius: 2,
		backgroundColor:
			COLORS.subtle,
	},

	headerCloseButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor:
			"rgba(118,118,128,0.10)",
	},

	headerCloseButtonPressed: {
		opacity: 0.62,
		transform: [
			{
				scale: 0.96,
			},
		],
	},
});