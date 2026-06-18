// Workflows que coordenam agenda e financeiro.
// A implementação será conectada após o financeiroSlice.
// src/features/financeiro/financeiro.workflows.js
// @ts-nocheck
//
// Workflows responsáveis por coordenar Agenda e Financeiro.
//
// A agenda continua responsável pelo evento.
// O financeiro continua responsável pelo lançamento.
// Este arquivo coordena as duas operações.

import { createAsyncThunk } from '@reduxjs/toolkit';

import {
    addEvento,
    addEventosBatch,
    updateEvento,
    deleteEvento,
    selectEventoById,
} from '@/src/store/slices/agendaSlice';

import {
    createLancamentoFromEvento,
    ensureLancamentoForEvento,
    updateLancamento,
    cancelLancamento,
    deleteLancamento,
    loadLancamentoById,
} from '@/src/store/slices/financeiroSlice';

import {
    buildEventoFinanceiroResumo,
    normalizeMoney,
} from '@/src/features/financeiro/financeiro.helpers';

/* =========================================================
   Helpers
========================================================= */

function ensureEvento(evento) {
    if (!evento?.id) {
        throw new Error('Evento inválido.');
    }

    return evento;
}

function ensureLancamento(lancamento) {
    if (!lancamento?.id) {
        throw new Error('Lançamento financeiro inválido.');
    }

    return lancamento;
}

function getEventoFromState(state, eventoId) {
    return selectEventoById(eventoId)(state);
}

async function syncResumoFinanceiroNoEvento({
    dispatch,
    evento,
    lancamento,
}) {
    ensureEvento(evento);
    ensureLancamento(lancamento);

    const resumo = buildEventoFinanceiroResumo(
        lancamento,
        evento.financeiro || {}
    );

    const eventoAtualizado = await dispatch(
        updateEvento({
            id: evento.id,

            patch: {
                financeiro: resumo,
            },

            skipGoogleSync: true,
        })
    ).unwrap();

    return {
        evento: eventoAtualizado,
        resumo,
    };
}

/* =========================================================
   Criar evento simples + lançamento
========================================================= */

export const createEventoComFinanceiro = createAsyncThunk(
    'financeiroWorkflow/createEventoComFinanceiro',

    async (payload, { dispatch }) => {
        /*
         * 1. Cria o evento normalmente.
         *
         * O addEvento continua responsável por:
         * - normalização;
         * - persistência;
         * - fila do Google Calendar.
         */
        const evento = ensureEvento(
            await dispatch(
                addEvento(payload)
            ).unwrap()
        );

        /*
         * 2. Cria o lançamento vinculado ao evento.
         *
         * O service financeiro usa ID determinístico e
         * origem.eventoId, evitando duplicidade.
         */
        const lancamento = ensureLancamento(
            await dispatch(
                createLancamentoFromEvento({
                    evento,

                    overrides: {
                        valor:
                            payload?.financeiro?.preco ??
                            payload?.preco ??
                            0,
                    },
                })
            ).unwrap()
        );

        /*
         * 3. Grava o resumo financeiro no evento.
         */
        const synced =
            await syncResumoFinanceiroNoEvento({
                dispatch,
                evento,
                lancamento,
            });

        return {
            evento: synced.evento,
            lancamento,
            resumo: synced.resumo,
        };
    }
);

/* =========================================================
   Criar eventos recorrentes + lançamentos individuais
========================================================= */

export const createEventosRecorrentesComFinanceiro =
    createAsyncThunk(
        'financeiroWorkflow/createEventosRecorrentesComFinanceiro',

        async (payloadList, { dispatch }) => {
            if (!Array.isArray(payloadList) || payloadList.length === 0) {
                throw new Error(
                    'Nenhum evento recorrente foi informado.'
                );
            }

            /*
             * 1. Cria todos os eventos.
             */
            const eventos = await dispatch(
                addEventosBatch(payloadList)
            ).unwrap();

            const results = [];
            const errors = [];

            /*
             * 2. Cada evento recebe seu próprio lançamento.
             *
             * O processamento é sequencial para reduzir concorrência
             * e facilitar a recuperação em caso de erro.
             */
            for (const evento of eventos) {
                try {
                    const lancamento = ensureLancamento(
                        await dispatch(
                            createLancamentoFromEvento({
                                evento,

                                overrides: {
                                    valor:
                                        evento?.financeiro?.preco ??
                                        0,
                                },
                            })
                        ).unwrap()
                    );

                    const synced =
                        await syncResumoFinanceiroNoEvento({
                            dispatch,
                            evento,
                            lancamento,
                        });

                    results.push({
                        evento: synced.evento,
                        lancamento,
                        resumo: synced.resumo,
                    });
                } catch (error) {
                    errors.push({
                        eventoId:
                            evento?.id != null
                                ? String(evento.id)
                                : null,

                        message:
                            error?.message ||
                            'Erro ao criar lançamento recorrente.',
                    });
                }
            }

            /*
             * Os eventos já foram criados.
             *
             * Não lançamos erro global caso apenas um lançamento falhe,
             * porque isso faria a tela indicar falha mesmo com eventos
             * já salvos.
             *
             * A migração progressiva poderá reparar qualquer evento
             * presente em errors.
             */
            return {
                eventos: results.map(
                    (item) => item.evento
                ),

                lancamentos: results.map(
                    (item) => item.lancamento
                ),

                results,
                errors,

                totalEventos: eventos.length,
                totalSincronizados: results.length,
                totalErros: errors.length,
            };
        }
    );

/* =========================================================
   Atualizar evento + lançamento
========================================================= */

export const updateEventoComFinanceiro =
    createAsyncThunk(
        'financeiroWorkflow/updateEventoComFinanceiro',

        async (
            {
                id,
                patch = {},
                financeiroPatch = {},
                changeStatus = false,
            },
            {
                dispatch,
                getState,
            }
        ) => {
            if (!id) {
                throw new Error(
                    'ID do evento é obrigatório.'
                );
            }

            const previousEvento =
                getEventoFromState(
                    getState(),
                    id
                );

            if (!previousEvento) {
                throw new Error(
                    `Evento ${id} não encontrado no estado.`
                );
            }

            /*
             * Retiramos financeiro do patch geral.
             *
             * A partir do novo fluxo, valores financeiros devem ser
             * alterados no lançamento, e não diretamente no evento.
             */
            const {
                financeiro: legacyFinanceiroPatch,
                ...eventoPatch
            } = patch || {};

            /*
             * Compatibilidade:
             *
             * Caso alguma tela ainda envie financeiro.preco,
             * convertemos para valorOriginal.
             */
            const requestedOriginal =
                financeiroPatch?.valorOriginal ??
                financeiroPatch?.original ??
                legacyFinanceiroPatch?.preco;

            /*
             * 1. Atualiza os dados do evento.
             *
             * Esta é a única atualização que pode gerar sync Google.
             */
            const eventoAtualizado = ensureEvento(
                await dispatch(
                    updateEvento({
                        id,

                        patch: eventoPatch,

                        changeStatus,
                    })
                ).unwrap()
            );

            /*
             * 2. Garante que o evento possua lançamento.
             *
             * Para eventos antigos, isso realiza a migração progressiva.
             */
            const ensured = await dispatch(
                ensureLancamentoForEvento({
                    evento: eventoAtualizado,
                })
            ).unwrap();

            let lancamento = ensureLancamento(
                ensured.lancamento
            );

            /*
             * 3. Atualiza os dados financeiros quando necessário.
             */
            const patchLancamento = {};

            if (requestedOriginal != null) {
                const valorOriginal =
                    normalizeMoney(
                        requestedOriginal
                    );

                const valorRecebido =
                    normalizeMoney(
                        lancamento?.valores?.recebido
                    );

                /*
                 * Nesta primeira versão não permitimos reduzir o total
                 * para menos do que já foi recebido.
                 */
                if (valorOriginal < valorRecebido) {
                    throw new Error(
                        `O valor do evento não pode ser menor que o valor já recebido (${valorRecebido.toLocaleString(
                            'pt-BR',
                            {
                                style: 'currency',
                                currency: 'BRL',
                            }
                        )}).`
                    );
                }

                patchLancamento.valores = {
                    ...(lancamento.valores || {}),
                    original: valorOriginal,
                };
            }

            if (financeiroPatch?.desconto != null) {
                patchLancamento.valores = {
                    ...(patchLancamento.valores ||
                        lancamento.valores ||
                        {}),

                    desconto: normalizeMoney(
                        financeiroPatch.desconto
                    ),
                };
            }

            if (financeiroPatch?.acrescimo != null) {
                patchLancamento.valores = {
                    ...(patchLancamento.valores ||
                        lancamento.valores ||
                        {}),

                    acrescimo: normalizeMoney(
                        financeiroPatch.acrescimo
                    ),
                };
            }

            if (financeiroPatch?.vencimento != null) {
                patchLancamento.vencimento =
                    financeiroPatch.vencimento;
            }

            if (financeiroPatch?.categoria != null) {
                patchLancamento.categoria =
                    financeiroPatch.categoria;
            }

            if (financeiroPatch?.descricao != null) {
                patchLancamento.descricao =
                    financeiroPatch.descricao;
            }

            if (financeiroPatch?.observacoes != null) {
                patchLancamento.observacoes =
                    financeiroPatch.observacoes;
            }

            if (Object.keys(patchLancamento).length > 0) {
                lancamento = ensureLancamento(
                    await dispatch(
                        updateLancamento({
                            id: lancamento.id,
                            patch: patchLancamento,
                        })
                    ).unwrap()
                );
            }

            /*
             * 4. Atualiza o resumo financeiro no evento.
             *
             * Não gera uma segunda tarefa Google.
             */
            const synced =
                await syncResumoFinanceiroNoEvento({
                    dispatch,
                    evento: eventoAtualizado,
                    lancamento,
                });

            return {
                evento: synced.evento,
                lancamento,
                resumo: synced.resumo,

                migrated:
                    Boolean(ensured.created),

                linked:
                    Boolean(ensured.linked),
            };
        }
    );

/* =========================================================
   Excluir evento + tratar lançamento vinculado
========================================================= */

export const deleteEventoComFinanceiro =
    createAsyncThunk(
        'financeiroWorkflow/deleteEventoComFinanceiro',

        async (
            eventoId,
            {
                dispatch,
                getState,
                rejectWithValue,
            }
        ) => {
            const safeEventoId =
                eventoId != null
                    ? String(eventoId)
                    : null;

            if (!safeEventoId) {
                return rejectWithValue(
                    'ID do evento é obrigatório.'
                );
            }

            try {
                const state =
                    getState();

                const evento =
                    getEventoFromState(
                        state,
                        safeEventoId
                    );

                if (!evento?.id) {
                    throw new Error(
                        `Evento ${safeEventoId} não encontrado no estado.`
                    );
                }

                const lancamentoId =
                    evento?.financeiro
                        ?.lancamentoId != null
                        ? String(
                            evento.financeiro
                                .lancamentoId
                        )
                        : null;

                let lancamento =
                    lancamentoId
                        ? state?.financeiro
                            ?.byId?.[
                                lancamentoId
                            ] || null
                        : null;

                /*
                 * Caso o lançamento ainda não esteja carregado
                 * no Redux, tenta buscá-lo antes de decidir entre
                 * cancelar ou excluir.
                 */
                if (
                    lancamentoId &&
                    !lancamento
                ) {
                    try {
                        lancamento =
                            await dispatch(
                                loadLancamentoById(
                                    lancamentoId
                                )
                            ).unwrap();
                    } catch (error) {
                        /*
                         * Um vínculo financeiro antigo pode apontar
                         * para um lançamento que já foi removido.
                         * Nesse caso, a exclusão do evento continua.
                         */
                        console.warn(
                            'Lançamento vinculado não encontrado durante a exclusão do evento:',
                            error
                        );

                        lancamento =
                            null;
                    }
                }

                let financeiroAction =
                    null;

                if (
                    lancamentoId &&
                    lancamento?.id
                ) {
                    const hasRecebimentos =
                        Array.isArray(
                            lancamento
                                ?.recebimentos
                        ) &&
                        lancamento
                            .recebimentos
                            .length >
                            0;

                    if (hasRecebimentos) {
                        await dispatch(
                            cancelLancamento(
                                lancamentoId
                            )
                        ).unwrap();

                        financeiroAction =
                            'cancelado';
                    } else {
                        await dispatch(
                            deleteLancamento(
                                lancamentoId
                            )
                        ).unwrap();

                        financeiroAction =
                            'excluido';
                    }
                }

                await dispatch(
                    deleteEvento(
                        safeEventoId
                    )
                ).unwrap();

                return {
                    eventoId:
                        safeEventoId,

                    lancamentoId,

                    financeiroAction,
                };
            } catch (error) {
                return rejectWithValue(
                    error?.message ||
                    'Não foi possível excluir o evento e tratar o lançamento financeiro.'
                );
            }
        }
    );
