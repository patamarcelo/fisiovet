// src/store/slices/agendaSlice.js
// Redux + thunks usando o services/agenda (cloud-first + cache local)
// Sem mocks e sem gerar dados iniciais

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import {
    listEventos as svcListEventos,
    createEvento as svcCreateEvento,
    updateEvento as svcUpdateEvento,
    removeEvento as svcRemoveEvento,
} from '@/src/services/agenda';

/* ---------------- helpers ---------------- */
const pad2 = (n) => String(n).padStart(2, '0');
const toLocalIsoNoTZ = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

const hhmmToMinutes = (v) => {
    const m = String(v || '').match(/^(\d{1,2}):([0-5]\d)$/);
    if (!m) return 60;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};
const ensureStringId = (v) => (v == null ? null : String(v));

const toDateLocal = (v) => {
    if (v?.toDate) return v.toDate(); // Firestore Timestamp
    if (v instanceof Date) return v;
    if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v);
    if (typeof v === "string") return new Date(v);
    return new Date(v);
};

const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

function buildStartEndFrom(dateLike, durHHMM) {
    const startD = toDateLocal(dateLike);
    if (!isValidDate(startD)) {
        console.warn("⚠️ buildStartEndFrom: data inválida recebida ->", dateLike);
        return null;
    }
    const endD = new Date(startD);
    endD.setMinutes(endD.getMinutes() + hhmmToMinutes(durHHMM || "1:00"));
    return { start: toLocalIsoNoTZ(startD), end: toLocalIsoNoTZ(endD) };
}

// --------------------------
function sanitizeEvento(prev, patchOrNew) {
    const nowIso = new Date().toISOString();
    const next = { ...(prev || {}), ...(patchOrNew || {}) };

    // normalizações
    next.id = ensureStringId(next.id) || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    next.tutorId = ensureStringId(next.tutorId);
    if (Array.isArray(next.petIds)) next.petIds = next.petIds.map((x) => String(x));
    if (!next.status) next.status = "pendente";

    // garante objeto financeiro
    if (!next.financeiro || typeof next.financeiro !== "object") next.financeiro = {};
    if (next.preco != null && next.financeiro.preco == null) {
        next.financeiro.preco = next.preco;
        delete next.preco;
    }
    if (next.financeiro.preco != null) {
        const v = String(next.financeiro.preco).replace(/\./g, "").replace(",", ".");
        const n = Number(v);
        next.financeiro.preco = Number.isFinite(n) ? Math.max(0, n) : 0;
    }
    if (typeof next.financeiro.pago !== "boolean") next.financeiro.pago = false;
    if (next.financeiro.comprovanteUrl == null)
        next.financeiro.comprovanteUrl = next.financeiro.comprovanteUrl ?? null;

    if (next.seriesId != null) next.seriesId = String(next.seriesId);

    // --- (re)calcular start/end SOMENTE se a base for válida ---
    let se = null;

    if (patchOrNew?.date) {
        se = buildStartEndFrom(patchOrNew.date, patchOrNew.duracao || next.duracao);
    } else if (patchOrNew?.start && (patchOrNew?.duracao || next.duracao)) {
        se = buildStartEndFrom(patchOrNew.start, patchOrNew?.duracao || next.duracao);
    } else if (patchOrNew?.duracao && next.start) {
        se = buildStartEndFrom(next.start, patchOrNew.duracao);
    }

    if (se && se.start && se.end) {
        next.start = se.start;
        next.end = se.end;
    } else {
        // mantém os valores anteriores válidos
        if (!isValidDate(new Date(next.start))) delete next.start;
        if (!isValidDate(new Date(next.end))) delete next.end;
    }

    // timestamps (norma do slice; Firestore também mantém createdAt/updatedAt)
    if (!prev?.createdAt) next.createdAt = next.createdAt ?? nowIso;
    next.updatedAt = nowIso;

    delete next.date; // nunca persistir `date` no estado
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
        seriesId: payload?.seriesId ?? null,
        financeiro: {
            preco: payload?.financeiro?.preco ?? payload?.preco ?? 0,
            pago: payload?.financeiro?.pago ?? false,
            comprovanteUrl: payload?.financeiro?.comprovanteUrl ?? null,
        },
    };

    if (payload?.start && payload?.end) {
        return sanitizeEvento(null, { ...scaffold, start: payload.start, end: payload.end });
    }
    return sanitizeEvento(null, { ...scaffold, date: payload?.date });
}

/* ---------------- state ---------------- */
const initialState = {
    byId: {},
    allIds: [],
    status: 'idle',
    error: null,
    lastLoadedAt: null,
};

/* ---------------- thunks (cloud-first + cache local no service) ---------------- */
export const loadAgenda = createAsyncThunk('agenda/load', async () => {
    const arr = await svcListEventos();
    return Array.isArray(arr) ? arr.map((e) => sanitizeEvento(null, e)) : [];
});

export const addEvento = createAsyncThunk('agenda/add', async (payload) => {
    // normaliza para garantir start/end/preço, etc.
    const normalized = normalizeNewEvent(payload);
    // o service faz dual-write (cloud + local) e retorna o salvo
    const saved = await svcCreateEvento(normalized);
    return sanitizeEvento(null, saved);
});

export const updateEvento = createAsyncThunk(
    'agenda/update',
    async ({ id, patch }) => {
        console.log('id : ', id)
        console.log('patch: ', patch)
        const saved = await svcUpdateEvento(String(id), patch);
        return saved
    }
);

export const deleteEvento = createAsyncThunk('agenda/delete', async (id) => {
    const removedId = await svcRemoveEvento(String(id));
    return String(removedId);
});

export const addEventosBatch = createAsyncThunk('agenda/addBatch', async (payloadList) => {
    const results = [];
    for (const p of (payloadList || [])) {
        const norm = normalizeNewEvent(p);
        const saved = await svcCreateEvento(norm);
        results.push(sanitizeEvento(null, saved));
    }
    return results;
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
            // load
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
                    state.byId[id] = sanitizeEvento(null, e);
                    state.allIds.push(id);
                });
                state.allIds.sort((a, b) => new Date(state.byId[a].start) - new Date(state.byId[b].start));
                state.lastLoadedAt = new Date().toISOString();
            })
            .addCase(loadAgenda.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error?.message || 'Erro ao carregar agenda';
            })

            // add
            .addCase(addEvento.fulfilled, (state, action) => {
                const e = sanitizeEvento(null, action.payload);
                const id = String(e.id);
                state.byId[id] = e;
                if (!state.allIds.includes(id)) state.allIds.push(id);
                state.allIds.sort((a, b) => new Date(state.byId[a].start) - new Date(state.byId[b].start));
            })

            // update
            .addCase(updateEvento.fulfilled, (state, action) => {
                const incoming = action.payload;            // evento COMPLETO vindo do serviço
                const id = String(incoming.id);
                const prev = state.byId[id] || {};

                // se quiser normalizar, use prev como base
                const merged = {
                    ...prev,
                    ...incoming,
                    ...(incoming?.financeiro
                        ? { financeiro: { ...(prev.financeiro || {}), ...incoming.financeiro } }
                        : {}),
                };

                // opcional: sanitize sobre merged, NÃO sobre null
                // const safe = sanitizeEvento(prev, merged);
                const safe = merged;

                state.byId[id] = safe;
                if (!state.allIds.includes(id)) state.allIds.push(id);
                state.allIds.sort((a, b) => new Date(state.byId[a].start) - new Date(state.byId[b].start));
            })

            // delete
            .addCase(deleteEvento.fulfilled, (state, action) => {
                const id = String(action.payload);
                delete state.byId[id];
                state.allIds = state.allIds.filter((x) => x !== id);
            })

            // add batch
            .addCase(addEventosBatch.fulfilled, (state, action) => {
                const rows = Array.isArray(action.payload) ? action.payload : [];
                rows.forEach((e) => {
                    const safe = sanitizeEvento(null, e);
                    const id = String(safe.id);
                    state.byId[id] = safe;
                    if (!state.allIds.includes(id)) state.allIds.push(id);
                });
                state.allIds.sort((a, b) => new Date(state.byId[a].start) - new Date(state.byId[b].start));
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
    createSelector(
        [selectAllEventos, (_, start) => start, (_, __, end) => end],
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

export const makeSelectUpcomingEventosByTutor = (tutorId, limit = 3) =>
    createSelector([selectAllEventos], (list) => {
        const now = new Date();
        const tid = String(tutorId);
        return list
            .filter((e) => String(e.tutorId) === tid && new Date(e.end) >= now)
            .sort((a, b) => new Date(a.start) - new Date(b.start))
            .slice(0, limit);
    });

export const makeSelectEventosByPetId = (petId) =>
    createSelector(selectAllEventos, (list) => {
        const pid = String(petId);
        return list.filter(
            (e) => Array.isArray(e.petIds) && e.petIds.map(String).includes(pid)
        );
    });

export const makeSelectEventosByPetGrouped = (petId) =>
    createSelector(makeSelectEventosByPetId(petId), (list) => {
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
    });

export const makeSelectEventosBySeriesId = (seriesId) =>
    createSelector(selectAllEventos, (list) => {
        const sid = String(seriesId || '');
        return list.filter((e) => (e.seriesId || '') === sid);
    });