// src/services/pets.js
// @ts-nocheck

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureFirebase } from "@/firebase/firebase";

/* =====================================
   Constantes / helpers
===================================== */

const STORAGE_KEY =
  "fisiovet:pets_v1";

export let _pets = [];

function genId() {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function comparePetNames(a, b) {
  return String(a?.nome || "").localeCompare(
    String(b?.nome || ""),
    "pt-BR",
    {
      sensitivity: "base",
    }
  );
}

function sortPets(list) {
  return [...(Array.isArray(list) ? list : [])]
    .sort(comparePetNames);
}

function mergePet(
  previous = {},
  incoming = {}
) {
  return {
    ...previous,
    ...incoming,

    tutor: incoming?.tutor
      ? {
          ...(previous?.tutor || {}),
          ...incoming.tutor,
        }
      : previous?.tutor,
  };
}

/* =====================================
   AsyncStorage
===================================== */

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
      ? parsed
      : [];
  } catch (error) {
    console.warn(
      "⚠️ Falha ao ler cache local de pets:",
      error
    );

    return [];
  }
}

async function saveAllLocal(
  pets
) {
  const safeList =
    Array.isArray(pets)
      ? pets
      : [];

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(safeList)
  );

  return safeList;
}

async function upsertLocalPet(
  pet
) {
  if (!pet?.id) {
    return null;
  }

  const pets =
    await loadAllLocal();

  const id =
    String(pet.id);

  const index =
    pets.findIndex(
      (item) =>
        String(item?.id) === id
    );

  if (index === -1) {
    pets.push(pet);
  } else {
    pets[index] =
      mergePet(
        pets[index],
        pet
      );
  }

  await saveAllLocal(
    pets
  );

  return (
    pets.find(
      (item) =>
        String(item?.id) === id
    ) || pet
  );
}

async function upsertManyLocalPets(
  rows
) {
  const current =
    await loadAllLocal();

  const byId =
    new Map(
      current
        .filter(
          (item) =>
            item?.id != null
        )
        .map(
          (item) => [
            String(item.id),
            item,
          ]
        )
    );

  for (const pet of rows || []) {
    if (!pet?.id) {
      continue;
    }

    const id =
      String(pet.id);

    byId.set(
      id,
      mergePet(
        byId.get(id) || {},
        pet
      )
    );
  }

  const next =
    Array.from(
      byId.values()
    );

  await saveAllLocal(
    next
  );

  return next;
}

async function removeLocalPet(
  id
) {
  const pets =
    await loadAllLocal();

  const next =
    pets.filter(
      (item) =>
        String(item?.id) !==
        String(id)
    );

  await saveAllLocal(next);

  return String(id);
}

/* =====================================
   Firestore
===================================== */

function getCol(
  firestore,
  uid
) {
  return firestore
    .collection("users")
    .doc(String(uid))
    .collection("pets");
}

function docToPet(doc) {
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

/* =====================================
   API pública
===================================== */

export async function listPets() {
  const fb =
    ensureFirebase();

  const uid =
    fb?.auth?.currentUser?.uid;

  console.log(
    "listPets → usando",
    fb && uid
      ? "FIRESTORE"
      : "LOCAL"
  );

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
          docToPet
        );

      console.log(
        "Firestore count:",
        snapshot.size
      );

      if (rows.length > 0) {
        await saveAllLocal(
          rows
        );
      }

      return sortPets(
        rows
      );
    } catch (error) {
      console.warn(
        "⚠️ Firestore indisponível ao listar pets. Usando cache local.",
        error
      );

      const local =
        await loadAllLocal();

      if (local.length > 0) {
        return sortPets(
          local
        );
      }

      throw error;
    }
  }

  const local =
    await loadAllLocal();

  console.log(
    "Local count:",
    local.length
  );

  return sortPets(local);
}

export async function listPetsByTutor(
  tutorId
) {
  const safeTutorId =
    String(tutorId);

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
          .where(
            "tutor.id",
            "==",
            safeTutorId
          )
          .orderBy("nome")
          .get();

      const rows =
        snapshot.docs.map(
          docToPet
        );

      /*
       * Como a consulta contém somente os pets deste tutor,
       * fazemos upsert e não substituímos todo o cache.
       */
      if (rows.length > 0) {
        await upsertManyLocalPets(
          rows
        );
      }

      return sortPets(
        rows
      );
    } catch (error) {
      console.warn(
        "⚠️ Firestore indisponível ao listar pets do tutor. Usando cache local.",
        error
      );

      const local =
        (
          await loadAllLocal()
        ).filter(
          (pet) =>
            String(
              pet?.tutor?.id
            ) ===
            safeTutorId
        );

      if (local.length > 0) {
        return sortPets(
          local
        );
      }

      throw error;
    }
  }

  return sortPets(
    (
      await loadAllLocal()
    ).filter(
      (pet) =>
        String(
          pet?.tutor?.id
        ) ===
        safeTutorId
    )
  );
}

export async function getPetById(
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
          "Pet não encontrado."
        );
      }

      const pet =
        docToPet(snapshot);

      await upsertLocalPet(
        pet
      );

      return pet;
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
      "Pet não encontrado."
    );
  }

  return {
    ...local,
  };
}

export async function createPet(
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

    const data = {
      ...payload,
      createdAt:
        serverTimestamp,
      updatedAt:
        serverTimestamp,
      createdAtMs:
        nowMs,
      updatedAtMs:
        nowMs,
    };

    await documentRef.set(
      data
    );

    const saved = {
      id: documentRef.id,
      ...payload,
      createdAt:
        nowMs,
      updatedAt:
        nowMs,
    };

    await upsertLocalPet(
      saved
    );

    return saved;
  }

  const saved = {
    id: genId(),
    ...payload,
    createdAt:
      nowMs,
    updatedAt:
      nowMs,
  };

  await upsertLocalPet(
    saved
  );

  return saved;
}

export async function updatePet(
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

  if (fb && uid) {
    const documentRef =
      getCol(
        fb.firestore,
        uid
      ).doc(safeId);

    const serverTimestamp =
      fb.firestoreModule
        .FieldValue
        .serverTimestamp();

    await documentRef.update({
      ...patch,
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
      mergePet(
        previousLocal,
        {
          ...patch,
          id: safeId,
          updatedAt:
            nowMs,
        }
      );

    await upsertLocalPet(
      saved
    );

    return saved;
  }

  const pets =
    await loadAllLocal();

  const index =
    pets.findIndex(
      (item) =>
        String(item?.id) ===
        safeId
    );

  if (index === -1) {
    throw new Error(
      "Pet não encontrado."
    );
  }

  const saved =
    mergePet(
      pets[index],
      {
        ...patch,
        id: safeId,
        updatedAt:
          nowMs,
      }
    );

  pets[index] =
    saved;

  await saveAllLocal(
    pets
  );

  return saved;
}

export async function removePet(
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

  await removeLocalPet(
    safeId
  );

  return {
    ok: true,
  };
}

/* =====================================
   Utilidades dev / migração
===================================== */

export async function clearAllPetsLocal() {
  await AsyncStorage.removeItem(
    STORAGE_KEY
  );

  return {
    ok: true,
  };
}

export async function migrateLegacyPetsOnce({
  clearLocal = true,
  overwrite = false,
} = {}) {
  const fb =
    ensureFirebase();

  const uid =
    fb?.auth?.currentUser?.uid;

  if (!fb || !uid) {
    throw new Error(
      "Usuário não autenticado / Firebase indisponível."
    );
  }

  let legacy = [];

  try {
    const raw =
      await AsyncStorage.getItem(
        STORAGE_KEY
      );

    if (raw) {
      legacy =
        JSON.parse(raw) || [];
    }
  } catch {
    legacy = [];
  }

  if (
    !Array.isArray(legacy) ||
    legacy.length === 0
  ) {
    return {
      migrated: 0,
      skipped: 0,
    };
  }

  const collectionRef =
    getCol(
      fb.firestore,
      uid
    );

  const fieldValue =
    fb.firestoreModule
      .FieldValue;

  let migrated = 0;
  let skipped = 0;

  const chunkSize = 400;

  for (
    let index = 0;
    index < legacy.length;
    index += chunkSize
  ) {
    const batch =
      fb.firestore.batch();

    const chunk =
      legacy.slice(
        index,
        index + chunkSize
      );

    for (const pet of chunk) {
      const id =
        String(pet?.id || "");

      if (!id) {
        continue;
      }

      const documentRef =
        collectionRef.doc(id);

      if (!overwrite) {
        const existing =
          await documentRef.get();

        if (existing.exists) {
          skipped += 1;
          continue;
        }
      }

      const createdAtMs =
        Number(
          pet?.createdAt ??
            Date.now()
        );

      const updatedAtMs =
        Number(
          pet?.updatedAt ??
            createdAtMs
        );

      batch.set(
        documentRef,
        {
          ...pet,
          createdAt:
            fieldValue.serverTimestamp(),
          updatedAt:
            fieldValue.serverTimestamp(),
          createdAtMs,
          updatedAtMs,
        }
      );

      migrated += 1;
    }

    await batch.commit();
  }

  if (clearLocal) {
    await AsyncStorage.removeItem(
      STORAGE_KEY
    );
  }

  return {
    migrated,
    skipped,
  };
}
