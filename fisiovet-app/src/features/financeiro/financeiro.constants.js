export const FINANCEIRO_STATUS = Object.freeze({
  RASCUNHO: "rascunho",
  PENDENTE: "pendente",
  PARCIAL: "parcial",
  PAGO: "pago",
  VENCIDO: "vencido",
  CANCELADO: "cancelado",
});

export const FINANCEIRO_ORIGEM = Object.freeze({
  EVENTO: "evento",
  AVULSO: "avulso",
});

export const FINANCEIRO_CATEGORIA = Object.freeze({
  ATENDIMENTO: "atendimento",
  AVALIACAO: "avaliacao",
  LAUDO: "laudo",
  ANALISE: "analise",
  PACOTE: "pacote",
  PRODUTO: "produto",
  OUTRO: "outro",
});

export const FINANCEIRO_FORMA_PAGAMENTO = Object.freeze({
  PIX: "pix",
  DINHEIRO: "dinheiro",
  CARTAO_CREDITO: "cartao_credito",
  CARTAO_DEBITO: "cartao_debito",
  TRANSFERENCIA: "transferencia",
  BOLETO: "boleto",
  NAO_INFORMADO: "nao_informado",
  OUTRO: "outro",
});

export const FINANCEIRO_INTEGRACAO_STATUS = Object.freeze({
  NAO_INTEGRADO: "nao_integrado",
  PENDENTE: "pendente",
  SINCRONIZADO: "sincronizado",
  ERRO: "erro",
});
