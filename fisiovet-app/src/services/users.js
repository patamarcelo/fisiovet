// src/services/users.js
import {
	doc,
	getDoc,
	serverTimestamp,
	setDoc,
	updateDoc,
} from "firebase/firestore";

import { db } from "@/src/services/firebaseClient";

export async function getUserProfile(uid) {
	if (!uid) return null;

	const ref = doc(db, "users", String(uid));
	const snap = await getDoc(ref);

	if (!snap.exists()) return null;

	return {
		id: snap.id,
		...snap.data(),
	};
}

export async function ensureUserProfile(authUserDTO) {
	if (!authUserDTO?.uid) return null;

	const uid = String(authUserDTO.uid);
	const ref = doc(db, "users", uid);
	const snap = await getDoc(ref);

	const basePayload = {
		uid,
		email: authUserDTO.email || null,
		displayName: authUserDTO.displayName || authUserDTO.name || null,
		photoURL: authUserDTO.photoURL || null,
		updatedAt: serverTimestamp(),
	};

	if (!snap.exists()) {
		const payload = {
			...basePayload,
			createdAt: serverTimestamp(),

			subscription: {
				plan: "free",
				status: "inactive",
				source: null,
				manual: false,
				currentPeriodEnd: null,
				updatedAt: serverTimestamp(),
			},
		};

		await setDoc(ref, payload, { merge: true });

		return {
			id: uid,
			...payload,
			createdAt: null,
			updatedAt: null,
			subscription: {
				plan: "free",
				status: "inactive",
				source: null,
				manual: false,
				currentPeriodEnd: null,
				updatedAt: null,
			},
		};
	}

	await setDoc(ref, basePayload, { merge: true });

	return {
		id: snap.id,
		...snap.data(),
		...basePayload,
		updatedAt: null,
	};
}

export async function updateUserSubscription(uid, subscriptionPatch) {
	if (!uid) throw new Error("UID ausente");

	const ref = doc(db, "users", String(uid));

	await updateDoc(ref, {
		subscription: {
			...subscriptionPatch,
			updatedAt: serverTimestamp(),
		},
	});

	return await getUserProfile(uid);
}