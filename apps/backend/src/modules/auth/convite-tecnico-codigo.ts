import { createHash, randomInt } from "node:crypto";

const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function normalizarCodigoConvite(codigo: string) {
  return codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashCodigoConvite(codigo: string) {
  return createHash("sha256").update(normalizarCodigoConvite(codigo)).digest("hex");
}

export function gerarCodigoConvite() {
  const caracteres = Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${caracteres.slice(0, 4)}-${caracteres.slice(4)}`;
}
