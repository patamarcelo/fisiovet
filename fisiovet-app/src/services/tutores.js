// src/services/tutores.js

// Porto Alegre - RS (centro aproximado)
const POA = { lat: -30.0346, lng: -51.2177 };

// jitter leve (± ~1km) – só usado em dados existentes
const jitter = (v) => v + (Math.random() - 0.5) * 0.02;

// Mock em memória
let _tutores = [
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
  {
    id: 't3',
    nome: 'Fernanda Alves',
    telefone: '51997776666',
    email: 'fernanda@example.com',
    endereco: {
      cep: '91751-630',
      logradouro: 'Av. Edgar Pires de Castro',
      numero: '200',
      bairro: 'Vila Nova',
      cidade: 'Porto Alegre',
      uf: 'RS',
      formatted:
        'Av. Edgar Pires de Castro, 200 - Vila Nova, Porto Alegre - RS, 91751-630, Brasil',
    },
    geo: { lat: jitter(POA.lat), lng: jitter(POA.lng), precision: 'approx', placeId: 'mock-t3' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 't4',
    nome: 'Marcos Pereira',
    telefone: '51992223344',
    email: 'marcos@example.com',
    endereco: {
      cep: '90440-050',
      logradouro: 'Rua Padre Chagas',
      numero: '150',
      bairro: 'Moinhos de Vento',
      cidade: 'Porto Alegre',
      uf: 'RS',
      formatted:
        'Rua Padre Chagas, 150 - Moinhos de Vento, Porto Alegre - RS, 90440-050, Brasil',
    },
    geo: { lat: jitter(POA.lat), lng: jitter(POA.lng), precision: 'approx', placeId: 'mock-t4' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 't5',
    nome: 'Juliana Martins',
    telefone: '51993335555',
    email: 'juliana@example.com',
    endereco: {
      cep: '91330-000',
      logradouro: 'Av. Protásio Alves',
      numero: '5000',
      bairro: 'Petrópolis',
      cidade: 'Porto Alegre',
      uf: 'RS',
      formatted:
        'Av. Protásio Alves, 5000 - Petrópolis, Porto Alegre - RS, 91330-000, Brasil',
    },
    geo: { lat: jitter(POA.lat), lng: jitter(POA.lng), precision: 'approx', placeId: 'mock-t5' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },

  // novos tutores, alinhados ao mock dos pets
  {
    id: 't6',
    nome: 'Bruno Carvalho',
    telefone: '51991112233',
    email: 'bruno@example.com',
    endereco: {
      cep: '90110-001',
      logradouro: 'Av. Ipiranga',
      numero: '2000',
      bairro: 'Azenha',
      cidade: 'Porto Alegre',
      uf: 'RS',
      formatted: 'Av. Ipiranga, 2000 - Azenha, Porto Alegre - RS, 90110-001, Brasil',
    },
    geo: { lat: jitter(POA.lat), lng: jitter(POA.lng), precision: 'approx', placeId: 'mock-t6' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 't7',
    nome: 'Paula Rocha',
    telefone: '51994447777',
    email: 'paula@example.com',
    endereco: {
      cep: '91340-001',
      logradouro: 'Av. Carlos Gomes',
      numero: '1200',
      bairro: 'Bela Vista',
      cidade: 'Porto Alegre',
      uf: 'RS',
      formatted: 'Av. Carlos Gomes, 1200 - Bela Vista, Porto Alegre - RS, 91340-001, Brasil',
    },
    geo: { lat: jitter(POA.lat), lng: jitter(POA.lng), precision: 'approx', placeId: 'mock-t7' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 't8',
    nome: 'Rafael Santos',
    telefone: '51995556666',
    email: 'rafael@example.com',
    endereco: {
      cep: '90520-001',
      logradouro: 'Av. Assis Brasil',
      numero: '4500',
      bairro: 'Passo d’Areia',
      cidade: 'Porto Alegre',
      uf: 'RS',
      formatted:
        'Av. Assis Brasil, 4500 - Passo d’Areia, Porto Alegre - RS, 90520-001, Brasil',
    },
    geo: { lat: jitter(POA.lat), lng: jitter(POA.lng), precision: 'approx', placeId: 'mock-t8' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 't9',
    nome: 'Camila Duarte',
    telefone: '51996667777',
    email: 'camila@example.com',
    endereco: {
      cep: '91710-001',
      logradouro: 'Av. Cavalhada',
      numero: '800',
      bairro: 'Cavalhada',
      cidade: 'Porto Alegre',
      uf: 'RS',
      formatted: 'Av. Cavalhada, 800 - Cavalhada, Porto Alegre - RS, 91710-001, Brasil',
    },
    geo: { lat: jitter(POA.lat), lng: jitter(POA.lng), precision: 'approx', placeId: 'mock-t9' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 't10',
    nome: 'Tiago Nunes',
    telefone: '51997778888',
    email: 'tiago@example.com',
    endereco: {
      cep: '91110-001',
      logradouro: 'Av. Sertório',
      numero: '3000',
      bairro: 'Sarandi',
      cidade: 'Porto Alegre',
      uf: 'RS',
      formatted: 'Av. Sertório, 3000 - Sarandi, Porto Alegre - RS, 91110-001, Brasil',
    },
    geo: { lat: jitter(POA.lat), lng: jitter(POA.lng), precision: 'approx', placeId: 'mock-t10' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];
const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const genId = () => Math.random().toString(36).slice(2, 8);

// --- API Mock --- //
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

// 👉 Geocoding MOCK: agora sempre devolve POA fixo
export async function geocodeCepMock(_cep, _enderecoParcial) {
    await delay(120);
    return { ...POA }; // sem jitter
}

// 👇 se quiser manter fallback, ok. Mas não geocodifique se o payload já trouxe geo.
export async function createTutor(payload) {
    await delay();
    const now = Date.now();

    const geo = payload.geo ?? (await geocodeCepMock(payload?.endereco?.cep, payload?.endereco));

    const item = {
        id: genId(),
        ...payload,
        geo, // já pode vir enriquecido do form
        createdAt: now,
        updatedAt: now,
    };

    _tutores.push(item);
    return { ...item };
}

export async function updateTutor(id, patch) {
    await delay();
    const idx = _tutores.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Tutor não encontrado');

    // se veio patch.geo, usa o que veio (enriquecido)
    let geo = patch.geo ?? _tutores[idx].geo;

    // se NÃO veio geo no patch e mudou endereço/cep, pode usar fallback mock
    const cepMudou = patch?.endereco?.cep && patch.endereco.cep !== _tutores[idx]?.endereco?.cep;
    if (!patch.geo && (cepMudou || patch?.endereco)) {
        geo = await geocodeCepMock(
            patch?.endereco?.cep ?? _tutores[idx]?.endereco?.cep,
            patch?.endereco
        );
    }

    _tutores[idx] = { ..._tutores[idx], ...patch, geo, updatedAt: Date.now() };
    return { ..._tutores[idx] };
}

export async function removeTutor(id) {
    await delay();
    _tutores = _tutores.filter((x) => x.id !== id);
    return { ok: true };
}