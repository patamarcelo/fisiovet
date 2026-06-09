// src/features/avaliacoes/saveAvaliacao.js
import { db } from "@/src/services/firebaseClient";
import {
	collection,
	doc,
	serverTimestamp,
	setDoc,
} from "firebase/firestore";

/**
 * Salva uma avaliação em:
 * users/{uid}/pets/{petId}/avaliacoes/{avaliacaoId}
 *
 * fields = { radios: {...}, switches: {...}, notes: '' }
 */
export async function saveAvaliacaoForPet({
	uid,
	petId,
	tutorId = null,
	fields,
}) {
	if (!uid) throw new Error("UID ausente");
	if (!petId) throw new Error("petId ausente");

	const avaliacoesColRef = collection(
		db,
		"users",
		String(uid),
		"pets",
		String(petId),
		"avaliacoes"
	);

	const ref = doc(avaliacoesColRef);

	const payload = {
		type: "avaliacao",
		petId: String(petId),
		tutorId: tutorId ? String(tutorId) : null,
		fields: fields || { radios: {}, switches: {}, notes: "" },
		createdAt: serverTimestamp(),
		status: "submitted",
	};

	await setDoc(ref, payload);

	return { avaliacaoId: ref.id };
}