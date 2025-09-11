import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import {
    listTutores,
    getTutorById,
    createTutor,
    updateTutor as svcUpdateTutor,
    removeTutor,
} from '@/src/services/tutores';

// THUNKS
export const fetchTutores = createAsyncThunk('tutores/fetchAll', async () => {
    return await listTutores();
});

export const fetchTutor = createAsyncThunk('tutores/fetchOne', async (id) => {
    return await getTutorById(id);
});

export const addTutor = createAsyncThunk('tutores/add', async (payload) => {
    // payload: { nome, telefone, email, endereco, geo? }
    return await createTutor(payload);
});

export const updateTutor = createAsyncThunk(
    'tutores/update',
    async ({ id, patch }) => {
        // patch: campos que deseja atualizar (ex: { nome, telefone, email, endereco, geo })
        return await svcUpdateTutor(id, patch);
    }
);

export const deleteTutor = createAsyncThunk('tutores/delete', async (id) => {
    await removeTutor(id);
    return id;
});

// SLICE
const initialState = {
    items: [],     // lista para render rápido
    byId: {},      // cache por id
    loading: false,
    error: null,
};

const tutoresSlice = createSlice({
    name: 'tutores',
    initialState,
    reducers: {
        // espaço para reducers síncronos se precisar
    },
    extraReducers: (builder) => {
        builder
            // LIST
            .addCase(fetchTutores.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTutores.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
                state.byId = Object.fromEntries(action.payload.map((t) => [t.id, t]));
            })
            .addCase(fetchTutores.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error?.message || 'Erro ao listar tutores';
            })

            // GET ONE (cacheia no byId e garante presença na lista)
            .addCase(fetchTutor.fulfilled, (state, action) => {
                const t = action.payload;
                state.byId[t.id] = t;
                if (!state.items.find((x) => x.id === t.id)) {
                    state.items.push(t);
                    state.items.sort((a, b) => a.nome.localeCompare(b.nome));
                }
            })

            // CREATE
            .addCase(addTutor.pending, (state) => {
                state.error = null;
            })
            .addCase(addTutor.fulfilled, (state, action) => {
                const t = action.payload;
                state.items.push(t);
                state.items.sort((a, b) => a.nome.localeCompare(b.nome));
                state.byId[t.id] = t;
            })
            .addCase(addTutor.rejected, (state, action) => {
                state.error = action.error?.message || 'Erro ao criar tutor';
            })

            // UPDATE
            .addCase(updateTutor.pending, (state) => {
                state.error = null;
            })
            .addCase(updateTutor.fulfilled, (state, action) => {
                const t = action.payload; // tutor atualizado
                state.byId[t.id] = t;
                state.items = state.items.map((x) => (x.id === t.id ? t : x));
                state.items.sort((a, b) => a.nome.localeCompare(b.nome));
            })
            .addCase(updateTutor.rejected, (state, action) => {
                state.error = action.error?.message || 'Erro ao atualizar tutor';
            })

            // DELETE
            .addCase(deleteTutor.fulfilled, (state, action) => {
                const id = action.payload;
                delete state.byId[id];
                state.items = state.items.filter((x) => x.id !== id);
            });
    },
});

export default tutoresSlice.reducer;

// SELECTORS
export const selectTutores = (state) => state.tutores.items;
export const selectTutorById = (state, id) => state.tutores.byId[id];

// Exemplo de selector memoizado (por nome)
export const makeSelectTutoresByQuery = () =>
    createSelector(
        [(state) => state.tutores.items, (_, q) => (q || '').toLowerCase()],
        (items, q) =>
            q
                ? items.filter((t) =>
                    `${t.nome} ${t.telefone} ${t.email}`.toLowerCase().includes(q)
                )
                : items
    );
