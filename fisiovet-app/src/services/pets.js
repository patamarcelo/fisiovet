// src/services/pets.js
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const genId = () => Math.random().toString(36).slice(2, 8);

/**
 * Modelo de Pet:
 * {
 *   id,
 *   tutor: { id, nome },
 *   nome,
 *   especie: 'cachorro'|'gato',
 *   raca, cor,
 *   sexo: 'M'|'F',
 *   castrado: boolean,
 *   nasc: 'YYYY-MM-DD' | null,
 *   pesoKg: number | null,
 *   fotoUrl?: string,
 *   createdAt, updatedAt
 * }
 */
let _pets = [
    {
        id: 'p1',
        tutor: { id: 't1', nome: 'Ana Souza' },
        nome: 'Thor',
        especie: 'cachorro',
        raca: 'Golden Retriever',
        cor: 'Dourado',
        sexo: 'M',
        castrado: true,
        nasc: '2020-04-10',
        pesoKg: 30,
        createdAt: Date.now() - 86400000 * 50,
        updatedAt: Date.now() - 86400000 * 2,
    },
    {
        id: 'p2',
        tutor: { id: 't1', nome: 'Ana Souza' },
        nome: 'Mimi',
        especie: 'gato',
        raca: 'SRD',
        cor: 'Tricolor',
        sexo: 'F',
        castrado: false,
        nasc: '2023-08-01',
        pesoKg: 3.2,
        createdAt: Date.now() - 86400000 * 10,
        updatedAt: Date.now() - 86400000 * 1,
    },
];

// ---- Queries ----
export async function listPets() {
    await delay();
    // ordena por nome (alfa) só para UX básica
    return [..._pets].sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function listPetsByTutor(tutorId) {
    await delay();
    return _pets.filter((p) => p.tutor?.id === tutorId).sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function getPetById(id) {
    await delay();
    const p = _pets.find((x) => x.id === id);
    if (!p) throw new Error('Pet não encontrado');
    return { ...p };
}

// ---- Mutations ----
export async function createPet(payload) {
    await delay();
    const now = Date.now();
    const item = {
        id: genId(),
        ...payload,
        createdAt: now,
        updatedAt: now,
    };
    _pets.push(item);
    return { ...item };
}

export async function updatePet(id, patch) {
    await delay();
    const idx = _pets.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Pet não encontrado');

    _pets[idx] = {
        ..._pets[idx],
        ...patch,
        // permitir trocar tutor (relação)
        tutor: patch?.tutor ?? _pets[idx].tutor,
        updatedAt: Date.now(),
    };
    return { ..._pets[idx] };
}

export async function removePet(id) {
    await delay();
    _pets = _pets.filter((x) => x.id !== id);
    return { ok: true };
}