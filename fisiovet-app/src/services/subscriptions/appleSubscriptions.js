// src/services/subscriptions/appleSubscriptions.js
// @ts-nocheck

import { Platform } from "react-native";
import Purchases from "react-native-purchases";

export const REVENUECAT_ENTITLEMENTS = {
	PREMIUM: "premium",
};

export const APPLE_PRODUCT_IDS = {
	MONTHLY: "app.fisiovet.premium.monthly",
	ANNUAL: "app.fisiovet.premium.annual",
};

export const REVENUECAT_PACKAGE_IDS = {
	MONTHLY: "$rc_monthly",
	ANNUAL: "$rc_annual",
};

const REVENUECAT_IOS_API_KEY =
	process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;

let configuredUserId = null;

/*
 * Serve apenas para impedir duas configurações simultâneas.
 * Não deve armazenar indefinidamente um CustomerInfo antigo.
 */
let configurePromise = null;

function assertIOS() {
	if (Platform.OS !== "ios") {
		throw new Error(
			"Assinaturas da App Store estão disponíveis somente no iOS."
		);
	}
}

function assertApiKey() {
	if (!REVENUECAT_IOS_API_KEY) {
		throw new Error(
			"EXPO_PUBLIC_REVENUECAT_IOS_API_KEY não foi configurada."
		);
	}

	if (!REVENUECAT_IOS_API_KEY.startsWith("appl_")) {
		throw new Error(
			"A chave configurada não parece ser uma chave pública da App Store."
		);
	}
}

function normalizeUserId(userId) {
	const value = String(
		userId || ""
	).trim();

	if (!value) {
		throw new Error(
			"É necessário informar o UID do usuário para configurar as assinaturas."
		);
	}

	return value;
}

async function invalidateCustomerInfoCache() {
	await Purchases.invalidateCustomerInfoCache();
}

export function isAppleSubscriptionAvailable() {
	return (
		Platform.OS === "ios" &&
		Boolean(
			REVENUECAT_IOS_API_KEY
		)
	);
}

/**
 * Configura o RevenueCat para o UID Firebase.
 *
 * forceRefresh=true:
 * - invalida o CustomerInfo local;
 * - força uma nova consulta ao RevenueCat;
 * - reconhece grants realizados pelo servidor/dashboard.
 */
export async function configureAppleSubscriptions(
	userId,
	{
		forceRefresh = false,
	} = {}
) {
	assertIOS();
	assertApiKey();

	const normalizedUserId =
		normalizeUserId(userId);

	/*
	 * Se já existe uma configuração em andamento,
	 * aguardamos sua conclusão antes de prosseguir.
	 */
	if (configurePromise) {
		await configurePromise;
	}

	configurePromise = (async () => {
		if (__DEV__) {
			Purchases.setLogLevel(
				Purchases.LOG_LEVEL.DEBUG
			);
		}

		const isConfigured =
			await Purchases.isConfigured();

		if (!isConfigured) {
			Purchases.configure({
				apiKey:
					REVENUECAT_IOS_API_KEY,

				appUserID:
					normalizedUserId,
			});

			configuredUserId =
				normalizedUserId;

			return;
		}

		const currentAppUserId =
			await Purchases.getAppUserID();

		if (
			currentAppUserId !==
			normalizedUserId
		) {
			await Purchases.logIn(
				normalizedUserId
			);
		}

		configuredUserId =
			normalizedUserId;
	})();

	try {
		await configurePromise;
	} catch (error) {
		configuredUserId = null;
		throw error;
	} finally {
		/*
		 * Essencial:
		 * não guardar a Promise resolvida e nem o
		 * CustomerInfo retornado na primeira inicialização.
		 */
		configurePromise = null;
	}

	if (forceRefresh) {
		await invalidateCustomerInfoCache();
	}

	return Purchases.getCustomerInfo();
}

/**
 * Retorna o CustomerInfo atual.
 *
 * Use forceRefresh=true quando a alteração pode ter
 * acontecido fora do dispositivo, como:
 * - grant pelo dashboard;
 * - revogação administrativa;
 * - reembolso;
 * - alteração externa da assinatura.
 */
export async function getAppleCustomerInfo({
	forceRefresh = false,
} = {}) {
	assertIOS();

	const isConfigured =
		await Purchases.isConfigured();

	if (!isConfigured) {
		throw new Error(
			"O RevenueCat ainda não foi configurado."
		);
	}

	if (forceRefresh) {
		await invalidateCustomerInfoCache();
	}

	return Purchases.getCustomerInfo();
}

export async function refreshAppleCustomerInfo() {
	return getAppleCustomerInfo({
		forceRefresh: true,
	});
}

export async function getAppleOfferings() {
	assertIOS();

	const offerings =
		await Purchases.getOfferings();

	const current =
		offerings?.current;

	if (!current) {
		throw new Error(
			"Nenhuma oferta de assinatura está disponível no momento."
		);
	}

	const availablePackages =
		current.availablePackages ||
		[];

	const monthlyPackage =
		current.monthly ||
		availablePackages.find(
			(item) =>
				item?.identifier ===
				REVENUECAT_PACKAGE_IDS.MONTHLY ||
				item?.product?.identifier ===
				APPLE_PRODUCT_IDS.MONTHLY
		) ||
		null;

	const annualPackage =
		current.annual ||
		availablePackages.find(
			(item) =>
				item?.identifier ===
				REVENUECAT_PACKAGE_IDS.ANNUAL ||
				item?.product?.identifier ===
				APPLE_PRODUCT_IDS.ANNUAL
		) ||
		null;

	return {
		offerings,
		current,
		monthlyPackage,
		annualPackage,
	};
}

export async function purchaseApplePackage(
	purchasesPackage
) {
	assertIOS();

	if (!purchasesPackage) {
		throw new Error(
			"O plano selecionado não está disponível."
		);
	}

	try {
		const result =
			await Purchases.purchasePackage(
				purchasesPackage
			);

		return {
			cancelled: false,

			customerInfo:
				result.customerInfo,

			productIdentifier:
				result.productIdentifier,
		};
	} catch (error) {
		if (error?.userCancelled) {
			return {
				cancelled: true,
				customerInfo: null,
				productIdentifier: null,
			};
		}

		throw normalizeApplePurchaseError(
			error
		);
	}
}

export async function restoreApplePurchases() {
	assertIOS();

	try {
		return await Purchases.restorePurchases();
	} catch (error) {
		throw normalizeApplePurchaseError(
			error
		);
	}
}

export function getPremiumEntitlement(
	customerInfo
) {
	return (
		customerInfo
			?.entitlements
			?.active
		?.[
		REVENUECAT_ENTITLEMENTS
			.PREMIUM
		] ||
		null
	);
}

export function hasActivePremiumEntitlement(
	customerInfo
) {
	return Boolean(
		getPremiumEntitlement(
			customerInfo
		)
	);
}

/**
 * Mantemos grants promocionais como "monthly" internamente
 * para não exigir alteração no subscriptionSlice atual.
 *
 * O ponto relevante para os limites é:
 * entitlements.active.premium existe.
 */
export function getPlanFromCustomerInfo(
	customerInfo
) {
	const premium =
		getPremiumEntitlement(
			customerInfo
		);

	if (!premium) {
		return {
			isPremium: false,
			plan: "free",
			status: "inactive",
			source: null,
			productId: null,
			currentPeriodEnd: null,
			willRenew: false,
			isPromotional: false,
		};
	}

	const productId =
		premium.productIdentifier ||
		null;

	const isAnnual =
		productId ===
		APPLE_PRODUCT_IDS.ANNUAL;

	const isMonthly =
		productId ===
		APPLE_PRODUCT_IDS.MONTHLY;

	/*
	 * Grants do RevenueCat normalmente não possuem os
	 * Product IDs reais da App Store.
	 *
	 * Como o slice atual conhece apenas monthly e annual,
	 * uma concessão promocional usa monthly para obter
	 * os mesmos limites ilimitados.
	 */
	const isPromotional =
		!isAnnual &&
		!isMonthly;

	const plan =
		isAnnual
			? "annual"
			: "monthly";

	return {
		isPremium: true,
		plan,
		status: "active",

		/*
		 * Mantido como app_store para compatibilidade
		 * com o enum atual do subscriptionSlice.
		 */
		source: "app_store",

		productId,

		currentPeriodEnd:
			premium.expirationDate ||
			null,

		willRenew:
			Boolean(
				premium.willRenew
			),

		isPromotional,
	};
}

export function subscribeToAppleCustomerInfo(
	listener
) {
	assertIOS();

	if (
		typeof listener !==
		"function"
	) {
		throw new Error(
			"O listener de assinatura precisa ser uma função."
		);
	}

	const revenueCatListener = (
		customerInfo
	) => {
		listener(customerInfo);
	};

	Purchases.addCustomerInfoUpdateListener(
		revenueCatListener
	);

	return () => {
		Purchases.removeCustomerInfoUpdateListener(
			revenueCatListener
		);
	};
}

export async function getAppleRevenueCatUserId() {
	assertIOS();

	const isConfigured =
		await Purchases.isConfigured();

	if (!isConfigured) {
		return null;
	}

	return Purchases.getAppUserID();
}

export async function logOutAppleSubscriptions() {
	if (Platform.OS !== "ios") {
		return null;
	}

	try {
		const isConfigured =
			await Purchases.isConfigured();

		if (!isConfigured) {
			return null;
		}

		const currentAppUserId =
			await Purchases.getAppUserID();

		/*
		 * Depois de um logout, o RevenueCat cria um
		 * usuário anônimo automaticamente.
		 *
		 * Não devemos chamar logOut novamente enquanto
		 * o usuário atual já for anônimo.
		 */
		const isAnonymous =
			String(
				currentAppUserId || ""
			).startsWith(
				"$RCAnonymousID:"
			);

		if (isAnonymous) {
			return null;
		}

		return await Purchases.logOut();
	} catch (error) {
		const message =
			String(
				error?.message || ""
			).toLowerCase();

		/*
		 * Proteção adicional para versões do SDK que
		 * retornem erro ao tentar desconectar um usuário
		 * que já está anônimo.
		 */
		const alreadyAnonymous =
			message.includes(
				"current user is anonymous"
			) ||
			message.includes(
				"user is anonymous"
			);

		if (alreadyAnonymous) {
			return null;
		}

		throw error;
	} finally {
		configuredUserId = null;
		configurePromise = null;
	}
}
export function normalizeApplePurchaseError(
	error
) {
	const message =
		error?.message ||
		error?.userInfo
			?.readableErrorCode ||
		"Não foi possível concluir a operação com a App Store.";

	const normalizedError =
		new Error(message);

	normalizedError.code =
		error?.code ||
		"unknown_purchase_error";

	normalizedError.userCancelled =
		Boolean(
			error?.userCancelled
		);

	normalizedError.originalError =
		error;

	return normalizedError;
}