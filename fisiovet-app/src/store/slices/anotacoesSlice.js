// src/store/slices/anotacoesSlice.js
// @ts-nocheck

import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";

import {
  createAnotacao as serviceCreateAnotacao,
  listAnotacoesByPet,
  removeAnotacao,
  updateAnotacao as serviceUpdateAnotacao,
} from "@/src/services/anotacoes";

const initialState = {
  byId: {},
  allIds: [],
  byPetId: {},
  loadingByPet: {},
  saving: false,
  error: null,
};

function toStringId(value) {
  return value == null
    ? null
    : String(value);
}

function annotationTime(item) {
  const value =
    item?.updatedAt ||
    item?.createdAt;

  if (!value) return 0;

  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed)
    ? 0
    : parsed;
}

function sortIdsByNewest(state, ids) {
  ids.sort((a, b) => {
    const aItem = state.byId[String(a)];
    const bItem = state.byId[String(b)];

    return (
      annotationTime(bItem) -
      annotationTime(aItem)
    );
  });
}

function removeFromPetIndex(
  state,
  annotationId,
  petId,
) {
  const safePetId = toStringId(petId);

  if (!safePetId) return;

  const ids =
    state.byPetId[safePetId];

  if (!Array.isArray(ids)) return;

  state.byPetId[safePetId] = ids.filter(
    (id) =>
      String(id) !== String(annotationId)
  );

  if (
    state.byPetId[safePetId].length === 0
  ) {
    delete state.byPetId[safePetId];
  }
}

function addToPetIndex(
  state,
  annotationId,
  petId,
) {
  const safePetId = toStringId(petId);

  if (!safePetId) return;

  if (
    !Array.isArray(
      state.byPetId[safePetId]
    )
  ) {
    state.byPetId[safePetId] = [];
  }

  const safeAnnotationId =
    String(annotationId);

  if (
    !state.byPetId[safePetId].includes(
      safeAnnotationId
    )
  ) {
    state.byPetId[safePetId].push(
      safeAnnotationId
    );
  }

  sortIdsByNewest(
    state,
    state.byPetId[safePetId],
  );
}

function upsertOne(state, annotation) {
  if (!annotation?.id) return;

  const id = String(annotation.id);
  const previous = state.byId[id];

  const next = {
    ...(previous || {}),
    ...annotation,
    id,
    petId:
      annotation.petId != null
        ? String(annotation.petId)
        : previous?.petId ?? null,
    tutorId:
      annotation.tutorId != null
        ? String(annotation.tutorId)
        : annotation.tutorId === null
          ? null
          : previous?.tutorId ?? null,
  };

  state.byId[id] = next;

  if (!state.allIds.includes(id)) {
    state.allIds.push(id);
  }

  const previousPetId =
    previous?.petId != null
      ? String(previous.petId)
      : null;

  const nextPetId =
    next?.petId != null
      ? String(next.petId)
      : null;

  if (
    previousPetId &&
    previousPetId !== nextPetId
  ) {
    removeFromPetIndex(
      state,
      id,
      previousPetId,
    );
  }

  if (nextPetId) {
    addToPetIndex(
      state,
      id,
      nextPetId,
    );
  }

  sortIdsByNewest(
    state,
    state.allIds,
  );
}

function replacePetAnnotations(
  state,
  petId,
  rows,
) {
  const safePetId = String(petId);

  const oldIds =
    state.byPetId[safePetId] || [];

  for (const oldId of oldIds) {
    const existing =
      state.byId[String(oldId)];

    /*
     * Remove apenas itens realmente vinculados a este pet.
     * Isso evita apagar dados de outro índice.
     */
    if (
      String(existing?.petId) ===
      safePetId
    ) {
      delete state.byId[String(oldId)];

      state.allIds =
        state.allIds.filter(
          (id) =>
            String(id) !==
            String(oldId)
        );
    }
  }

  state.byPetId[safePetId] = [];

  for (const row of rows || []) {
    upsertOne(state, row);
  }

  sortIdsByNewest(
    state,
    state.byPetId[safePetId],
  );
}

export const fetchAnotacoesByPet =
  createAsyncThunk(
    "anotacoes/fetchByPet",
    async (petId) => {
      const safePetId = String(
        petId || ""
      ).trim();

      const rows =
        await listAnotacoesByPet(
          safePetId
        );

      return {
        petId: safePetId,
        rows: Array.isArray(rows)
          ? rows
          : [],
      };
    },
  );

export const addAnotacao =
  createAsyncThunk(
    "anotacoes/add",
    async (payload) => {
      return await serviceCreateAnotacao(
        payload
      );
    },
  );

export const updateAnotacao =
  createAsyncThunk(
    "anotacoes/update",
    async ({
      id,
      patch,
    }) => {
      const result =
        await serviceUpdateAnotacao(
          id,
          patch
        );

      return result;
    },
  );

export const deleteAnotacao =
  createAsyncThunk(
    "anotacoes/delete",
    async (id) => {
      return await removeAnotacao(id);
    },
  );

const anotacoesSlice = createSlice({
  name: "anotacoes",
  initialState,

  reducers: {
    resetAnotacoesState: () =>
      initialState,

    clearAnotacoesError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(
        fetchAnotacoesByPet.pending,
        (state, action) => {
          const petId = String(
            action.meta.arg
          );

          state.loadingByPet[petId] =
            "loading";

          state.error = null;
        },
      )

      .addCase(
        fetchAnotacoesByPet.fulfilled,
        (state, action) => {
          const {
            petId,
            rows,
          } = action.payload;

          replacePetAnnotations(
            state,
            petId,
            rows,
          );

          state.loadingByPet[petId] =
            "succeeded";
        },
      )

      .addCase(
        fetchAnotacoesByPet.rejected,
        (state, action) => {
          const petId = String(
            action.meta.arg
          );

          state.loadingByPet[petId] =
            "failed";

          state.error =
            action.error?.message ||
            "Erro ao carregar anotações.";
        },
      )

      .addCase(
        addAnotacao.pending,
        (state) => {
          state.saving = true;
          state.error = null;
        },
      )

      .addCase(
        addAnotacao.fulfilled,
        (state, action) => {
          state.saving = false;
          upsertOne(
            state,
            action.payload,
          );
        },
      )

      .addCase(
        addAnotacao.rejected,
        (state, action) => {
          state.saving = false;

          state.error =
            action.error?.message ||
            "Erro ao salvar anotação.";
        },
      )

      .addCase(
        updateAnotacao.pending,
        (state) => {
          state.saving = true;
          state.error = null;
        },
      )

      .addCase(
        updateAnotacao.fulfilled,
        (state, action) => {
          state.saving = false;

          const {
            id,
            patch,
          } = action.payload || {};

          const current =
            state.byId[String(id)];

          if (!current) return;

          upsertOne(state, {
            ...current,
            ...patch,
            id: String(id),
          });
        },
      )

      .addCase(
        updateAnotacao.rejected,
        (state, action) => {
          state.saving = false;

          state.error =
            action.error?.message ||
            "Erro ao atualizar anotação.";
        },
      )

      .addCase(
        deleteAnotacao.fulfilled,
        (state, action) => {
          const id = String(
            action.payload
          );

          const current =
            state.byId[id];

          if (current?.petId) {
            removeFromPetIndex(
              state,
              id,
              current.petId,
            );
          }

          delete state.byId[id];

          state.allIds =
            state.allIds.filter(
              (currentId) =>
                String(currentId) !== id
            );
        },
      )

      .addCase(
        deleteAnotacao.rejected,
        (state, action) => {
          state.error =
            action.error?.message ||
            "Erro ao excluir anotação.";
        },
      );
  },
});

export const {
  resetAnotacoesState,
  clearAnotacoesError,
} = anotacoesSlice.actions;

export default anotacoesSlice.reducer;

export const selectAnotacoesState =
  (state) =>
    state.anotacoes ||
    initialState;

export const selectAllAnotacoes =
  createSelector(
    selectAnotacoesState,
    (anotacoes) =>
      anotacoes.allIds
        .map(
          (id) =>
            anotacoes.byId[id]
        )
        .filter(Boolean),
  );

export const selectAnotacaoById =
  (id) =>
    createSelector(
      selectAnotacoesState,
      (anotacoes) =>
        anotacoes.byId?.[
          String(id)
        ],
    );

export const makeSelectAnotacoesByPet =
  (petId) =>
    createSelector(
      selectAnotacoesState,
      (anotacoes) => {
        const safePetId =
          String(petId);

        const ids =
          anotacoes.byPetId?.[
            safePetId
          ] || [];

        return ids
          .map(
            (id) =>
              anotacoes.byId?.[
                String(id)
              ]
          )
          .filter(Boolean);
      },
    );

export const selectAnotacoesLoadingByPet =
  (petId) =>
    createSelector(
      selectAnotacoesState,
      (anotacoes) =>
        anotacoes.loadingByPet?.[
          String(petId)
        ] || "idle",
    );

export const selectAnotacoesSaving =
  createSelector(
    selectAnotacoesState,
    (anotacoes) =>
      Boolean(anotacoes.saving),
  );

export const selectAnotacoesError =
  createSelector(
    selectAnotacoesState,
    (anotacoes) =>
      anotacoes.error,
  );
