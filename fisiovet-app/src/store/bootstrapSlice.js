// store/bootstrapSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Thunks reais do app
import { fetchTutores } from './slices/tutoresSlice';
import { fetchAllPets } from './slices/petsSlice';
import { loadAgenda } from './slices/agendaSlice';

/**
 * Roda cargas iniciais em paralelo logo após o login.
 * - Mantém falhas isoladas (allSettled) para não bloquear as demais.
 * - Retorna um resumo { ok, fail } apenas para telemetria/log.
 */
export const postLoginBootstrap = createAsyncThunk(
    'bootstrap/postLogin',
    async ({ uid, clinicId }, { dispatch, rejectWithValue }) => {
        try {
            const results = await Promise.allSettled([
                // Se precisar filtrar por uid/clinicId, passe como arg para os thunks/serviços
                dispatch(fetchTutores()).unwrap(),
                dispatch(fetchAllPets()).unwrap(),
                dispatch(loadAgenda()).unwrap(),
            ]);

            const summary = results.reduce(
                (acc, r) => {
                    if (r.status === 'fulfilled') acc.ok += 1;
                    else acc.fail += 1;
                    return acc;
                },
                { ok: 0, fail: 0 }
            );

            return summary;
        } catch (e) {
            return rejectWithValue(e?.message || 'Falha no bootstrap');
        }
    }
);

const initialState = {
    loading: false,
    hydratedUserId: null, // uid do último usuário “hidratado”
    error: null,
    done: false,          // true quando o bootstrap terminou (com sucesso ou com falha parcial)
};

const bootstrapSlice = createSlice({
    name: 'bootstrap',
    initialState,
    reducers: {
        resetBootstrap(state) {
            state.loading = false;
            state.hydratedUserId = null;
            state.error = null;
            state.done = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(postLoginBootstrap.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.done = false;
                // ainda não sabemos o uid com sucesso, então não setamos hydratedUserId aqui
            })
            .addCase(postLoginBootstrap.fulfilled, (state, action) => {
                state.loading = false;
                state.done = true;
                // pega o uid passado ao thunk (action.meta.arg.uid)
                state.hydratedUserId = action?.meta?.arg?.uid ?? null;
                // opcional: você pode armazenar o summary se quiser (action.payload)
                // state.summary = action.payload;
            })
            .addCase(postLoginBootstrap.rejected, (state, action) => {
                state.loading = false;
                state.done = true;
                state.error = action.payload || action.error?.message || 'Bootstrap falhou';
                // mantém hydratedUserId como estava (provavelmente null) em caso de erro total
            });
    },
});

export const { resetBootstrap } = bootstrapSlice.actions;
export default bootstrapSlice.reducer;

// ---------------- Selectors ----------------
export const selectBootstrapLoading = (state) => state.bootstrap.loading;
export const selectBootstrapDone = (state) => state.bootstrap.done;
export const selectBootstrapError = (state) => state.bootstrap.error;
export const selectBootstrapHydratedUserId = (state) => state.bootstrap.hydratedUserId;