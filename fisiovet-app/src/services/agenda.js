// src/services/agenda.js
// Persistência cloud-first com fallback local + dual-write
// Coleção: users/{uid}/agenda

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureFirebase } from '@/firebase/firebase';

/* =======================
   Constantes / helpers
======================= */
const STORAGE_KEY = 'fisiovet:agenda_v1';

// leitura / escrita local (array de eventos)
async function loadAllLocal() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}
async function saveAllLocal(list) {
    await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.isArray(list) ? list : [])
    );
}

/* =======================
   Firestore helpers
======================= */
function getCol(firestore, uid) {
    return firestore.collection('users').doc(String(uid)).collection('agenda');
}

function docToEvento(doc) {
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

// utils internos (no topo do services/agenda.js, se ainda não existirem)
function stripUndefined(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = Array.isArray(obj) ? [] : {};
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v !== undefined) {
            out[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? stripUndefined(v) : v;
        }
    }
    return out;
}

/* =======================
   API pública
======================= */

/** Lista todos os eventos (cloud quando logado; sempre sincroniza cache local) */
export async function listEventos() {
    const fb = ensureFirebase();
    const uid = fb?.auth?.currentUser?.uid;

    if (fb && uid) {
        const snap = await getCol(fb.firestore, uid).orderBy('start', 'asc').get();
        const rows = snap.docs.map(docToEvento);
        // atualiza cache local com tudo que veio da nuvem
        await saveAllLocal(rows);
        return rows;
    }

    // fallback local
    return await loadAllLocal();
}

/** Busca um evento por id */
export async function getEventoById(id) {
    const fb = ensureFirebase();
    const uid = fb?.auth?.currentUser?.uid;

    if (fb && uid) {
        const ref = getCol(fb.firestore, uid).doc(String(id));
        const snap = await ref.get();
        if (!snap.exists) throw new Error('Evento não encontrado');
        const evt = docToEvento(snap);
        // mantém coerência no cache local (upsert)
        const all = await loadAllLocal();
        const idx = all.findIndex((e) => String(e.id) === String(id));
        if (idx === -1) {
            await saveAllLocal([...all, evt]);
        } else {
            all[idx] = evt;
            await saveAllLocal(all);
        }
        return evt;
    }

    // fallback local
    const all = await loadAllLocal();
    const evt = all.find((e) => String(e.id) === String(id));
    if (!evt) throw new Error('Evento não encontrado');
    return { ...evt };
}

export async function createEvento(payload) {
    const fb = ensureFirebase();
    const uid = fb?.auth?.currentUser?.uid;
    const nowMs = Date.now();

    if (fb && uid) {
        const col = getCol(fb.firestore, uid);
        const ref = col.doc(); // gera doc.id
        const fv = fb.firestoreModule.FieldValue;

        // nunca confie no payload.id (ignora se vier)
        const data = stripUndefined({
            ...payload,
            id: ref.id,                    // <- ESSE é o id fonte da verdade
            createdAt: fv.serverTimestamp(),
            updatedAt: fv.serverTimestamp(),
            createdAtMs: nowMs,
            updatedAtMs: nowMs,
        });

        await ref.set(data);

        // salva no cache local com o mesmo id do Firestore
        const saved = { ...payload, id: ref.id, createdAt: nowMs, updatedAt: nowMs };
        const all = await loadAllLocal();
        all.push(saved);
        all.sort((a, b) => new Date(a.start) - new Date(b.start));
        await saveAllLocal(all);

        return saved;
    }

    // OFFLINE: cria só no device
    const all = await loadAllLocal();
    const localId = `${nowMs}-${Math.random().toString(36).slice(2, 7)}`;
    const item = { ...payload, id: localId, createdAt: nowMs, updatedAt: nowMs };
    all.push(item);
    all.sort((a, b) => new Date(a.start) - new Date(b.start));
    await saveAllLocal(all);
    return item;
}

function hhmmToMinutes(v) {
  const m = String(v || '').match(/^(\d{1,2}):([0-5]\d)$/);
  if (!m) return 60;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function toLocalIsoNoTZ(d) {
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function normalizePatchDates(patch, prev) {
  const out = { ...patch };
  const baseDur = out.duracao || prev?.duracao || '1:00';

  // Se veio 'date', calcule start/end e remova 'date'
  if (out.date instanceof Date) {
    const start = new Date(out.date);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + hhmmToMinutes(baseDur));
    out.start = toLocalIsoNoTZ(start);
    out.end = toLocalIsoNoTZ(end);
    delete out.date;
  } else if (out.start && (out.duracao || prev?.duracao)) {
    // Se veio start + (duracao), recalcule end
    const start = new Date(out.start);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + hhmmToMinutes(baseDur));
    out.end = toLocalIsoNoTZ(end);
  }
  return out;
}

export async function updateEvento(id, patch) {
  const fb = ensureFirebase();
  const uid = fb?.auth?.currentUser?.uid;
  const nowMs = Date.now();

  // nunca permita trocar o id por patch
  let safePatch = stripUndefined({ ...patch });
  delete safePatch.id;

  if (fb && uid) {
    const col = getCol(fb.firestore, uid);
    const fv = fb.firestoreModule.FieldValue;

    // localizar doc por doc.id ou por campo 'id'
    let docRef = col.doc(String(id));
    let snap = await docRef.get();
    if (!snap.exists) {
      const q = await col.where('id', '==', String(id)).limit(1).get();
      if (!q.empty) {
        docRef = q.docs[0].ref;
        snap = q.docs[0];
      } else {
        throw new Error(`Evento ${id} não encontrado no Firestore (doc.id nem campo 'id').`);
      }
    }

    // normalizar datas SEMPRE aqui também
    const prev = snap.data() || {};
    safePatch = normalizePatchDates(safePatch, prev);

    // nunca persista 'date'
    if ('date' in safePatch) delete safePatch.date;

    // persistir merge
    await docRef.set(
      { ...safePatch, updatedAt: fv.serverTimestamp(), updatedAtMs: nowMs },
      { merge: true }
    );

    // atualizar cache local (deep merge em financeiro)
    const all = await loadAllLocal();
    let idx = all.findIndex((e) => String(e.id) === String(docRef.id));
    if (idx === -1) idx = all.findIndex((e) => String(e.id) === String(id));

    let prevLocal = idx !== -1 ? all[idx] : { id: docRef.id };
    if (idx === -1) {
      all.push(prevLocal);
      idx = all.length - 1;
    }

    const merged = {
      ...prevLocal,
      ...safePatch,
      ...(safePatch?.financeiro
        ? { financeiro: { ...(prevLocal.financeiro || {}), ...safePatch.financeiro } }
        : {}),
      id: docRef.id,
      updatedAt: nowMs,
    };

    all[idx] = merged;
    all.sort((a, b) => new Date(a.start) - new Date(b.start));
    await saveAllLocal(all);

    return merged;
  }

  // offline: normalize também
  let safePatchOffline = stripUndefined({ ...patch });
  delete safePatchOffline.id;

  const all = await loadAllLocal();
  const idx = all.findIndex((e) => String(e.id) === String(id));
  if (idx === -1) throw new Error('Evento não encontrado (offline)');

  const prevLocal = all[idx];
  safePatchOffline = normalizePatchDates(safePatchOffline, prevLocal);
  if ('date' in safePatchOffline) delete safePatchOffline.date;

  const merged = {
    ...prevLocal,
    ...safePatchOffline,
    ...(safePatchOffline?.financeiro
      ? { financeiro: { ...(prevLocal.financeiro || {}), ...safePatchOffline.financeiro } }
      : {}),
    updatedAt: nowMs,
  };

  all[idx] = merged;
  all.sort((a, b) => new Date(a.start) - new Date(b.start));
  await saveAllLocal(all);
  return merged;
}




/** Exclui evento por id (dual-write quando logado) */
export async function removeEvento(id) {
    const fb = ensureFirebase();
    const uid = fb?.auth?.currentUser?.uid;

    if (fb && uid) {
        await getCol(fb.firestore, uid).doc(String(id)).delete();
    }

    // remove do cache local em ambos os cenários
    const all = await loadAllLocal();
    const next = all.filter((e) => String(e.id) !== String(id));
    await saveAllLocal(next);
    return String(id);
}

/** Utilidades */
export async function replaceLocalAgenda(list) {
    await saveAllLocal(Array.isArray(list) ? list : []);
    return { ok: true };
}
export async function clearLocalAgenda() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return { ok: true };
}