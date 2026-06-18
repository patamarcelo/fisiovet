// src/services/tutores.js
// @ts-nocheck

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureFirebase } from "@/firebase/firebase";

/* =======================
   Constantes / helpers
======================= */

const STORAGE_KEY = "fisiovet:tutores_v1";

const POA = {
  lat: -30.0346,
  lng: -51.2177,
};

export const SEED_TUTORES = [];

function genId() {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function findUndefinedPaths(value, path = "") {
  const hits = [];

  if (value === undefined) {
    hits.push(path || "(root)");
    return hits;
  }

  if (value === null) {
    return hits;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      hits.push(
        ...findUndefinedPaths(
          item,
          `${path}[${index}]`
        )
      );
    });

    return hits;
  }

  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const nextPath = path
        ? `${path}.${key}`
        : key;

      hits.push(
        ...findUndefinedPaths(
          item,
          nextPath
        )
      );
    }
  }

  return hits;
}

function compareTutorNames(a, b) {
  return String(a?.nome || "").localeCompare(
    String(b?.nome || ""),
    "pt-BR",
    {
      sensitivity: "base",
    }
  );
}

function sortTutores(list) {
  return [...(Array.isArray(list) ? list : [])]
    .sort(compareTutorNames);
}

function mergeTutor(previous = {}, incoming = {}) {
  return {
    ...previous,
    ...incoming,

    endereco: incoming?.endereco
      ? {
          ...(previous?.endereco || {}),
          ...incoming.endereco,
        }
      : previous?.endereco,

    geo: incoming?.geo
      ? {
          ...(previous?.geo || {}),
          ...incoming.geo,
        }
      : previous?.geo,
  };
}

/* =======================
   Geocode temporário
======================= */

export async function geocodeCepMock(
  _cep,
  _enderecoParcial
) {
  return {
    ...POA,
  };
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
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        SEED_TUTORES
      )
    );

    return [...SEED_TUTORES];
  }

  try {
    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.warn(
      "⚠️ Falha ao ler cache local de tutores:",
      error
    );

    return [];
  }
}

async function saveAllLocal(tutores) {
  const safeList =
    Array.isArray(tutores)
      ? tutores
      : [];

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(safeList)
  );

  return safeList;
}

async function upsertLocalTutor(
  tutor
) {
  if (!tutor?.id) {
    return null;
  }

  const tutores =
    await loadAllLocal();

  const id =
    String(tutor.id);

  const index =
    tutores.findIndex(
      (item) =>
        String(item?.id) === id
    );

  if (index === -1) {
    tutores.push(tutor);
  } else {
    tutores[index] =
      mergeTutor(
        tutores[index],
        tutor
      );
  }

  await saveAllLocal(
    tutores
  );

  return (
    tutores.find(
      (item) =>
        String(item?.id) === id
    ) || tutor
  );
}

async function removeLocalTutor(
  id
) {
  const tutores =
    await loadAllLocal();

  const next =
    tutores.filter(
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
    .collection("tutores");
}

function docToTutor(doc) {
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

export async function listTutores() {
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
          .orderBy("nome")
          .get();

      const rows =
        snapshot.docs.map(
          docToTutor
        );

      /*
       * Na Fase 0 não apagamos um cache local preenchido
       * somente porque a consulta remota retornou [].
       *
       * O reducer também possui a mesma proteção.
       */
      if (rows.length > 0) {
        await saveAllLocal(
          rows
        );
      }

      return sortTutores(
        rows
      );
    } catch (error) {
      console.warn(
        "⚠️ Firestore indisponível ao listar tutores. Usando cache local.",
        error
      );

      const local =
        await loadAllLocal();

      if (local.length > 0) {
        return sortTutores(
          local
        );
      }

      /*
       * Rejeita o thunk para preservar o Redux Persist
       * já hidratado, em vez de entregar [].
       */
      throw error;
    }
  }

  return sortTutores(
    await loadAllLocal()
  );
}

export async function getTutorById(
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
          "Tutor não encontrado."
        );
      }

      const tutor =
        docToTutor(snapshot);

      await upsertLocalTutor(
        tutor
      );

      return tutor;
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
      "Tutor não encontrado."
    );
  }

  return {
    ...local,
  };
}

export async function createTutor(
  payload
) {
  const fb =
    ensureFirebase();

  const uid =
    fb?.auth?.currentUser?.uid;

  const geo =
    payload?.geo ??
    (
      await geocodeCepMock(
        payload?.endereco?.cep,
        payload?.endereco
      )
    );

  if (fb && uid) {
    const collectionRef =
      getCol(
        fb.firestore,
        uid
      );

    const documentRef =
      collectionRef.doc();

    const nowMs =
      Date.now();

    const serverTimestamp =
      fb.firestoreModule
        .FieldValue
        .serverTimestamp();

    const data = {
      ...payload,
      geo,
      createdAt:
        serverTimestamp,
      updatedAt:
        serverTimestamp,
      createdAtMs:
        nowMs,
      updatedAtMs:
        nowMs,
    };

    const undefinedPaths =
      findUndefinedPaths(data);

    if (
      undefinedPaths.length > 0
    ) {
      console.log(
        "🔥 Firestore SET: undefinedPaths =",
        undefinedPaths
      );

      throw new Error(
        `Payload contém undefined: ${undefinedPaths.join(", ")}`
      );
    }

    await documentRef.set(
      data
    );

    const saved = {
      id: documentRef.id,
      ...payload,
      geo,
      createdAt: nowMs,
      updatedAt: nowMs,
    };

    await upsertLocalTutor(
      saved
    );

    return saved;
  }

  const now =
    Date.now();

  const saved = {
    id: genId(),
    ...payload,
    geo,
    createdAt: now,
    updatedAt: now,
  };

  await upsertLocalTutor(
    saved
  );

  return saved;
}

export async function updateTutor(
  id,
  patch
) {
  const safeId =
    String(id);

  const fb =
    ensureFirebase();

  const uid =
    fb?.auth?.currentUser?.uid;

  if (fb && uid) {
    let geo =
      patch?.geo;

    if (
      !geo &&
      patch?.endereco
    ) {
      const current =
        await getTutorById(
          safeId
        );

      const originalCep =
        current?.endereco?.cep;

      const nextCep =
        patch?.endereco?.cep;

      geo =
        await geocodeCepMock(
          nextCep ??
            originalCep,
          patch?.endereco ??
            current?.endereco
        );
    }

    const documentRef =
      getCol(
        fb.firestore,
        uid
      ).doc(safeId);

    const nowMs =
      Date.now();

    const serverTimestamp =
      fb.firestoreModule
        .FieldValue
        .serverTimestamp();

    await documentRef.update({
      ...patch,
      ...(geo
        ? {
            geo,
          }
        : {}),
      updatedAt:
        serverTimestamp,
      updatedAtMs:
        nowMs,
    });

    const previousLocal =
      (
        await loadAllLocal()
      ).find(
        (item) =>
          String(item?.id) ===
          safeId
      ) || {
        id: safeId,
      };

    const saved =
      mergeTutor(
        previousLocal,
        {
          ...patch,
          ...(geo
            ? {
                geo,
              }
            : {}),
          id: safeId,
          updatedAt:
            nowMs,
        }
      );

    await upsertLocalTutor(
      saved
    );

    return saved;
  }

  const tutores =
    await loadAllLocal();

  const index =
    tutores.findIndex(
      (item) =>
        String(item?.id) ===
        safeId
    );

  if (index === -1) {
    throw new Error(
      "Tutor não encontrado."
    );
  }

  let geo =
    patch?.geo ??
    tutores[index]?.geo;

  if (
    !patch?.geo &&
    patch?.endereco
  ) {
    geo =
      await geocodeCepMock(
        patch?.endereco?.cep ??
          tutores[index]
            ?.endereco?.cep,
        patch?.endereco ??
          tutores[index]
            ?.endereco
      );
  }

  const saved =
    mergeTutor(
      tutores[index],
      {
        ...patch,
        geo,
        id: safeId,
        updatedAt:
          Date.now(),
      }
    );

  tutores[index] =
    saved;

  await saveAllLocal(
    tutores
  );

  return saved;
}

export async function removeTutor(
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

  await removeLocalTutor(
    safeId
  );

  return {
    ok: true,
  };
}

export async function resetTutoresToSeed() {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      SEED_TUTORES
    )
  );

  return {
    ok: true,
  };
}
