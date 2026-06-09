// src/utils/subscriptionLimits.js

export const RESOURCE_LABELS = {
	tutores: "tutores",
	pets: "pets",
	eventos: "eventos",
};

function countArray(value) {
	return Array.isArray(value) ? value.length : 0;
}

function countObject(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
	return Object.keys(value).length;
}

function uniqueCountFromObjectCollections(value) {
	if (!value || typeof value !== "object") return 0;

	const map = new Map();

	for (const entry of Object.values(value)) {
		if (Array.isArray(entry)) {
			for (const item of entry) {
				if (item?.id) map.set(String(item.id), item);
			}
		}

		if (entry && typeof entry === "object" && !Array.isArray(entry)) {
			for (const item of Object.values(entry)) {
				if (item?.id) map.set(String(item.id), item);
			}
		}
	}

	return map.size;
}

export function getUsageFromState(state) {
	const tutoresCount =
		countArray(state?.tutores?.items) ||
		countObject(state?.tutores?.byId);

	const petsCount =
		countArray(state?.pets?.items) ||
		countObject(state?.pets?.byId) ||
		uniqueCountFromObjectCollections(state?.pets?.byTutorId) ||
		uniqueCountFromObjectCollections(state?.pets?.byTutor) ||
		0;

	const agendaItems =
		state?.agenda?.items ||
		state?.agenda?.eventos ||
		Object.values(state?.agenda?.byId || {});

	const eventosCount = Array.isArray(agendaItems)
		? agendaItems.length
		: countObject(state?.agenda?.byId);

	return {
		tutores: tutoresCount,
		pets: petsCount,
		eventos: eventosCount,
	};
}

export function getLimitStatus({ enabled, plan, limits, usage, resource }) {
	if (!enabled) {
		return {
			allowed: true,
			reason: "feature_disabled",
			limit: null,
			current: usage?.[resource] || 0,
		};
	}

	const limit = limits?.[resource];

	if (limit == null) {
		return {
			allowed: true,
			reason: "unlimited",
			limit: null,
			current: usage?.[resource] || 0,
		};
	}

	const current = usage?.[resource] || 0;

	return {
		allowed: current < limit,
		reason: current >= limit ? "limit_reached" : "within_limit",
		limit,
		current,
		plan,
		resource,
	};
}

export function getUsagePercent(current, limit) {
	if (!limit) return 0;
	return Math.min(100, Math.round((current / limit) * 100));
}