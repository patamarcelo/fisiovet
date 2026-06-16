// src/hooks/useSubscriptionGate.js
// @ts-nocheck

import {
	useCallback,
	useMemo,
} from "react";

import {
	Alert,
} from "react-native";

import {
	router,
} from "expo-router";

import {
	useSelector,
} from "react-redux";

import {
	selectCurrentLimits,
	selectCurrentPlan,
	selectSubscriptionEnabled,
} from "@/src/store/slices/subscriptionSlice";

import {
	getLimitMessage,
	getLimitStatus,
	getUsageFromState,
} from "@/src/utils/subscriptionLimits";

export function useSubscriptionGate(
	resource
) {
	const enabled =
		useSelector(
			selectSubscriptionEnabled
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

	const status =
		useMemo(
			() =>
				getLimitStatus({
					enabled,
					plan,
					limits,
					usage,
					resource,
				}),
			[
				enabled,
				plan,
				limits,
				usage,
				resource,
			]
		);

	const openPlans =
		useCallback(() => {
			router.push(
				"/(home-modals)/assinatura"
			);
		}, []);

	const showLimitAlert =
		useCallback(() => {
			if (
				status.allowed
			) {
				return true;
			}

			const {
				title,
				message,
			} =
				getLimitMessage(
					status
				);

			Alert.alert(
				title,
				message,
				[
					{
						text:
							"Agora não",
						style:
							"cancel",
					},
					{
						text:
							"Ver planos",
						onPress:
							openPlans,
					},
				]
			);

			return false;
		}, [
			status,
			openPlans,
		]);

	/*
	 * Executa uma função somente se a criação estiver permitida.
	 *
	 * Exemplo:
	 * guard(() => router.push("/pet-new"));
	 */
	const guard =
		useCallback(
			(callback) => {
				if (
					!status.allowed
				) {
					showLimitAlert();
					return false;
				}

				callback?.();
				return true;
			},
			[
				status.allowed,
				showLimitAlert,
			]
		);

	return {
		...status,

		enabled,
		plan,
		limits,
		usage,

		canCreate:
			status.allowed,

		openPlans,
		showLimitAlert,
		guard,
	};
}