// src/features/exams/uploadExam.js
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

import { db, storage } from "@/src/services/firebaseClient";
import {
	collection,
	doc,
	serverTimestamp,
	setDoc,
} from "firebase/firestore";
import {
	getDownloadURL,
	ref as storageRef,
	uploadBytesResumable,
} from "firebase/storage";

function guessMimeType(uri = "", fallback = "application/octet-stream") {
	const clean = String(uri).split("?")[0].toLowerCase();

	if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
	if (clean.endsWith(".png")) return "image/png";
	if (clean.endsWith(".webp")) return "image/webp";
	if (clean.endsWith(".heic")) return "image/heic";
	if (clean.endsWith(".heif")) return "image/heif";
	if (clean.endsWith(".gif")) return "image/gif";

	if (clean.endsWith(".pdf")) return "application/pdf";
	if (clean.endsWith(".txt")) return "text/plain";
	if (clean.endsWith(".csv")) return "text/csv";

	if (clean.endsWith(".doc")) return "application/msword";
	if (clean.endsWith(".docx")) {
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
	}

	if (clean.endsWith(".xls")) return "application/vnd.ms-excel";
	if (clean.endsWith(".xlsx")) {
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
	}

	return fallback;
}

// Escolhe arquivo (imagem, pdf, etc.)
export async function pickExamFile({ mode = "any" } = {}) {
	if (mode === "image") {
		const res = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			quality: 0.9,
			base64: false,
			allowsEditing: false,
		});

		if (res.canceled) return null;

		const asset = res.assets[0];

		return {
			uri: asset.uri,
			name:
				asset.fileName ||
				asset.uri.split("/").pop() ||
				`image-${Date.now()}.jpg`,
			mime: asset.mimeType || guessMimeType(asset.uri, "image/jpeg"),
			size: asset.fileSize || (await safeGetSize(asset.uri)),
			width: asset.width,
			height: asset.height,
		};
	}

	const res = await DocumentPicker.getDocumentAsync({
		multiple: false,
		copyToCacheDirectory: true,
	});

	if (res.canceled) return null;

	const asset = res.assets[0];

	return {
		uri: asset.uri,
		name: asset.name || asset.uri.split("/").pop() || `file-${Date.now()}`,
		mime: asset.mimeType || guessMimeType(asset.uri),
		size: asset.size ?? (await safeGetSize(asset.uri)),
	};
}

async function safeGetSize(uri) {
	try {
		const info = await FileSystem.getInfoAsync(uri, { size: true });
		return info.size ?? 0;
	} catch {
		return 0;
	}
}

async function uriToBlob(uri) {
	const response = await fetch(uri);
	return await response.blob();
}

/**
 * Sobe arquivo no Storage e cria doc em:
 * users/{uid}/pets/{petId}/exams/{examId}
 */
export async function uploadExamForPet({
	uid,
	petId,
	tutorId = null,
	title = null,
	notes = null,
	file,
	onProgress = null,
}) {
	if (!uid) throw new Error("UID ausente");
	if (!petId) throw new Error("petId ausente");
	if (!file?.uri) throw new Error("Arquivo inválido");

	const examsColRef = collection(
		db,
		"users",
		String(uid),
		"pets",
		String(petId),
		"exams"
	);

	const examRef = doc(examsColRef);
	const examId = examRef.id;

	const storagePath = `users/${uid}/pets/${petId}/exams/${examId}/${file.name}`;
	const fileRef = storageRef(storage, storagePath);

	const blob = await uriToBlob(file.uri);

	const task = uploadBytesResumable(fileRef, blob, {
		contentType: file.mime || "application/octet-stream",
	});

	const clamp = (n) => Math.max(0, Math.min(99, Math.round(n)));

	await new Promise((resolve, reject) => {
		task.on(
			"state_changed",
			(snap) => {
				if (!onProgress) return;

				const { bytesTransferred = 0, totalBytes = 0 } = snap || {};

				if (totalBytes > 0) {
					const pct = clamp((bytesTransferred / totalBytes) * 100);
					onProgress(pct);
				}
			},
			(err) => reject(err),
			() => resolve()
		);
	});

	const downloadURL = await getDownloadURL(fileRef);

	const payload = {
		petId: String(petId),
		tutorId: tutorId ? String(tutorId) : null,
		title: title || file.name,
		notes: notes || null,
		type: "exam",
		tags: [],
		createdAt: serverTimestamp(),
		file: {
			name: file.name,
			mime: file.mime || "application/octet-stream",
			size: file.size ?? null,
			width: file.width ?? null,
			height: file.height ?? null,
			storagePath,
			downloadURL,
		},
	};

	await setDoc(examRef, payload);

	if (onProgress) onProgress(100);

	return { examId, downloadURL };
}