// src/services/pets.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'fisiovet:pets_v1';
let _pets = [
    {
        id: 'mbq8j6a-1k3d9p',
        tutor: { id: 't1' },
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
        id: 'mbq8j6a-2k4f7x',
        tutor: { id: 't1' },
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
        id: 'mbq8j6a-3p9z4m',
        tutor: { id: 't2' },
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
        id: 'mbq8j6a-4t2k1n',
        tutor: { id: 't2' },
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
        id: 'mbq8j6a-5z8r2c',
        tutor: { id: 't3' },
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
        id: 'mbq8j6a-6m5v8j',
        tutor: { id: 't3' },
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
        id: 'mbq8j6a-7q1l4h',
        tutor: { id: 't4' },
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
        id: 'mbq8j6a-8x7c2v',
        tutor: { id: 't4' },
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
        id: 'mbq8j6a-9g3b1p',
        tutor: { id: 't5' },
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
        id: 'mbq8j6a-10n2s8k',
        tutor: { id: 't5' },
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
        id: 'mbq8j6a-11d4f9m',
        tutor: { id: 't6' },
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
        id: 'mbq8j6a-12r7p3x',
        tutor: { id: 't6' },
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
        id: 'mbq8j6a-13y9k2z',
        tutor: { id: 't7' },
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
        id: 'mbq8j6a-14w6t8b',
        tutor: { id: 't7' },
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
        id: 'mbq8j6a-15h5m7n',
        tutor: { id: 't8' },
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

async function loadAll() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
        // 1ª execução no device: inicializa com SEED (apenas uma vez)
        if (_pets?.length) {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(_pets));
            return _pets;
        }
        return [];
    }
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

async function saveAll(pets) {
    // Proteção: nunca grave undefined/null
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(pets) ? pets : []));
}
// ---- Helpers ----

function genId() {
    return (
        Date.now().toString(36) +
        '-' +
        Math.random().toString(36).slice(2, 9)
    );
}

// ---- Queries ----
export async function listPets() {
    const pets = await loadAll();
    return pets.slice().sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function listPetsByTutor(tutorId) {
    const pets = await loadAll();
    return pets
        .filter((p) => p.tutor?.id === tutorId)
        .sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function getPetById(id) {
    const pets = await loadAll();
    const p = pets.find((x) => x.id === id);
    if (!p) throw new Error('Pet não encontrado');
    return { ...p };
}

// ---- Mutations ----
export async function createPet(payload) {
    const now = Date.now();
    const item = {
        id: genId(),
        ...payload,
        createdAt: now,
        updatedAt: now,
    };
    const pets = await loadAll();
    pets.push(item);
    await saveAll(pets);
    return { ...item };
}

export async function updatePet(id, patch) {
    const pets = await loadAll();
    const idx = pets.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Pet não encontrado');

    const merged = {
        ...pets[idx],
        ...patch,
        tutor: patch?.tutor ?? pets[idx].tutor,
        updatedAt: Date.now(),
    };

    pets[idx] = merged;
    await saveAll(pets);
    return { ...merged };
}

export async function removePet(id) {
    const pets = await loadAll();
    const next = pets.filter((x) => x.id !== id);
    await saveAll(next);
    return { ok: true };
}