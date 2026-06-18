// src/services/agenda.js
// @ts-nocheck
//
// Fase 0:
// - cache local é carregado primeiro;
// - Firestore atualiza a agenda em segundo plano;
// - caminhos online mantêm o AsyncStorage atualizado;
// - falha remota mantém os dados locais já existentes;
// - resposta remota vazia é válida e limpa o cache local;
// - exclusões feitas em outro aparelho são refletidas após o refresh remoto.
//
// Coleção: users/{uid}/agenda

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureFirebase } from "@/firebase/firebase";

/* =======================
   Constantes / helpers
======================= */

const STORAGE_KEY =
  "fisiovet:agenda_v1";

const pad2 = (value) =>
  String(value).padStart(
    2,
    "0"
  );

function createLocalId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function hhmmToMinutes(value) {
  const match =
    String(value || "").match(
      /^(\d{1,2}):([0-5]\d)$/
    );

  if (!match) {
    return 60;
  }

  return (
    parseInt(
      match[1],
      10
    ) *
      60 +
    parseInt(
      match[2],
      10
    )
  );
}

function toLocalIsoNoTZ(date) {
  return `${date.getFullYear()}-${pad2(
    date.getMonth() + 1
  )}-${pad2(
    date.getDate()
  )}T${pad2(
    date.getHours()
  )}:${pad2(
    date.getMinutes()
  )}:${pad2(
    date.getSeconds()
  )}`;
}

function normalizePatchDates(
  patch,
  previous
) {
  const output = {
    ...(patch || {}),
  };

  const duration =
    output.duracao ||
    previous?.duracao ||
    "1:00";

  if (
    output.date instanceof
    Date
  ) {
    const start =
      new Date(
        output.date
      );

    const end =
      new Date(start);

    end.setMinutes(
      end.getMinutes() +
        hhmmToMinutes(
          duration
        )
    );

    output.start =
      toLocalIsoNoTZ(start);

    output.end =
      toLocalIsoNoTZ(end);

    delete output.date;
  } else if (
    output.start &&
    (
      output.duracao ||
      previous?.duracao
    )
  ) {
    const start =
      new Date(
        output.start
      );

    if (
      !Number.isNaN(
        start.getTime()
      )
    ) {
      const end =
        new Date(start);

      end.setMinutes(
        end.getMinutes() +
          hhmmToMinutes(
            duration
          )
      );

      output.end =
        toLocalIsoNoTZ(end);
    }
  }

  return output;
}

function stripUndefined(
  value
) {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map(
        stripUndefined
      )
      .filter(
        (item) =>
          item !== undefined
      );
  }

  const output = {};

  for (
    const [key, item]
    of Object.entries(value)
  ) {
    const cleaned =
      stripUndefined(item);

    if (
      cleaned !== undefined
    ) {
      output[key] =
        cleaned;
    }
  }

  return output;
}

function normalizePetIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) =>
          item == null
            ? ""
            : String(item)
        )
        .filter(Boolean)
    )
  );
}

function normalizePetNames(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      String(item || "").trim()
    )
    .filter(Boolean);
}

function normalizeEventoPets(
  evento = {},
  options = {}
) {
  const {
    preserveExplicitNull =
      false,
  } = options;

  const hasPetIds =
    Object.prototype
      .hasOwnProperty.call(
        evento,
        "petIds"
      );

  const hasPetNomes =
    Object.prototype
      .hasOwnProperty.call(
        evento,
        "petNomes"
      );

  const hasPetId =
    Object.prototype
      .hasOwnProperty.call(
        evento,
        "petId"
      );

  const hasPetNome =
    Object.prototype
      .hasOwnProperty.call(
        evento,
        "petNome"
      ) ||
    Object.prototype
      .hasOwnProperty.call(
        evento,
        "petName"
      );

  const petIds =
    hasPetIds
      ? normalizePetIds(
          evento.petIds
        )
      : [];

  const petNomes =
    hasPetNomes
      ? normalizePetNames(
          evento.petNomes
        )
      : [];

  let petId;

  if (
    preserveExplicitNull &&
    hasPetId &&
    evento.petId == null
  ) {
    petId = null;
  } else if (
    evento.petId != null
  ) {
    petId =
      String(
        evento.petId
      );
  } else {
    petId =
      petIds[0] ||
      null;
  }

  let petNome;

  if (
    preserveExplicitNull &&
    hasPetNome &&
    (
      evento.petNome == null ||
      String(
        evento.petNome ??
        evento.petName ??
        ""
      ).trim() === ""
    )
  ) {
    petNome = null;
  } else {
    petNome =
      String(
        evento.petNome ??
        evento.petName ??
        petNomes[0] ??
        ""
      ).trim() ||
      null;
  }

  if (
    petId &&
    !petIds.includes(
      petId
    )
  ) {
    petIds.unshift(
      petId
    );
  }

  if (
    petNome &&
    !petNomes.includes(
      petNome
    )
  ) {
    petNomes.unshift(
      petNome
    );
  }

  return {
    ...evento,
    petIds,
    petNomes,
    petId,
    petNome,
  };
}

function mergeEvento(
  previous = {},
  incoming = {}
) {
  const hasIncomingPetIds =
    Object.prototype
      .hasOwnProperty.call(
        incoming,
        "petIds"
      );

  const hasIncomingPetNomes =
    Object.prototype
      .hasOwnProperty.call(
        incoming,
        "petNomes"
      );

  const hasIncomingPetId =
    Object.prototype
      .hasOwnProperty.call(
        incoming,
        "petId"
      );

  const hasIncomingPetNome =
    Object.prototype
      .hasOwnProperty.call(
        incoming,
        "petNome"
      ) ||
    Object.prototype
      .hasOwnProperty.call(
        incoming,
        "petName"
      );

  const merged = {
    ...previous,
    ...incoming,

    financeiro:
      incoming?.financeiro
        ? {
            ...(
              previous
                ?.financeiro ||
              {}
            ),

            ...incoming
              .financeiro,
          }
        : previous
            ?.financeiro,

    googleAgenda:
      incoming
        ?.googleAgenda
        ? {
            ...(
              previous
                ?.googleAgenda ||
              {}
            ),

            ...incoming
              .googleAgenda,
          }
        : previous
            ?.googleAgenda,

    petIds:
      hasIncomingPetIds
        ? normalizePetIds(
            incoming.petIds
          )
        : normalizePetIds(
            previous.petIds
          ),

    petNomes:
      hasIncomingPetNomes
        ? normalizePetNames(
            incoming.petNomes
          )
        : normalizePetNames(
            previous.petNomes
          ),
  };

  if (
    hasIncomingPetId
  ) {
    merged.petId =
      incoming.petId ==
      null
        ? null
        : String(
            incoming.petId
          );
  } else if (
    hasIncomingPetIds
  ) {
    merged.petId =
      merged.petIds[
        0
      ] ||
      null;
  } else {
    merged.petId =
      previous.petId ??
      merged.petIds[
        0
      ] ??
      null;
  }

  if (
    hasIncomingPetNome
  ) {
    merged.petNome =
      String(
        incoming.petNome ??
        incoming.petName ??
        ""
      ).trim() ||
      null;
  } else if (
    hasIncomingPetNomes
  ) {
    merged.petNome =
      merged.petNomes[
        0
      ] ||
      null;
  } else {
    merged.petNome =
      String(
        previous.petNome ??
        previous.petName ??
        merged.petNomes[
          0
        ] ??
        ""
      ).trim() ||
      null;
  }

  return normalizeEventoPets(
    merged,
    {
      preserveExplicitNull:
        true,
    }
  );
}

function normalizePetPatch(
  patch,
  previous = {}
) {
  const incoming =
    patch || {};

  const hasPetFields =
    [
      "petIds",
      "petNomes",
      "petId",
      "petNome",
      "petName",
    ].some(
      (key) =>
        Object.prototype
          .hasOwnProperty.call(
            incoming,
            key
          )
    );

  if (!hasPetFields) {
    return {
      ...incoming,
    };
  }

  const normalized =
    mergeEvento(
      previous,
      incoming
    );

  return {
    ...incoming,

    petIds:
      normalized.petIds,

    petNomes:
      normalized.petNomes,

    petId:
      normalized.petId,

    petNome:
      normalized.petNome,
  };
}

function sortEventos(
  list
) {
  return [
    ...(
      Array.isArray(list)
        ? list
        : []
    ),
  ].sort(
    (a, b) => {
      const timeA =
        new Date(
          a?.start ||
          0
        ).getTime();

      const timeB =
        new Date(
          b?.start ||
          0
        ).getTime();

      return (
        (
          Number.isFinite(
            timeA
          )
            ? timeA
            : 0
        ) -
        (
          Number.isFinite(
            timeB
          )
            ? timeB
            : 0
        )
      );
    }
  );
}

/* =======================
   AsyncStorage
======================= */

async function loadAllLocal() {
  const raw =
    await AsyncStorage.getItem(
      STORAGE_KEY
    );

  if (!raw) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(raw);

    return Array.isArray(
      parsed
    )
      ? sortEventos(
          parsed
        )
      : [];
  } catch (error) {
    console.warn(
      "⚠️ Falha ao ler cache local da agenda:",
      error
    );

    return [];
  }
}

async function saveAllLocal(
  list
) {
  const safeList =
    sortEventos(
      Array.isArray(
        list
      )
        ? list
        : []
    );

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      safeList
    )
  );

  return safeList;
}

async function upsertLocalEvento(
  evento
) {
  if (!evento?.id) {
    return null;
  }

  const all =
    await loadAllLocal();

  const id =
    String(
      evento.id
    );

  const index =
    all.findIndex(
      (item) =>
        String(
          item?.id
        ) === id
    );

  if (index === -1) {
    all.push(
      evento
    );
  } else {
    all[index] =
      mergeEvento(
        all[index],
        evento
      );
  }

  await saveAllLocal(
    all
  );

  return (
    all.find(
      (item) =>
        String(
          item?.id
        ) === id
    ) ||
    evento
  );
}

async function removeLocalEvento(
  id
) {
  const all =
    await loadAllLocal();

  const next =
    all.filter(
      (item) =>
        String(
          item?.id
        ) !==
        String(id)
    );

  await saveAllLocal(
    next
  );

  return String(
    id
  );
}

/* =======================
   Firestore
======================= */

function getCol(
  firestore,
  uid
) {
  return firestore
    .collection(
      "users"
    )
    .doc(
      String(uid)
    )
    .collection(
      "agenda"
    );
}

function docToEvento(
  doc
) {
  const data =
    doc.data() ||
    {};

  const createdAt =
    data.createdAt
      ?.toMillis?.() ??
    data.createdAtMs ??
    Date.now();

  const updatedAt =
    data.updatedAt
      ?.toMillis?.() ??
    data.updatedAtMs ??
    createdAt;

  return normalizeEventoPets({
    id:
      doc.id,

    ...data,

    createdAt,
    updatedAt,
  });
}

/* =======================
   API pública
======================= */

export async function listEventosLocal() {
  return loadAllLocal();
}

export async function listEventosRemote() {
  const fb =
    ensureFirebase();

  const uid =
    fb?.auth
      ?.currentUser
      ?.uid;

  if (
    !fb ||
    !uid
  ) {
    throw new Error(
      "Usuário não autenticado para atualizar a agenda."
    );
  }

  const snapshot =
    await getCol(
      fb.firestore,
      uid
    )
      .orderBy(
        "start",
        "asc"
      )
      .get();

  const rows =
    snapshot.docs.map(
      docToEvento
    );

  /*
   * A consulta remota terminou com sucesso.
   *
   * Mesmo uma lista vazia é um resultado válido:
   * ela pode significar que os eventos foram
   * excluídos em outro aparelho.
   */
  await saveAllLocal(
    rows
  );

  return sortEventos(
    rows
  );
}

/**
 * Compatibilidade com chamadas antigas:
 * retorna o cache local imediatamente quando houver,
 * mas ainda tenta o remoto antes de encerrar quando
 * essa função for chamada diretamente.
 *
 * O carregamento principal do app deve usar:
 * - listEventosLocal();
 * - listEventosRemote();
 */
export async function listEventos() {
  const local =
    await listEventosLocal();

  try {
    /*
     * Quando o Firestore responde com sucesso,
     * o remoto é a fonte de verdade, inclusive
     * quando retorna uma lista vazia.
     */
    return await listEventosRemote();
  } catch (error) {
    /*
     * Somente uma falha real de rede/autenticação
     * permite usar o cache local como fallback.
     */
    if (
      local.length >
      0
    ) {
      return local;
    }

    throw error;
  }
}

export async function getEventoById(
  id
) {
  const safeId =
    String(id);

  const fb =
    ensureFirebase();

  const uid =
    fb?.auth
      ?.currentUser
      ?.uid;

  if (
    fb &&
    uid
  ) {
    try {
      const collectionRef =
        getCol(
          fb.firestore,
          uid
        );

      let snapshot =
        await collectionRef
          .doc(
            safeId
          )
          .get();

      /*
       * Compatibilidade com documentos antigos
       * cujo ID do Firestore não corresponde ao
       * campo interno "id".
       */
      if (
        !snapshot.exists
      ) {
        const querySnapshot =
          await collectionRef
            .where(
              "id",
              "==",
              safeId
            )
            .limit(
              1
            )
            .get();

        if (
          !querySnapshot.empty
        ) {
          snapshot =
            querySnapshot.docs[0];
        }
      }

      if (
        !snapshot.exists
      ) {
        /*
         * O remoto respondeu com sucesso e confirmou
         * que o evento não existe. Removemos qualquer
         * cópia local antiga para impedir que o evento
         * reapareça no aparelho.
         */
        await removeLocalEvento(
          safeId
        );

        const notFoundError =
          new Error(
            "Evento não encontrado."
          );

        notFoundError.code =
          "EVENTO_NOT_FOUND";

        throw notFoundError;
      }

      const evento =
        docToEvento(
          snapshot
        );

      await upsertLocalEvento(
        evento
      );

      return evento;
    } catch (error) {
      /*
       * Não usa cache quando o Firestore confirmou
       * que o registro foi excluído.
       */
      if (
        error?.code ===
        "EVENTO_NOT_FOUND"
      ) {
        throw error;
      }

      /*
       * Em falha real de rede, o cache local continua
       * disponível para uso offline.
       */
      const local =
        (
          await loadAllLocal()
        ).find(
          (item) =>
            String(
              item?.id
            ) ===
            safeId
        );

      if (local) {
        return {
          ...local,
        };
      }

      throw error;
    }
  }

  const local =
    (
      await loadAllLocal()
    ).find(
      (item) =>
        String(
          item?.id
        ) ===
        safeId
    );

  if (!local) {
    throw new Error(
      "Evento não encontrado."
    );
  }

  return {
    ...local,
  };
}

export async function createEvento(
  payload
) {
  const fb =
    ensureFirebase();

  const uid =
    fb?.auth
      ?.currentUser
      ?.uid;

  const nowMs =
    Date.now();

  if (
    fb &&
    uid
  ) {
    const collectionRef =
      getCol(
        fb.firestore,
        uid
      );

    const documentRef =
      collectionRef.doc();

    const serverTimestamp =
      fb.firestoreModule
        .FieldValue
        .serverTimestamp();

    const normalizedPayload =
      normalizeEventoPets(
        payload
      );

    const data =
      stripUndefined({
        ...normalizedPayload,

        id:
          documentRef.id,

        createdAt:
          serverTimestamp,

        updatedAt:
          serverTimestamp,

        createdAtMs:
          nowMs,

        updatedAtMs:
          nowMs,
      });

    await documentRef.set(
      data
    );

    const saved =
      normalizeEventoPets({
        ...normalizedPayload,

        id:
          documentRef.id,

        createdAt:
          nowMs,

        updatedAt:
          nowMs,
      });

    await upsertLocalEvento(
      saved
    );

    return saved;
  }

  const saved =
    normalizeEventoPets({
      ...payload,

      id:
        payload?.id ||
        createLocalId(),

      createdAt:
        payload
          ?.createdAt ??
        nowMs,

      updatedAt:
        nowMs,
    });

  await upsertLocalEvento(
    saved
  );

  return saved;
}

export async function updateEvento(
  id,
  patch
) {
  const safeId =
    String(id);

  const fb =
    ensureFirebase();

  const uid =
    fb?.auth
      ?.currentUser
      ?.uid;

  const nowMs =
    Date.now();

  let safePatch =
    stripUndefined({
      ...(patch || {}),
    });

  delete safePatch.id;

  if (
    fb &&
    uid
  ) {
    const collectionRef =
      getCol(
        fb.firestore,
        uid
      );

    let documentRef =
      collectionRef.doc(
        safeId
      );

    let snapshot =
      await documentRef.get();

    if (
      !snapshot.exists
    ) {
      const querySnapshot =
        await collectionRef
          .where(
            "id",
            "==",
            safeId
          )
          .limit(
            1
          )
          .get();

      if (
        querySnapshot.empty
      ) {
        throw new Error(
          `Evento ${safeId} não encontrado no Firestore.`
        );
      }

      documentRef =
        querySnapshot
          .docs[0]
          .ref;

      snapshot =
        querySnapshot
          .docs[0];
    }

    const previousRemote =
      snapshot.data() ||
      {};

    safePatch =
      normalizePatchDates(
        safePatch,
        previousRemote
      );

    safePatch =
      normalizePetPatch(
        safePatch,
        previousRemote
      );

    delete safePatch.date;

    const serverTimestamp =
      fb.firestoreModule
        .FieldValue
        .serverTimestamp();

    await documentRef.set(
      {
        ...safePatch,

        updatedAt:
          serverTimestamp,

        updatedAtMs:
          nowMs,
      },
      {
        merge:
          true,
      }
    );

    const previousLocal =
      (
        await loadAllLocal()
      ).find(
        (item) =>
          String(
            item?.id
          ) ===
            String(
              documentRef.id
            ) ||
          String(
            item?.id
          ) ===
            safeId
      ) || {
        id:
          documentRef.id,
      };

    const saved =
      mergeEvento(
        previousLocal,
        {
          ...safePatch,

          id:
            documentRef.id,

          updatedAt:
            nowMs,
        }
      );

    await upsertLocalEvento(
      saved
    );

    return saved;
  }

  const all =
    await loadAllLocal();

  const index =
    all.findIndex(
      (item) =>
        String(
          item?.id
        ) ===
        safeId
    );

  if (
    index ===
    -1
  ) {
    throw new Error(
      "Evento não encontrado no cache local."
    );
  }

  safePatch =
    normalizePatchDates(
      safePatch,
      all[index]
    );

  safePatch =
    normalizePetPatch(
      safePatch,
      all[index]
    );

  delete safePatch.date;

  const saved =
    mergeEvento(
      all[index],
      {
        ...safePatch,

        id:
          safeId,

        updatedAt:
          nowMs,
      }
    );

  all[index] =
    saved;

  await saveAllLocal(
    all
  );

  return saved;
}

export async function removeEvento(
  id
) {
  const safeId =
    String(id);

  const fb =
    ensureFirebase();

  const uid =
    fb?.auth
      ?.currentUser
      ?.uid;

  if (
    fb &&
    uid
  ) {
    const collectionRef =
      getCol(
        fb.firestore,
        uid
      );

    const directRef =
      collectionRef.doc(
        safeId
      );

    const directSnapshot =
      await directRef.get();

    if (
      directSnapshot.exists
    ) {
      await directRef.delete();
    } else {
      /*
       * Compatibilidade com registros antigos:
       * procura documentos cujo campo interno "id"
       * corresponda ao ID solicitado.
       */
      const querySnapshot =
        await collectionRef
          .where(
            "id",
            "==",
            safeId
          )
          .get();

      for (
        const document
        of querySnapshot.docs
      ) {
        await document.ref.delete();
      }
    }
  }

  await removeLocalEvento(
    safeId
  );

  return safeId;
}

/* =======================
   Utilidades
======================= */

export async function replaceLocalAgenda(
  list
) {
  await saveAllLocal(
    Array.isArray(
      list
    )
      ? list
      : []
  );

  return {
    ok:
      true,
  };
}

export async function clearLocalAgenda() {
  await AsyncStorage.removeItem(
    STORAGE_KEY
  );

  return {
    ok:
      true,
  };
}