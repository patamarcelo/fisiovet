// Migração progressiva de eventos legados.
// A implementação será conectada após o service financeiro.
// src/features/financeiro/financeiro.migration.js
// @ts-nocheck
//
// Migração progressiva do financeiro legado dos eventos.
//
// Responsabilidades:
// - localizar ou criar o lançamento financeiro do evento;
// - impedir lançamentos duplicados;
// - preservar pagamento e comprovante legados;
// - atualizar o resumo financeiro dentro do evento;
// - permitir execução repetida com segurança.

import {
    getLancamentoById,
    findLancamentoByEventoId,
    createLancamento,
} from '@/src/services/financeiro';

import {
    getEventoById,
    updateEvento as updateEventoService,
} from '@/src/services/agenda';

import {
    mapEventoToLancamento,
} from '@/src/features/financeiro/financeiro.mappers';

import {
    buildEventoFinanceiroResumo,
    sanitizeLancamento,
} from '@/src/features/financeiro/financeiro.helpers';

/* =========================================================
   Helpers
========================================================= */

function ensureStringId(value) {
    if (value == null || value === '') {
        return null;
    }

    return String(value);
}

function hasLancamentoLink(evento) {
    return Boolean(
        ensureStringId(
            evento?.financeiro?.lancamentoId
        )
    );
}

function isSameFinanceiroResumo(current = {}, next = {}) {
    return (
        String(current?.lancamentoId || '') ===
            String(next?.lancamentoId || '') &&
        Number(current?.preco || 0) ===
            Number(next?.preco || 0) &&
        Boolean(current?.pago) ===
            Boolean(next?.pago) &&
        String(current?.status || '') ===
            String(next?.status || '') &&
        Number(current?.valorRecebido || 0) ===
            Number(next?.valorRecebido || 0) &&
        Number(current?.saldo || 0) ===
            Number(next?.saldo || 0) &&
        String(current?.comprovanteUrl || '') ===
            String(next?.comprovanteUrl || '')
    );
}

/* =========================================================
   Atualização do resumo no evento
========================================================= */

export async function syncEventoFinanceiroResumo({
    evento,
    lancamento,
}) {
    if (!evento?.id) {
        throw new Error(
            'Evento inválido para sincronização financeira.'
        );
    }

    if (!lancamento?.id) {
        throw new Error(
            'Lançamento inválido para sincronização do evento.'
        );
    }

    const resumo = buildEventoFinanceiroResumo(
        lancamento,
        evento.financeiro || {}
    );

    if (
        isSameFinanceiroResumo(
            evento.financeiro || {},
            resumo
        )
    ) {
        return {
            evento,
            updated: false,
            resumo,
        };
    }

    const eventoAtualizado =
        await updateEventoService(
            String(evento.id),
            {
                financeiro: resumo,
            }
        );

    return {
        evento: eventoAtualizado,
        updated: true,
        resumo,
    };
}

/* =========================================================
   Busca segura
========================================================= */

async function findLinkedLancamento(evento) {
    const lancamentoId =
        ensureStringId(
            evento?.financeiro?.lancamentoId
        );

    if (!lancamentoId) {
        return null;
    }

    try {
        return await getLancamentoById(
            lancamentoId
        );
    } catch {
        return null;
    }
}

/* =========================================================
   Migração principal
========================================================= */

/**
 * Garante que um evento possua exatamente um lançamento.
 *
 * Ordem:
 * 1. tenta o lancamentoId gravado no evento;
 * 2. procura por origem.eventoId;
 * 3. cria um lançamento com base no evento legado;
 * 4. atualiza o resumo financeiro do evento.
 */
export async function ensureLancamentoForEventoMigration(
    eventoOrId,
    overrides = {}
) {
    const evento =
        typeof eventoOrId === 'object' &&
        eventoOrId !== null
            ? eventoOrId
            : await getEventoById(
                  String(eventoOrId)
              );

    if (!evento?.id) {
        throw new Error(
            'Evento inválido para migração financeira.'
        );
    }

    let lancamento = null;
    let created = false;
    let foundBy = null;

    /*
     * 1. Usa o vínculo já salvo no evento.
     */
    if (hasLancamentoLink(evento)) {
        lancamento =
            await findLinkedLancamento(evento);

        if (lancamento) {
            foundBy = 'lancamentoId';
        }
    }

    /*
     * 2. Procura por origem.eventoId.
     *
     * Isso cobre:
     * - evento cujo lançamento existe mas ainda não está vinculado;
     * - migração interrompida após criar o lançamento;
     * - chamada repetida da migração.
     */
    if (!lancamento) {
        lancamento =
            await findLancamentoByEventoId(
                evento.id
            );

        if (lancamento) {
            foundBy = 'eventoId';
        }
    }

    /*
     * 3. Cria o lançamento.
     *
     * createLancamento também possui proteção
     * contra duplicidade por eventoId.
     */
    if (!lancamento) {
        const payload =
            mapEventoToLancamento(
                evento,
                overrides
            );

        lancamento =
            await createLancamento(
                payload
            );

        created = true;
        foundBy = 'created';
    }

    const safeLancamento =
        sanitizeLancamento(lancamento);

    /*
     * 4. Atualiza ou repara o resumo no evento.
     */
    const syncResult =
        await syncEventoFinanceiroResumo({
            evento,
            lancamento: safeLancamento,
        });

    return {
        evento: syncResult.evento,
        lancamento: safeLancamento,

        created,
        linked: syncResult.updated,
        foundBy,

        resumo: syncResult.resumo,
    };
}

/* =========================================================
   Migração em lote
========================================================= */

/**
 * Migra uma lista de eventos sequencialmente.
 *
 * O processamento sequencial reduz:
 * - concorrência no Firestore;
 * - risco de duplicidade;
 * - excesso de gravações simultâneas.
 */
export async function migrateEventosFinanceiros(
    eventos = [],
    options = {}
) {
    const {
        includeZeroValue = true,
        stopOnError = false,
        onProgress = null,
    } = options;

    const result = {
        processed: 0,
        created: 0,
        linked: 0,
        skipped: 0,
        errors: [],
        items: [],
    };

    for (const evento of eventos || []) {
        try {
            const preco = Number(
                evento?.financeiro?.preco ??
                    evento?.preco ??
                    0
            );

            const pago = Boolean(
                evento?.financeiro?.pago
            );

            /*
             * Pode ignorar eventos sem qualquer dado financeiro,
             * caso essa opção seja usada em uma migração administrativa.
             *
             * No fluxo normal, includeZeroValue deve continuar true,
             * pois eventos novos podem começar como rascunho.
             */
            if (
                !includeZeroValue &&
                preco <= 0 &&
                !pago
            ) {
                result.skipped += 1;
                continue;
            }

            const migration =
                await ensureLancamentoForEventoMigration(
                    evento
                );

            result.processed += 1;

            if (migration.created) {
                result.created += 1;
            }

            if (migration.linked) {
                result.linked += 1;
            }

            result.items.push({
                eventoId: String(evento.id),
                lancamentoId:
                    String(
                        migration.lancamento.id
                    ),
                created:
                    migration.created,
                linked:
                    migration.linked,
                foundBy:
                    migration.foundBy,
            });

            if (
                typeof onProgress ===
                'function'
            ) {
                onProgress({
                    ...result,
                    currentEventoId:
                        String(evento.id),
                });
            }
        } catch (error) {
            const failure = {
                eventoId:
                    evento?.id != null
                        ? String(evento.id)
                        : null,

                message:
                    error?.message ||
                    'Erro desconhecido na migração financeira.',
            };

            result.errors.push(failure);

            if (stopOnError) {
                throw error;
            }
        }
    }

    return result;
}