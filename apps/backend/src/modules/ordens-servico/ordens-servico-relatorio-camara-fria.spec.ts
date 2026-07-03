import { CategoriaAtendimento, ChecklistTipo, EvidenciaTipo, OrdemServicoTipoServico } from "@prisma/client";
import * as assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { OrdensServicoRelatorioTecnicoRenderer } from "./ordens-servico-relatorio-tecnico-renderer";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

test("renderiza relatorio de camara fria com checklist fotos e duas assinaturas", async () => {
  const storageRoot = join(process.cwd(), "tmp", "fase-07-camara-fria");
  const pastaOs = join(storageRoot, "os", "os-cf", "checklist", "equip-1");
  await mkdir(pastaOs, { recursive: true });
  await Promise.all([
    writeFile(join(pastaOs, "controlador.png"), png),
    writeFile(join(pastaOs, "evaporadora.png"), png),
    writeFile(join(pastaOs, "condensadora.png"), png),
    writeFile(join(storageRoot, "os", "os-cf", "assinatura.png"), png),
    writeFile(join(storageRoot, "os", "os-cf", "assinatura-tecnico.png"), png)
  ]);

  try {
    const pdf = new OrdensServicoRelatorioTecnicoRenderer().renderizar({
      osId: "OS-CF-001",
      categoriaServico: CategoriaAtendimento.camara_fria,
      checklistTipo: ChecklistTipo.mensal,
      clienteNome: "Mercado Central",
      clienteDocumento: "12.345.678/0001-90",
      clienteEmail: "cliente@example.com",
      clienteEndereco: "Rua Teste, 10, Londrina, PR",
      titulo: "Preventiva camara fria mensal",
      tipoServico: OrdemServicoTipoServico.preventiva,
      agendadaPara: new Date("2026-07-02T12:00:00.000Z"),
      finalizadoEm: new Date("2026-07-02T14:00:00.000Z"),
      assinaturaUrl: "/storage/os/os-cf/assinatura.png",
      nomeResponsavelAssinatura: "Maria Responsavel",
      assinaturaTecnicoUrl: "/storage/os/os-cf/assinatura-tecnico.png",
      nomeTecnicoAssinatura: "Joao Tecnico",
      storageRoot,
      totalMaquinas: 1,
      equipamento: null,
      equipamentos: [{
        id: "equip-1",
        tipo: "Camara fria",
        marca: "Danfoss",
        modelo: "CF-10",
        numeroSerie: "SERIE-01",
        codigoQr: "QR-CF-01",
        localInstalacao: "Deposito",
        gasRefrigerante: "R-404A"
      }],
      evidencias: [{
        tipo: EvidenciaTipo.antes,
        descricao: "Vista geral",
        storageUrl: "/storage/os/os-cf/checklist/equip-1/evaporadora.png",
        criadoEm: new Date("2026-07-02T12:30:00.000Z")
      }],
      checklistRespostas: [
        { equipamentoId: "equip-1", codigo: "CFM_PORTA", tipo: "select_obs", valor: "Normal", observacao: null },
        { equipamentoId: "equip-1", codigo: "CFM_TEMP_AMBIENTE", tipo: "numerico", valor: "2", observacao: null },
        { equipamentoId: "equip-1", codigo: "CFM_FOTO_CONTROLADOR", tipo: "foto", valor: "/storage/os/os-cf/checklist/equip-1/controlador.png", observacao: null },
        { equipamentoId: "equip-1", codigo: "CFM_FOTO_EVAP", tipo: "foto", valor: "/storage/os/os-cf/checklist/equip-1/evaporadora.png", observacao: null },
        { equipamentoId: "equip-1", codigo: "CFM_FOTO_COND", tipo: "foto", valor: "/storage/os/os-cf/checklist/equip-1/condensadora.png", observacao: null }
      ]
    } as never);
    if (process.env.RENDER_PHASE07 === "1") {
      const outputDir = join(process.cwd(), "tmp", "pdfs");
      await mkdir(outputDir, { recursive: true });
      await writeFile(join(outputDir, "fase-07-relatorio-camara-fria.pdf"), pdf);
    }
    const texto = pdf.toString("latin1");

    assert.match(texto, /RELATÓRIO CÂMARA FRIA/);
    assert.match(texto, /OS\s+OS-CF-001/);
    assert.match(texto, /Cliente\s+Mercado Central/);
    assert.match(texto, /Temperatura ambiente da câmara\s+2.*C/);
    assert.match(texto, /Foto do controlador/);
    assert.match(texto, /Foto da evaporadora/);
    assert.match(texto, /Foto da condensadora/);
    assert.match(texto, /Técnico\s+Joao Tecnico/);
    assert.match(texto, /Responsável\s+Maria Responsavel/);
    assert.ok((texto.match(/\/Subtype \/Image/g) ?? []).length >= 5);
  } finally {
    await rm(storageRoot, { recursive: true, force: true });
  }
});
