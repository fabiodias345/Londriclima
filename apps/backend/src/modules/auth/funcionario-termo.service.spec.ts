import * as assert from "node:assert/strict";
import { test } from "node:test";
import { FuncionarioTermoService } from "./funcionario-termo.service";

test("gera termo PDF com identidade, clausulas e hash de auditoria", () => {
  const resultado = new FuncionarioTermoService().gerar({
    nome: "Joao Tecnico",
    cpf: "12345678901",
    aceitoEm: new Date("2026-07-03T15:00:00.000Z"),
    foto: Buffer.from("foto"),
    assinatura: Buffer.from("assinatura")
  });
  const texto = resultado.pdf.toString("latin1");
  assert.match(texto, /^%PDF-1\.4/);
  assert.match(texto, /Joao Tecnico/);
  assert.match(texto, /checklists/);
  assert.match(texto, /EPIs/);
  assert.match(resultado.sha256, /^[a-f0-9]{64}$/);
});
