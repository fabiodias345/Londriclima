import * as assert from "node:assert/strict";
import { test } from "node:test";
import { FuncionarioTermoService, TERMO_RESPONSABILIDADE_VERSAO } from "./funcionario-termo.service";

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
  assert.match(texto, /proteção/);
  assert.match(texto, /identificação/);
  assert.match(texto, /não/);
  assert.match(texto, /relatórios/);
  assert.match(texto, /serviços/);
  assert.match(texto, /Versão/);
  assert.match(texto, /DECLARAÇÃO/);
  assert.equal(TERMO_RESPONSABILIDADE_VERSAO, "2026-07-04");
  assert.match(resultado.sha256, /^[a-f0-9]{64}$/);
});
