// src/services/addressAutocomplete.js
// @ts-nocheck

const API_KEY =
	process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const AUTOCOMPLETE_URL =
	"https://places.googleapis.com/v1/places:autocomplete";

const PLACE_DETAILS_URL =
	"https://places.googleapis.com/v1/places";

function normalizeSessionToken(value) {
	const token = String(value || "").trim();

	if (!token) {
		return undefined;
	}

	return token.slice(0, 36);
}

export function createPlacesSessionToken() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
		/[xy]/g,
		(char) => {
			const random =
				Math.floor(Math.random() * 16);

			const value =
				char === "x"
					? random
					: (random & 0x3) | 0x8;

			return value.toString(16);
		}
	);
}

export async function autocompleteAddress({
	input,
	sessionToken,
}) {
	const query = String(input || "").trim();

	if (query.length < 3) {
		return [];
	}

	if (!API_KEY) {
		throw new Error(
			"Chave Google ausente (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)."
		);
	}

	const safeSessionToken =
		normalizeSessionToken(sessionToken);

	const requestBody = {
		input: query,
		includedRegionCodes: ["br"],
		languageCode: "pt-BR",
		regionCode: "BR",
	};

	if (safeSessionToken) {
		requestBody.sessionToken =
			safeSessionToken;
	}

	const response = await fetch(
		AUTOCOMPLETE_URL,
		{
			method: "POST",

			headers: {
				"Content-Type":
					"application/json",

				"X-Goog-Api-Key":
					API_KEY,

				"X-Goog-FieldMask":
					[
						"suggestions.placePrediction.placeId",
						"suggestions.placePrediction.text",
						"suggestions.placePrediction.structuredFormat",
						"suggestions.placePrediction.types",
					].join(","),
			},

			body: JSON.stringify(
				requestBody
			),
		}
	);

	if (!response.ok) {
		const body = await response
			.text()
			.catch(() => "");

		throw new Error(
			`Falha no autocomplete (${response.status}): ${body}`
		);
	}

	const data = await response.json();

	return (data?.suggestions || [])
		.map((suggestion) => {
			const prediction =
				suggestion?.placePrediction;

			if (!prediction?.placeId) {
				return null;
			}

			return {
				placeId:
					prediction.placeId,

				description:
					prediction.text?.text ||
					"",

				mainText:
					prediction
						.structuredFormat
						?.mainText?.text ||
					prediction.text?.text ||
					"",

				secondaryText:
					prediction
						.structuredFormat
						?.secondaryText
						?.text ||
					"",

				types:
					prediction.types ||
					[],
			};
		})
		.filter(Boolean);
}

export async function getAddressDetails({
	placeId,
	sessionToken,
}) {
	const safePlaceId = String(
		placeId || ""
	).trim();

	if (!safePlaceId) {
		throw new Error(
			"placeId não informado."
		);
	}

	if (!API_KEY) {
		throw new Error(
			"Chave Google ausente (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)."
		);
	}

	const fieldMask = [
		"id",
		"formattedAddress",
		"addressComponents",
		"location",
		"viewport",
		"types",
	].join(",");

	const params = new URLSearchParams();

	params.set(
		"languageCode",
		"pt-BR"
	);

	params.set(
		"regionCode",
		"BR"
	);

	const safeSessionToken =
		normalizeSessionToken(sessionToken);

	if (safeSessionToken) {
		params.set(
			"sessionToken",
			safeSessionToken
		);
	}

	const url =
		`${PLACE_DETAILS_URL}/${encodeURIComponent(
			safePlaceId
		)}?${params.toString()}`;

	const response = await fetch(
		url,
		{
			method: "GET",

			headers: {
				"X-Goog-Api-Key":
					API_KEY,

				"X-Goog-FieldMask":
					fieldMask,
			},
		}
	);

	if (!response.ok) {
		const body = await response
			.text()
			.catch(() => "");

		throw new Error(
			`Falha ao buscar detalhes (${response.status}): ${body}`
		);
	}

	return await response.json();
}