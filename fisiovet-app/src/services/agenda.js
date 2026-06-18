// src/services/agenda.js
// @ts-nocheck
//
// Fase 0:
// - Firestore continua sendo tentado primeiro;
// - leituras remotas possuem fallback local;
// - caminhos online mantêm o AsyncStorage atualizado;
// - resposta remota vazia não apaga um cache local preenchido.
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

function mergeEvento(
  previous = {},
  incoming = {}
) {
  return {
    ...previous,
    ...incoming,

    financeiro: incoming?.financeiro
      ? {
          ...(previous?.financeiro || {}),
          ...incoming.financeiro,
        }
      : previous?.financeiro,

    googleAgenda: incoming?.googleAgenda
      ? {
          ...(previous?.googleAgenda || {}),
          ...incoming.googleAgenda,
        }
      : previous?.googleAgenda,
  };
}

function sortEventos(
  list
) {
  return [...(Array.isArray(list) ? list : [])]
    .sort(
      (a, b) => {
        const timeA =
          new Date(
            a?.start || 0
          ).getTime();

        const timeB =
          new Date(
            b?.start || 0
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

    return Array.isArray(parsed)
      ? sortEventos(parsed)
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
      Array.isArray(list)
        ? list
        : []
    );

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(safeList)
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
    String(evento.id);

  const index =
    all.findIndex(
      (item) =>
        String(item?.id) === id
    );

  if (index === -1) {
    all.push(evento);
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
        String(item?.id) === id
    ) || evento
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
        String(item?.id) !==
        String(id)
    );

  await saveAllLocal(next);

  return String(id);
}

/* =======================
   Firestore
======================= */

function getCol(
  firestore,
  uid
) {
  return firestore
    .collection("users")
    .doc(String(uid))
    .collection("agenda");
}

function docToEvento(
  doc
) {
  const data =
    doc.data() || {};

  const createdAt =
    data.createdAt?.toMillis?.() ??
    data.createdAtMs ??
    Date.now();

  const updatedAt =
    data.updatedAt?.toMillis?.() ??
    data.updatedAtMs ??
    createdAt;

  return {
    id: doc.id,
    ...data,
    createdAt,
    updatedAt,
  };
}

/* =======================
   API pública
======================= */

export async function listEventos() {
  const fb =
    ensureFirebase();

  const uid =
    fb?.auth?.currentUser?.uid;

  if (fb && uid) {
    try {
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

      if (rows.length > 0) {
        await saveAllLocal(
          rows
        );
      }

      return sortEventos(
        rows
      );
    } catch (error) {
      console.warn(
        "⚠️ Firestore indisponível ao listar agenda. Usando cache local.",
        error
      );

      const local =
        await loadAllLocal();

      if (local.length > 0) {
        return local;
      }

      throw error;
    }
  }

  return loadAllLocal();
}

export async function getEventoById(
  id
) {
  const safeId =
    String(id);

  const fb =
    ensureFirebase();

  const uid =
    fb?.auth?.currentUser?.uid;

  if (fb && uid) {
    try {
      const snapshot =
        await getCol(
          fb.firestore,
          uid
        )
          .doc(safeId)
          .get();

      if (!snapshot.exists) {
        throw new Error(
          "Evento não encontrado."
        );
      }

      const evento =
        docToEvento(snapshot);

      await upsertLocalEvento(
        evento
      );

      return evento;
    } catch (error) {
      const local =
        (
          await loadAllLocal()
        ).find(
          (item) =>
            String(item?.id) ===
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
        String(item?.id) ===
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
    fb?.auth?.currentUser?.uid;

  const nowMs =
    Date.now();

  if (fb && uid) {
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

    const data =
      stripUndefined({
        ...payload,
        id: documentRef.id,
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

    const saved = {
      ...payload,
      id: documentRef.id,
      createdAt:
        nowMs,
      updatedAt:
        nowMs,
    };

    await upsertLocalEvento(
      saved
    );

    return saved;
  }

  const saved = {
    ...payload,
    id:
      payload?.id ||
      createLocalId(),
    createdAt:
      payload?.createdAt ??
      nowMs,
    updatedAt:
      nowMs,
  };

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
    fb?.auth?.currentUser?.uid;

  const nowMs =
    Date.now();

  let safePatch =
    stripUndefined({
      ...(patch || {}),
    });

  delete safePatch.id;

  if (fb && uid) {
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

    if (!snapshot.exists) {
      const querySnapshot =
        await collectionRef
          .where(
            "id",
            "==",
            safeId
          )
          .limit(1)
          .get();

      if (
        querySnapshot.empty
      ) {
        throw new Error(
          `Evento ${safeId} não encontrado no Firestore.`
        );
      }

      documentRef =
        querySnapshot.docs[0].ref;

      snapshot =
        querySnapshot.docs[0];
    }

    const previousRemote =
      snapshot.data() || {};

    safePatch =
      normalizePatchDates(
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
        merge: true,
      }
    );

    const previousLocal =
      (
        await loadAllLocal()
      ).find(
        (item) =>
          String(item?.id) ===
            String(
              documentRef.id
            ) ||
          String(item?.id) ===
            safeId
      ) || {
        id: documentRef.id,
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
        String(item?.id) ===
        safeId
    );

  if (index === -1) {
    throw new Error(
      "Evento não encontrado no cache local."
    );
  }

  safePatch =
    normalizePatchDates(
      safePatch,
      all[index]
    );

  delete safePatch.date;

  const saved =
    mergeEvento(
      all[index],
      {
        ...safePatch,
        id: safeId,
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
    fb?.auth?.currentUser?.uid;

  if (fb && uid) {
    await getCol(
      fb.firestore,
      uid
    )
      .doc(safeId)
      .delete();
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
    Array.isArray(list)
      ? list
      : []
  );

  return {
    ok: true,
  };
}

export async function clearLocalAgenda() {
  await AsyncStorage.removeItem(
    STORAGE_KEY
  );

  return {
    ok: true,
  };
}
