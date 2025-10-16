// src/services/tutores.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureFirebase } from '@/firebase/firebase';

/* =======================
   Constantes / helpers
======================= */
const STORAGE_KEY = 'fisiovet:tutores_v1';

// POA mock (geocode)
const POA = { lat: -30.0346, lng: -51.2177 };
const jitter = (v) => v + (Math.random() - 0.5) * 0.02;

export const SEED_TUTORES = [
  {
    id: 't1',
    nome: 'Ana Souza',
    telefone: '11999990001',
    email: 'ana@example.com',
    endereco: {
      cep: '90010-000',
      logradouro: 'Av. Borges de Medeiros',
      numero: '1000',
      bairro: 'Centro Histórico',
      cidade: 'Porto Alegre',
      uf: 'RS',
      formatted:
        'Av. Borges de Medeiros, 1000 - Centro Histórico, Porto Alegre - RS, 90010-000, Brasil',
    },
    geo: { lat: jitter(POA.lat), lng: jitter(POA.lng), precision: 'approx', placeId: 'mock-t1' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 't2',
    nome: 'Carlos Lima',
    telefone: '51988882222',
    email: 'carlos@example.com',
    endereco: {
      cep: '90020-004',
      logradouro: 'Rua dos Andradas',
      numero: '55',
      bairro: 'Centro',
      cidade: 'Porto Alegre',
      uf: 'RS',
      formatted: 'Rua dos Andradas, 55 - Centro, Porto Alegre - RS, 90020-004, Brasil',
    },
    geo: { lat: jitter(POA.lat), lng: jitter(POA.lng), precision: 'approx', placeId: 'mock-t2' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

// ids locais para fallback
function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// geocode mock
export async function geocodeCepMock(_cep, _enderecoParcial) {
  return { ...POA };
}

/* =======================
   AsyncStorage (fallback)
======================= */
async function loadAllLocal() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TUTORES));
    return SEED_TUTORES;
  }
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function saveAllLocal(tutores) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(tutores) ? tutores : []));
}

/* =======================
   Firestore helpers
======================= */
function getCol(firestore, uid) {
  return firestore.collection('users').doc(String(uid)).collection('tutores');
}

function docToTutor(doc) {
  const data = doc.data() || {};
  // normaliza timestamps (serverTimestamp pode vir como FieldValue até resolver)
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

/* =======================
   API pública (cloud-first)
======================= */

/** Lista todos (cloud se logado, senão local) */
export async function listTutores() {
  const fb = ensureFirebase();
  const uid = fb?.auth?.currentUser?.uid;

  if (fb && uid) {
    const snap = await getCol(fb.firestore, uid).orderBy('nome').get();
    return snap.docs.map(docToTutor);
  }

  // fallback local
  const list = await loadAllLocal();
  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
  return list.slice().sort((a, b) => collator.compare(a.nome || '', b.nome || ''));
}

/** Busca um */
export async function getTutorById(id) {
  const fb = ensureFirebase();
  const uid = fb?.auth?.currentUser?.uid;

  if (fb && uid) {
    const ref = getCol(fb.firestore, uid).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Tutor não encontrado');
    return docToTutor(snap);
  }

  // fallback local
  const tutores = await loadAllLocal();
  const t = tutores.find((x) => x.id === id);
  if (!t) throw new Error('Tutor não encontrado');
  return { ...t };
}

/** Cria */
export async function createTutor(payload) {
  const fb = ensureFirebase();
  const uid = fb?.auth?.currentUser?.uid;

  const geo = payload.geo ?? (await geocodeCepMock(payload?.endereco?.cep, payload?.endereco));

  if (fb && uid) {
    const col = getCol(fb.firestore, uid);
    const ref = col.doc();
    const nowSrv = fb.firestoreModule.FieldValue.serverTimestamp();
    const nowMs = Date.now();

    const data = {
      ...payload,
      geo,
      createdAt: nowSrv,
      updatedAt: nowSrv,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    };

    await ref.set(data);
    // retorna payload+id com ms locais (útil pra UI)
    return { id: ref.id, ...payload, geo, createdAt: nowMs, updatedAt: nowMs };
  }

  // fallback local
  const tutores = await loadAllLocal();
  const now = Date.now();
  const item = { id: genId(), ...payload, geo, createdAt: now, updatedAt: now };
  tutores.push(item);
  await saveAllLocal(tutores);
  return { ...item };
}

/** Atualiza */
export async function updateTutor(id, patch) {
  const fb = ensureFirebase();
  const uid = fb?.auth?.currentUser?.uid;

  if (fb && uid) {
    // se veio patch.geo, usa; senão, checa se endereço/cep mudou para recalcular (mock)
    let geo = patch.geo;
    if (!geo && patch?.endereco) {
      // pega doc atual para comparar
      const current = await getTutorById(id);
      const cepOriginal = current?.endereco?.cep;
      const cepNovo = patch?.endereco?.cep;
      const cepMudou = cepNovo && cepNovo !== cepOriginal;
      if (cepMudou || patch?.endereco) {
        geo = await geocodeCepMock(cepNovo ?? cepOriginal, patch?.endereco ?? current?.endereco);
      }
    }

    const ref = getCol(fb.firestore, uid).doc(String(id));
    const nowSrv = fb.firestoreModule.FieldValue.serverTimestamp();
    const nowMs = Date.now();

    await ref.update({
      ...patch,
      ...(geo ? { geo } : {}),
      updatedAt: nowSrv,
      updatedAtMs: nowMs,
    });

    // retorna merge local para atualizar store
    return { id, ...patch, ...(geo ? { geo } : {}), updatedAt: nowMs };
  }

  // fallback local
  const tutores = await loadAllLocal();
  const idx = tutores.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error('Tutor não encontrado');

  let geo = patch.geo ?? tutores[idx].geo;
  const cepOriginal = tutores[idx]?.endereco?.cep;
  const cepNovo = patch?.endereco?.cep;
  const cepMudou = cepNovo && cepNovo !== cepOriginal;
  if (!patch.geo && (cepMudou || patch?.endereco)) {
    geo = await geocodeCepMock(cepNovo ?? cepOriginal, patch?.endereco ?? tutores[idx]?.endereco);
  }

  tutores[idx] = { ...tutores[idx], ...patch, geo, updatedAt: Date.now() };
  await saveAllLocal(tutores);
  return { ...tutores[idx] };
}

/** Remove */
export async function removeTutor(id) {
  const fb = ensureFirebase();
  const uid = fb?.auth?.currentUser?.uid;

  if (fb && uid) {
    const ref = getCol(fb.firestore, uid).doc(String(id));
    await ref.delete();
    return { ok: true };
  }

  // fallback local
  const tutores = await loadAllLocal();
  const next = tutores.filter((x) => x.id !== id);
  await saveAllLocal(next);
  return { ok: true };
}

/** (Opcional DEV) reset local */
export async function resetTutoresToSeed() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TUTORES));
  return { ok: true };
}