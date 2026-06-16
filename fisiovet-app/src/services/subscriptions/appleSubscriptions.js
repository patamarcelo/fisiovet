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
	const value = String(userId || "").trim();

	if (!value) {
		throw new Error(
			"É necessário informar o UID do usuário para configurar as assinaturas."
		);
	}

	return value;
}

export function isAppleSubscriptionAvailable() {
	return (
		Platform.OS === "ios" &&
		Boolean(REVENUECAT_IOS_API_KEY)
	);
}

export async function configureAppleSubscriptions(userId) {
	assertIOS();
	assertApiKey();

	const normalizedUserId =
		normalizeUserId(userId);

	if (
		configurePromise &&
		configuredUserId === normalizedUserId
	) {
		return configurePromise;
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

			return Purchases.getCustomerInfo();
		}

		const currentAppUserId =
			await Purchases.getAppUserID();

		if (
			currentAppUserId !==
			normalizedUserId
		) {
			const result =
				await Purchases.logIn(
					normalizedUserId
				);

			configuredUserId =
				normalizedUserId;

			return result.customerInfo;
		}

		configuredUserId =
			normalizedUserId;

		return Purchases.getCustomerInfo();
	})();

	try {
		return await configurePromise;
	} catch (error) {
		configurePromise = null;
		configuredUserId = null;
		throw error;
	}
}

export async function getAppleCustomerInfo() {
	assertIOS();

	return Purchases.getCustomerInfo();
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
		current.availablePackages || [];

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
		};
	}

	const productId =
		premium.productIdentifier ||
		null;

	const plan =
		productId ===
		APPLE_PRODUCT_IDS.ANNUAL
			? "annual"
			: "monthly";

	return {
		isPremium: true,
		plan,
		status: "active",
		source: "app_store",
		productId,
		currentPeriodEnd:
			premium.expirationDate ||
			null,
		willRenew:
			Boolean(
				premium.willRenew
			),
	};
}

export function subscribeToAppleCustomerInfo(
	listener
) {
	assertIOS();

	if (typeof listener !== "function") {
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

export async function logOutAppleSubscriptions() {
	if (Platform.OS !== "ios") {
		return null;
	}

	const isConfigured =
		await Purchases.isConfigured();

	if (!isConfigured) {
		configuredUserId = null;
		configurePromise = null;
		return null;
	}

	const customerInfo =
		await Purchases.logOut();

	configuredUserId = null;
	configurePromise = null;

	return customerInfo;
}

export function normalizeApplePurchaseError(
	error
) {
	const message =
		error?.message ||
		error?.userInfo?.readableErrorCode ||
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