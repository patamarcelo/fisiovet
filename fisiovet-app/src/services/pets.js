// src/services/pets.js
// JS puro

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureFirebase } from '@/firebase/firebase';

/* =====================================
   Constantes / helpers (AsyncStorage)
===================================== */
const STORAGE_KEY = 'fisiovet:pets_v1';

// (opcional) SEED inicial — deixe [] para começar do zero
export let _pets = [];

// IDs locais para fallback
function genId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// --------- Local store ----------
async function loadAllLocal() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return [];
    }
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

async function saveAllLocal(pets) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(pets) ? pets : []));
}

/* =====================================
   Firestore helpers
   Coleção: users/{uid}/pets
===================================== */
function getCol(firestore, uid) {
    return firestore.collection('users').doc(String(uid)).collection('pets');
}

// normaliza timestamps que podem estar como FieldValue ou Timestamp
function docToPet(doc) {
    const data = doc.data() || {};
    const createdAt =
        (data.createdAt && data.createdAt.toMillis?.()) ??
        data.createdAtMs ??
        Date.now();
    const updatedAt =
        (data.updatedAt && data.updatedAt.toMillis?.()) ??
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
   API pública (cloud-first com fallback)
===================================== */

/** Lista todos os pets (cloud se logado; senão local) */
export async function listPets() {
    const fb = ensureFirebase();
    const uid = fb?.auth?.currentUser?.uid;

    console.log('listPets → usando', (fb && uid) ? 'FIRESTORE' : 'LOCAL');

    if (fb && uid) {
        const snap = await getCol(fb.firestore, uid).orderBy('nome').get();
        console.log('Firestore count:', snap.size);
        return snap.docs.map(docToPet);
    }

    const pets = await loadAllLocal();
    console.log('Local count:', pets.length);
    return pets.slice().sort((a, b) => a.nome.localeCompare(b.nome));
}
/** Lista pets de um tutor específico */
export async function listPetsByTutor(tutorId) {
    const fb = ensureFirebase();
    const uid = fb?.auth?.currentUser?.uid;

    if (fb && uid) {
        const snap = await getCol(fb.firestore, uid)
            .where('tutor.id', '==', String(tutorId))
            .orderBy('nome')
            .get();
        return snap.docs.map(docToPet);
    }

    // fallback local
    const pets = await loadAllLocal();
    const filtered = pets.filter((p) => p.tutor?.id === tutorId);
    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
    return filtered.slice().sort((a, b) => collator.compare(a.nome || '', b.nome || ''));
}

/** Busca um pet por id */
export async function getPetById(id) {
    const fb = ensureFirebase();
    const uid = fb?.auth?.currentUser?.uid;

    if (fb && uid) {
        const snap = await getCol(fb.firestore, uid).doc(String(id)).get();
        if (!snap.exists) throw new Error('Pet não encontrado');
        return docToPet(snap);
    }

    // fallback local
    const pets = await loadAllLocal();
    const p = pets.find((x) => x.id === id);
    if (!p) throw new Error('Pet não encontrado');
    return { ...p };
}

/** Cria pet */
export async function createPet(payload) {
    const fb = ensureFirebase();
    const uid = fb?.auth?.currentUser?.uid;

    // payload esperado (exemplo):
    // { tutor: { id }, nome, especie, raca, cor, sexo, castrado, nasc, pesoKg, ... }

    if (fb && uid) {
        const col = getCol(fb.firestore, uid);
        const ref = col.doc();
        const nowMs = Date.now();
        const nowSrv = fb.firestoreModule.FieldValue.serverTimestamp();

        const data = {
            ...payload,
            createdAt: nowSrv,
            updatedAt: nowSrv,
            createdAtMs: nowMs,
            updatedAtMs: nowMs,
        };

        await ref.set(data);
        return { id: ref.id, ...payload, createdAt: nowMs, updatedAt: nowMs };
    }

    // fallback local
    const now = Date.now();
    const item = { id: genId(), ...payload, createdAt: now, updatedAt: now };
    const pets = await loadAllLocal();
    pets.push(item);
    await saveAllLocal(pets);
    return { ...item };
}

/** Atualiza pet */
export async function updatePet(id, patch) {
    const fb = ensureFirebase();
    const uid = fb?.auth?.currentUser?.uid;

    // patch pode conter: { nome, tutor, ... } — manteremos tutor aninhado

    if (fb && uid) {
        const ref = getCol(fb.firestore, uid).doc(String(id));
        const nowMs = Date.now();
        const nowSrv = fb.firestoreModule.FieldValue.serverTimestamp();

        await ref.update({
            ...patch,
            updatedAt: nowSrv,
            updatedAtMs: nowMs,
        });

        // retorno para atualizar a store local rapidamente (merge no slice)
        return { id, ...patch, updatedAt: nowMs };
    }

    // fallback local
    const pets = await loadAllLocal();
    const idx = pets.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Pet não encontrado');

    pets[idx] = {
        ...pets[idx],
        ...patch,
        tutor: patch?.tutor ?? pets[idx].tutor, // preserva objeto tutor
        updatedAt: Date.now(),
    };

    await saveAllLocal(pets);
    return { ...pets[idx] };
}

/** Remove pet */
export async function removePet(id) {
    const fb = ensureFirebase();
    const uid = fb?.auth?.currentUser?.uid;

    if (fb && uid) {
        await getCol(fb.firestore, uid).doc(String(id)).delete();
        return { ok: true };
    }

    // fallback local
    const pets = await loadAllLocal();
    const next = pets.filter((x) => x.id !== id);
    await saveAllLocal(next);
    return { ok: true };
}

/* =====================================
   Utilidades dev / migração
===================================== */

/** Limpa todos os pets locais (use uma vez se quiser começar do zero) */
export async function clearAllPetsLocal() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return { ok: true };
}

/** Migra pets do AsyncStorage -> Firestore (use uma única vez) */
export async function migrateLegacyPetsOnce({ clearLocal = true, overwrite = false } = {}) {
    const fb = ensureFirebase();
    const uid = fb?.auth?.currentUser?.uid;
    if (!fb || !uid) throw new Error('Usuário não autenticado / Firebase indisponível');

    // lê dados locais legados
    let legacy = [];
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) legacy = JSON.parse(raw) || [];
    } catch { /* ignore */ }

    if (!Array.isArray(legacy) || legacy.length === 0) {
        return { migrated: 0, skipped: 0 };
    }

    const col = getCol(fb.firestore, uid);
    const fv = fb.firestoreModule.FieldValue;

    let migrated = 0;
    let skipped = 0;

    // processa em lotes (batch max ~500 writes)
    const chunkSize = 400;
    for (let i = 0; i < legacy.length; i += chunkSize) {
        const batch = fb.firestore.batch();
        const slice = legacy.slice(i, i + chunkSize);

        // atenção: é write-after-read se overwrite=false (faz get por doc)
        for (const p of slice) {
            const id = String(p.id || '');
            if (!id) continue;

            const ref = col.doc(id);

            if (!overwrite) {
                const exists = await ref.get();
                if (exists.exists) { skipped++; continue; }
            }

            const createdAtMs = Number(p.createdAt ?? Date.now());
            const updatedAtMs = Number(p.updatedAt ?? createdAtMs);

            batch.set(ref, {
                ...p,
                createdAt: fv.serverTimestamp(),
                updatedAt: fv.serverTimestamp(),
                createdAtMs,
                updatedAtMs,
            });

            migrated++;
        }

        await batch.commit();
    }

    if (clearLocal) {
        await AsyncStorage.removeItem(STORAGE_KEY);
    }

    return { migrated, skipped };
}
