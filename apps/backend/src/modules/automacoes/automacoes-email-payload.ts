import { Prisma } from "@prisma/client";

type AutomacaoEmailPayload = {
  tipo?: unknown;
  relatorio_id?: unknown;
  cliente_id?: unknown;
  cliente_nome?: unknown;
  cliente_email?: unknown;
  data_envio?: unknown;
  engenheiro_cpf?: unknown;
  engenheiro_email?: unknown;
  engenheiro_nome?: unknown;
  engenheiro_crea?: unknown;
  data_evento?: unknown;
  assinafy_status?: unknown;
  periodo_inicio?: unknown;
  periodo_fim?: unknown;
  total_maquinas?: unknown;
  total_os_concluidas?: unknown;
  os_ids?: unknown;
  link_assinatura?: unknown;
  pdf_hash?: unknown;
  pdf_filename?: unknown;
  pdf_base64?: unknown;
};

type PayloadAssinaturaEngenheiro = {
  tipo: "pmoc_assinatura_engenheiro";
  relatorio_id: string;
  cliente_nome: string;
  cliente_email: string;
  data_envio: string;
  engenheiro_email: string;
  engenheiro_nome: string;
  link_assinatura: string;
  pdf_hash: string;
  pdf_filename: string;
  pdf_base64: string;
};

type PayloadRelatorioAssinado = {
  tipo: "pmoc_relatorio_assinado";
  relatorio_id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_email: string;
  data_envio: string;
  engenheiro_nome: string;
  engenheiro_cpf: string;
  engenheiro_crea: string;
  pdf_hash: string;
  pdf_filename: string;
  pdf_base64: string;
};

type PayloadAssinaturaNegada = {
  tipo: "pmoc_assinatura_negada";
  relatorio_id: string;
  cliente_nome: string;
  cliente_email: string;
  data_evento: string;
  engenheiro_nome: string;
  assinafy_status: string;
};

type PayloadRelatorioTecnicoAvulso = {
  tipo: "relatorio_tecnico_avulso";
  cliente_id: string;
  cliente_nome: string;
  cliente_email: string;
  data_envio: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  total_maquinas: number;
  total_os_concluidas: number;
  os_ids: string[];
  pdf_filename: string;
  pdf_base64: string;
};

export type PayloadEmailAutomacao =
  | PayloadAssinaturaEngenheiro
  | PayloadRelatorioAssinado
  | PayloadAssinaturaNegada
  | PayloadRelatorioTecnicoAvulso;

export function validarPayloadAutomacaoEmail(payload: Prisma.JsonValue): PayloadEmailAutomacao {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Payload de e-mail invalido.");
  }

  const dados = payload as AutomacaoEmailPayload;

  if (dados.tipo === "pmoc_assinatura_engenheiro") {
    return {
      tipo: dados.tipo,
      relatorio_id: exigirString(dados.relatorio_id, "relatorio_id"),
      cliente_nome: exigirString(dados.cliente_nome, "cliente_nome"),
      cliente_email: exigirString(dados.cliente_email, "cliente_email"),
      data_envio: exigirString(dados.data_envio, "data_envio"),
      engenheiro_email: exigirString(dados.engenheiro_email, "engenheiro_email"),
      engenheiro_nome: exigirString(dados.engenheiro_nome, "engenheiro_nome"),
      link_assinatura: exigirString(dados.link_assinatura, "link_assinatura"),
      pdf_hash: exigirString(dados.pdf_hash, "pdf_hash"),
      pdf_filename: exigirString(dados.pdf_filename, "pdf_filename"),
      pdf_base64: exigirString(dados.pdf_base64, "pdf_base64")
    };
  }

  if (dados.tipo === "pmoc_relatorio_assinado") {
    return {
      tipo: dados.tipo,
      relatorio_id: exigirString(dados.relatorio_id, "relatorio_id"),
      cliente_id: exigirString(dados.cliente_id, "cliente_id"),
      cliente_nome: exigirString(dados.cliente_nome, "cliente_nome"),
      cliente_email: exigirString(dados.cliente_email, "cliente_email"),
      data_envio: exigirString(dados.data_envio, "data_envio"),
      engenheiro_nome: exigirString(dados.engenheiro_nome, "engenheiro_nome"),
      engenheiro_cpf: exigirString(dados.engenheiro_cpf, "engenheiro_cpf"),
      engenheiro_crea: exigirString(dados.engenheiro_crea, "engenheiro_crea"),
      pdf_hash: exigirString(dados.pdf_hash, "pdf_hash"),
      pdf_filename: exigirString(dados.pdf_filename, "pdf_filename"),
      pdf_base64: exigirString(dados.pdf_base64, "pdf_base64")
    };
  }

  if (dados.tipo === "relatorio_tecnico_avulso") {
    return {
      tipo: dados.tipo,
      cliente_id: exigirString(dados.cliente_id, "cliente_id"),
      cliente_nome: exigirString(dados.cliente_nome, "cliente_nome"),
      cliente_email: exigirString(dados.cliente_email, "cliente_email"),
      data_envio: exigirString(dados.data_envio, "data_envio"),
      periodo_inicio: stringOuNulo(dados.periodo_inicio),
      periodo_fim: stringOuNulo(dados.periodo_fim),
      total_maquinas: exigirNumero(dados.total_maquinas, "total_maquinas"),
      total_os_concluidas: exigirNumero(dados.total_os_concluidas, "total_os_concluidas"),
      os_ids: exigirListaStrings(dados.os_ids, "os_ids"),
      pdf_filename: exigirString(dados.pdf_filename, "pdf_filename"),
      pdf_base64: exigirString(dados.pdf_base64, "pdf_base64")
    };
  }

  if (dados.tipo === "pmoc_assinatura_negada") {
    return {
      tipo: dados.tipo,
      relatorio_id: exigirString(dados.relatorio_id, "relatorio_id"),
      cliente_nome: exigirString(dados.cliente_nome, "cliente_nome"),
      cliente_email: exigirString(dados.cliente_email, "cliente_email"),
      data_evento: exigirString(dados.data_evento, "data_evento"),
      engenheiro_nome: exigirString(dados.engenheiro_nome, "engenheiro_nome"),
      assinafy_status: exigirString(dados.assinafy_status, "assinafy_status")
    };
  }

  throw new Error("Tipo de e-mail nao suportado.");
}

function exigirString(valor: unknown, campo: string) {
  if (typeof valor !== "string" || !valor.trim()) {
    throw new Error(`Payload de e-mail sem ${campo}.`);
  }

  return valor.trim();
}

function stringOuNulo(valor: unknown) {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function exigirNumero(valor: unknown, campo: string) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new Error(`Payload de e-mail sem ${campo}.`);
  }

  return valor;
}

function exigirListaStrings(valor: unknown, campo: string) {
  if (!Array.isArray(valor) || valor.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`Payload de e-mail sem ${campo}.`);
  }

  return valor.map((item) => item.trim());
}
