// src/store/slices/petsSlice.js
import { createAsyncThunk, createSlice, createSelector } from '@reduxjs/toolkit';
import {
    listPets,
    listPetsByTutor,
    getPetById,
    createPet,
    updatePet as updatePetApi,
    removePet,
} from '@/src/services/pets';

// ---------- Thunks ----------
export const fetchAllPets = createAsyncThunk('pets/fetchAll', async () => {
    const list = await listPets();
    return Array.isArray(list) ? list : [];
});

export const fetchPetsByTutor = createAsyncThunk(
    'pets/fetchByTutor',
    async ({ tutorId }) => {
        const rows = await listPetsByTutor(tutorId);
        return { tutorId: String(tutorId), rows: Array.isArray(rows) ? rows : [] };
    },
    {
        condition: ({ tutorId, force }, { getState }) => {
            const state = getState();
            if (force) return true;
            const tid = String(tutorId);
            // só bloqueia se já tentamos carregar antes para esse tutor
            return typeof state.pets.byTutorId[tid] === 'undefined';
        },
    }
);

export const fetchPet = createAsyncThunk('pets/fetchOne', async (id) => {
    const pet = await getPetById(id);
    return pet;
});

export const addPet = createAsyncThunk('pets/add', async (payload) => {
    const created = await createPet(payload);
    return created;
});

export const updatePet = createAsyncThunk('pets/update', async (payload) => {
    // payload deve conter id e os demais campos do pet para atualização completa
    const updated = await updatePetApi(payload.id, payload);
    return updated;
});

export const patchPet = createAsyncThunk('pets/patch', async ({ id, patch }) => {
    const updated = await updatePetApi(id, patch);
    return updated;
});

export const deletePet = createAsyncThunk('pets/delete', async (id) => {
    await removePet(id);
    return id;
});

// ---------- Estado ----------
const initialState = {
    byId: {},            // id -> pet
    allIds: [],          // lista de ids (para listagem geral)
    byTutorId: {},       // tutorId -> [petIds]
    statusAll: 'idle',   // 'idle'|'loading'|'succeeded'|'failed'
    loadingByTutor: {},  // tutorId -> status
    error: null,
    activeTutorId: null, // << PATCH: filtro de tutor opcional (não vaza entre telas)
};

// ---------- Helpers ----------
const toStr = (v) => (v == null ? undefined : String(v));

function indexAdd(state, petId, tutorId) {
    if (!tutorId) return;
    const tid = String(tutorId);
    const arr = state.byTutorId[tid] || (state.byTutorId[tid] = []);
    if (!arr.includes(petId)) arr.push(petId);
}

function indexRemove(state, petId, tutorId) {
    if (!tutorId) return;
    const tid = String(tutorId);
    const arr = state.byTutorId[tid];
    if (!arr) return;
    state.byTutorId[tid] = arr.filter((id) => id !== petId);
    if (state.byTutorId[tid].length === 0) delete state.byTutorId[tid];
}

function upsertOne(state, p) {
    const id = String(p.id);
    const prev = state.byId[id];

    // normaliza tutor
    const tid = toStr(p?.tutor?.id);

    state.byId[id] = { ...p, tutor: tid ? { ...p.tutor, id: tid } : p.tutor ?? null };
    if (!state.allIds.includes(id)) state.allIds.push(id);

    // reindex se mudou tutor
    const prevTid = toStr(prev?.tutor?.id);
    if (prevTid !== tid) {
        if (prevTid) indexRemove(state, id, prevTid);
        if (tid) indexAdd(state, id, tid);
    } else if (tid) {
        indexAdd(state, id, tid);
    }
}

function upsertMany(state, pets) {
    pets.forEach((p) => upsertOne(state, p));
}

function rebuildByTutorIndex(state) {
    state.byTutorId = {};
    state.allIds.forEach((id) => {
        const p = state.byId[id];
        const tid = toStr(p?.tutor?.id);
        if (tid) indexAdd(state, id, tid);
    });
}

// ---------- Slice ----------
const petsSlice = createSlice({
    name: 'pets',
    initialState,
    reducers: {
        resetPetsState: () => initialState,
        // PATCH: controle de filtro por tutor para não “vazar” entre telas
        setActiveTutorId(state, action) {
            state.activeTutorId = action.payload != null ? String(action.payload) : null;
        },
        clearActiveTutorId(state) {
            state.activeTutorId = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // ---- fetchAllPets ----
            .addCase(fetchAllPets.pending, (state) => {
                state.statusAll = 'loading';
                state.error = null;
            })
            .addCase(fetchAllPets.fulfilled, (state, action) => {
                state.statusAll = 'succeeded';
                // substitui tudo (ideal p/ telas gerais)
                const rows = Array.isArray(action.payload) ? action.payload : [];
                // se nada mudou (mesmo total e mesmos ids), não refaça o estado:
                if (
                    rows.length === state.allIds.length &&
                    rows.every((p, i) => state.byId[p.id]) // check básico, barato
                ) {
                    return;
                }
                state.byId = {};
                state.allIds = [];
                state.byTutorId = {};
                upsertMany(state, rows);
            })
            .addCase(fetchAllPets.rejected, (state, action) => {
                state.statusAll = 'failed';
                state.error = action.error?.message ?? 'Erro ao carregar pets';
            })

            // ---- fetchPetsByTutor ----
            .addCase(fetchPetsByTutor.pending, (state, action) => {
                const tutorId = String(action.meta.arg.tutorId);
                state.loadingByTutor[tutorId] = 'loading';
            })
            .addCase(fetchPetsByTutor.fulfilled, (state, action) => {
                const { tutorId, rows } = action.payload;
                // limpa índice do tutor e reindexa com as linhas retornadas
                state.byTutorId[tutorId] = [];
                upsertMany(state, rows);
                state.byTutorId[tutorId] = rows.map((p) => String(p.id));
                state.loadingByTutor[tutorId] = 'succeeded';
            })
            .addCase(fetchPetsByTutor.rejected, (state, action) => {
                const tutorId = String(action.meta.arg.tutorId);
                state.loadingByTutor[tutorId] = 'failed';
            })

            // ---- fetchPet ----
            .addCase(fetchPet.fulfilled, (state, action) => {
                const p = action.payload;
                if (!p) return;
                upsertOne(state, p);
            })

            // ---- addPet ----
            .addCase(addPet.fulfilled, (state, action) => {
                const p = action.payload;
                if (!p) return;
                upsertOne(state, p);
            })

            // ---- patchPet ----
            .addCase(patchPet.fulfilled, (state, action) => {
                const p = action.payload;
                if (!p) return;
                upsertOne(state, p);
            })

            // ---- updatePet ----
            .addCase(updatePet.fulfilled, (state, action) => {
                const p = action.payload;
                if (!p) return;
                upsertOne(state, p);
            })

            // ---- deletePet ----
            .addCase(deletePet.fulfilled, (state, action) => {
                const id = String(action.payload);
                const pet = state.byId[id];
                delete state.byId[id];
                state.allIds = state.allIds.filter((x) => x !== id);
                const tid = toStr(pet?.tutor?.id);
                if (tid && state.byTutorId[tid]) {
                    state.byTutorId[tid] = state.byTutorId[tid].filter((x) => x !== id);
                    if (state.byTutorId[tid].length === 0) delete state.byTutorId[tid];
                }
            });
    },
});

export const {
    resetPetsState,
    setActiveTutorId,
    clearActiveTutorId,
} = petsSlice.actions;

export default petsSlice.reducer;

// ---------- Selectors ----------
export const selectPetsState = (s) => s.pets || initialState;
export const selectTutoresState = (s) => s.tutores || { byId: {}, allIds: [] };

export const selectAllPets = createSelector(
    selectPetsState,
    (pets) => (pets.allIds || []).map((id) => pets.byId[id]).filter(Boolean)
);

export const selectPetById = (id) =>
    createSelector(selectPetsState, (pets) => pets.byId?.[id]);

export const selectPetsByTutorId = (tutorId) =>
    createSelector(selectPetsState, (pets) => {
        const tid = String(tutorId);
        const ids = pets.byTutorId?.[tid] || [];
        return ids.map((id) => pets.byId[id]).filter(Boolean);
    });

export const selectLoadingPetsByTutor = (tutorId) =>
    createSelector(selectPetsState, (pets) => (pets.loadingByTutor?.[String(tutorId)] === 'loading'));

export const selectAllPetsStatus = createSelector(
    selectPetsState,
    (pets) => pets.statusAll
);

// ---------- JOIN helpers ----------
const selectTutoresById = createSelector(
    selectTutoresState,
    (tutores) => tutores.byId || {}
);

// Pet (join com nome do tutor, se existir)
export const selectPetByIdJoined = (id) =>
    createSelector([selectPetsState, selectTutoresById], (pets, tutoresById) => {
        const p = pets.byId?.[id];
        if (!p) return undefined;
        const tid = toStr(p?.tutor?.id);
        const t = tid ? tutoresById[tid] : undefined;
        return {
            ...p,
            tutor: tid ? { id: tid, nome: t?.nome } : null,
        };
    });

// Lista completa (SEM filtro por tutor!)
export const selectAllPetsJoined = createSelector(
    [selectPetsState, selectTutoresById],
    (pets, tutoresById) =>
        (pets.allIds || [])
            .map((id) => {
                const p = pets.byId[id];
                if (!p) return null;
                const tid = toStr(p?.tutor?.id);
                const t = tid ? tutoresById[tid] : undefined;
                return { ...p, tutor: tid ? { id: tid, nome: t?.nome } : null };
            })
            .filter(Boolean)
);

// ---------- Filtro por tutor controlado (para tela do Tutor) ----------
export const selectActiveTutorId = createSelector(selectPetsState, (p) => p.activeTutorId);

export const selectPetsByActiveTutor = createSelector(
    [selectAllPetsJoined, selectActiveTutorId],
    (pets, activeTutorId) => {
        if (!activeTutorId) return pets;
        const tid = String(activeTutorId);
        return pets.filter((p) => p.tutor?.id === tid);
    }
);