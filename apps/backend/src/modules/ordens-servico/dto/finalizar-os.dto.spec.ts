import "reflect-metadata";
import { validate } from "class-validator";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { FinalizarOsDto } from "./finalizar-os.dto";

test("finalizacao exige nome e assinatura do tecnico", async () => {
  const dto = Object.assign(new FinalizarOsDto(), {
    assinatura_cliente_base64: "assinatura-cliente",
    nome_responsavel_assinatura: "Maria Souza",
    latitude: -23.3,
    longitude: -51.1,
    finalizado_em: "2026-07-02T18:00:00.000Z"
  });

  const camposInvalidos = (await validate(dto)).map((erro) => erro.property);

  assert.ok(camposInvalidos.includes("assinatura_tecnico_base64"));
  assert.ok(camposInvalidos.includes("nome_tecnico_assinatura"));
});
