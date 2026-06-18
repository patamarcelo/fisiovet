// src/services/avaliacoes.js
// @ts-nocheck
//
// Fase 0 — avaliações local-first:
// - cache separado por usuário e pet;
// - leitura local imediata;
// - atualização remota em background;
// - resposta remota vazia não apaga cache local preenchido;
// - helpers públicos para criação, edição e exclusão atualizarem o cache.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureFirebase } from "@/firebase/firebase";

const STORAGE_PREFIX = "fisiovet:avaliacoes:v1";

function getCurrentUid() {
  const fb = ensureFirebase();
  return fb?.auth?.currentUser?.uid
    ? String(fb.auth.currentUser.uid)
    : "anonymous";
}

function getStorageKey(petId, uid = getCurrentUid()) {
  return `${STORAGE_PREFIX}:${String(uid)}:${String(petId)}`;
}

function sortAvaliacoes(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const timeA = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
    const timeB = new Date(b?.createdAt || b?.updatedAt || 0).getTime();

    return (
      (Number.isFinite(timeB) ? timeB : 0) -
      (Number.isFinite(timeA) ? timeA : 0)
    );
  });
}

function docToAvaliacao(doc) {
  const data = doc.data() || {};

  const createdAt =
    data.createdAt?.toMillis?.() ??
    data.createdAtMs ??
    data.createdAt ??
    Date.now();

  const updatedAt =
    data.updatedAt?.toMillis?.() ??
    data.updatedAtMs ??
    data.updatedAt ??
    createdAt;

  return {
    id: String(doc.id),
    ...data,
    createdAt,
    updatedAt,
  };
}

async function readLocal(petId, uid = getCurrentUid()) {
  if (!petId) return [];

  const raw = await AsyncStorage.getItem(
    getStorageKey(petId, uid)
  );

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? sortAvaliacoes(parsed)
      : [];
  } catch (error) {
    console.warn(
      "⚠️ Falha ao ler cache local das avaliações:",
      error
    );

    return [];
  }
}

async function writeLocal(
  petId,
  list,
  uid = getCurrentUid()
) {
  if (!petId) return [];

  const safeList = sortAvaliacoes(
    Array.isArray(list) ? list : []
  );

  await AsyncStorage.setItem(
    getStorageKey(petId, uid),
    JSON.stringify(safeList)
  );

  return safeList;
}

export async function listAvaliacoesLocal(petId) {
  return readLocal(String(petId));
}

export async function listAvaliacoesRemote(petId) {
  const fb = ensureFirebase();
  const uid = fb?.auth?.currentUser?.uid;

  if (!fb?.firestore || !uid) {
    throw new Error(
      "Usuário não autenticado para atualizar as avaliações."
    );
  }

  const snapshot = await fb.firestore
    .collection("users")
    .doc(String(uid))
    .collection("pets")
    .doc(String(petId))
    .collection("avaliacoes")
    .orderBy("createdAt", "desc")
    .get();

  const rows = snapshot.docs.map(docToAvaliacao);

  /*
   * Proteção da Fase 0:
   * uma resposta vazia inesperada não apaga
   * um cache local já preenchido.
   */
  const local = await readLocal(
    String(petId),
    String(uid)
  );

  if (rows.length > 0 || local.length === 0) {
    await writeLocal(
      String(petId),
      rows,
      String(uid)
    );
  }

  return rows.length === 0 && local.length > 0
    ? local
    : sortAvaliacoes(rows);
}

export async function listAvaliacoes(petId) {
  const local = await listAvaliacoesLocal(petId);

  try {
    return await listAvaliacoesRemote(petId);
  } catch (error) {
    if (local.length > 0) {
      return local;
    }

    throw error;
  }
}

export async function getAvaliacaoById(
  petId,
  avaliacaoId
) {
  const safePetId =
    String(petId);

  const safeId =
    String(avaliacaoId);

  const localItems =
    await listAvaliacoesLocal(
      safePetId
    );

  const local =
    localItems.find(
      (item) =>
        String(item?.id) ===
        safeId
    );

  /*
   * Local-first real:
   * se existe no aparelho, retorna imediatamente.
   */
  if (local) {
    return {
      ...local,
    };
  }

  /*
   * Só consulta o Firestore quando
   * a avaliação não existe no cache local.
   */
  const fb =
    ensureFirebase();

  const firestore =
    fb?.firestore;

  const uid =
    fb?.auth
      ?.currentUser?.uid;

  if (
    !firestore ||
    !uid
  ) {
    throw new Error(
      "Avaliação não encontrada no cache local."
    );
  }

  const snapshot =
    await firestore
      .collection("users")
      .doc(String(uid))
      .collection("pets")
      .doc(safePetId)
      .collection("avaliacoes")
      .doc(safeId)
      .get();

  if (!snapshot.exists) {
    throw new Error(
      "Avaliação não encontrada."
    );
  }

  const avaliacao =
    docToAvaliacao(
      snapshot
    );

  await upsertLocalAvaliacao(
    safePetId,
    avaliacao
  );

  return avaliacao;
}

export async function upsertLocalAvaliacao(
  petId,
  avaliacao
) {
  if (!petId || !avaliacao?.id) {
    return null;
  }

  const safePetId = String(petId);
  const id = String(avaliacao.id);
  const all = await readLocal(safePetId);

  const index = all.findIndex(
    (item) => String(item?.id) === id
  );

  const saved = {
    ...(index >= 0 ? all[index] : {}),
    ...avaliacao,
    id,
  };

  if (index === -1) {
    all.push(saved);
  } else {
    all[index] = saved;
  }

  await writeLocal(safePetId, all);

  return saved;
}

export async function removeLocalAvaliacao(
  petId,
  avaliacaoId
) {
  const safePetId = String(petId);
  const safeId = String(avaliacaoId);

  const all = await readLocal(safePetId);

  const next = all.filter(
    (item) => String(item?.id) !== safeId
  );

  await writeLocal(safePetId, next);

  return safeId;
}

export async function replaceLocalAvaliacoes(
  petId,
  list
) {
  await writeLocal(
    String(petId),
    Array.isArray(list) ? list : []
  );

  return { ok: true };
}

export async function clearLocalAvaliacoes(
  petId
) {
  await AsyncStorage.removeItem(
    getStorageKey(String(petId))
  );

  return { ok: true };
}
