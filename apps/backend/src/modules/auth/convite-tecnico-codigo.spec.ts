import { test } from "node:test";
import * as assert from "node:assert/strict";
import { gerarCodigoConvite, hashCodigoConvite, normalizarCodigoConvite } from "./convite-tecnico-codigo";

test("codigo de convite e legivel, normalizado e armazenavel apenas como hash", () => {
  const codigo = gerarCodigoConvite();
  assert.match(codigo, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
  assert.equal(normalizarCodigoConvite(codigo.toLowerCase()), codigo.replace("-", ""));
  assert.match(hashCodigoConvite(codigo), /^[a-f0-9]{64}$/);
  assert.equal(hashCodigoConvite(codigo), hashCodigoConvite(codigo.replace("-", "").toLowerCase()));
});

test("convites gerados nao repetem em uma amostra operacional", () => {
  const codigos = new Set(Array.from({ length: 100 }, gerarCodigoConvite));
  assert.equal(codigos.size, 100);
});
