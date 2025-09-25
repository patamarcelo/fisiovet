// src/store/slices/agendaSlice.js
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SEED_TUTORES } from '@/src/services/tutores';
import { _pets } from '@/src/services/pets';

const STORAGE_KEY = 'AGENDAV1_EVENTS';


// --- helpers iguais ao slice ---

const pad2 = (n) => String(n).padStart(2, "0");
const toLocalIsoNoTZ = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const durations = [
    { label: "00:30", min: 30 },
    { label: "00:45", min: 45 },
    { label: "01:00", min: 60 },
    { label: "01:30", min: 90 },
];
const statuses = ["pendente", "confirmado", "cancelado"];

// titulo conforme tipo e pet
const titles = ["Consulta", "Vacinação", "Revisão", "Retorno", "Avaliação", "Fisioterapia"];

function addMinutes(date, mins) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + mins);
    return d;
}

function generateMockEvents(tutores, pets) {
    // indexar pets por tutor
    const petsByTutor = tutores.reduce((acc, t) => {
        acc[t.id] = pets.filter((p) => p.tutor?.id === t.id);
        return acc;
    }, {});

    const makeEvent = ({ dayOffset = 0, hour = 9, tutor }) => {
        // pega 1..2 pets válidos do tutor (se tiver)
        const tutorPets = petsByTutor[tutor.id] || [];
        const chosen = tutorPets.length
            ? [pick(tutorPets)].concat(Math.random() < 0.35 && tutorPets.length > 1 ? [pick(tutorPets.filter(p => p.id !== tutorPets[0].id))] : []).filter(Boolean)
            : [];

        const petNames = chosen.map((p) => p.nome).join(", ");
        const petIds = chosen.map((p) => p.id);

        const kind = pick(titles);
        const dur = pick(durations);

        const start = new Date();
        start.setHours(9, 0, 0, 0);
        start.setDate(start.getDate() + dayOffset);
        start.setHours(hour, 0, 0, 0);
        const end = addMinutes(start, dur.min);

        const status = pick(statuses);

        return {
            id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 7),
            title: `${kind}${petNames ? " - " + petNames.split(", ")[0] : ""}`,
            start: toLocalIsoNoTZ(start),
            end: toLocalIsoNoTZ(end),
            status,
            cliente: tutor.nome,
            local: tutor.endereco?.formatted || "",
            tutorId: tutor.id,
            tutorNome: tutor.nome,
            petIds,
            duracao: dur.label,
            observacoes: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    };

    // 2 passados (ontem e 2 dias atrás), 8 futuros (espalha próximos dias/horas)
    const plan = [
        { offset: -2, hour: 15 },
        { offset: -1, hour: 10 },
        { offset: 0, hour: 16 },
        { offset: 1, hour: 9 },
        { offset: 2, hour: 11 },
        { offset: 3, hour: 14 },
        { offset: 4, hour: 10 },
        { offset: 5, hour: 15 },
        { offset: 6, hour: 13 },
        { offset: 7, hour: 9 },
    ];

    // alterna entre tutores t1/t2, garantindo pets coerentes
    const poolTutors = tutores.filter(Boolean);
    const events = plan.map((p, i) =>
        makeEvent({
            dayOffset: p.offset,
            hour: p.hour,
            tutor: poolTutors[i % poolTutors.length],
        })
    );

    // mantém ordenado por start
    events.sort((a, b) => new Date(a.start) - new Date(b.start));
    return events;
}

// --- exemplo de uso ---
const mockEvents = generateMockEvents(SEED_TUTORES, _pets);

/* ---------------- helpers ---------------- */
// --- helpers internos (reuso do seu agrupador) ---

// const pad2 = (n) => String(n).padStart(2, '0');
// const toLocalIsoNoTZ = (d) =>
//     `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

const hhmmToMinutes = (v) => {
    const m = String(v || '').match(/^(\d{1,2}):([0-5]\d)$/);
    if (!m) return 60;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};
const ensureStringId = (v) => (v == null ? null : String(v));

function buildStartEndFrom(dateLike, durHHMM) {
    const startD = dateLike instanceof Date ? new Date(dateLike) : new Date(dateLike);
    const endD = new Date(startD);
    endD.setMinutes(endD.getMinutes() + hhmmToMinutes(durHHMM || '1:00'));
    return { start: toLocalIsoNoTZ(startD), end: toLocalIsoNoTZ(endD) };
}

// remove `date` (Date) e normaliza campos antes de salvar no estado/AsyncStorage
function sanitizeEvento(prev, patchOrNew) {
    const nowIso = new Date().toISOString();
    const next = { ...(prev || {}), ...(patchOrNew || {}) };

    // normalizações
    next.id = ensureStringId(next.id) || String(Date.now());
    next.tutorId = ensureStringId(next.tutorId);
    if (Array.isArray(next.petIds)) next.petIds = next.petIds.map((x) => String(x));
    if (!next.status) next.status = 'pendente';

    // (re)calcular start/end quando vier `date` (Date/ISO) e/ou `duracao`
    if (patchOrNew?.date) {
        const base = patchOrNew.date;
        const dur = patchOrNew.duracao || next.duracao || '1:00';
        const { start, end } = buildStartEndFrom(base, dur);
        next.start = start;
        next.end = end;
    } else if (patchOrNew?.start && (patchOrNew?.duracao || next.duracao)) {
        const dur = patchOrNew?.duracao || next.duracao || '1:00';
        const { end } = buildStartEndFrom(patchOrNew.start, dur);
        next.end = end;
    } else if (patchOrNew?.duracao && next.start) {
        const { end } = buildStartEndFrom(next.start, patchOrNew.duracao);
        next.end = end;
    }

    // timestamps
    if (!prev?.createdAt) next.createdAt = nowIso;
    next.updatedAt = nowIso;

    // nunca persistir `date` no estado
    delete next.date;

    return next;
}

function normalizeNewEvent(payload) {
    const scaffold = {
        id: payload?.id,
        title: payload?.title || 'Evento',
        status: payload?.status || 'pendente',
        cliente: payload?.cliente || payload?.tutorNome || '',
        local: (payload?.local || '').trim(),
        tutorId: payload?.tutorId,
        tutorNome: payload?.tutorNome || '',
        petIds: Array.isArray(payload?.petIds) ? payload.petIds : [],
        duracao: payload?.duracao || '1:00',
        observacoes: payload?.observacoes || '',
    };

    // se veio start/end prontos, mantemos; senão, derivamos de `date` + `duracao`
    if (payload?.start && payload?.end) {
        return sanitizeEvento(null, { ...scaffold, start: payload.start, end: payload.end });
    }
    return sanitizeEvento(null, { ...scaffold, date: payload?.date });
}

const groupByDay = (list) => {
    const map = new Map();
    for (const e of list) {
        const d = new Date(e.start);
        const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(e);
    }
    return Array.from(map.entries())
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([title, data]) => ({
            title,
            data: data.sort((a, b) => new Date(a.start) - new Date(b.start)),
        }));
};

/* ---------------- persistência ---------------- */
async function readFromDevice() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}
async function writeToDevice(arr) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

/* ---------------- estado ---------------- */
const initialState = {
    byId: {},
    allIds: [],
    status: 'idle',
    error: null,
    lastLoadedAt: null,
};

/* ---------------- thunks ---------------- */
export const loadAgenda = createAsyncThunk('agenda/load', async () => {
    const arr = await readFromDevice();
    if (Array.isArray(arr) && arr.length) return arr;
    await writeToDevice(mockEvents);
    return mockEvents;
});

export const addEvento = createAsyncThunk('agenda/add', async (payload) => {
    const evt = normalizeNewEvent(payload);            // <-- aqui já remove `date` e gera start/end
    const arr = (await readFromDevice()) || [];
    arr.push(evt);
    arr.sort((a, b) => new Date(a.start) - new Date(b.start));
    await writeToDevice(arr);
    return evt;
});

export const updateEvento = createAsyncThunk('agenda/update', async ({ id, patch }) => {
    const arr = (await readFromDevice()) || [];
    const idx = arr.findIndex((e) => String(e.id) === String(id));
    if (idx === -1) throw new Error('Evento não encontrado');

    const curr = arr[idx];
    // sanitiza o patch (converte date -> start/end; normaliza ids; remove `date`)
    const merged = sanitizeEvento(curr, { ...patch, id: String(id) });

    arr[idx] = merged;
    arr.sort((a, b) => new Date(a.start) - new Date(b.start));
    await writeToDevice(arr);
    return merged;
});

export const deleteEvento = createAsyncThunk('agenda/delete', async (id) => {
    const arr = (await readFromDevice()) || [];
    const next = arr.filter((e) => String(e.id) !== String(id));
    await writeToDevice(next);
    return String(id);
});

export const replaceAllEventos = createAsyncThunk('agenda/replaceAll', async (list) => {
    // garante serializável e sem `date`
    const safe = Array.isArray(list)
        ? list.map((e) => sanitizeEvento(null, e))
        : [];
    await writeToDevice(safe);
    return safe;
});

/* ---------------- slice ---------------- */
const agendaSlice = createSlice({
    name: 'agenda',
    initialState,
    reducers: {
        resetAgendaState: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadAgenda.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(loadAgenda.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.error = null;
                const rows = Array.isArray(action.payload) ? action.payload : [];
                state.byId = {};
                state.allIds = [];
                rows.forEach((e) => {
                    const id = String(e.id);
                    state.byId[id] = sanitizeEvento(null, e); // segurança extra ao reidratar
                    state.allIds.push(id);
                });
                state.allIds.sort((a, b) => new Date(state.byId[a].start) - new Date(state.byId[b].start));
                state.lastLoadedAt = new Date().toISOString();
            })
            .addCase(loadAgenda.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error?.message || 'Erro ao carregar agenda';
            })

            .addCase(addEvento.fulfilled, (state, action) => {
                const e = sanitizeEvento(null, action.payload);
                const id = String(e.id);
                state.byId[id] = e;
                if (!state.allIds.includes(id)) state.allIds.push(id);
                state.allIds.sort((a, b) => new Date(state.byId[a].start) - new Date(state.byId[b].start));
            })

            .addCase(updateEvento.fulfilled, (state, action) => {
                const e = sanitizeEvento(null, action.payload);
                const id = String(e.id);
                state.byId[id] = e;
                if (!state.allIds.includes(id)) state.allIds.push(id);
                state.allIds.sort((a, b) => new Date(state.byId[a].start) - new Date(state.byId[b].start));
            })

            .addCase(deleteEvento.fulfilled, (state, action) => {
                const id = String(action.payload);
                delete state.byId[id];
                state.allIds = state.allIds.filter((x) => x !== id);
            })

            .addCase(replaceAllEventos.fulfilled, (state, action) => {
                const rows = Array.isArray(action.payload) ? action.payload : [];
                state.byId = {};
                state.allIds = [];
                rows.forEach((e) => {
                    const id = String(e.id);
                    state.byId[id] = sanitizeEvento(null, e);
                    state.allIds.push(id);
                });
                state.allIds.sort((a, b) => new Date(state.byId[a].start) - new Date(state.byId[b].start));
                state.lastLoadedAt = new Date().toISOString();
            });
    },
});

export const { resetAgendaState } = agendaSlice.actions;
export default agendaSlice.reducer;

/* ---------------- selectors ---------------- */
export const selectAgendaState = (s) => s.agenda || initialState;

export const selectAllEventos = createSelector(
    selectAgendaState,
    (ag) => ag.allIds.map((id) => ag.byId[id]).filter(Boolean)
);

export const selectEventoById = (id) =>
    createSelector(selectAgendaState, (ag) => ag.byId[String(id)]);

export const selectAgendaStatus = createSelector(
    selectAgendaState,
    (ag) => ag.status
);

export const selectEventosGroupedByDay = createSelector(selectAllEventos, (list) => {
    const map = new Map();
    for (const e of list) {
        const d = new Date(e.start);
        const y = d.getFullYear();
        const m = pad2(d.getMonth() + 1);
        const day = pad2(d.getDate());
        const key = `${y}-${m}-${day}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(e);
    }
    const sections = Array.from(map.entries())
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([title, data]) => ({
            title,
            data: data.sort((a, b) => new Date(a.start) - new Date(b.start)),
        }));
    return sections;
});

export const makeSelectEventosBetween = () =>
    createSelector([selectAllEventos, (_, start) => start, (_, __, end) => end],
        (list, start, end) => {
            const s = start ? new Date(start) : null;
            const e = end ? new Date(end) : null;
            return list.filter((evt) => {
                const d = new Date(evt.start);
                if (s && d < s) return false;
                if (e && d > e) return false;
                return true;
            });
        }
    );

// --- Selector: próximos eventos por tutor (futuros), limit X ---
export const makeSelectUpcomingEventosByTutor = (tutorId, limit = 3) =>
    createSelector([selectAllEventos], (list) => {
        const now = new Date();
        const tid = String(tutorId);
        return list
            .filter((e) => String(e.tutorId) === tid && new Date(e.end) >= now)
            .sort((a, b) => new Date(a.start) - new Date(b.start))
            .slice(0, limit);
    });

// NOVOS:
export const makeSelectEventosByPetId = (petId) =>
    createSelector(selectAllEventos, (list) => {
        const pid = String(petId);
        return list.filter(
            (e) => Array.isArray(e.petIds) && e.petIds.map(String).includes(pid)
        );
    });

export const makeSelectEventosByPetGrouped = (petId) =>
    createSelector(makeSelectEventosByPetId(petId), (list) => groupByDay(list));