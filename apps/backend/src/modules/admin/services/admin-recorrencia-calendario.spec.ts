import * as assert from "node:assert/strict";
import { test } from "node:test";
import { ChecklistTipo, PlanoRecorrenciaFrequencia } from "@prisma/client";
import {
  calcularProximaExecucaoPorCalendario,
  normalizarCalendarioRecorrencia,
  obterChecklistDoMes
} from "./admin-recorrencia-calendario";

test("calendario PMOC mensal trimestral semestral anual escolhe checklist por mes", () => {
  const calendario = normalizarCalendarioRecorrencia(
    {
      1: "mensal",
      2: "mensal",
      3: "trimestral",
      4: "mensal",
      5: "mensal",
      6: "semestral",
      7: "mensal",
      8: "mensal",
      9: "trimestral",
      10: "mensal",
      11: "mensal",
      12: "anual"
    },
    PlanoRecorrenciaFrequencia.mensal
  );

  assert.equal(obterChecklistDoMes(calendario, new Date("2026-01-10T08:00:00.000Z"), ChecklistTipo.mensal), ChecklistTipo.mensal);
  assert.equal(obterChecklistDoMes(calendario, new Date("2026-03-10T08:00:00.000Z"), ChecklistTipo.mensal), ChecklistTipo.trimestral);
  assert.equal(obterChecklistDoMes(calendario, new Date("2026-06-10T08:00:00.000Z"), ChecklistTipo.mensal), ChecklistTipo.semestral);
  assert.equal(obterChecklistDoMes(calendario, new Date("2026-12-10T08:00:00.000Z"), ChecklistTipo.mensal), ChecklistTipo.anual);
});

test("calendario pula meses marcados como nenhum ao calcular proxima OS", () => {
  const calendario = normalizarCalendarioRecorrencia(
    {
      1: "mensal",
      2: "nenhum",
      3: "trimestral"
    },
    PlanoRecorrenciaFrequencia.mensal
  );

  const proxima = calcularProximaExecucaoPorCalendario(
    new Date("2026-01-31T08:00:00.000Z"),
    calendario,
    PlanoRecorrenciaFrequencia.mensal
  );

  assert.equal(proxima.toISOString(), "2026-03-31T08:00:00.000Z");
});
