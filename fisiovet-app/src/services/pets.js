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
    {
        id: 'p3',
        tutor: { id: 't2', nome: 'Carlos Lima' },
        nome: 'Rex',
        especie: 'cachorro',
        raca: 'Pastor Alemão',
        cor: 'Preto e Marrom',
        sexo: 'M',
        castrado: true,
        nasc: '2019-02-15',
        pesoKg: 40,
        createdAt: Date.now() - 86400000 * 200,
        updatedAt: Date.now() - 86400000 * 3,
    },
    {
        id: 'p4',
        tutor: { id: 't2', nome: 'Carlos Lima' },
        nome: 'Luna',
        especie: 'gato',
        raca: 'Persa',
        cor: 'Branco',
        sexo: 'F',
        castrado: true,
        nasc: '2021-11-20',
        pesoKg: 4.5,
        createdAt: Date.now() - 86400000 * 150,
        updatedAt: Date.now() - 86400000 * 5,
    },
    {
        id: 'p5',
        tutor: { id: 't3', nome: 'Fernanda Oliveira' },
        nome: 'Bidu',
        especie: 'cachorro',
        raca: 'Beagle',
        cor: 'Caramelo',
        sexo: 'M',
        castrado: false,
        nasc: '2022-06-01',
        pesoKg: 12,
        createdAt: Date.now() - 86400000 * 80,
        updatedAt: Date.now() - 86400000 * 1,
    },
    {
        id: 'p6',
        tutor: { id: 't3', nome: 'Fernanda Oliveira' },
        nome: 'Mel',
        especie: 'gato',
        raca: 'Siamês',
        cor: 'Bege',
        sexo: 'F',
        castrado: false,
        nasc: '2023-01-15',
        pesoKg: 3.8,
        createdAt: Date.now() - 86400000 * 60,
        updatedAt: Date.now() - 86400000 * 2,
    },
    {
        id: 'p7',
        tutor: { id: 't4', nome: 'João Pedro' },
        nome: 'Apolo',
        especie: 'cachorro',
        raca: 'Labrador',
        cor: 'Preto',
        sexo: 'M',
        castrado: true,
        nasc: '2018-05-05',
        pesoKg: 33,
        createdAt: Date.now() - 86400000 * 400,
        updatedAt: Date.now() - 86400000 * 7,
    },
    {
        id: 'p8',
        tutor: { id: 't4', nome: 'João Pedro' },
        nome: 'Nina',
        especie: 'gato',
        raca: 'Maine Coon',
        cor: 'Cinza',
        sexo: 'F',
        castrado: true,
        nasc: '2020-07-12',
        pesoKg: 6,
        createdAt: Date.now() - 86400000 * 300,
        updatedAt: Date.now() - 86400000 * 4,
    },
    {
        id: 'p9',
        tutor: { id: 't5', nome: 'Mariana Silva' },
        nome: 'Bob',
        especie: 'cachorro',
        raca: 'Bulldog Francês',
        cor: 'Branco e Preto',
        sexo: 'M',
        castrado: false,
        nasc: '2021-03-08',
        pesoKg: 14,
        createdAt: Date.now() - 86400000 * 220,
        updatedAt: Date.now() - 86400000 * 6,
    },
    {
        id: 'p10',
        tutor: { id: 't5', nome: 'Mariana Silva' },
        nome: 'Amora',
        especie: 'gato',
        raca: 'Angorá',
        cor: 'Preto',
        sexo: 'F',
        castrado: true,
        nasc: '2019-12-01',
        pesoKg: 5,
        createdAt: Date.now() - 86400000 * 500,
        updatedAt: Date.now() - 86400000 * 3,
    },
    {
        id: 'p11',
        tutor: { id: 't6', nome: 'Ricardo Santos' },
        nome: 'Toby',
        especie: 'cachorro',
        raca: 'Shih Tzu',
        cor: 'Branco e Marrom',
        sexo: 'M',
        castrado: true,
        nasc: '2017-09-14',
        pesoKg: 7,
        createdAt: Date.now() - 86400000 * 700,
        updatedAt: Date.now() - 86400000 * 10,
    },
    {
        id: 'p12',
        tutor: { id: 't6', nome: 'Ricardo Santos' },
        nome: 'Sofia',
        especie: 'gato',
        raca: 'British Shorthair',
        cor: 'Cinza Azul',
        sexo: 'F',
        castrado: false,
        nasc: '2022-02-28',
        pesoKg: 4,
        createdAt: Date.now() - 86400000 * 150,
        updatedAt: Date.now() - 86400000 * 2,
    },
    {
        id: 'p13',
        tutor: { id: 't7', nome: 'Beatriz Rocha' },
        nome: 'Max',
        especie: 'cachorro',
        raca: 'Poodle',
        cor: 'Branco',
        sexo: 'M',
        castrado: true,
        nasc: '2016-08-21',
        pesoKg: 10,
        createdAt: Date.now() - 86400000 * 900,
        updatedAt: Date.now() - 86400000 * 15,
    },
    {
        id: 'p14',
        tutor: { id: 't7', nome: 'Beatriz Rocha' },
        nome: 'Jade',
        especie: 'gato',
        raca: 'SRD',
        cor: 'Rajado',
        sexo: 'F',
        castrado: false,
        nasc: '2024-03-15',
        pesoKg: 2.5,
        createdAt: Date.now() - 86400000 * 30,
        updatedAt: Date.now() - 86400000 * 1,
    },
    {
        id: 'p15',
        tutor: { id: 't8', nome: 'Lucas Almeida' },
        nome: 'Spike',
        especie: 'cachorro',
        raca: 'Rottweiler',
        cor: 'Preto e Castanho',
        sexo: 'M',
        castrado: true,
        nasc: '2015-01-10',
        pesoKg: 45,
        createdAt: Date.now() - 86400000 * 1200,
        updatedAt: Date.now() - 86400000 * 20,
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