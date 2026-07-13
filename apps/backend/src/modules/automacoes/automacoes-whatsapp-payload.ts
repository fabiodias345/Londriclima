import { Prisma } from "@prisma/client";

export type AutomacaoWhatsappPayload = {
  tipo: "os_finalizada";
  os_id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_telefone: string;
  titulo: string;
  finalizado_em: string;
};

export function validarPayloadAutomacaoWhatsapp(payload: Prisma.JsonValue): AutomacaoWhatsappPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Payload WhatsApp invalido.");
  }

  const dados = payload as Partial<Record<keyof AutomacaoWhatsappPayload, unknown>>;

  if (dados.tipo !== "os_finalizada") {
    throw new Error("Tipo de payload WhatsApp invalido.");
  }

  return {
    tipo: dados.tipo,
    os_id: validarTexto(dados.os_id, "os_id"),
    cliente_id: validarTexto(dados.cliente_id, "cliente_id"),
    cliente_nome: validarTexto(dados.cliente_nome, "cliente_nome"),
    cliente_telefone: validarTexto(dados.cliente_telefone, "cliente_telefone"),
    titulo: validarTexto(dados.titulo, "titulo"),
    finalizado_em: validarTexto(dados.finalizado_em, "finalizado_em")
  };
}

function validarTexto(valor: unknown, campo: string) {
  if (typeof valor !== "string" || !valor.trim()) {
    throw new Error(`Payload WhatsApp sem ${campo}.`);
  }

  return valor.trim();
}
