import {
    createSlice,
    createAsyncThunk,
    createSelector,
} from '@reduxjs/toolkit';

import {
    listTutores,
    getTutorById,
    createTutor,
    updateTutor as svcUpdateTutor,
    removeTutor,
} from '@/src/services/tutores';

/* ---------- Helpers ---------- */

function deepCleanUndefined(value) {
    if (value === undefined) return undefined;

    // Mantém null como null.
    if (value === null) return null;

    if (Array.isArray(value)) {
        return value
            .map(deepCleanUndefined)
            .filter((item) => item !== undefined);
    }

    if (typeof value === 'object') {
        const output = {};

        for (const [key, currentValue] of Object.entries(value)) {
            const cleaned = deepCleanUndefined(currentValue);

            if (cleaned !== undefined) {
                output[key] = cleaned;
            }
        }

        return output;
    }

    return value;
}

function compareTutorNames(a, b) {
    const nomeA = String(a?.nome ?? '').trim();
    const nomeB = String(b?.nome ?? '').trim();

    return nomeA.localeCompare(nomeB, 'pt-BR', {
        sensitivity: 'base',
    });
}

function sortTutores(items) {
    if (!Array.isArray(items)) return [];

    items.sort(compareTutorNames);

    return items;
}

function mergeTutor(currentTutor, patch) {
    const current = currentTutor ?? {};
    const incoming = patch ?? {};

    return {
        ...current,
        ...incoming,

        endereco: incoming.endereco
            ? {
                  ...(current.endereco ?? {}),
                  ...incoming.endereco,
              }
            : current.endereco,

        geo: incoming.geo
            ? {
                  ...(current.geo ?? {}),
                  ...incoming.geo,
              }
            : current.geo,
    };
}

function normalizeTutorList(payload) {
    if (!Array.isArray(payload)) return [];

    return payload.filter(
        (tutor) => tutor && tutor.id !== undefined && tutor.id !== null
    );
}

/* ---------- Thunks ---------- */

export const fetchTutores = createAsyncThunk(
    'tutores/fetchAll',
    async () => {
        return await listTutores();
    }
);

export const fetchTutor = createAsyncThunk(
    'tutores/fetchOne',
    async (id) => {
        return await getTutorById(id);
    }
);

export const addTutor = createAsyncThunk(
    'tutores/add',
    async (payload) => {
        const cleanedPayload = deepCleanUndefined(payload);

        return await createTutor(cleanedPayload);
    }
);

export const updateTutor = createAsyncThunk(
    'tutores/update',
    async ({ id, patch }, { rejectWithValue }) => {
        try {
            if (id === undefined || id === null || id === '') {
                throw new Error('ID do tutor não informado.');
            }

            const cleanedPatch = deepCleanUndefined(patch ?? {});

            const serviceResult = await svcUpdateTutor(
                id,
                cleanedPatch
            );

            /*
             * O serviço pode retornar:
             * - tutor completo;
             * - somente os campos alterados;
             * - undefined.
             *
             * Por isso devolvemos também o id e o patch original.
             */
            return {
                id,
                patch: cleanedPatch,
                serviceResult: serviceResult ?? null,
            };
        } catch (error) {
            return rejectWithValue(
                error?.message || 'Erro ao atualizar tutor.'
            );
        }
    }
);

export const deleteTutor = createAsyncThunk(
    'tutores/delete',
    async (id) => {
        await removeTutor(id);

        return id;
    }
);

/* ---------- Slice ---------- */

const initialState = {
    items: [],
    byId: {},
    loading: false,
    error: null,
};

const tutoresSlice = createSlice({
    name: 'tutores',
    initialState,

    reducers: {},

    extraReducers: (builder) => {
        builder

            /* ---------- LIST ---------- */

            .addCase(fetchTutores.pending, (state) => {
                state.loading = true;
                state.error = null;
            })

            .addCase(fetchTutores.fulfilled, (state, action) => {
                state.loading = false;

                const tutores = normalizeTutorList(action.payload);

                state.items = sortTutores(tutores);

                state.byId = Object.fromEntries(
                    tutores.map((tutor) => [
                        String(tutor.id),
                        tutor,
                    ])
                );
            })

            .addCase(fetchTutores.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    action.payload ||
                    action.error?.message ||
                    'Erro ao listar tutores';
            })

            /* ---------- GET ONE ---------- */

            .addCase(fetchTutor.fulfilled, (state, action) => {
                const tutor = action.payload;

                if (!tutor?.id) return;

                const tutorId = String(tutor.id);
                const currentTutor = state.byId[tutorId];

                const mergedTutor = mergeTutor(
                    currentTutor,
                    tutor
                );

                state.byId[tutorId] = mergedTutor;

                const index = state.items.findIndex(
                    (item) =>
                        String(item?.id) === tutorId
                );

                if (index >= 0) {
                    state.items[index] = mergeTutor(
                        state.items[index],
                        tutor
                    );
                } else {
                    state.items.push(mergedTutor);
                }

                sortTutores(state.items);
            })

            /* ---------- CREATE ---------- */

            .addCase(addTutor.pending, (state) => {
                state.error = null;
            })

            .addCase(addTutor.fulfilled, (state, action) => {
                const tutor = action.payload;

                if (!tutor?.id) {
                    state.error =
                        'O tutor foi criado, mas o retorno não contém um ID.';
                    return;
                }

                const tutorId = String(tutor.id);

                state.byId[tutorId] = tutor;

                const existingIndex = state.items.findIndex(
                    (item) =>
                        String(item?.id) === tutorId
                );

                if (existingIndex >= 0) {
                    state.items[existingIndex] = mergeTutor(
                        state.items[existingIndex],
                        tutor
                    );
                } else {
                    state.items.push(tutor);
                }

                sortTutores(state.items);
            })

            .addCase(addTutor.rejected, (state, action) => {
                state.error =
                    action.payload ||
                    action.error?.message ||
                    'Erro ao criar tutor';
            })

            /* ---------- UPDATE ---------- */

            .addCase(updateTutor.pending, (state) => {
                state.error = null;
            })

            .addCase(updateTutor.fulfilled, (state, action) => {
                const {
                    id,
                    patch = {},
                    serviceResult,
                } = action.payload ?? {};

                if (id === undefined || id === null) {
                    state.error =
                        'Atualização concluída sem identificação do tutor.';
                    return;
                }

                const tutorId = String(id);

                /*
                 * Se o serviço retornou um objeto, ele pode ser completo
                 * ou parcial. Em ambos os casos fazemos merge.
                 */
                const returnedTutor =
                    serviceResult &&
                    typeof serviceResult === 'object'
                        ? serviceResult
                        : {};

                const updateData = {
                    ...patch,
                    ...returnedTutor,
                    id:
                        returnedTutor?.id ??
                        patch?.id ??
                        id,
                };

                const currentById = state.byId[tutorId];

                const itemIndex = state.items.findIndex(
                    (item) =>
                        String(item?.id) === tutorId
                );

                const currentFromItems =
                    itemIndex >= 0
                        ? state.items[itemIndex]
                        : null;

                const currentTutor =
                    currentById ??
                    currentFromItems ?? {
                        id,
                    };

                const updatedTutor = mergeTutor(
                    currentTutor,
                    updateData
                );

                state.byId[tutorId] = updatedTutor;

                if (itemIndex >= 0) {
                    state.items[itemIndex] = mergeTutor(
                        state.items[itemIndex],
                        updateData
                    );
                } else {
                    state.items.push(updatedTutor);
                }

                sortTutores(state.items);
            })

            .addCase(updateTutor.rejected, (state, action) => {
                state.error =
                    action.payload ||
                    action.error?.message ||
                    'Erro ao atualizar tutor';
            })

            /* ---------- DELETE ---------- */

            .addCase(deleteTutor.fulfilled, (state, action) => {
                const id = action.payload;
                const tutorId = String(id);

                delete state.byId[tutorId];

                state.items = state.items.filter(
                    (item) =>
                        String(item?.id) !== tutorId
                );
            });
    },
});

export default tutoresSlice.reducer;

/* ---------- Selectors ---------- */

export const selectTutores = (state) =>
    state.tutores?.items ?? [];

export const selectTutorById = (state, id) =>
    state.tutores?.byId?.[String(id)];

export const makeSelectTutoresByQuery = () =>
    createSelector(
        [
            (state) => state.tutores?.items ?? [],
            (_, query) =>
                String(query ?? '')
                    .trim()
                    .toLowerCase(),
        ],
        (items, query) => {
            if (!query) return items;

            return items.filter((tutor) => {
                const searchableText = [
                    tutor?.nome,
                    tutor?.telefone,
                    tutor?.email,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return searchableText.includes(query);
            });
        }
    );