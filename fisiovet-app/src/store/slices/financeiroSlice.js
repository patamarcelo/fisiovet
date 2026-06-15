// Estado Redux do novo módulo financeiro.
// Este arquivo será implementado após o service financeiro.
// src/store/slices/financeiroSlice.js
// @ts-nocheck

import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";

import {
  listLancamentos as svcListLancamentos,
  getLancamentoById as svcGetLancamentoById,
  createLancamento as svcCreateLancamento,
  updateLancamento as svcUpdateLancamento,
  removeLancamento as svcRemoveLancamento,
  findLancamentoByEventoId as svcFindLancamentoByEventoId,
  addRecebimento as svcAddRecebimento,
  removeRecebimento as svcRemoveRecebimento,
} from "@/src/services/financeiro";

import {
  sanitizeLancamento,
} from "@/src/features/financeiro/financeiro.helpers";

import {
  FINANCEIRO_ORIGEM,
  FINANCEIRO_STATUS,
} from "@/src/features/financeiro/financeiro.constants";

import {
  mapEventoToLancamento,
} from "@/src/features/financeiro/financeiro.mappers";

/* =========================================================
   Estado inicial
========================================================= */

const initialState = {
  byId: {},
  allIds: [],

  status: "idle",
  error: null,
  lastLoadedAt: null,

  selectedId: null,

  migration: {
    status: "idle",
    processed: 0,
    created: 0,
    linked: 0,
    errors: [],
  },
};

/* =========================================================
   Helpers internos
========================================================= */

function sortIds(state) {
  state.allIds.sort((a, b) => {
    const itemA = state.byId[a];
    const itemB = state.byId[b];

    const dateA = new Date(
      itemA?.competencia ||
        itemA?.vencimento ||
        itemA?.createdAt ||
        0
    ).getTime();

    const dateB = new Date(
      itemB?.competencia ||
        itemB?.vencimento ||
        itemB?.createdAt ||
        0
    ).getTime();

    const safeA = Number.isFinite(dateA)
      ? dateA
      : 0;

    const safeB = Number.isFinite(dateB)
      ? dateB
      : 0;

    return safeB - safeA;
  });
}

function upsertLancamentoState(
  state,
  lancamento
) {
  if (!lancamento?.id) return;

  const safe =
    sanitizeLancamento(lancamento);

  const id = String(safe.id);

  state.byId[id] = safe;

  if (!state.allIds.includes(id)) {
    state.allIds.push(id);
  }

  sortIds(state);
}

function removeLancamentoState(
  state,
  id
) {
  const safeId = String(id);

  delete state.byId[safeId];

  state.allIds =
    state.allIds.filter(
      (itemId) =>
        String(itemId) !== safeId
    );

  if (
    String(state.selectedId) === safeId
  ) {
    state.selectedId = null;
  }
}

/* =========================================================
   Thunks de leitura
========================================================= */

export const loadLancamentos =
  createAsyncThunk(
    "financeiro/loadLancamentos",
    async () => {
      const rows =
        await svcListLancamentos();

      return Array.isArray(rows)
        ? rows.map((item) =>
            sanitizeLancamento(item)
          )
        : [];
    }
  );

export const loadLancamentoById =
  createAsyncThunk(
    "financeiro/loadLancamentoById",
    async (id) => {
      const item =
        await svcGetLancamentoById(id);

      return sanitizeLancamento(item);
    }
  );

export const findLancamentoByEventoId =
  createAsyncThunk(
    "financeiro/findLancamentoByEventoId",
    async (eventoId) => {
      const item =
        await svcFindLancamentoByEventoId(
          eventoId
        );

      return item
        ? sanitizeLancamento(item)
        : null;
    }
  );

/* =========================================================
   Thunks de criação
========================================================= */

export const createLancamento =
  createAsyncThunk(
    "financeiro/createLancamento",
    async (payload) => {
      const saved =
        await svcCreateLancamento(
          sanitizeLancamento(payload)
        );

      return sanitizeLancamento(saved);
    }
  );

export const createLancamentoAvulso =
  createAsyncThunk(
    "financeiro/createLancamentoAvulso",
    async (payload) => {
      const normalized =
        sanitizeLancamento({
          ...payload,

          origem: {
            ...(payload?.origem || {}),
            tipo:
              FINANCEIRO_ORIGEM.AVULSO,
            eventoId: null,
            seriesId: null,
          },
        });

      const saved =
        await svcCreateLancamento(
          normalized
        );

      return sanitizeLancamento(saved);
    }
  );

export const createLancamentoFromEvento =
  createAsyncThunk(
    "financeiro/createLancamentoFromEvento",
    async ({
      evento,
      overrides = {},
    }) => {
      if (!evento?.id) {
        throw new Error(
          "Evento inválido para criação do lançamento."
        );
      }

      const payload =
        mapEventoToLancamento(
          evento,
          overrides
        );

      const saved =
        await svcCreateLancamento(
          payload
        );

      return sanitizeLancamento(saved);
    }
  );

/* =========================================================
   Garantia de lançamento por evento
========================================================= */

export const ensureLancamentoForEvento =
  createAsyncThunk(
    "financeiro/ensureLancamentoForEvento",
    async ({
      evento,
      overrides = {},
    }) => {
      if (!evento?.id) {
        throw new Error(
          "Evento inválido."
        );
      }

      const lancamentoId =
        evento?.financeiro
          ?.lancamentoId;

      if (lancamentoId) {
        try {
          const existingById =
            await svcGetLancamentoById(
              lancamentoId
            );

          return {
            lancamento:
              sanitizeLancamento(
                existingById
              ),

            created: false,
            linked: true,
          };
        } catch {
          // Continua e procura pelo eventoId.
        }
      }

      const existingByEvento =
        await svcFindLancamentoByEventoId(
          evento.id
        );

      if (existingByEvento) {
        return {
          lancamento:
            sanitizeLancamento(
              existingByEvento
            ),

          created: false,
          linked: false,
        };
      }

      const payload =
        mapEventoToLancamento(
          evento,
          overrides
        );

      const created =
        await svcCreateLancamento(
          payload
        );

      return {
        lancamento:
          sanitizeLancamento(created),

        created: true,
        linked: false,
      };
    }
  );

/* =========================================================
   Atualização
========================================================= */

export const updateLancamento =
  createAsyncThunk(
    "financeiro/updateLancamento",
    async ({
      id,
      patch,
    }) => {
      const saved =
        await svcUpdateLancamento(
          id,
          patch
        );

      return sanitizeLancamento(saved);
    }
  );

export const cancelLancamento =
  createAsyncThunk(
    "financeiro/cancelLancamento",
    async (id) => {
      const saved =
        await svcUpdateLancamento(
          id,
          {
            status:
              FINANCEIRO_STATUS.CANCELADO,
          }
        );

      return sanitizeLancamento(saved);
    }
  );

/* =========================================================
   Recebimentos
========================================================= */

export const registerRecebimento =
  createAsyncThunk(
    "financeiro/registerRecebimento",
    async ({
      lancamentoId,
      recebimento,
    }) => {
      const saved =
        await svcAddRecebimento(
          lancamentoId,
          recebimento
        );

      return sanitizeLancamento(saved);
    }
  );

export const deleteRecebimento =
  createAsyncThunk(
    "financeiro/deleteRecebimento",
    async ({
      lancamentoId,
      recebimentoId,
    }) => {
      const saved =
        await svcRemoveRecebimento(
          lancamentoId,
          recebimentoId
        );

      return sanitizeLancamento(saved);
    }
  );

/* =========================================================
   Exclusão
========================================================= */

export const deleteLancamento =
  createAsyncThunk(
    "financeiro/deleteLancamento",
    async (id) => {
      const removedId =
        await svcRemoveLancamento(id);

      return String(removedId);
    }
  );

/* =========================================================
   Slice
========================================================= */

const financeiroSlice = createSlice({
  name: "financeiro",

  initialState,

  reducers: {
    resetFinanceiroState: () =>
      initialState,

    setSelectedLancamentoId: (
      state,
      action
    ) => {
      state.selectedId =
        action.payload != null
          ? String(action.payload)
          : null;
    },

    clearFinanceiroError: (
      state
    ) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      /* -------------------------
         Load
      ------------------------- */

      .addCase(
        loadLancamentos.pending,
        (state) => {
          state.status = "loading";
          state.error = null;
        }
      )

      .addCase(
        loadLancamentos.fulfilled,
        (state, action) => {
          state.status = "succeeded";
          state.error = null;

          state.byId = {};
          state.allIds = [];

          const rows =
            Array.isArray(action.payload)
              ? action.payload
              : [];

          rows.forEach((item) => {
            upsertLancamentoState(
              state,
              item
            );
          });

          state.lastLoadedAt =
            new Date().toISOString();
        }
      )

      .addCase(
        loadLancamentos.rejected,
        (state, action) => {
          state.status = "failed";

          state.error =
            action.error?.message ||
            "Erro ao carregar lançamentos.";
        }
      )

      /* -------------------------
         Load one
      ------------------------- */

      .addCase(
        loadLancamentoById.pending,
        (state) => {
          state.error = null;
        }
      )

      .addCase(
        loadLancamentoById.fulfilled,
        (state, action) => {
          upsertLancamentoState(
            state,
            action.payload
          );

          state.selectedId =
            action.payload?.id
              ? String(
                  action.payload.id
                )
              : null;
        }
      )

      .addCase(
        loadLancamentoById.rejected,
        (state, action) => {
          state.error =
            action.error?.message ||
            "Erro ao carregar lançamento.";
        }
      )

      /* -------------------------
         Find by event
      ------------------------- */

      .addCase(
        findLancamentoByEventoId.fulfilled,
        (state, action) => {
          if (action.payload) {
            upsertLancamentoState(
              state,
              action.payload
            );
          }
        }
      )

      /* -------------------------
         Create
      ------------------------- */

      .addCase(
        createLancamento.fulfilled,
        (state, action) => {
          upsertLancamentoState(
            state,
            action.payload
          );
        }
      )

      .addCase(
        createLancamentoAvulso.fulfilled,
        (state, action) => {
          upsertLancamentoState(
            state,
            action.payload
          );
        }
      )

      .addCase(
        createLancamentoFromEvento.fulfilled,
        (state, action) => {
          upsertLancamentoState(
            state,
            action.payload
          );
        }
      )

      /* -------------------------
         Ensure event
      ------------------------- */

      .addCase(
        ensureLancamentoForEvento.pending,
        (state) => {
          state.migration.status =
            "loading";

          state.error = null;
        }
      )

      .addCase(
        ensureLancamentoForEvento.fulfilled,
        (state, action) => {
          state.migration.status =
            "succeeded";

          state.migration.processed += 1;

          if (
            action.payload?.created
          ) {
            state.migration.created += 1;
          }

          if (
            action.payload?.linked
          ) {
            state.migration.linked += 1;
          }

          if (
            action.payload?.lancamento
          ) {
            upsertLancamentoState(
              state,
              action.payload.lancamento
            );
          }
        }
      )

      .addCase(
        ensureLancamentoForEvento.rejected,
        (state, action) => {
          state.migration.status =
            "failed";

          const message =
            action.error?.message ||
            "Erro ao garantir lançamento.";

          state.migration.errors.push(
            message
          );

          state.error = message;
        }
      )

      /* -------------------------
         Update
      ------------------------- */

      .addCase(
        updateLancamento.fulfilled,
        (state, action) => {
          upsertLancamentoState(
            state,
            action.payload
          );
        }
      )

      .addCase(
        cancelLancamento.fulfilled,
        (state, action) => {
          upsertLancamentoState(
            state,
            action.payload
          );
        }
      )

      /* -------------------------
         Receipts
      ------------------------- */

      .addCase(
        registerRecebimento.fulfilled,
        (state, action) => {
          upsertLancamentoState(
            state,
            action.payload
          );
        }
      )

      .addCase(
        deleteRecebimento.fulfilled,
        (state, action) => {
          upsertLancamentoState(
            state,
            action.payload
          );
        }
      )

      /* -------------------------
         Delete
      ------------------------- */

      .addCase(
        deleteLancamento.fulfilled,
        (state, action) => {
          removeLancamentoState(
            state,
            action.payload
          );
        }
      )

      /* -------------------------
         Erros genéricos
      ------------------------- */

      .addMatcher(
        (action) =>
          action.type.startsWith(
            "financeiro/"
          ) &&
          action.type.endsWith(
            "/rejected"
          ),

        (state, action) => {
          state.error =
            action.error?.message ||
            "Erro no módulo financeiro.";
        }
      );
  },
});

export const {
  resetFinanceiroState,
  setSelectedLancamentoId,
  clearFinanceiroError,
} = financeiroSlice.actions;

export default financeiroSlice.reducer;

/* =========================================================
   Selectors base
========================================================= */

export const selectFinanceiroState = (
  state
) =>
  state?.financeiro ||
  initialState;

export const selectFinanceiroStatus =
  createSelector(
    selectFinanceiroState,
    (financeiro) =>
      financeiro.status
  );

export const selectFinanceiroError =
  createSelector(
    selectFinanceiroState,
    (financeiro) =>
      financeiro.error
  );

export const selectFinanceiroMigration =
  createSelector(
    selectFinanceiroState,
    (financeiro) =>
      financeiro.migration
  );

export const selectAllLancamentos =
  createSelector(
    selectFinanceiroState,
    (financeiro) =>
      financeiro.allIds
        .map(
          (id) =>
            financeiro.byId[id]
        )
        .filter(Boolean)
  );

export const selectLancamentoById =
  (id) =>
    createSelector(
      selectFinanceiroState,
      (financeiro) =>
        financeiro.byId[
          String(id)
        ] || null
    );

export const selectSelectedLancamento =
  createSelector(
    selectFinanceiroState,
    (financeiro) => {
      if (
        !financeiro.selectedId
      ) {
        return null;
      }

      return (
        financeiro.byId[
          String(
            financeiro.selectedId
          )
        ] || null
      );
    }
  );

/* =========================================================
   Selectors por relação
========================================================= */

export const makeSelectLancamentoByEventoId =
  (eventoId) =>
    createSelector(
      selectAllLancamentos,
      (list) =>
        list.find(
          (item) =>
            String(
              item?.origem
                ?.eventoId || ""
            ) ===
            String(eventoId)
        ) || null
    );

export const makeSelectLancamentosByTutorId =
  (tutorId) =>
    createSelector(
      selectAllLancamentos,
      (list) =>
        list.filter(
          (item) =>
            String(
              item?.tutorId || ""
            ) ===
            String(tutorId)
        )
    );

export const makeSelectLancamentosByPetId =
  (petId) =>
    createSelector(
      selectAllLancamentos,
      (list) =>
        list.filter(
          (item) =>
            Array.isArray(
              item?.petIds
            ) &&
            item.petIds
              .map(String)
              .includes(
                String(petId)
              )
        )
    );

export const makeSelectLancamentosByStatus =
  (status) =>
    createSelector(
      selectAllLancamentos,
      (list) =>
        list.filter(
          (item) =>
            item.status === status
        )
    );

/* =========================================================
   Selector por período
========================================================= */

export const makeSelectLancamentosBetween =
  () =>
    createSelector(
      [
        selectAllLancamentos,
        (_, start) => start,
        (_, __, end) => end,
      ],

      (list, start, end) => {
        const startDate =
          start
            ? new Date(start)
            : null;

        const endDate =
          end
            ? new Date(end)
            : null;

        return list.filter(
          (item) => {
            const date =
              new Date(
                item.competencia
              );

            if (
              Number.isNaN(
                date.getTime()
              )
            ) {
              return false;
            }

            if (
              startDate &&
              date < startDate
            ) {
              return false;
            }

            if (
              endDate &&
              date > endDate
            ) {
              return false;
            }

            return true;
          }
        );
      }
    );

/* =========================================================
   Resumo financeiro
========================================================= */

export const selectFinanceiroResumo =
  createSelector(
    selectAllLancamentos,
    (list) => {
      return list.reduce(
        (acc, item) => {
          const final =
            Number(
              item?.valores?.final ||
                0
            );

          const recebido =
            Number(
              item?.valores
                ?.recebido || 0
            );

          const saldo =
            Number(
              item?.valores?.saldo ||
                0
            );

          if (
            item.status ===
            FINANCEIRO_STATUS.CANCELADO
          ) {
            acc.cancelado += final;
            acc.quantidadeCancelados += 1;

            return acc;
          }

          acc.faturado += final;
          acc.recebido += recebido;
          acc.aReceber += saldo;
          acc.quantidade += 1;

          if (
            item.status ===
            FINANCEIRO_STATUS.PAGO
          ) {
            acc.quantidadePagos += 1;
          }

          if (
            item.status ===
            FINANCEIRO_STATUS.PARCIAL
          ) {
            acc.parcial += saldo;
            acc.quantidadeParciais += 1;
          }

          if (
            item.status ===
            FINANCEIRO_STATUS.VENCIDO
          ) {
            acc.vencido += saldo;
            acc.quantidadeVencidos += 1;
          }

          if (
            item.status ===
            FINANCEIRO_STATUS.PENDENTE
          ) {
            acc.pendente += saldo;
            acc.quantidadePendentes += 1;
          }

          if (
            item.status ===
            FINANCEIRO_STATUS.RASCUNHO
          ) {
            acc.quantidadeRascunhos += 1;
          }

          return acc;
        },

        {
          faturado: 0,
          recebido: 0,
          aReceber: 0,
          pendente: 0,
          parcial: 0,
          vencido: 0,
          cancelado: 0,

          quantidade: 0,
          quantidadePagos: 0,
          quantidadePendentes: 0,
          quantidadeParciais: 0,
          quantidadeVencidos: 0,
          quantidadeCancelados: 0,
          quantidadeRascunhos: 0,
        }
      );
    }
  );