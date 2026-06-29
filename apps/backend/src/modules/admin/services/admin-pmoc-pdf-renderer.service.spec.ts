import * as assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { AdminPmocPdfRendererService } from "./admin-pmoc-pdf-renderer.service";

test("PMOC PDF inclui resumo do checklist executado no APK sem mudar a estrutura do documento", () => {
  const renderer = new AdminPmocPdfRendererService();
  const storageDir = resolve(process.cwd(), "..", "..", "storage", "os", "os-pmoc-renderer-test");
  const foto = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x03, 0x01, 0x11, 0x00, 0xff, 0xd9]);
  for (const arquivo of ["evidencias/antes.jpg", "evidencias/depois.jpg", "checklist/insuflamento.jpg", "checklist/filtro.jpg"]) {
    const caminho = resolve(storageDir, arquivo);
    mkdirSync(dirname(caminho), { recursive: true });
    writeFileSync(caminho, foto);
  }

  try {
    const pdf = renderer
    .gerar({
      cliente: {
        nome: "Cliente PMOC",
        documento: "12345678900",
        telefone: "43988887777",
        email: "cliente@example.com",
        pmoc_art_numero: "ART-123",
        endereco: { cidade: "Londrina", uf: "PR" }
      },
      periodo: { inicio: "2026-06-01T00:00:00.000Z", fim: "2026-06-30T00:00:00.000Z" },
      total_maquinas: 1,
      total_os_concluidas: 1,
      pronto_para_pdf: true,
      pendencias: [],
      maquinas: [
        {
          tipo: "Split",
          patrimonio: "PMOC-001",
          codigo_barras: "789",
          marca: "Springer",
          modelo: "Hi Wall",
          capacidade_btu: 12000,
          gas_refrigerante: "R-410A",
          numero_serie: "SN-1",
          local_instalacao: "Sala",
          os_concluidas: [
            {
              titulo: "PMOC trimestral",
              checklist_tipo: "trimestral",
              agendada_para: "2026-06-12T09:00:00.000Z",
              concluida_em: "2026-06-12T10:00:00.000Z",
              tecnico: { nome: "Joao Tecnico" },
              eventos: [],
              evidencias: [
                { tipo: "antes", storage_url: "/storage/os/os-pmoc-renderer-test/evidencias/antes.jpg" },
                { tipo: "depois", storage_url: "/storage/os/os-pmoc-renderer-test/evidencias/depois.jpg" }
              ],
              checklist: { servico_realizado: "Checklist da maquina", procedimentos: [] },
              checklist_respostas: [
                { codigo: "TRI_FILTRO", tipo: "select_obs", valor: "Executado", observacao: null },
                { codigo: "TRI_CONTROLE", tipo: "select_obs", valor: "Irregularidade encontrada", observacao: "controle sem pilha" },
                { codigo: "TRI_DRENO", tipo: "select_obs", valor: "Executado", observacao: null },
                { codigo: "TRI_VISUAL", tipo: "select_obs", valor: "Executado", observacao: null },
                { codigo: "TRI_SERPENTINA", tipo: "select_obs", valor: "Executado", observacao: null },
                { codigo: "TRI_ELETRICA", tipo: "select_obs", valor: "Executado", observacao: null },
                { codigo: "TRI_MOTORES", tipo: "select_obs", valor: "Executado", observacao: null },
                { codigo: "TRI_ISOLAMENTO", tipo: "select_obs", valor: "Executado", observacao: null },
                { codigo: "TRI_CIRCUITO", tipo: "select_obs", valor: "Executado", observacao: null },
                { codigo: "TRI_TEMP_INSUFLAMENTO", tipo: "numerico", valor: "7.5", observacao: "medicao ok" },
                { codigo: "TRI_TEMP_RETORNO", tipo: "numerico", valor: "19.2", observacao: null },
                { codigo: "TRI_FOTO_INSUFLAMENTO", tipo: "foto", valor: "/storage/os/os-pmoc-renderer-test/checklist/insuflamento.jpg", observacao: null },
                { codigo: "TRI_FOTO_FILTRO", tipo: "foto", valor: "/storage/os/os-pmoc-renderer-test/checklist/filtro.jpg", observacao: null }
              ]
            } as never
          ]
        }
      ]
    })
    .toString("latin1");

  assert.match(pdf, /Checklist APK/);
  assert.match(pdf, /EXECU/);
  assert.match(pdf, /EVID/);
  assert.match(pdf, /antes\.jpg/);
  assert.match(pdf, /depois\.jpg/);
  assert.match(pdf, /insuflamento\.jpg/);
  assert.match(pdf, /filtro\.jpg/);
  assert.equal((pdf.match(/\/Subtype \/Image/g) ?? []).length, 4);
    assert.match(pdf, /Limpeza ou substituição dos filtros: Executado/);
    assert.match(pdf, /Teste do controle remoto\/comandos: Irregularidade encontrada/);
    assert.match(pdf, /Temperatura de insuflamento: 7\.5/);
    assert.match(pdf, /Checklist APK 13/);
    assert.match(pdf, /Foto da máquina aberta com o filtro limpo: filtro\.jpg/);
  assert.match(pdf, /MÁQUINA N:001 - PÁGINA EXCLUSIVA/);
  } finally {
    rmSync(storageDir, { recursive: true, force: true });
  }
});
