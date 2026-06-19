import { BadRequestException } from "@nestjs/common";

export type AssinafyAccount = {
  id?: unknown;
};

export type AssinafySigner = {
  id?: unknown;
  email?: unknown;
};

export function statusConcluidoAssinafy(status: string) {
  return ["completed", "signed", "assinado", "concluido", "certificated"].includes(status.toLowerCase());
}

export function statusRecusadoAssinafy(status: string) {
  return [
    "refused",
    "rejected",
    "rejected_by_signer",
    "declined",
    "denied",
    "canceled",
    "cancelled",
    "cancelado",
    "recusado",
    "negado",
    "reprovado"
  ].includes(status.toLowerCase());
}

export function statusFinalizadoAssinafy(status: string) {
  return statusConcluidoAssinafy(status) || statusRecusadoAssinafy(status);
}

export function escolherStatusAssinafy(documentStatus: unknown, assignmentStatus: unknown) {
  const documentStatusString = stringOuNulo(documentStatus) ?? "pending";
  const assignmentStatusString = stringOuNulo(assignmentStatus);

  if (assignmentStatusString && statusFinalizadoAssinafy(assignmentStatusString)) {
    return assignmentStatusString;
  }

  return documentStatusString;
}

export function extrairMensagemErroAssinafy(data: unknown) {
  if (isRecord(data) && typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }
  return null;
}

export function extrairAccounts(data: unknown): AssinafyAccount[] {
  return extrairLista<AssinafyAccount>(data);
}

export function extrairLista<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (isRecord(data) && Array.isArray(data.data)) {
    return data.data as T[];
  }
  if (isRecord(data) && isRecord(data.data)) {
    return [data.data as T];
  }
  return [];
}

export function extrairPayload(data: unknown): Record<string, unknown> {
  if (isRecord(data) && isRecord(data.data)) {
    return data.data;
  }
  return isRecord(data) ? data : {};
}

export function exigirString(value: unknown, campo: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestException(`${campo} ausente.`);
  }
  return value;
}

export function stringOuNulo(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
