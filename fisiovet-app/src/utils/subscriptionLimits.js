// src/utils/subscriptionLimits.js
//@ts-nocheck

import { createSelector } from "@reduxjs/toolkit";

export const SUBSCRIPTION_RESOURCES = {
	TUTORES: "tutores",
	PETS: "pets",
	EVENTOS: "eventos",
};

export const RESOURCE_LABELS = {
	tutores: "tutores",
	pets: "pets",
	eventos: "eventos",
};

export const RESOURCE_SINGULAR_LABELS = {
	tutores: "tutor",
	pets: "pet",
	eventos: "evento",
};

function countArray(value) {
	return Array.isArray(value)
		? value.length
		: 0;
}

function countObject(value) {
	if (
		!value ||
		typeof value !==
		"object" ||
		Array.isArray(value)
	) {
		return 0;
	}

	return Object.keys(
		value
	).length;
}

function countUniqueIdsFromCollections(
	value
) {
	if (
		!value ||
		typeof value !==
		"object"
	) {
		return 0;
	}

	const ids =
		new Set();

	for (
		const entry of
		Object.values(value)
	) {
		if (
			Array.isArray(entry)
		) {
			for (
				const item of entry
			) {
				/*
				 * Aceita tanto:
				 * ["pet-1", "pet-2"]
				 *
				 * quanto:
				 * [{ id: "pet-1" }]
				 */
				const id =
					item &&
						typeof item ===
						"object"
						? item.id
						: item;

				if (
					id != null
				) {
					ids.add(
						String(id)
					);
				}
			}

			continue;
		}

		if (
			entry &&
			typeof entry ===
			"object"
		) {
			for (
				const [
					key,
					item,
				] of Object.entries(
					entry
				)
			) {
				const id =
					item?.id ??
					key;

				if (
					id != null
				) {
					ids.add(
						String(id)
					);
				}
			}
		}
	}

	return ids.size;
}

function getTutoresCount(
	state
) {
	const byIdCount =
		countObject(
			state?.tutores
				?.byId
		);

	if (byIdCount > 0) {
		return byIdCount;
	}

	return countArray(
		state?.tutores
			?.items
	);
}

function getPetsCount(
	state
) {
	const byIdCount =
		countObject(
			state?.pets?.byId
		);

	if (byIdCount > 0) {
		return byIdCount;
	}

	const itemsCount =
		countArray(
			state?.pets?.items
		);

	if (itemsCount > 0) {
		return itemsCount;
	}

	const byTutorIdCount =
		countUniqueIdsFromCollections(
			state?.pets
				?.byTutorId
		);

	if (
		byTutorIdCount > 0
	) {
		return byTutorIdCount;
	}

	return countUniqueIdsFromCollections(
		state?.pets?.byTutor
	);
}

function getEventosCount(
	state
) {
	const byIdCount =
		countObject(
			state?.agenda?.byId
		);

	if (byIdCount > 0) {
		return byIdCount;
	}

	const items =
		state?.agenda?.items ||
		state?.agenda?.eventos;

	return countArray(
		items
	);
}

function calculateUsageFromState(state) {
	return {
		tutores: getTutoresCount(state),
		pets: getPetsCount(state),
		eventos: getEventosCount(state),
	};
}

export function getLimitStatus({
	enabled,
	plan,
	limits,
	usage,
	resource,
}) {
	const current =
		Number(
			usage?.[resource] ||
			0
		);

	if (!enabled) {
		return {
			allowed: true,
			reason:
				"feature_disabled",
			resource,
			plan,
			current,
			limit: null,
			remaining: null,
			unlimited: true,
		};
	}

	const limit =
		limits?.[resource];

	if (limit == null) {
		return {
			allowed: true,
			reason:
				"unlimited",
			resource,
			plan,
			current,
			limit: null,
			remaining: null,
			unlimited: true,
		};
	}

	const safeLimit =
		Math.max(
			0,
			Number(limit)
		);

	const remaining =
		Math.max(
			0,
			safeLimit -
			current
		);

	const allowed =
		current <
		safeLimit;

	return {
		allowed,

		reason:
			allowed
				? "within_limit"
				: "limit_reached",

		resource,
		plan,
		current,
		limit:
			safeLimit,
		remaining,
		unlimited: false,
	};
}

export function getUsagePercent(
	current,
	limit
) {
	if (
		limit == null
	) {
		return 0;
	}

	const safeLimit =
		Number(limit);

	const safeCurrent =
		Number(current || 0);

	if (
		!Number.isFinite(
			safeLimit
		) ||
		safeLimit <= 0
	) {
		return 100;
	}

	return Math.min(
		100,
		Math.max(
			0,
			Math.round(
				(
					safeCurrent /
					safeLimit
				) * 100
			)
		)
	);
}

export function getLimitMessage({
	resource,
	current,
	limit,
}) {
	const label =
		RESOURCE_LABELS[
		resource
		] ||
		resource;

	return {
		title:
			`Limite de ${label} atingido`,

		message:
			`Seu plano Free permite até ${limit} ${label}. Você já possui ${current}. Assine o FisioVet para continuar cadastrando.`,
	};
}

export const getUsageFromState = createSelector(
	[
		(state) => state?.tutores,
		(state) => state?.pets,
		(state) => state?.agenda,
	],
	(tutores, pets, agenda) =>
		calculateUsageFromState({
			tutores,
			pets,
			agenda,
		})
);