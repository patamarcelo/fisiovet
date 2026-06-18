// src/store/slices/avaliacaoSlice.js
// @ts-nocheck

import {
  createAsyncThunk,
  createSelector,
  createSlice,
  nanoid,
} from "@reduxjs/toolkit";

import {
  listAvaliacoesLocal,
  listAvaliacoesRemote,
  upsertLocalAvaliacao,
  removeLocalAvaliacao,
} from "@/src/services/avaliacoes";

function makeDefaultDraft(
  petId,
  tipo = null
) {
  const now = Date.now();

  return {
    id: nanoid(),
    petId: String(petId),
    createdAt: now,
    title: "",
    type: tipo,
    fields: {},
  };
}

function createPetBucket() {
  return {
    byId: {},
    allIds: [],
    status: "idle",
    refreshing: false,
    error: null,
    lastLoadedAt: null,
  };
}

function ensureRootShape(state) {
  if (
    !state.draftsByPet ||
    typeof state.draftsByPet !== "object" ||
    Array.isArray(state.draftsByPet)
  ) {
    state.draftsByPet = {};
  }

  if (
    !state.byPetId ||
    typeof state.byPetId !== "object" ||
    Array.isArray(state.byPetId)
  ) {
    state.byPetId = {};
  }
}

function ensurePetBucket(
  state,
  petId
) {
  ensureRootShape(state);

  const safePetId =
    String(petId);

  if (
    !state.byPetId[safePetId] ||
    typeof state.byPetId[safePetId] !== "object"
  ) {
    state.byPetId[safePetId] =
      createPetBucket();
  }

  const bucket =
    state.byPetId[safePetId];

  if (
    !bucket.byId ||
    typeof bucket.byId !== "object" ||
    Array.isArray(bucket.byId)
  ) {
    bucket.byId = {};
  }

  if (!Array.isArray(bucket.allIds)) {
    bucket.allIds = [];
  }

  if (!bucket.status) {
    bucket.status = "idle";
  }

  if (typeof bucket.refreshing !== "boolean") {
    bucket.refreshing = false;
  }

  if (!("error" in bucket)) {
    bucket.error = null;
  }

  if (!("lastLoadedAt" in bucket)) {
    bucket.lastLoadedAt = null;
  }

  return bucket;
}

function normalizeAvaliacao(
  avaliacao,
  petId
) {
  if (!avaliacao) {
    return null;
  }

  const id =
    avaliacao?.id != null
      ? String(avaliacao.id)
      : null;

  if (!id) {
    return null;
  }

  return {
    ...avaliacao,
    id,
    petId:
      avaliacao?.petId != null
        ? String(avaliacao.petId)
        : String(petId),
  };
}

function sortBucket(
  bucket
) {
  bucket.allIds.sort(
    (a, b) => {
      const timeA =
        new Date(
          bucket.byId[a]?.createdAt ||
          bucket.byId[a]?.updatedAt ||
          0
        ).getTime();

      const timeB =
        new Date(
          bucket.byId[b]?.createdAt ||
          bucket.byId[b]?.updatedAt ||
          0
        ).getTime();

      return (
        (
          Number.isFinite(timeB)
            ? timeB
            : 0
        ) -
        (
          Number.isFinite(timeA)
            ? timeA
            : 0
        )
      );
    }
  );
}

function replaceBucketRows(
  bucket,
  rows,
  petId,
  {
    preserveWhenEmpty = true,
  } = {}
) {
  const safeRows =
    Array.isArray(rows)
      ? rows
        .map((item) =>
          normalizeAvaliacao(
            item,
            petId
          )
        )
        .filter(Boolean)
      : [];

  if (
    preserveWhenEmpty &&
    safeRows.length === 0 &&
    bucket.allIds.length > 0
  ) {
    return;
  }

  bucket.byId = {};
  bucket.allIds = [];

  for (
    const avaliacao
    of safeRows
  ) {
    bucket.byId[avaliacao.id] =
      avaliacao;

    bucket.allIds.push(
      avaliacao.id
    );
  }

  sortBucket(bucket);
}

const initialState = {
  draftsByPet: {},
  byPetId: {},
};

export const hydrateAvaliacoesLocal =
  createAsyncThunk(
    "avaliacoes/hydrateLocal",
    async (
      {
        petId,
      }
    ) => {
      const safePetId =
        String(petId);

      const rows =
        await listAvaliacoesLocal(
          safePetId
        );

      return {
        petId:
          safePetId,

        rows:
          Array.isArray(rows)
            ? rows
            : [],
      };
    }
  );

export const refreshAvaliacoesRemote =
  createAsyncThunk(
    "avaliacoes/refreshRemote",
    async (
      {
        petId,
      }
    ) => {
      const safePetId =
        String(petId);

      const rows =
        await listAvaliacoesRemote(
          safePetId
        );

      return {
        petId:
          safePetId,

        rows:
          Array.isArray(rows)
            ? rows
            : [],
      };
    }
  );

export const loadAvaliacoes =
  createAsyncThunk(
    "avaliacoes/load",
    async (
      {
        petId,
      },
      {
        dispatch,
      }
    ) => {
      const safePetId =
        String(petId);

      await dispatch(
        hydrateAvaliacoesLocal({
          petId:
            safePetId,
        })
      ).unwrap();

      void dispatch(
        refreshAvaliacoesRemote({
          petId:
            safePetId,
        })
      );

      return {
        petId:
          safePetId,
      };
    }
  );

export const cacheAvaliacao =
  createAsyncThunk(
    "avaliacoes/cacheOne",
    async (
      {
        petId,
        avaliacao,
      }
    ) => {
      const safePetId =
        String(petId);

      const saved =
        await upsertLocalAvaliacao(
          safePetId,
          avaliacao
        );

      return {
        petId:
          safePetId,

        avaliacao:
          saved,
      };
    }
  );

export const uncacheAvaliacao =
  createAsyncThunk(
    "avaliacoes/uncacheOne",
    async (
      {
        petId,
        avaliacaoId,
      }
    ) => {
      const safePetId =
        String(petId);

      const removedId =
        await removeLocalAvaliacao(
          safePetId,
          avaliacaoId
        );

      return {
        petId:
          safePetId,

        avaliacaoId:
          String(removedId),
      };
    }
  );

const avaliacoesSlice =
  createSlice({
    name: "avaliacoes",

    initialState,

    reducers: {
      createDraft(
        state,
        action
      ) {
        ensureRootShape(state);

        const {
          petId,
          tipo = null,
        } =
          action.payload || {};

        if (!petId) {
          return;
        }

        state.draftsByPet[
          String(petId)
        ] =
          makeDefaultDraft(
            petId,
            tipo
          );
      },

      updateDraftField(
        state,
        action
      ) {
        ensureRootShape(state);

        const {
          petId,
          path,
          value,
        } =
          action.payload || {};

        const draft =
          state.draftsByPet[
          String(petId)
          ];

        if (!draft) {
          return;
        }

        if (
          !Array.isArray(path) ||
          path.length === 0
        ) {
          return;
        }

        let ref = draft;

        for (
          let index = 0;
          index <
          path.length - 1;
          index += 1
        ) {
          const key =
            path[index];

          if (
            ref[key] === undefined ||
            ref[key] === null ||
            typeof ref[key] !==
            "object"
          ) {
            ref[key] = {};
          }

          ref = ref[key];
        }

        ref[
          path[
          path.length - 1
          ]
        ] = value;
      },

      clearDraft(
        state,
        action
      ) {
        ensureRootShape(state);

        const {
          petId,
        } =
          action.payload || {};

        if (!petId) {
          return;
        }

        delete state.draftsByPet[
          String(petId)
        ];
      },

      replaceDraft(
        state,
        action
      ) {
        ensureRootShape(state);

        const {
          petId,
          draft,
        } =
          action.payload || {};

        if (!petId) {
          return;
        }

        state.draftsByPet[
          String(petId)
        ] = draft;
      },

      upsertAvaliacaoState(
        state,
        action
      ) {
        const {
          petId,
          avaliacao,
        } =
          action.payload || {};

        if (
          !petId ||
          !avaliacao?.id
        ) {
          return;
        }

        const bucket =
          ensurePetBucket(
            state,
            petId
          );

        const safe =
          normalizeAvaliacao(
            avaliacao,
            petId
          );

        bucket.byId[
          safe.id
        ] = {
          ...(bucket.byId[
            safe.id
          ] || {}),
          ...safe,
        };

        if (
          !bucket.allIds.includes(
            safe.id
          )
        ) {
          bucket.allIds.push(
            safe.id
          );
        }

        sortBucket(bucket);
      },

      removeAvaliacaoState(
        state,
        action
      ) {
        const {
          petId,
          avaliacaoId,
        } =
          action.payload || {};

        if (
          !petId ||
          !avaliacaoId
        ) {
          return;
        }

        const bucket =
          ensurePetBucket(
            state,
            petId
          );

        const safeId =
          String(
            avaliacaoId
          );

        delete bucket.byId[
          safeId
        ];

        bucket.allIds =
          bucket.allIds.filter(
            (id) =>
              id !== safeId
          );
      },

      resetAvaliacoesPet(
        state,
        action
      ) {
        ensureRootShape(state);

        const {
          petId,
        } =
          action.payload || {};

        if (!petId) {
          return;
        }

        delete state.byPetId[
          String(petId)
        ];
      },
    },

    extraReducers:
      (builder) => {
        builder
          .addCase(
            hydrateAvaliacoesLocal.pending,
            (
              state,
              action
            ) => {
              const petId =
                String(
                  action.meta.arg
                    ?.petId
                );

              const bucket =
                ensurePetBucket(
                  state,
                  petId
                );

              bucket.status =
                "loading";

              bucket.error =
                null;
            }
          )

          .addCase(
            hydrateAvaliacoesLocal.fulfilled,
            (
              state,
              action
            ) => {
              const {
                petId,
                rows,
              } =
                action.payload;

              const bucket =
                ensurePetBucket(
                  state,
                  petId
                );

              replaceBucketRows(
                bucket,
                rows,
                petId,
                {
                  preserveWhenEmpty:
                    true,
                }
              );

              bucket.status =
                "succeeded";

              bucket.error =
                null;
            }
          )

          .addCase(
            hydrateAvaliacoesLocal.rejected,
            (
              state,
              action
            ) => {
              const petId =
                String(
                  action.meta.arg
                    ?.petId
                );

              const bucket =
                ensurePetBucket(
                  state,
                  petId
                );

              bucket.status =
                "failed";

              bucket.error =
                action.error
                  ?.message ||
                "Erro ao carregar avaliações locais";
            }
          )

          .addCase(
            refreshAvaliacoesRemote.pending,
            (
              state,
              action
            ) => {
              const petId =
                String(
                  action.meta.arg
                    ?.petId
                );

              const bucket =
                ensurePetBucket(
                  state,
                  petId
                );

              bucket.refreshing =
                true;
            }
          )

          .addCase(
            refreshAvaliacoesRemote.fulfilled,
            (
              state,
              action
            ) => {
              const {
                petId,
                rows,
              } =
                action.payload;

              const bucket =
                ensurePetBucket(
                  state,
                  petId
                );

              replaceBucketRows(
                bucket,
                rows,
                petId,
                {
                  preserveWhenEmpty:
                    true,
                }
              );

              bucket.status =
                "succeeded";

              bucket.refreshing =
                false;

              bucket.error =
                null;

              bucket.lastLoadedAt =
                new Date()
                  .toISOString();
            }
          )

          .addCase(
            refreshAvaliacoesRemote.rejected,
            (
              state,
              action
            ) => {
              const petId =
                String(
                  action.meta.arg
                    ?.petId
                );

              const bucket =
                ensurePetBucket(
                  state,
                  petId
                );

              bucket.refreshing =
                false;

              bucket.error =
                action.error
                  ?.message ||
                "Não foi possível atualizar as avaliações";
            }
          )

          .addCase(
            cacheAvaliacao.fulfilled,
            (
              state,
              action
            ) => {
              const {
                petId,
                avaliacao,
              } =
                action.payload || {};

              if (!avaliacao?.id) {
                return;
              }

              const bucket =
                ensurePetBucket(
                  state,
                  petId
                );

              const safe =
                normalizeAvaliacao(
                  avaliacao,
                  petId
                );

              bucket.byId[
                safe.id
              ] = {
                ...(bucket.byId[
                  safe.id
                ] || {}),
                ...safe,
              };

              if (
                !bucket.allIds.includes(
                  safe.id
                )
              ) {
                bucket.allIds.push(
                  safe.id
                );
              }

              sortBucket(bucket);
            }
          )

          .addCase(
            uncacheAvaliacao.fulfilled,
            (
              state,
              action
            ) => {
              const {
                petId,
                avaliacaoId,
              } =
                action.payload || {};

              const bucket =
                ensurePetBucket(
                  state,
                  petId
                );

              delete bucket.byId[
                String(
                  avaliacaoId
                )
              ];

              bucket.allIds =
                bucket.allIds.filter(
                  (id) =>
                    id !==
                    String(
                      avaliacaoId
                    )
                );
            }
          );
      },
  });

export const {
  createDraft,
  updateDraftField,
  clearDraft,
  replaceDraft,
  upsertAvaliacaoState,
  removeAvaliacaoState,
  resetAvaliacoesPet,
} =
  avaliacoesSlice.actions;

export default avaliacoesSlice.reducer;

//* ---------------- selectors ---------------- */

const EMPTY_DRAFTS_BY_PET = {};
const EMPTY_BY_PET_ID = {};
const EMPTY_BY_ID = {};
const EMPTY_ALL_IDS = [];

const selectAvaliacoesRoot = (state) =>
  state?.avaliacoes ||
  state?.avaliacao ||
  initialState;

export const selectDraftByPetId =
  (petId) =>
    createSelector(
      [selectAvaliacoesRoot],
      (avaliacoes) => {
        const draftsByPet =
          avaliacoes?.draftsByPet &&
            typeof avaliacoes.draftsByPet === "object" &&
            !Array.isArray(avaliacoes.draftsByPet)
            ? avaliacoes.draftsByPet
            : EMPTY_DRAFTS_BY_PET;

        return (
          draftsByPet[String(petId)] ||
          null
        );
      }
    );

export const selectAvaliacoesBucketByPetId =
  (petId) =>
    createSelector(
      [selectAvaliacoesRoot],
      (avaliacoes) => {
        const byPetId =
          avaliacoes?.byPetId &&
            typeof avaliacoes.byPetId === "object" &&
            !Array.isArray(avaliacoes.byPetId)
            ? avaliacoes.byPetId
            : EMPTY_BY_PET_ID;

        const bucket =
          byPetId[String(petId)];

        if (
          !bucket ||
          typeof bucket !== "object"
        ) {
          return null;
        }

        return bucket;
      }
    );

export const selectAvaliacoesByPetId =
  (petId) =>
    createSelector(
      [selectAvaliacoesBucketByPetId(petId)],
      (bucket) => {
        if (!bucket) {
          return EMPTY_ALL_IDS;
        }

        const byId =
          bucket?.byId &&
            typeof bucket.byId === "object" &&
            !Array.isArray(bucket.byId)
            ? bucket.byId
            : EMPTY_BY_ID;

        const allIds =
          Array.isArray(bucket?.allIds)
            ? bucket.allIds
            : EMPTY_ALL_IDS;

        return allIds
          .map((id) => byId[id])
          .filter(Boolean);
      }
    );

export const selectAvaliacoesStatusByPetId =
  (petId) =>
    createSelector(
      [selectAvaliacoesBucketByPetId(petId)],
      (bucket) =>
        bucket?.status ||
        "idle"
    );

export const selectAvaliacoesRefreshingByPetId =
  (petId) =>
    createSelector(
      [selectAvaliacoesBucketByPetId(petId)],
      (bucket) =>
        Boolean(
          bucket?.refreshing
        )
    );

export const selectAvaliacoesErrorByPetId =
  (petId) =>
    createSelector(
      [selectAvaliacoesBucketByPetId(petId)],
      (bucket) =>
        bucket?.error ||
        null
    );

export const selectAvaliacaoById =
  (
    petId,
    avaliacaoId
  ) =>
    createSelector(
      [
        selectAvaliacoesBucketByPetId(
          petId
        ),
      ],
      (bucket) => {
        if (
          !bucket ||
          !avaliacaoId
        ) {
          return null;
        }

        return (
          bucket.byId?.[
          String(
            avaliacaoId
          )
          ] ||
          null
        );
      }
    );