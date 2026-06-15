// @ts-nocheck
import { FINANCEIRO_STATUS } from "./financeiro.constants";


export function normalizeMoney(value) {
  if (value == null || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? Math.max(0, value)
      : 0;
  }

  const normalized = String(value)
    .trim()
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number(normalized);

  return Number.isFinite(number)
    ? Math.max(0, number)
    : 0;
}

export function normalizeDateToIso(value, fallback = null) {
  if (!value) return fallback;

  if (value?.toDate) {
    return value.toDate().toISOString();
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toISOString();
}

export function calculateFinancialValues({
  original = 0,
  desconto = 0,
  acrescimo = 0,
  recebimentos = [],
} = {}) {
  const safeOriginal = normalizeMoney(original);
  const safeDesconto = normalizeMoney(desconto);
  const safeAcrescimo = normalizeMoney(acrescimo);

  const final = Math.max(
    0,
    safeOriginal - safeDesconto + safeAcrescimo
  );

  const recebido = (recebimentos || []).reduce(
    (total, recebimento) =>
      total + normalizeMoney(recebimento?.valor),
    0
  );

  const saldo = Math.max(final - recebido, 0);

  return {
    original: safeOriginal,
    desconto: safeDesconto,
    acrescimo: safeAcrescimo,
    final,
    recebido,
    saldo,
  };
}

export function calculateFinancialStatus({
  valores,
  vencimento,
  cancelado = false,
} = {}) {
  if (cancelado) {
    return FINANCEIRO_STATUS.CANCELADO;
  }

  const final = normalizeMoney(valores?.final);
  const recebido = normalizeMoney(valores?.recebido);
  const saldo = normalizeMoney(valores?.saldo);

  if (final <= 0) {
    return FINANCEIRO_STATUS.RASCUNHO;
  }

  if (recebido >= final || saldo <= 0) {
    return FINANCEIRO_STATUS.PAGO;
  }

  if (recebido > 0) {
    return FINANCEIRO_STATUS.PARCIAL;
  }

  if (vencimento) {
    const dueDate = new Date(vencimento);
    const now = new Date();

    dueDate.setHours(23, 59, 59, 999);

    if (
      !Number.isNaN(dueDate.getTime()) &&
      dueDate < now
    ) {
      return FINANCEIRO_STATUS.VENCIDO;
    }
  }

  return FINANCEIRO_STATUS.PENDENTE;
}

export function sanitizeRecebimento(
  recebimento = {},
  fallbackId = null
) {
  const nowIso = new Date().toISOString();

  return {
    id:
      recebimento.id ||
      fallbackId ||
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    valor: normalizeMoney(recebimento.valor),

    formaPagamento:
      recebimento.formaPagamento ||
      "nao_informado",

    origem:
      recebimento.origem ||
      "manual",

    recebidoEm:
      normalizeDateToIso(
        recebimento.recebidoEm,
        nowIso
      ),

    observacao:
      recebimento.observacao ||
      recebimento.observacoes ||
      "",

    comprovanteUrl:
      recebimento.comprovanteUrl ??
      null,

    createdAt:
      normalizeDateToIso(
        recebimento.createdAt,
        nowIso
      ),
  };
}

export function sanitizeLancamento(
  lancamento = {},
  previous = null
) {
  const nowIso = new Date().toISOString();

  const recebimentos = Array.isArray(
    lancamento.recebimentos
  )
    ? lancamento.recebimentos.map(
        (item, index) =>
          sanitizeRecebimento(
            item,
            `${lancamento.id || "fin"}-rec-${index}`
          )
      )
    : [];

  const valores = calculateFinancialValues({
    original:
      lancamento?.valores?.original ??
      lancamento.valor ??
      lancamento.preco ??
      0,

    desconto:
      lancamento?.valores?.desconto ??
      0,

    acrescimo:
      lancamento?.valores?.acrescimo ??
      0,

    recebimentos,
  });

  const vencimento = normalizeDateToIso(
    lancamento.vencimento,
    normalizeDateToIso(
      lancamento.competencia,
      nowIso
    )
  );

  const status = calculateFinancialStatus({
    valores,
    vencimento,
    cancelado:
      lancamento.status ===
      FINANCEIRO_STATUS.CANCELADO,
  });

  return {
    ...(previous || {}),
    ...lancamento,

    id:
      String(
        lancamento.id ||
        previous?.id ||
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`
      ),

    origem: {
      tipo:
        lancamento?.origem?.tipo ||
        "avulso",

      eventoId:
        lancamento?.origem?.eventoId != null
          ? String(
              lancamento.origem.eventoId
            )
          : null,

      seriesId:
        lancamento?.origem?.seriesId != null
          ? String(
              lancamento.origem.seriesId
            )
          : null,
    },

    tutorId:
      lancamento.tutorId != null
        ? String(lancamento.tutorId)
        : null,

    petIds: Array.isArray(
      lancamento.petIds
    )
      ? lancamento.petIds.map(String)
      : [],

    categoria:
      lancamento.categoria ||
      "outro",

    descricao:
      lancamento.descricao ||
      "",

    competencia:
      normalizeDateToIso(
        lancamento.competencia,
        nowIso
      ),

    vencimento,

    valores,
    status,
    recebimentos,

    observacoes:
      lancamento.observacoes ||
      "",

    comprovanteUrl:
      lancamento.comprovanteUrl ??
      null,

    integracao: {
      provider:
        lancamento?.integracao
          ?.provider ?? null,

      customerId:
        lancamento?.integracao
          ?.customerId ?? null,

      cobrancaId:
        lancamento?.integracao
          ?.cobrancaId ?? null,

      status:
        lancamento?.integracao
          ?.status ||
        "nao_integrado",

      paymentUrl:
        lancamento?.integracao
          ?.paymentUrl ?? null,

      syncedAt:
        lancamento?.integracao
          ?.syncedAt ?? null,

      error:
        lancamento?.integracao
          ?.error ?? null,
    },

    createdAt:
      normalizeDateToIso(
        previous?.createdAt ||
          lancamento.createdAt,
        nowIso
      ),

    updatedAt: nowIso,
  };
}

export function buildEventoFinanceiroResumo(
  lancamento,
  previousFinanceiro = {}
) {
  const safe = sanitizeLancamento(
    lancamento
  );

  return {
    ...previousFinanceiro,

    lancamentoId: safe.id,

    preco: safe.valores.final,

    pago:
      safe.status ===
      FINANCEIRO_STATUS.PAGO,

    status: safe.status,

    valorRecebido:
      safe.valores.recebido,

    saldo:
      safe.valores.saldo,

    comprovanteUrl:
      safe.comprovanteUrl ??
      previousFinanceiro
        ?.comprovanteUrl ??
      null,
  };
}
