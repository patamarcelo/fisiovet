// src/store/slices/petsSlice.js
// @ts-nocheck

import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";

import {
  listPets,
  listPetsByTutor,
  getPetById,
  createPet,
  updatePet as updatePetApi,
  removePet,
} from "@/src/services/pets";

/* ---------- Thunks ---------- */

export const fetchAllPets =
  createAsyncThunk(
    "pets/fetchAll",
    async () => {
      const list =
        await listPets();

      return Array.isArray(
        list
      )
        ? list
        : [];
    }
  );

export const fetchPetsByTutor =
  createAsyncThunk(
    "pets/fetchByTutor",

    async ({
      tutorId,
    }) => {
      const rows =
        await listPetsByTutor(
          tutorId
        );

      return {
        tutorId:
          String(tutorId),

        rows:
          Array.isArray(rows)
            ? rows
            : [],
      };
    },

    {
      condition:
        (
          {
            tutorId,
            force,
          },
          {
            getState,
          }
        ) => {
          const state =
            getState();

          if (force) {
            return true;
          }

          const safeTutorId =
            String(tutorId);

          return (
            typeof state.pets
              .byTutorId[
                safeTutorId
              ] ===
            "undefined"
          );
        },
    }
  );

export const fetchPet =
  createAsyncThunk(
    "pets/fetchOne",
    async (id) => {
      return await getPetById(
        id
      );
    }
  );

export const addPet =
  createAsyncThunk(
    "pets/add",
    async (payload) => {
      return await createPet(
        payload
      );
    }
  );

export const updatePet =
  createAsyncThunk(
    "pets/update",
    async (payload) => {
      return await updatePetApi(
        payload.id,
        payload
      );
    }
  );

export const patchPet =
  createAsyncThunk(
    "pets/patch",
    async ({
      id,
      patch,
    }) => {
      return await updatePetApi(
        id,
        patch
      );
    }
  );

export const deletePet =
  createAsyncThunk(
    "pets/delete",
    async (id) => {
      await removePet(id);

      return id;
    }
  );

/* ---------- Estado ---------- */

const initialState = {
  byId: {},
  allIds: [],
  byTutorId: {},

  statusAll: "idle",
  loadingByTutor: {},

  error: null,
  activeTutorId: null,
};

/* ---------- Helpers ---------- */

const toStr =
  (value) =>
    value == null
      ? undefined
      : String(value);

function indexAdd(
  state,
  petId,
  tutorId
) {
  if (!tutorId) {
    return;
  }

  const safeTutorId =
    String(tutorId);

  const list =
    state.byTutorId[
      safeTutorId
    ] ||
    (
      state.byTutorId[
        safeTutorId
      ] = []
    );

  if (
    !list.includes(petId)
  ) {
    list.push(petId);
  }
}

function indexRemove(
  state,
  petId,
  tutorId
) {
  if (!tutorId) {
    return;
  }

  const safeTutorId =
    String(tutorId);

  const list =
    state.byTutorId[
      safeTutorId
    ];

  if (!list) {
    return;
  }

  state.byTutorId[
    safeTutorId
  ] =
    list.filter(
      (id) =>
        id !== petId
    );

  if (
    state.byTutorId[
      safeTutorId
    ].length === 0
  ) {
    delete state.byTutorId[
      safeTutorId
    ];
  }
}

function upsertOne(
  state,
  pet
) {
  if (!pet?.id) {
    return;
  }

  const id =
    String(pet.id);

  const previous =
    state.byId[id];

  const tutorId =
    toStr(
      pet?.tutor?.id
    );

  state.byId[id] = {
    ...previous,
    ...pet,

    tutor: tutorId
      ? {
          ...(previous?.tutor || {}),
          ...(pet?.tutor || {}),
          id: tutorId,
        }
      : pet?.tutor ??
        previous?.tutor ??
        null,
  };

  if (
    !state.allIds.includes(
      id
    )
  ) {
    state.allIds.push(id);
  }

  const previousTutorId =
    toStr(
      previous?.tutor?.id
    );

  if (
    previousTutorId !==
    tutorId
  ) {
    if (previousTutorId) {
      indexRemove(
        state,
        id,
        previousTutorId
      );
    }

    if (tutorId) {
      indexAdd(
        state,
        id,
        tutorId
      );
    }
  } else if (tutorId) {
    indexAdd(
      state,
      id,
      tutorId
    );
  }
}

function upsertMany(
  state,
  pets
) {
  for (
    const pet
    of pets || []
  ) {
    upsertOne(
      state,
      pet
    );
  }
}

/* ---------- Slice ---------- */

const petsSlice =
  createSlice({
    name: "pets",

    initialState,

    reducers: {
      resetPetsState:
        () =>
          initialState,

      setActiveTutorId:
        (
          state,
          action
        ) => {
          state.activeTutorId =
            action.payload !=
            null
              ? String(
                  action.payload
                )
              : null;
        },

      clearActiveTutorId:
        (state) => {
          state.activeTutorId =
            null;
        },
    },

    extraReducers:
      (builder) => {
        builder
          /* ---------- FETCH ALL ---------- */

          .addCase(
            fetchAllPets.pending,
            (state) => {
              state.statusAll =
                "loading";

              state.error =
                null;
            }
          )

          .addCase(
            fetchAllPets.fulfilled,
            (
              state,
              action
            ) => {
              state.statusAll =
                "succeeded";

              state.error =
                null;

              const rows =
                Array.isArray(
                  action.payload
                )
                  ? action.payload
                  : [];

              /*
               * Proteção da Fase 0:
               * resposta vazia não apaga um estado
               * persistido que já contém pets.
               */
              if (
                rows.length ===
                  0 &&
                state.allIds
                  .length > 0
              ) {
                return;
              }

              /*
               * Mantém o atalho anterior quando
               * os mesmos IDs já estão carregados.
               */
              if (
                rows.length ===
                  state.allIds
                    .length &&
                rows.every(
                  (pet) =>
                    state.byId[
                      String(
                        pet.id
                      )
                    ]
                )
              ) {
                upsertMany(
                  state,
                  rows
                );

                return;
              }

              state.byId =
                {};

              state.allIds =
                [];

              state.byTutorId =
                {};

              upsertMany(
                state,
                rows
              );
            }
          )

          .addCase(
            fetchAllPets.rejected,
            (
              state,
              action
            ) => {
              state.statusAll =
                "failed";

              state.error =
                action.error
                  ?.message ??
                "Erro ao carregar pets";

              /*
               * Não altera byId/allIds.
               */
            }
          )

          /* ---------- FETCH BY TUTOR ---------- */

          .addCase(
            fetchPetsByTutor.pending,
            (
              state,
              action
            ) => {
              const tutorId =
                String(
                  action.meta
                    .arg.tutorId
                );

              state.loadingByTutor[
                tutorId
              ] = "loading";
            }
          )

          .addCase(
            fetchPetsByTutor.fulfilled,
            (
              state,
              action
            ) => {
              const {
                tutorId,
                rows,
              } =
                action.payload;

              const previousIds =
                state.byTutorId[
                  tutorId
                ] || [];

              /*
               * Mesma proteção para consulta por tutor:
               * não apaga o índice persistido em uma
               * resposta vazia inesperada.
               */
              if (
                rows.length ===
                  0 &&
                previousIds.length >
                  0
              ) {
                state.loadingByTutor[
                  tutorId
                ] =
                  "succeeded";

                return;
              }

              upsertMany(
                state,
                rows
              );

              state.byTutorId[
                tutorId
              ] =
                rows.map(
                  (pet) =>
                    String(
                      pet.id
                    )
                );

              state.loadingByTutor[
                tutorId
              ] =
                "succeeded";
            }
          )

          .addCase(
            fetchPetsByTutor.rejected,
            (
              state,
              action
            ) => {
              const tutorId =
                String(
                  action.meta
                    .arg.tutorId
                );

              state.loadingByTutor[
                tutorId
              ] = "failed";
            }
          )

          /* ---------- FETCH ONE ---------- */

          .addCase(
            fetchPet.fulfilled,
            (
              state,
              action
            ) => {
              upsertOne(
                state,
                action.payload
              );
            }
          )

          /* ---------- CREATE ---------- */

          .addCase(
            addPet.fulfilled,
            (
              state,
              action
            ) => {
              upsertOne(
                state,
                action.payload
              );
            }
          )

          /* ---------- PATCH ---------- */

          .addCase(
            patchPet.fulfilled,
            (
              state,
              action
            ) => {
              upsertOne(
                state,
                action.payload
              );
            }
          )

          /* ---------- UPDATE ---------- */

          .addCase(
            updatePet.fulfilled,
            (
              state,
              action
            ) => {
              upsertOne(
                state,
                action.payload
              );
            }
          )

          /* ---------- DELETE ---------- */

          .addCase(
            deletePet.fulfilled,
            (
              state,
              action
            ) => {
              const id =
                String(
                  action.payload
                );

              const pet =
                state.byId[id];

              delete state.byId[
                id
              ];

              state.allIds =
                state.allIds.filter(
                  (itemId) =>
                    itemId !== id
                );

              const tutorId =
                toStr(
                  pet?.tutor?.id
                );

              if (
                tutorId &&
                state.byTutorId[
                  tutorId
                ]
              ) {
                state.byTutorId[
                  tutorId
                ] =
                  state.byTutorId[
                    tutorId
                  ].filter(
                    (itemId) =>
                      itemId !==
                      id
                  );

                if (
                  state
                    .byTutorId[
                      tutorId
                    ].length ===
                  0
                ) {
                  delete state
                    .byTutorId[
                      tutorId
                    ];
                }
              }
            }
          );
      },
  });

export const {
  resetPetsState,
  setActiveTutorId,
  clearActiveTutorId,
} = petsSlice.actions;

export default petsSlice.reducer;

/* ---------- Selectors ---------- */

export const selectPetsState =
  (state) =>
    state.pets ||
    initialState;

export const selectTutoresState =
  (state) =>
    state.tutores || {
      byId: {},
      allIds: [],
    };

export const selectAllPets =
  createSelector(
    selectPetsState,
    (pets) =>
      (
        pets.allIds || []
      )
        .map(
          (id) =>
            pets.byId[id]
        )
        .filter(Boolean)
  );

export const selectPetById =
  (id) =>
    createSelector(
      selectPetsState,
      (pets) =>
        pets.byId?.[
          String(id)
        ]
    );

export const selectPetsByTutorId =
  (tutorId) =>
    createSelector(
      selectPetsState,
      (pets) => {
        const safeTutorId =
          String(tutorId);

        const ids =
          pets.byTutorId?.[
            safeTutorId
          ] || [];

        return ids
          .map(
            (id) =>
              pets.byId[id]
          )
          .filter(Boolean);
      }
    );

export const selectLoadingPetsByTutor =
  (tutorId) =>
    createSelector(
      selectPetsState,
      (pets) =>
        pets.loadingByTutor?.[
          String(tutorId)
        ] ===
        "loading"
    );

export const selectPetsByTutorStatus =
  (tutorId) =>
    createSelector(
      selectPetsState,
      (pets) =>
        pets.loadingByTutor?.[
          String(tutorId)
        ] || "idle"
    );

export const selectAllPetsStatus =
  createSelector(
    selectPetsState,
    (pets) =>
      pets.statusAll
  );

const selectTutoresById =
  createSelector(
    selectTutoresState,
    (tutores) =>
      tutores.byId || {}
  );

export const selectPetByIdJoined =
  (id) =>
    createSelector(
      [
        selectPetsState,
        selectTutoresById,
      ],

      (
        pets,
        tutoresById
      ) => {
        const pet =
          pets.byId?.[
            String(id)
          ];

        if (!pet) {
          return undefined;
        }

        const tutorId =
          toStr(
            pet?.tutor?.id
          );

        const tutor =
          tutorId
            ? tutoresById[
                tutorId
              ]
            : undefined;

        return {
          ...pet,

          tutor: tutorId
            ? {
                id:
                  tutorId,
                nome:
                  tutor?.nome,
              }
            : null,
        };
      }
    );

export const selectAllPetsJoined =
  createSelector(
    [
      selectPetsState,
      selectTutoresById,
    ],

    (
      pets,
      tutoresById
    ) =>
      (
        pets.allIds || []
      )
        .map(
          (id) => {
            const pet =
              pets.byId[id];

            if (!pet) {
              return null;
            }

            const tutorId =
              toStr(
                pet?.tutor?.id
              );

            const tutor =
              tutorId
                ? tutoresById[
                    tutorId
                  ]
                : undefined;

            return {
              ...pet,

              tutor: tutorId
                ? {
                    id:
                      tutorId,
                    nome:
                      tutor?.nome,
                  }
                : null,
            };
          }
        )
        .filter(Boolean)
  );

export const selectActiveTutorId =
  createSelector(
    selectPetsState,
    (pets) =>
      pets.activeTutorId
  );

export const selectPetsByActiveTutor =
  createSelector(
    [
      selectAllPetsJoined,
      selectActiveTutorId,
    ],

    (
      pets,
      activeTutorId
    ) => {
      if (!activeTutorId) {
        return pets;
      }

      const safeTutorId =
        String(
          activeTutorId
        );

      return pets.filter(
        (pet) =>
          pet?.tutor?.id ===
          safeTutorId
      );
    }
  );