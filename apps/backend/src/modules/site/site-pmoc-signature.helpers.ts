import { BadRequestException } from "@nestjs/common";
import { createHash } from "node:crypto";

const PDF_ASSINADO_MAX_BYTES = 15 * 1024 * 1024;

type ConfirmarAssinaturaPmocPayload = {
  pdf_assinado_base64?: unknown;
  pdf_assinado_filename?: unknown;
};

export function validarPdfAssinadoGovBr(dto: unknown, clienteNome: string) {
  if (!dto || typeof dto !== "object" || Array.isArray(dto)) {
    throw new BadRequestException("Envie o PDF assinado no Gov.br.");
  }

  const payload = dto as ConfirmarAssinaturaPmocPayload;
  const base64 = normalizarPdfBase64(payload.pdf_assinado_base64);
  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length || buffer.length > PDF_ASSINADO_MAX_BYTES) {
    throw new BadRequestException("PDF assinado invalido ou acima do limite de 15 MB.");
  }

  if (buffer.subarray(0, 4).toString("utf8") !== "%PDF") {
    throw new BadRequestException("O arquivo assinado deve ser um PDF.");
  }

  return {
    base64,
    filename: normalizarNomePdfAssinado(payload.pdf_assinado_filename, clienteNome),
    hash: createHash("sha256").update(buffer).digest("hex")
  };
}

function normalizarPdfBase64(valor: unknown) {
  if (typeof valor !== "string" || !valor.trim()) {
    throw new BadRequestException("Envie o PDF assinado no Gov.br.");
  }

  const normalizado = valor.replace(/^data:application\/pdf;base64,/i, "").replace(/\s/g, "");

  if (!normalizado || normalizado.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalizado)) {
    throw new BadRequestException("PDF assinado em base64 invalido.");
  }

  return normalizado;
}

function normalizarNomePdfAssinado(valor: unknown, clienteNome: string) {
  if (typeof valor === "string" && /^[\w.\- ]+\.pdf$/i.test(valor.trim())) {
    return valor.trim();
  }

  const slug = clienteNome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `pmoc-${slug || "cliente"}-assinado-govbr.pdf`;
}
