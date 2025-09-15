import { createAsyncThunk, createSlice, createSelector } from '@reduxjs/toolkit';
import {
    listPets,
    listPetsByTutor,
    getPetById,
    createPet,
    updatePet,
    removePet,
} from '@/src/services/pets';

// ---------- Thunks ----------
export const fetchAllPets = createAsyncThunk('pets/fetchAll', async () => {
    const list = await listPets();
    return list;
});

export const fetchPetsByTutor = createAsyncThunk(
    'pets/fetchByTutor',
    async ({ tutorId }) => {
        const rows = await listPetsByTutor(tutorId);
        return { tutorId, rows };
    },
    {
        condition: ({ tutorId, force }, { getState }) => {
            const state = getState();
            if (force) return true;
            // só bloqueia se já tentamos carregar antes
            return typeof state.pets.byTutorId[tutorId] === 'undefined';
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

export const patchPet = createAsyncThunk('pets/patch', async ({ id, patch }) => {
    const updated = await updatePet(id, patch);
    return updated;
});

export const deletePet = createAsyncThunk('pets/delete', async (id) => {
    await removePet(id);
    return id;
});

// ---------- Estado ----------
const initialState = {
    byId: {},          // id -> pet
    allIds: [],        // lista de ids (para listagem geral)
    byTutorId: {},     // tutorId -> [petIds]
    statusAll: 'idle', // 'idle'|'loading'|'succeeded'|'failed'
    loadingByTutor: {},// tutorId -> status
    error: null,
};

// ---------- Helpers ----------
function upsertMany(state, pets) {
    pets.forEach((p) => {
        state.byId[p.id] = p;
        if (!state.allIds.includes(p.id)) state.allIds.push(p.id);
        const tid = p.tutor?.id;
        if (tid) {
            state.byTutorId[tid] = state.byTutorId[tid] || [];
            if (!state.byTutorId[tid].includes(p.id)) state.byTutorId[tid].push(p.id);
        }
    });
}

function rebuildByTutorIndex(state) {
    state.byTutorId = {};
    state.allIds.forEach((id) => {
        const p = state.byId[id];
        const tid = p?.tutor?.id;
        if (tid) {
            state.byTutorId[tid] = state.byTutorId[tid] || [];
            if (!state.byTutorId[tid].includes(id)) state.byTutorId[tid].push(id);
        }
    });
}

// ---------- Slice ----------
const petsSlice = createSlice({
    name: 'pets',
    initialState,
    reducers: {
        // opcional: para resets/seed etc.
        resetPetsState: () => initialState,
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
                state.byId = {};
                state.allIds = [];
                state.byTutorId = {};
                upsertMany(state, action.payload);
            })
            .addCase(fetchAllPets.rejected, (state, action) => {
                state.statusAll = 'failed';
                state.error = action.error?.message ?? 'Erro ao carregar pets';
            })

            // ---- fetchPetsByTutor ----
            .addCase(fetchPetsByTutor.pending, (state, action) => {
                const tutorId = action.meta.arg.tutorId;
                state.loadingByTutor[tutorId] = 'loading';
            })
            .addCase(fetchPetsByTutor.fulfilled, (state, action) => {
                const { tutorId, rows } = action.payload; // <- veio como rows
                state.byTutorId[tutorId] = [];
                upsertMany(state, rows);
                state.byTutorId[tutorId] = rows.map((p) => p.id);
                state.loadingByTutor[tutorId] = 'succeeded';
            })
            .addCase(fetchPetsByTutor.rejected, (state, action) => {
                const tutorId = action.meta.arg.tutorId;
                state.loadingByTutor[tutorId] = 'failed';
            })

            // ---- fetchPet ----
            .addCase(fetchPet.fulfilled, (state, action) => {
                const p = action.payload;
                state.byId[p.id] = p;
                if (!state.allIds.includes(p.id)) state.allIds.push(p.id);
                const tid = p.tutor?.id;
                if (tid) {
                    state.byTutorId[tid] = state.byTutorId[tid] || [];
                    if (!state.byTutorId[tid].includes(p.id)) state.byTutorId[tid].push(p.id);
                }
            })

            // ---- addPet ----
            .addCase(addPet.fulfilled, (state, action) => {
                const p = action.payload;
                state.byId[p.id] = p;
                if (!state.allIds.includes(p.id)) state.allIds.push(p.id);
                const tid = p.tutor?.id;
                if (tid) {
                    state.byTutorId[tid] = state.byTutorId[tid] || [];
                    if (!state.byTutorId[tid].includes(p.id)) state.byTutorId[tid].push(p.id);
                }
            })

            // ---- patchPet ----
            .addCase(patchPet.fulfilled, (state, action) => {
                const p = action.payload;
                const prev = state.byId[p.id];
                state.byId[p.id] = p;

                // se trocou de tutor, reindexa
                if (prev?.tutor?.id !== p.tutor?.id) {
                    rebuildByTutorIndex(state);
                } else {
                    // mantém índice atual
                    const tid = p.tutor?.id;
                    if (tid) {
                        state.byTutorId[tid] = state.byTutorId[tid] || [];
                        if (!state.byTutorId[tid].includes(p.id)) state.byTutorId[tid].push(p.id);
                    }
                }
            })

            // ---- deletePet ----
            .addCase(deletePet.fulfilled, (state, action) => {
                const id = action.payload;
                const pet = state.byId[id];
                delete state.byId[id];
                state.allIds = state.allIds.filter((x) => x !== id);
                const tid = pet?.tutor?.id;
                if (tid && state.byTutorId[tid]) {
                    state.byTutorId[tid] = state.byTutorId[tid].filter((x) => x !== id);
                    if (state.byTutorId[tid].length === 0) delete state.byTutorId[tid];
                }
            });
    },
});

export const { resetPetsState } = petsSlice.actions;
export default petsSlice.reducer;

// ---------- Selectors ----------
export const selectPetsState = (s) => s.pets;
export const selectTutoresState = (s) => s.tutores; // ✅ novo

export const selectAllPets = createSelector(
    selectPetsState,
    (pets) => pets.allIds.map((id) => pets.byId[id])
);

export const selectPetById = (id) =>
    createSelector(selectPetsState, (pets) => pets.byId[id]);

export const selectPetsByTutorId = (tutorId) =>
    createSelector(selectPetsState, (pets) => {
        const ids = pets.byTutorId[tutorId] || [];
        return ids.map((id) => pets.byId[id]);
    });

export const selectLoadingPetsByTutor = (tutorId) =>
    createSelector(selectPetsState, (pets) => pets.loadingByTutor[tutorId] === 'loading');

export const selectAllPetsStatus = createSelector(
    selectPetsState,
    (pets) => pets.statusAll
);

export const selectPetByIdJoined = (id) =>
    createSelector([selectPetsState, selectTutoresState], (pets, tutores) => {
        const p = pets.byId[id];
        if (!p) return undefined;
        const t = tutores.byId[p.tutor?.id];
        return {
            ...p,
            tutor: { id: p.tutor?.id, nome: t?.nome }, // ✅ injeta nome ao voar
        };
    });

export const selectAllPetsJoined = createSelector(
    [selectPetsState, selectTutoresState],
    (pets, tutores) =>
        pets.allIds.map((id) => {
            const p = pets.byId[id];
            const t = tutores.byId[p.tutor?.id];
            return { ...p, tutor: { id: p.tutor?.id, nome: t?.nome } };
        })
);

export const selectPetsByTutorIdJoined = (tutorId) =>
    createSelector([selectPetsState, selectTutoresState], (pets, tutores) => {
        const ids = pets.byTutorId[tutorId] || [];
        return ids.map((id) => {
            const p = pets.byId[id];
            const t = tutores.byId[p.tutor?.id];
            return { ...p, tutor: { id: p.tutor?.id, nome: t?.nome } };
        });
    });