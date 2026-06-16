// src/store/slices/subscriptionSlice.js

import {
	createSelector,
	createSlice,
} from "@reduxjs/toolkit";


export const PLAN_IDS = {
	FREE: "free",
	MONTHLY: "monthly",
	ANNUAL: "annual",
};

export const SUBSCRIPTION_STATUS = {
	INACTIVE: "inactive",
	ACTIVE: "active",
	TRIALING: "trialing",
	PAST_DUE: "past_due",
	CANCELED: "canceled",
	EXPIRED: "expired",
};

export const SUBSCRIPTION_SOURCE = {
	APP_STORE: "app_store",
	PLAY_STORE: "play_store",
	STRIPE: "stripe",
	MANUAL: "manual",
};

export const SUBSCRIPTION_LIMITS = {
	[PLAN_IDS.FREE]: {
		tutores: 3,
		pets: 6,
		eventos: 10,
	},

	[PLAN_IDS.MONTHLY]: {
		tutores: null,
		pets: null,
		eventos: null,
	},

	[PLAN_IDS.ANNUAL]: {
		tutores: null,
		pets: null,
		eventos: null,
	},
};

const VALID_PLANS = Object.values(
	PLAN_IDS
);

const initialState = {
	/*
	 * Liga ou desliga somente a aplicação dos limites.
	 *
	 * false:
	 * todos podem criar normalmente.
	 *
	 * true:
	 * o plano Free passa a respeitar os limites.
	 */
	enabled: true,

	plan: PLAN_IDS.FREE,
	status: SUBSCRIPTION_STATUS.INACTIVE,

	currentPeriodEnd: null,
	source: null,

	productId: null,
	originalTransactionId: null,

	updatedAt: null,
};

function normalizePlan(plan) {
	return VALID_PLANS.includes(plan)
		? plan
		: PLAN_IDS.FREE;
}

function serializeDate(value) {
	if (!value) return null;

	const date =
		value instanceof Date
			? value
			: new Date(value);

	return Number.isNaN(
		date.getTime()
	)
		? null
		: date.toISOString();
}

const subscriptionSlice =
	createSlice({
		name: "subscription",

		initialState,

		reducers: {
			setSubscriptionEnabled(
				state,
				action
			) {
				state.enabled =
					Boolean(
						action.payload
					);

				state.updatedAt =
					new Date()
						.toISOString();
			},

			setPlan(
				state,
				action
			) {
				state.plan =
					normalizePlan(
						action.payload
					);

				state.updatedAt =
					new Date()
						.toISOString();
			},

			setSubscriptionStatus(
				state,
				action
			) {
				const payload =
					action.payload || {};

				state.plan =
					normalizePlan(
						payload.plan
					);

				state.status =
					payload.status ||
					SUBSCRIPTION_STATUS.INACTIVE;

				state.currentPeriodEnd =
					serializeDate(
						payload.currentPeriodEnd
					);

				state.source =
					payload.source ||
					null;

				state.productId =
					payload.productId ||
					null;

				state.originalTransactionId =
					payload.originalTransactionId ||
					null;

				state.updatedAt =
					new Date()
						.toISOString();
			},

			activateManualPremium(
				state,
				action
			) {
				const plan =
					normalizePlan(
						action.payload?.plan
					);

				state.plan =
					plan === PLAN_IDS.FREE
						? PLAN_IDS.MONTHLY
						: plan;

				state.status =
					SUBSCRIPTION_STATUS.ACTIVE;

				state.source =
					SUBSCRIPTION_SOURCE.MANUAL;

				state.currentPeriodEnd =
					serializeDate(
						action.payload
							?.currentPeriodEnd
					);

				state.updatedAt =
					new Date()
						.toISOString();
			},

			resetSubscription() {
				return {
					...initialState,
				};
			},
		},
	});

export const {
	setSubscriptionEnabled,
	setPlan,
	setSubscriptionStatus,
	activateManualPremium,
	resetSubscription,
} = subscriptionSlice.actions;

export default subscriptionSlice.reducer;

/* =========================================================
   Selectors
========================================================= */

export const selectSubscription = (
	state
) =>
	state?.subscription ||
	initialState;

export const selectSubscriptionEnabled =
	createSelector(
		selectSubscription,
		(subscription) =>
			Boolean(
				subscription.enabled
			)
	);

export const selectCurrentPlan =
	createSelector(
		selectSubscription,
		(subscription) =>
			normalizePlan(
				subscription.plan
			)
	);

export const selectSubscriptionStatus =
	createSelector(
		selectSubscription,
		(subscription) =>
			subscription.status ||
			SUBSCRIPTION_STATUS.INACTIVE
	);

export const selectCurrentLimits =
	createSelector(
		selectCurrentPlan,
		(plan) =>
			SUBSCRIPTION_LIMITS[
				plan
			] ||
			SUBSCRIPTION_LIMITS[
				PLAN_IDS.FREE
			]
	);

export const selectIsFreePlan =
	createSelector(
		selectCurrentPlan,
		(plan) =>
			plan ===
			PLAN_IDS.FREE
	);

export const selectIsPaidPlan =
	createSelector(
		selectCurrentPlan,
		(plan) =>
			plan ===
				PLAN_IDS.MONTHLY ||
			plan ===
				PLAN_IDS.ANNUAL
	);

export const selectHasPremiumAccess =
	createSelector(
		[
			selectCurrentPlan,
			selectSubscriptionStatus,
		],
		(
			plan,
			status
		) => {
			const paid =
				plan ===
					PLAN_IDS.MONTHLY ||
				plan ===
					PLAN_IDS.ANNUAL;

			/*
			 * Enquanto a Apple ainda não estiver conectada,
			 * setPlan permite testar os planos localmente.
			 */
			if (!paid) {
				return false;
			}

			return [
				SUBSCRIPTION_STATUS.ACTIVE,
				SUBSCRIPTION_STATUS.TRIALING,
			].includes(
				status
			);
		}
	);

export const selectPlanLabel =
	createSelector(
		selectCurrentPlan,
		(plan) => {
			if (
				plan ===
				PLAN_IDS.MONTHLY
			) {
				return "Mensal";
			}

			if (
				plan ===
				PLAN_IDS.ANNUAL
			) {
				return "Anual";
			}

			return "Free";
		}
	);