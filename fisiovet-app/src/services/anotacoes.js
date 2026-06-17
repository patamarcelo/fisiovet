// src/services/anotacoes.js
// @ts-nocheck

import {
  ensureFirebase,
  firestoreModule,
} from "@/firebase/firebase";

const COLLECTION_NAME = "anotacoes";

function requireFirebase() {
  const fb = ensureFirebase();

  const uid = fb?.auth?.currentUser?.uid;
  const firestore = fb?.firestore;

  if (!uid) {
    throw new Error("Usuário não autenticado.");
  }

  if (!firestore) {
    throw new Error("Firestore não inicializado.");
  }

  return {
    uid,
    firestore,
  };
}

function getCollectionRef() {
  const { uid, firestore } = requireFirebase();

  return firestore
    .collection("users")
    .doc(uid)
    .collection(COLLECTION_NAME);
}

function toIso(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (typeof value === "number") {
    return new Date(
      value < 1e12 ? value * 1000 : value
    ).toISOString();
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString();
}

function normalizeAnotacao(id, data = {}) {
  return {
    id: String(id),
    petId:
      data.petId != null
        ? String(data.petId)
        : null,
    tutorId:
      data.tutorId != null
        ? String(data.tutorId)
        : null,
    titulo: String(data.titulo || "").trim(),
    texto: String(data.texto || "").trim(),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export async function listAnotacoesByPet(petId) {
  const safePetId = String(petId || "").trim();

  if (!safePetId) {
    throw new Error("petId é obrigatório.");
  }

  const collectionRef = getCollectionRef();

  let snapshot;

  try {
    snapshot = await collectionRef
      .where("petId", "==", safePetId)
      .orderBy("createdAt", "desc")
      .get();
  } catch (error) {
    /*
     * Caso o Firestore ainda não tenha o índice composto,
     * busca pelo pet e ordena localmente.
     */
    snapshot = await collectionRef
      .where("petId", "==", safePetId)
      .get();
  }

  return snapshot.docs
    .map((docSnap) =>
      normalizeAnotacao(
        docSnap.id,
        docSnap.data()
      )
    )
    .sort((a, b) => {
      const aDate = new Date(
        a.createdAt || 0
      ).getTime();

      const bDate = new Date(
        b.createdAt || 0
      ).getTime();

      return bDate - aDate;
    });
}

export async function getAnotacaoById(id) {
  const safeId = String(id || "").trim();

  if (!safeId) {
    throw new Error("ID da anotação é obrigatório.");
  }

  const snapshot = await getCollectionRef()
    .doc(safeId)
    .get();

  if (!snapshot.exists) {
    throw new Error("Anotação não encontrada.");
  }

  return normalizeAnotacao(
    snapshot.id,
    snapshot.data()
  );
}

export async function createAnotacao(payload = {}) {
  const petId = String(
    payload.petId || ""
  ).trim();

  const texto = String(
    payload.texto || ""
  ).trim();

  const titulo = String(
    payload.titulo || ""
  ).trim();

  if (!petId) {
    throw new Error("petId é obrigatório.");
  }

  if (!texto) {
    throw new Error("Escreva a anotação.");
  }

  const tutorId =
    payload.tutorId != null &&
    payload.tutorId !== ""
      ? String(payload.tutorId)
      : null;

  const data = {
    petId,
    tutorId,
    titulo,
    texto,
    createdAt:
      firestoreModule.FieldValue.serverTimestamp(),
    updatedAt:
      firestoreModule.FieldValue.serverTimestamp(),
  };

  const createdRef = await getCollectionRef().add(data);

  /*
   * Retorno otimista para atualizar a UI imediatamente.
   * Na próxima leitura, os timestamps reais do servidor substituem estes.
   */
  const now = new Date().toISOString();

  return {
    id: String(createdRef.id),
    petId,
    tutorId,
    titulo,
    texto,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateAnotacao(id, patch = {}) {
  const safeId = String(id || "").trim();

  if (!safeId) {
    throw new Error("ID da anotação é obrigatório.");
  }

  const cleanedPatch = {};

  if ("titulo" in patch) {
    cleanedPatch.titulo = String(
      patch.titulo || ""
    ).trim();
  }

  if ("texto" in patch) {
    const texto = String(
      patch.texto || ""
    ).trim();

    if (!texto) {
      throw new Error("Escreva a anotação.");
    }

    cleanedPatch.texto = texto;
  }

  if ("petId" in patch) {
    const petId = String(
      patch.petId || ""
    ).trim();

    if (!petId) {
      throw new Error("petId é obrigatório.");
    }

    cleanedPatch.petId = petId;
  }

  if ("tutorId" in patch) {
    cleanedPatch.tutorId =
      patch.tutorId != null &&
      patch.tutorId !== ""
        ? String(patch.tutorId)
        : null;
  }

  cleanedPatch.updatedAt =
    firestoreModule.FieldValue.serverTimestamp();

  await getCollectionRef()
    .doc(safeId)
    .update(cleanedPatch);

  return {
    id: safeId,
    patch: {
      ...cleanedPatch,
      updatedAt: new Date().toISOString(),
    },
  };
}

export async function removeAnotacao(id) {
  const safeId = String(id || "").trim();

  if (!safeId) {
    throw new Error("ID da anotação é obrigatório.");
  }

  await getCollectionRef()
    .doc(safeId)
    .delete();

  return safeId;
}
