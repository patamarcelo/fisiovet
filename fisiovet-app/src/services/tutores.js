// src/services/tutores.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---- Constantes / helpers ----
const STORAGE_KEY = 'fisiovet:tutores_v1';

// Porto Alegre - RS (centro aproximado)
const POA = { lat: -30.0346, lng: -51.2177 };
// jitter leve (± ~1km) – só usado no SEED
const jitter = (v) => v + (Math.random() - 0.5) * 0.02;

// IDs novos para criações futuras (evita colisão)
function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---- SEED: usado apenas se ainda não existir nada salvo ----
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

// ---- Storage helpers ----
async function loadAll() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // 1ª execução: grava seed e retorna
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

async function saveAll(tutores) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(tutores) ? tutores : []));
}

// 👉 Geocoding MOCK: devolve POA fixo, sem delay
export async function geocodeCepMock(_cep, _enderecoParcial) {
  return { ...POA };
}

// ---- API local-first ----
export async function listTutores() {
  const list = await loadAll();
  // Collator melhora ordenação pt-BR
  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
  return list.slice().sort((a, b) => collator.compare(a.nome || '', b.nome || ''));
}

export async function getTutorById(id) {
  const tutores = await loadAll();
  const t = tutores.find((x) => x.id === id);
  if (!t) throw new Error('Tutor não encontrado');
  return { ...t };
}

export async function createTutor(payload) {
  const tutores = await loadAll();
  const now = Date.now();

  // se o form já mandar geo, usa; senão mock
  const geo = payload.geo ?? (await geocodeCepMock(payload?.endereco?.cep, payload?.endereco));

  const item = {
    id: genId(),
    ...payload,
    geo,
    createdAt: now,
    updatedAt: now,
  };

  tutores.push(item);
  await saveAll(tutores);
  return { ...item };
}

export async function updateTutor(id, patch) {
  const tutores = await loadAll();
  const idx = tutores.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error('Tutor não encontrado');

  // se veio patch.geo, usa o que veio
  let geo = patch.geo ?? tutores[idx].geo;

  // se NÃO veio geo e endereço/cep mudou, re-calcula (mock)
  const cepOriginal = tutores[idx]?.endereco?.cep;
  const cepNovo = patch?.endereco?.cep;
  const cepMudou = cepNovo && cepNovo !== cepOriginal;
  if (!patch.geo && (cepMudou || patch?.endereco)) {
    geo = await geocodeCepMock(cepNovo ?? cepOriginal, patch?.endereco ?? tutores[idx]?.endereco);
  }

  tutores[idx] = { ...tutores[idx], ...patch, geo, updatedAt: Date.now() };
  await saveAll(tutores);
  return { ...tutores[idx] };
}

export async function removeTutor(id) {
  const tutores = await loadAll();
  const next = tutores.filter((x) => x.id !== id);
  await saveAll(next);
  return { ok: true };
}

// (Opcional, útil em DEV)
export async function resetTutoresToSeed() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TUTORES));
  return { ok: true };
}