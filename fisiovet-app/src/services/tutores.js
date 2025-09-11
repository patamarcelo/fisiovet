// src/services/tutores.js

// Porto Alegre - RS (centro aproximado)
const POA = { lat: -30.0346, lng: -51.2177 };

// jitter leve pra espalhar pinos no mapa (± ~1km)
const jitter = (v) => v + (Math.random() - 0.5) * 0.02;

// Mock em memória
let _tutores = [
    {
        id: 't1',
        nome: 'Ana Souza',
        telefone: '+55 11 99999-0001',
        email: 'ana@example.com',
        endereco: {
            cep: '90010-000',
            logradouro: 'Av. Borges de Medeiros',
            numero: '1000',
            bairro: 'Centro Histórico',
            cidade: 'Porto Alegre',
            uf: 'RS',
        },
        geo: { lat: jitter(POA.lat), lng: jitter(POA.lng) }, // 👈 já com coordenadas
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: 't2',
        nome: 'Carlos Lima',
        telefone: '+55 51 98888-2222',
        email: 'carlos@example.com',
        endereco: {
            cep: '90020-004',
            logradouro: 'Rua dos Andradas',
            numero: '55',
            bairro: 'Centro',
            cidade: 'Porto Alegre',
            uf: 'RS',
        },
        geo: { lat: jitter(POA.lat), lng: jitter(POA.lng) },
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
];

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const genId = () => Math.random().toString(36).slice(2, 8);

// Mock atual (retorna cópias)
export async function listTutores() {
    await delay();
    return [..._tutores].sort((a, b) => a.nome.localeCompare(b.nome));
}
export async function getTutorById(id) {
    await delay();
    const t = _tutores.find((x) => x.id === id);
    if (!t) throw new Error('Tutor não encontrado');
    return { ...t };
}

// 👉 Geocoding MOCK: por enquanto devolve POA + jitter.
// Depois trocamos por provedores reais (abaixo).
export async function geocodeCepMock(cep, _enderecoParcial) {
    await delay(120);
    return { lat: jitter(POA.lat), lng: jitter(POA.lng) };
}

export async function createTutor(payload) {
    await delay();
    const now = Date.now();
    const geo = payload.geo ?? (await geocodeCepMock(payload?.endereco?.cep, payload?.endereco));
    const item = { id: genId(), ...payload, geo, createdAt: now, updatedAt: now };
    _tutores.push(item);
    return { ...item };
}

export async function updateTutor(id, patch) {
    await delay();
    const idx = _tutores.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Tutor não encontrado');

    // se mudou CEP/endereço e não veio geo, re-geocodifica (mock)
    let geo = _tutores[idx].geo;
    const cepMudou = patch?.endereco?.cep && patch.endereco.cep !== _tutores[idx]?.endereco?.cep;
    if (!patch.geo && (cepMudou || patch?.endereco)) {
        geo = await geocodeCepMock(patch?.endereco?.cep ?? _tutores[idx]?.endereco?.cep, patch?.endereco);
    }

    _tutores[idx] = { ..._tutores[idx], ...patch, geo, updatedAt: Date.now() };
    return { ..._tutores[idx] };
}

export async function removeTutor(id) {
    await delay();
    _tutores = _tutores.filter((x) => x.id !== id);
    return { ok: true };
}