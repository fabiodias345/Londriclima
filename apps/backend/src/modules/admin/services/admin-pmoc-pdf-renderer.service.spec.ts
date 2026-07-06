import * as assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { AdminPmocPdfRendererService } from "./admin-pmoc-pdf-renderer.service";

test("PMOC PDF mostra checklist APK em tabela numerada com fotos e temperatura formatada", () => {
  const renderer = new AdminPmocPdfRendererService();
  const storageDir = resolve(process.cwd(), "..", "..", "storage", "os", "os-pmoc-renderer-test");
  const foto = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x03, 0x01, 0x11, 0x00, 0xff, 0xd9]);
  for (const arquivo of ["evidencias/depois.jpg", "checklist/bolsao.jpg", "checklist/insuflamento.jpg"]) {
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
                titulo: "PMOC semestral",
                checklist_tipo: "semestral",
                agendada_para: "2026-06-12T09:00:00.000Z",
                concluida_em: "2026-06-12T10:00:00.000Z",
                tecnico: { nome: "Joao Tecnico" },
                eventos: [],
                evidencias: [
                  { tipo: "antes", storage_url: "/storage/os/os-pmoc-renderer-test/checklist/bolsao.jpg" },
                  { tipo: "depois", storage_url: "/storage/os/os-pmoc-renderer-test/evidencias/depois.jpg" }
                ],
                checklist: { servico_realizado: "Checklist da maquina", procedimentos: [] },
                checklist_respostas: [
                  { codigo: "SEM_CONTROLE", tipo: "select_obs", valor: "Normal", observacao: null },
                  { codigo: "SEM_FIXACOES", tipo: "select_obs", valor: "Normal", observacao: null },
                  { codigo: "SEM_FOTO_BOLSAO", tipo: "foto", valor: "/storage/os/os-pmoc-renderer-test/checklist/bolsao.jpg", observacao: null },
                  { codigo: "SEM_FOTO_INSUFLAMENTO", tipo: "foto", valor: "/storage/os/os-pmoc-renderer-test/checklist/insuflamento.jpg", observacao: null },
                  { codigo: "SEM_HIGIENIZACAO_EVAP", tipo: "select_obs", valor: "Executado", observacao: null },
                  { codigo: "SEM_MOTORES", tipo: "select_obs", valor: "Normal", observacao: null },
                  { codigo: "SEM_TEMP_INSUFLAMENTO", tipo: "numerico", valor: "12", observacao: null }
                ]
              } as never
            ]
          }
        ]
      })
      .toString("latin1");

    assert.match(pdf, /CHECKLIST APK/);
    assert.match(pdf, /Manutenç/);
    assert.match(pdf, /Operação/);
    assert.match(pdf, /Identificaç/i);
    assert.match(pdf, /Informação/);
    assert.match(pdf, /TÉCNICO RESPONSÁVEL PELA EXECUÇÃO/);
    assert.match(pdf, /Foto do técnico/);
    assert.doesNotMatch(pdf, /Nao informado|nao informado|tecnico|usuario|EXECUCAO/);
    assert.match(pdf, /Item de Verifica/);
    assert.match(pdf, /Resultado/);
    assert.match(pdf, /Teste do controle remoto\/comandos/);
    assert.match(pdf, /suportes/);
    assert.match(pdf, /Higieniza/);
    assert.match(pdf, /Temperatura de insuflamento/);
    assert.match(pdf, /12/);
    assert.match(pdf, /C/);
    assert.doesNotMatch(pdf, /FOTOS/);
    assert.doesNotMatch(pdf, /depois\.jpg/);
    assert.equal((pdf.match(/\/Subtype \/Image/g) ?? []).length, 2);
    assert.doesNotMatch(pdf, /Checklist APK 7/);
    assert.doesNotMatch(pdf, /SEM_FOTO_BOLSAO/);
    assert.match(pdf, /QUINA N:001 - P/);
  } finally {
    rmSync(storageDir, { recursive: true, force: true });
  }
});
