// src/store/slices/subscriptionSlice.js
import { createSlice, createSelector } from "@reduxjs/toolkit";

export const PLAN_IDS = {
	FREE: "free",
	MONTHLY: "monthly",
	ANNUAL: "annual",
};

export const SUBSCRIPTION_LIMITS = {
	free: {
		tutores: 3,
		pets: 6,
		eventos: 10,
	},
	monthly: {
		tutores: null,
		pets: null,
		eventos: null,
	},
	annual: {
		tutores: null,
		pets: null,
		eventos: null,
	},
};

const initialState = {
	// Feature pronta, mas desligada por enquanto
	enabled: false,

	plan: PLAN_IDS.FREE,

	// Futuro: dados vindos de RevenueCat/App Store/Stripe/backend
	status: "inactive", // inactive | active | trialing | past_due | canceled
	currentPeriodEnd: null,
	source: null, // app_store | play_store | stripe | manual | null

	updatedAt: null,
};

const subscriptionSlice = createSlice({
	name: "subscription",
	initialState,
	reducers: {
		setSubscriptionEnabled(state, action) {
			state.enabled = !!action.payload;
			state.updatedAt = new Date().toISOString();
		},

		setPlan(state, action) {
			const plan = action.payload || PLAN_IDS.FREE;
			state.plan = plan;
			state.updatedAt = new Date().toISOString();
		},

		setSubscriptionStatus(state, action) {
			const {
				plan = PLAN_IDS.FREE,
				status = "inactive",
				currentPeriodEnd = null,
				source = null,
			} = action.payload || {};

			state.plan = plan;
			state.status = status;
			state.currentPeriodEnd = currentPeriodEnd;
			state.source = source;
			state.updatedAt = new Date().toISOString();
		},

		resetSubscription() {
			return initialState;
		},
	},
});

export const {
	setSubscriptionEnabled,
	setPlan,
	setSubscriptionStatus,
	resetSubscription,
} = subscriptionSlice.actions;

export default subscriptionSlice.reducer;

/* ---------------- Selectors ---------------- */

export const selectSubscription = (state) => state.subscription || initialState;

export const selectSubscriptionEnabled = createSelector(
	selectSubscription,
	(sub) => !!sub.enabled
);

export const selectCurrentPlan = createSelector(
	selectSubscription,
	(sub) => sub.plan || PLAN_IDS.FREE
);

export const selectCurrentLimits = createSelector(
	selectCurrentPlan,
	(plan) => SUBSCRIPTION_LIMITS[plan] || SUBSCRIPTION_LIMITS.free
);

export const selectIsFreePlan = createSelector(
	selectCurrentPlan,
	(plan) => plan === PLAN_IDS.FREE
);

export const selectIsPaidPlan = createSelector(
	selectCurrentPlan,
	(plan) => plan === PLAN_IDS.MONTHLY || plan === PLAN_IDS.ANNUAL
);