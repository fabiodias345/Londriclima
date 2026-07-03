import * as assert from "node:assert/strict";
import { test } from "node:test";
import { CategoriaAtendimento, ChecklistTipo, OrdemServicoTipoServico } from "@prisma/client";
import {
  codigosObrigatoriosChecklistEtapaAnual,
  codigosObrigatoriosChecklistPorServico,
  montarChecklistMobile,
  montarChecklistMobilePorServico
} from "./mobile-checklists";

const codigos = (tipo: ChecklistTipo) => montarChecklistMobile(tipo).map((item) => item.codigo);

test("checklist mobile mensal e independente", () => {
  assert.deepEqual(codigos(ChecklistTipo.mensal), [
    "MEN_FILTRO",
    "MEN_CONTROLE",
    "MEN_DRENO",
    "MEN_VISUAL",
    "MEN_TEMP_INSUFLAMENTO",
    "MEN_TEMP_RETORNO",
    "MEN_FOTO_INSUFLAMENTO",
    "MEN_FOTO_FILTRO"
  ]);
});

test("checklist mobile trimestral e independente", () => {
  assert.deepEqual(codigos(ChecklistTipo.trimestral), [
    "TRI_FILTRO",
    "TRI_CONTROLE",
    "TRI_DRENO",
    "TRI_VISUAL",
    "TRI_SERPENTINA",
    "TRI_ELETRICA",
    "TRI_MOTORES",
    "TRI_ISOLAMENTO",
    "TRI_CIRCUITO",
    "TRI_TEMP_INSUFLAMENTO",
    "TRI_TEMP_RETORNO",
    "TRI_FOTO_INSUFLAMENTO",
    "TRI_FOTO_FILTRO"
  ]);
});

test("checklist mobile semestral e independente", () => {
  assert.deepEqual(codigos(ChecklistTipo.semestral), [
    "SEM_CONTROLE",
    "SEM_HIGIENIZACAO_EVAP",
    "SEM_FOTO_BOLSAO",
    "SEM_MOTORES",
    "SEM_FIXACOES",
    "SEM_TEMP_INSUFLAMENTO",
    "SEM_FOTO_INSUFLAMENTO"
  ]);
});

test("checklist mobile anual separa evaporadora e condensadora", () => {
  const checklist = montarChecklistMobile(ChecklistTipo.anual);
  assert.deepEqual(checklist.map((item) => item.codigo), [
    "ANU_CONTROLE",
    "ANU_HIGIENIZACAO_EVAP",
    "ANU_FOTO_BOLSAO",
    "ANU_HIGIENIZACAO_COND",
    "ANU_FOTO_COND",
    "ANU_CIRCUITO",
    "ANU_ELETRICA",
    "ANU_ISOLAMENTO",
    "ANU_TEMP_INSUFLAMENTO",
    "ANU_TEMP_RETORNO",
    "ANU_FOTO_INSUFLAMENTO"
  ]);
  assert.deepEqual(
    Object.fromEntries(checklist.map((item) => [item.codigo, item.etapa])),
    {
      ANU_CONTROLE: "evaporadora",
      ANU_HIGIENIZACAO_EVAP: "evaporadora",
      ANU_FOTO_BOLSAO: "evaporadora",
      ANU_HIGIENIZACAO_COND: "condensadora",
      ANU_FOTO_COND: "condensadora",
      ANU_CIRCUITO: "condensadora",
      ANU_ELETRICA: "condensadora",
      ANU_ISOLAMENTO: "condensadora",
      ANU_TEMP_INSUFLAMENTO: "evaporadora",
      ANU_TEMP_RETORNO: "evaporadora",
      ANU_FOTO_INSUFLAMENTO: "evaporadora"
    }
  );
  assert.deepEqual(new Set(checklist.map((item) => item.etapa)), new Set(["evaporadora", "condensadora"]));
  assert.deepEqual(codigosObrigatoriosChecklistEtapaAnual("evaporadora"), [
    "ANU_CONTROLE",
    "ANU_HIGIENIZACAO_EVAP",
    "ANU_FOTO_BOLSAO",
    "ANU_TEMP_INSUFLAMENTO",
    "ANU_TEMP_RETORNO",
    "ANU_FOTO_INSUFLAMENTO"
  ]);
  assert.deepEqual(codigosObrigatoriosChecklistEtapaAnual("condensadora"), [
    "ANU_HIGIENIZACAO_COND",
    "ANU_FOTO_COND",
    "ANU_CIRCUITO",
    "ANU_ELETRICA",
    "ANU_ISOLAMENTO"
  ]);
});

test("checklist mobile de camara fria usa perguntas estruturadas e temperaturas em celsius", () => {
  const checklist = montarChecklistMobilePorServico(
    OrdemServicoTipoServico.preventiva,
    ChecklistTipo.anual,
    CategoriaAtendimento.camara_fria
  );

  assert.deepEqual(checklist.map((item) => item.codigo), [
    "CFA_CONTROLADOR",
    "CFA_PORTA",
    "CFA_DEGELO",
    "CFA_HIGIENIZACAO_EVAP",
    "CFA_DRENO_EVAP",
    "CFA_HIGIENIZACAO_COND",
    "CFA_CIRCUITO",
    "CFA_ELETRICA",
    "CFA_TEMP_AMBIENTE",
    "CFA_TEMP_RETORNO",
    "CFA_FOTO_CONTROLADOR",
    "CFA_FOTO_EVAP",
    "CFA_FOTO_COND"
  ]);
  assert.deepEqual(codigosObrigatoriosChecklistEtapaAnual("evaporadora", CategoriaAtendimento.camara_fria), [
    "CFA_CONTROLADOR",
    "CFA_PORTA",
    "CFA_DEGELO",
    "CFA_HIGIENIZACAO_EVAP",
    "CFA_DRENO_EVAP",
    "CFA_TEMP_AMBIENTE",
    "CFA_TEMP_RETORNO",
    "CFA_FOTO_CONTROLADOR",
    "CFA_FOTO_EVAP"
  ]);
  assert.deepEqual(codigosObrigatoriosChecklistEtapaAnual("condensadora", CategoriaAtendimento.camara_fria), [
    "CFA_HIGIENIZACAO_COND",
    "CFA_CIRCUITO",
    "CFA_ELETRICA",
    "CFA_FOTO_COND"
  ]);
  assert.equal(checklist.filter((item) => item.tipo === "foto").length, 3);
  assert.equal(checklist.filter((item) => item.tipo === "numerico").every((item) => item.unidade === "\u00B0C"), true);
});

test("checklist mobile instalacao usa fluxo proprio", () => {
  const checklist = montarChecklistMobilePorServico(OrdemServicoTipoServico.instalacao, ChecklistTipo.mensal);

  assert.deepEqual(checklist.map((item) => item.codigo), [
    "INS_FIXACAO",
    "INS_TUBULACAO",
    "INS_DRENO",
    "INS_ELETRICA",
    "INS_ESTANQUEIDADE",
    "INS_TESTE",
    "INS_TEMP_INSUFLAMENTO",
    "INS_TEMP_RETORNO",
    "INS_FOTO_EVAP",
    "INS_FOTO_COND"
  ]);
  assert.deepEqual(codigosObrigatoriosChecklistPorServico(OrdemServicoTipoServico.instalacao, ChecklistTipo.anual), [
    "INS_FIXACAO",
    "INS_TUBULACAO",
    "INS_DRENO",
    "INS_ELETRICA",
    "INS_ESTANQUEIDADE",
    "INS_TESTE",
    "INS_TEMP_INSUFLAMENTO",
    "INS_TEMP_RETORNO",
    "INS_FOTO_EVAP",
    "INS_FOTO_COND"
  ]);
});

test("checklist mobile usa respostas estruturadas sem sim ou nao", () => {
  for (const tipo of Object.values(ChecklistTipo)) {
    for (const item of montarChecklistMobile(tipo)) {
      assert.equal(item.obrigatorio, true);
      assert.equal(item.opcoes?.includes("Sim") ?? false, false);
      assert.equal(item.opcoes?.includes("Não") ?? false, false);
    }
  }
});
