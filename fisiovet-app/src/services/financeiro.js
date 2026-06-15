// Persistência dos lançamentos financeiros.
// Este arquivo será implementado seguindo o padrão de src/services/agenda.js.
// src/services/financeiro.js
// @ts-nocheck
//
// Persistência cloud-first com fallback local e dual-write.
//
// Coleção:
// users/{uid}/lancamentos/{lancamentoId}
//
// Regras principais:
// - lançamento de evento deve ser único por origem.eventoId;
// - Firestore é a fonte principal quando o usuário está autenticado;
// - AsyncStorage funciona como cache e fallback offline;
// - todos os registros passam por sanitizeLancamento;
// - nunca permite alterar o id por patch.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { ensureFirebase } from "@/firebase/firebase";

import {
  sanitizeLancamento,
  sanitizeRecebimento,
} from "@/src/features/financeiro/financeiro.helpers";

import {
  FINANCEIRO_ORIGEM,
  FINANCEIRO_STATUS,
} from "@/src/features/financeiro/financeiro.constants";

/* =========================================================
   Constantes
========================================================= */

const STORAGE_KEY_PREFIX = "fisiovet:financeiro_v1";

/* =========================================================
   Helpers gerais
========================================================= */

function ensureStringId(value) {
  if (value == null || value === "") return null;
  return String(value);
}

function createLocalId(prefix = "fin") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeEventoIdForDocId(eventoId) {
  return String(eventoId || "")
    .trim()
    .replace(/[\/\\]/g, "_");
}

function getDeterministicEventoLancamentoId(eventoId) {
  const safeEventoId = normalizeEventoIdForDocId(eventoId);

  if (!safeEventoId) {
    return createLocalId("fin");
  }

  return `evento-${safeEventoId}`;
}

function stripUndefined(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefined(item))
      .filter((item) => item !== undefined);
  }

  if (typeof value !== "object") {
    return value;
  }

  const result = {};

  for (const key of Object.keys(value)) {
    const sanitized = stripUndefined(value[key]);

    if (sanitized !== undefined) {
      result[key] = sanitized;
    }
  }

  return result;
}

function getCurrentUid() {
  const firebase = ensureFirebase();
  return firebase?.auth?.currentUser?.uid || null;
}

function getStorageKey(uid = null) {
  return `${STORAGE_KEY_PREFIX}:${uid || "guest"}`;
}

function sortLancamentos(list = []) {
  return [...list].sort((a, b) => {
    const dateA = new Date(
      a?.competencia ||
        a?.vencimento ||
        a?.createdAt ||
        0
    ).getTime();

    const dateB = new Date(
      b?.competencia ||
        b?.vencimento ||
        b?.createdAt ||
        0
    ).getTime();

    const safeA = Number.isFinite(dateA) ? dateA : 0;
    const safeB = Number.isFinite(dateB) ? dateB : 0;

    return safeB - safeA;
  });
}

function mergeLancamento(previous = {}, patch = {}) {
  const next = {
    ...previous,
    ...patch,

    origem: {
      ...(previous?.origem || {}),
      ...(patch?.origem || {}),
    },

    valores: {
      ...(previous?.valores || {}),
      ...(patch?.valores || {}),
    },

    integracao: {
      ...(previous?.integracao || {}),
      ...(patch?.integracao || {}),
    },
  };

  if (patch.recebimentos !== undefined) {
    next.recebimentos = Array.isArray(patch.recebimentos)
      ? patch.recebimentos
      : [];
  } else {
    next.recebimentos = Array.isArray(
      previous.recebimentos
    )
      ? previous.recebimentos
      : [];
  }

  return next;
}

/* =========================================================
   Cache local
========================================================= */

async function loadAllLocal(uid = null) {
  const storageKey = getStorageKey(uid);

  try {
    const raw = await AsyncStorage.getItem(storageKey);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortLancamentos(
      parsed.map((item) =>
        sanitizeLancamento(item)
      )
    );
  } catch (error) {
    console.warn(
      "⚠️ Erro ao ler cache financeiro:",
      error
    );

    return [];
  }
}

async function saveAllLocal(list, uid = null) {
  const storageKey = getStorageKey(uid);

  const safeList = sortLancamentos(
    Array.isArray(list)
      ? list.map((item) =>
          sanitizeLancamento(item)
        )
      : []
  );

  await AsyncStorage.setItem(
    storageKey,
    JSON.stringify(safeList)
  );

  return safeList;
}

async function upsertLocalLancamento(
  lancamento,
  uid = null
) {
  const safeLancamento =
    sanitizeLancamento(lancamento);

  const all = await loadAllLocal(uid);

  const index = all.findIndex(
    (item) =>
      String(item.id) ===
      String(safeLancamento.id)
  );

  if (index === -1) {
    all.push(safeLancamento);
  } else {
    all[index] = safeLancamento;
  }

  await saveAllLocal(all, uid);

  return safeLancamento;
}

async function removeLocalLancamento(
  id,
  uid = null
) {
  const all = await loadAllLocal(uid);

  const next = all.filter(
    (item) =>
      String(item.id) !== String(id)
  );

  await saveAllLocal(next, uid);

  return String(id);
}

/* =========================================================
   Firestore
========================================================= */

function getLancamentosCollection(
  firestore,
  uid
) {
  return firestore
    .collection("users")
    .doc(String(uid))
    .collection("lancamentos");
}

function firestoreValueToSerializable(value) {
  if (value == null) {
    return value;
  }

  if (
    typeof value?.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  if (
    typeof value?.toMillis === "function"
  ) {
    return new Date(
      value.toMillis()
    ).toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(
      firestoreValueToSerializable
    );
  }

  if (
    typeof value === "object" &&
    !(value instanceof Date)
  ) {
    const output = {};

    for (const [key, item] of Object.entries(
      value
    )) {
      output[key] =
        firestoreValueToSerializable(item);
    }

    return output;
  }

  return value;
}

function docToLancamento(documentSnapshot) {
  const rawData =
    documentSnapshot.data() || {};

  const data =
    firestoreValueToSerializable(rawData);

  const createdAt =
    data.createdAt ||
    (data.createdAtMs
      ? new Date(
          data.createdAtMs
        ).toISOString()
      : null);

  const updatedAt =
    data.updatedAt ||
    (data.updatedAtMs
      ? new Date(
          data.updatedAtMs
        ).toISOString()
      : createdAt);

  return sanitizeLancamento({
    ...data,
    id: documentSnapshot.id,
    createdAt,
    updatedAt,
  });
}

async function findFirestoreDocById(
  collectionRef,
  id
) {
  let documentRef =
    collectionRef.doc(String(id));

  let snapshot = await documentRef.get();

  if (snapshot.exists) {
    return {
      documentRef,
      snapshot,
    };
  }

  const querySnapshot =
    await collectionRef
      .where("id", "==", String(id))
      .limit(1)
      .get();

  if (!querySnapshot.empty) {
    return {
      documentRef:
        querySnapshot.docs[0].ref,
      snapshot:
        querySnapshot.docs[0],
    };
  }

  return null;
}

/* =========================================================
   Consultas públicas
========================================================= */

/**
 * Lista todos os lançamentos.
 *
 * Autenticado:
 * - lê da nuvem;
 * - atualiza o cache local.
 *
 * Sem autenticação ou em fallback:
 * - lê o cache local.
 */
export async function listLancamentos() {
  const firebase = ensureFirebase();
  const uid =
    firebase?.auth?.currentUser?.uid;

  if (firebase && uid) {
    try {
      const collectionRef =
        getLancamentosCollection(
          firebase.firestore,
          uid
        );

      const snapshot =
        await collectionRef
          .orderBy("competencia", "desc")
          .get();

      const rows = snapshot.docs.map(
        docToLancamento
      );

      await saveAllLocal(rows, uid);

      return rows;
    } catch (error) {
      console.warn(
        "⚠️ Erro ao listar lançamentos na nuvem. Usando cache local:",
        error
      );

      return loadAllLocal(uid);
    }
  }

  return loadAllLocal(null);
}

/**
 * Busca lançamento pelo id.
 */
export async function getLancamentoById(id) {
  const safeId = ensureStringId(id);

  if (!safeId) {
    throw new Error(
      "ID do lançamento é obrigatório."
    );
  }

  const firebase = ensureFirebase();
  const uid =
    firebase?.auth?.currentUser?.uid;

  if (firebase && uid) {
    try {
      const collectionRef =
        getLancamentosCollection(
          firebase.firestore,
          uid
        );

      const found =
        await findFirestoreDocById(
          collectionRef,
          safeId
        );

      if (!found) {
        throw new Error(
          "Lançamento não encontrado."
        );
      }

      const lancamento =
        docToLancamento(found.snapshot);

      await upsertLocalLancamento(
        lancamento,
        uid
      );

      return lancamento;
    } catch (error) {
      const localRows =
        await loadAllLocal(uid);

      const localItem =
        localRows.find(
          (item) =>
            String(item.id) === safeId
        );

      if (localItem) {
        return {
          ...localItem,
        };
      }

      throw error;
    }
  }

  const all = await loadAllLocal(null);

  const found = all.find(
    (item) =>
      String(item.id) === safeId
  );

  if (!found) {
    throw new Error(
      "Lançamento não encontrado."
    );
  }

  return {
    ...found,
  };
}

/**
 * Busca o lançamento principal vinculado a um evento.
 *
 * Ordem:
 * 1. consulta origem.eventoId na nuvem;
 * 2. tenta o id determinístico evento-{eventoId};
 * 3. procura no cache local.
 */
export async function findLancamentoByEventoId(
  eventoId
) {
  const safeEventoId =
    ensureStringId(eventoId);

  if (!safeEventoId) {
    return null;
  }

  const firebase = ensureFirebase();
  const uid =
    firebase?.auth?.currentUser?.uid;

  if (firebase && uid) {
    try {
      const collectionRef =
        getLancamentosCollection(
          firebase.firestore,
          uid
        );

      const querySnapshot =
        await collectionRef
          .where(
            "origem.eventoId",
            "==",
            safeEventoId
          )
          .limit(1)
          .get();

      if (!querySnapshot.empty) {
        const lancamento =
          docToLancamento(
            querySnapshot.docs[0]
          );

        await upsertLocalLancamento(
          lancamento,
          uid
        );

        return lancamento;
      }

      const deterministicId =
        getDeterministicEventoLancamentoId(
          safeEventoId
        );

      const deterministicSnapshot =
        await collectionRef
          .doc(deterministicId)
          .get();

      if (
        deterministicSnapshot.exists
      ) {
        const lancamento =
          docToLancamento(
            deterministicSnapshot
          );

        await upsertLocalLancamento(
          lancamento,
          uid
        );

        return lancamento;
      }
    } catch (error) {
      console.warn(
        "⚠️ Erro ao buscar lançamento por evento na nuvem:",
        error
      );
    }
  }

  const localRows =
    await loadAllLocal(uid || null);

  return (
    localRows.find(
      (item) =>
        String(
          item?.origem?.eventoId || ""
        ) === safeEventoId
    ) || null
  );
}

/* =========================================================
   Escrita pública
========================================================= */

/**
 * Cria lançamento.
 *
 * Quando a origem for evento:
 * - verifica se já existe;
 * - usa id determinístico;
 * - retorna o lançamento existente em chamadas repetidas.
 */
export async function createLancamento(
  payload
) {
  const firebase = ensureFirebase();
  const uid =
    firebase?.auth?.currentUser?.uid;

  const nowMs = Date.now();
  const nowIso =
    new Date(nowMs).toISOString();

  const origemTipo =
    payload?.origem?.tipo ||
    FINANCEIRO_ORIGEM.AVULSO;

  const eventoId =
    ensureStringId(
      payload?.origem?.eventoId
    );

  if (
    origemTipo ===
      FINANCEIRO_ORIGEM.EVENTO &&
    !eventoId
  ) {
    throw new Error(
      "eventoId é obrigatório para lançamentos originados por evento."
    );
  }

  if (
    origemTipo ===
      FINANCEIRO_ORIGEM.EVENTO &&
    eventoId
  ) {
    const existing =
      await findLancamentoByEventoId(
        eventoId
      );

    if (existing) {
      return existing;
    }
  }

  const requestedId =
    ensureStringId(payload?.id);

  const generatedId =
    origemTipo ===
      FINANCEIRO_ORIGEM.EVENTO &&
    eventoId
      ? getDeterministicEventoLancamentoId(
          eventoId
        )
      : requestedId ||
        createLocalId("fin");

  const normalized = sanitizeLancamento({
    ...payload,

    id: generatedId,

    origem: {
      ...(payload?.origem || {}),
      tipo: origemTipo,
      eventoId,
    },

    createdAt:
      payload?.createdAt ||
      nowIso,

    updatedAt: nowIso,
  });

  if (firebase && uid) {
    const collectionRef =
      getLancamentosCollection(
        firebase.firestore,
        uid
      );

    const documentRef =
      collectionRef.doc(
        String(normalized.id)
      );

    /*
     * Segunda proteção contra duplicidade:
     * caso duas chamadas tentem criar o lançamento
     * determinístico, a segunda reutiliza o documento.
     */
    const existingSnapshot =
      await documentRef.get();

    if (existingSnapshot.exists) {
      const existing =
        docToLancamento(
          existingSnapshot
        );

      await upsertLocalLancamento(
        existing,
        uid
      );

      return existing;
    }

    const fieldValue =
      firebase.firestoreModule
        .FieldValue;

    const firestoreData =
      stripUndefined({
        ...normalized,

        id: documentRef.id,

        createdAt:
          fieldValue.serverTimestamp(),

        updatedAt:
          fieldValue.serverTimestamp(),

        createdAtMs: nowMs,
        updatedAtMs: nowMs,
      });

    await documentRef.set(
      firestoreData
    );

    const saved =
      sanitizeLancamento({
        ...normalized,
        id: documentRef.id,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

    await upsertLocalLancamento(
      saved,
      uid
    );

    return saved;
  }

  const localSaved =
    sanitizeLancamento({
      ...normalized,
      id: generatedId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

  await upsertLocalLancamento(
    localSaved,
    null
  );

  return localSaved;
}

/**
 * Atualiza um lançamento.
 *
 * O patch é mesclado com:
 * - origem;
 * - valores;
 * - integração;
 * - recebimentos.
 *
 * Depois o lançamento inteiro é normalizado novamente.
 */
export async function updateLancamento(
  id,
  patch
) {
  const safeId = ensureStringId(id);

  if (!safeId) {
    throw new Error(
      "ID do lançamento é obrigatório."
    );
  }

  const firebase = ensureFirebase();
  const uid =
    firebase?.auth?.currentUser?.uid;

  const nowMs = Date.now();
  const nowIso =
    new Date(nowMs).toISOString();

  const safePatch =
    stripUndefined({
      ...(patch || {}),
    });

  delete safePatch.id;
  delete safePatch.createdAt;

  if (firebase && uid) {
    const collectionRef =
      getLancamentosCollection(
        firebase.firestore,
        uid
      );

    const found =
      await findFirestoreDocById(
        collectionRef,
        safeId
      );

    if (!found) {
      throw new Error(
        `Lançamento ${safeId} não encontrado.`
      );
    }

    const previous =
      docToLancamento(
        found.snapshot
      );

    const merged =
      mergeLancamento(
        previous,
        safePatch
      );

    const normalized =
      sanitizeLancamento(
        {
          ...merged,
          id: found.documentRef.id,
          createdAt:
            previous.createdAt,
          updatedAt: nowIso,
        },
        previous
      );

    const fieldValue =
      firebase.firestoreModule
        .FieldValue;

    const firestoreData =
      stripUndefined({
        ...normalized,

        id: found.documentRef.id,

        createdAt:
          previous.createdAt,

        updatedAt:
          fieldValue.serverTimestamp(),

        updatedAtMs: nowMs,
      });

    await found.documentRef.set(
      firestoreData,
      {
        merge: true,
      }
    );

    const saved =
      sanitizeLancamento({
        ...normalized,
        id: found.documentRef.id,
        updatedAt: nowIso,
      });

    await upsertLocalLancamento(
      saved,
      uid
    );

    return saved;
  }

  const all =
    await loadAllLocal(null);

  const index =
    all.findIndex(
      (item) =>
        String(item.id) === safeId
    );

  if (index === -1) {
    throw new Error(
      "Lançamento não encontrado no cache local."
    );
  }

  const previous = all[index];

  const merged =
    mergeLancamento(
      previous,
      safePatch
    );

  const saved =
    sanitizeLancamento(
      {
        ...merged,
        id: previous.id,
        createdAt:
          previous.createdAt,
        updatedAt: nowIso,
      },
      previous
    );

  all[index] = saved;

  await saveAllLocal(
    all,
    null
  );

  return saved;
}

/**
 * Exclui lançamento.
 *
 * A exclusão do lançamento não exclui automaticamente
 * o evento relacionado. Essa coordenação ficará no workflow.
 */
export async function removeLancamento(
  id
) {
  const safeId = ensureStringId(id);

  if (!safeId) {
    throw new Error(
      "ID do lançamento é obrigatório."
    );
  }

  const firebase = ensureFirebase();
  const uid =
    firebase?.auth?.currentUser?.uid;

  if (firebase && uid) {
    const collectionRef =
      getLancamentosCollection(
        firebase.firestore,
        uid
      );

    const found =
      await findFirestoreDocById(
        collectionRef,
        safeId
      );

    if (found) {
      await found.documentRef.delete();
    }

    await removeLocalLancamento(
      safeId,
      uid
    );

    return safeId;
  }

  await removeLocalLancamento(
    safeId,
    null
  );

  return safeId;
}

/* =========================================================
   Operações específicas de recebimentos
========================================================= */

/**
 * Adiciona um recebimento manual e recalcula o lançamento.
 */
export async function addRecebimento(
  lancamentoId,
  recebimento
) {
  const lancamento =
    await getLancamentoById(
      lancamentoId
    );

  if (
    lancamento.status ===
    FINANCEIRO_STATUS.CANCELADO
  ) {
    throw new Error(
      "Não é possível registrar recebimento em um lançamento cancelado."
    );
  }

  const safeRecebimento =
    sanitizeRecebimento(
      recebimento
    );

  const recebimentos = [
    ...(lancamento.recebimentos || []),
    safeRecebimento,
  ];

  return updateLancamento(
    lancamento.id,
    {
      recebimentos,
    }
  );
}

/**
 * Remove um recebimento pelo id.
 */
export async function removeRecebimento(
  lancamentoId,
  recebimentoId
) {
  const lancamento =
    await getLancamentoById(
      lancamentoId
    );

  const safeRecebimentoId =
    ensureStringId(recebimentoId);

  const recebimentos = (
    lancamento.recebimentos || []
  ).filter(
    (item) =>
      String(item.id) !==
      safeRecebimentoId
  );

  return updateLancamento(
    lancamento.id,
    {
      recebimentos,
    }
  );
}

/* =========================================================
   Utilidades de cache
========================================================= */

export async function replaceLocalFinanceiro(
  list
) {
  const uid = getCurrentUid();

  await saveAllLocal(
    Array.isArray(list)
      ? list
      : [],
    uid
  );

  return {
    ok: true,
  };
}

export async function clearLocalFinanceiro() {
  const uid = getCurrentUid();

  await AsyncStorage.removeItem(
    getStorageKey(uid)
  );

  return {
    ok: true,
  };
}