import * as assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { PreviaPmoc } from "./admin-pmoc-pdf-models";
import { AdminPmocPdfRendererService } from "./admin-pmoc-pdf-renderer.service";

test("PMOC renderiza assinatura do cliente na declaracao final", () => {
  const storageUrl = "/storage/os/pmoc-assinatura-cliente/assinatura-cliente.jpg";
  const assinaturaPath = resolve(process.cwd(), "..", "..", "storage", "os", "pmoc-assinatura-cliente", "assinatura-cliente.jpg");
  mkdirSync(dirname(assinaturaPath), { recursive: true });
  writeFileSync(assinaturaPath, Buffer.from([0xff, 0xd8, 0xff, 0xd9, 0x10]));

  const previa: PreviaPmoc = {
    cliente: {
      nome: "Cliente Teste",
      documento: "12345678000199",
      telefone: null,
      email: null,
      endereco: null
    },
    periodo: { inicio: "2026-07-01T00:00:00.000Z", fim: "2026-07-31T00:00:00.000Z" },
    total_maquinas: 1,
    total_os_concluidas: 1,
    pronto_para_pdf: true,
    pendencias: [],
    maquinas: [{
      tipo: "Split",
      patrimonio: "AC-01",
      codigo_barras: null,
      marca: "LG",
      modelo: "Dual",
      capacidade_btu: 12000,
      gas_refrigerante: null,
      numero_serie: null,
      local_instalacao: "Sala",
      area_climatizada_m2: 20,
      ocupantes_fixo: 2,
      ocupantes_variavel: 1,
      pendencias: [],
      os_concluidas: [{
        titulo: "PMOC mensal",
        agendada_para: "2026-07-06T12:00:00.000Z",
        concluida_em: "2026-07-06T13:00:00.000Z",
        tecnico: { nome: "Tecnico Teste" },
        checklist_tipo: "mensal",
        eventos: [],
        evidencias: [],
        checklist: { procedimentos: [], servico_realizado: "PMOC mensal" },
        checklist_respostas: [],
        assinatura: { nome_responsavel: "Maria Souza", storage_url: storageUrl },
        observacoes: []
      }]
    }]
  };

  try {
    const pdf = new AdminPmocPdfRendererService().gerar(previa).toString("latin1");

    assert.match(pdf, /Assinatura do cliente - Maria Souza/);
    assert.match(pdf, /\/Subtype \/Image/);
  } finally {
    rmSync(resolve(process.cwd(), "..", "..", "storage", "os", "pmoc-assinatura-cliente"), { recursive: true, force: true });
  }
});
