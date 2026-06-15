import {
  FINANCEIRO_CATEGORIA,
  FINANCEIRO_FORMA_PAGAMENTO,
  FINANCEIRO_ORIGEM,
} from "./financeiro.constants";

import {
  normalizeMoney,
  sanitizeLancamento,
} from "./financeiro.helpers";

export function mapEventoToLancamento(
  evento,
  overrides = {}
) {
  const preco = normalizeMoney(
    overrides?.valor ??
    evento?.financeiro?.preco ??
    evento?.preco ??
    0
  );

  const pago = Boolean(
    evento?.financeiro?.pago
  );

  const recebimentos = pago && preco > 0
    ? [
        {
          id: `legacy-${evento.id}`,

          valor: preco,

          formaPagamento:
            FINANCEIRO_FORMA_PAGAMENTO
              .NAO_INFORMADO,

          origem: "migracao",

          recebidoEm:
            evento.updatedAt ||
            evento.start ||
            evento.createdAt ||
            new Date().toISOString(),

          observacao:
            "Pagamento importado do modelo financeiro anterior.",

          comprovanteUrl:
            evento?.financeiro
              ?.comprovanteUrl ??
            null,
        },
      ]
    : [];

  return sanitizeLancamento({
    id: overrides.id,

    origem: {
      tipo: FINANCEIRO_ORIGEM.EVENTO,
      eventoId: String(evento.id),
      seriesId:
        evento.seriesId != null
          ? String(evento.seriesId)
          : null,
    },

    tutorId:
      evento.tutorId ?? null,

    petIds: Array.isArray(
      evento.petIds
    )
      ? evento.petIds
      : [],

    categoria:
      FINANCEIRO_CATEGORIA
        .ATENDIMENTO,

    descricao:
      overrides.descricao ||
      evento.descricao ||
      evento.title ||
      "Atendimento",

    competencia:
      evento.start ||
      evento.date ||
      new Date().toISOString(),

    vencimento:
      overrides.vencimento ||
      evento.start ||
      evento.date ||
      new Date().toISOString(),

    valores: {
      original: preco,
      desconto: 0,
      acrescimo: 0,
    },

    recebimentos,

    observacoes:
      overrides.observacoes ||
      "",

    comprovanteUrl:
      evento?.financeiro
        ?.comprovanteUrl ??
      null,

    integracao: {
      provider: null,
      customerId: null,
      cobrancaId: null,
      status: "nao_integrado",
      paymentUrl: null,
      syncedAt: null,
      error: null,
    },
  });
}
