import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
  carregarFotosRelatorioTecnico,
  montarCabecalhoRelatorioTecnico,
  montarCartaoRelatorioTecnico,
  montarLinhasAssinaturaRelatorioTecnico,
  montarLinhasChecklistRelatorioTecnico
} from "./admin-relatorio-pdf-componentes";

test("componentes do PDF montam cabecalho e cartoes reutilizaveis", () => {
  assert.deepEqual(montarCabecalhoRelatorioTecnico(0, 1, 3), [
    "MAQUINA N:001",
    "MANUTENCAO N:002 DE 003",
    ""
  ]);

  assert.deepEqual(montarCartaoRelatorioTecnico("DADOS DO EQUIPAMENTO", [["Campo", "Informacao"], ["Cliente", "ACME"]]), [
    "DADOS DO EQUIPAMENTO",
    "Campo                               Informacao",
    "Cliente                             ACME"
  ]);
});

test("componentes do PDF filtram e ordenam checklist sem fotos embutidas", () => {
  const linhas = montarLinhasChecklistRelatorioTecnico({
    problemaRelatado: "Sem gelar",
    servicoRealizado: "Limpeza",
    respostas: [
      { codigo: "M13", valor: "ok", observacao: null },
      { codigo: "C3", valor: "/storage/os/foto.jpg", observacao: null },
      { codigo: "M1", valor: "Luvas", observacao: "obrigatorio" },
      { codigo: "M2", valor: "pendente", observacao: null }
    ]
  });

  assert.deepEqual(linhas, [
    ["EPIs utilizados", "Luvas (obrigatorio)"],
    ["Ligar disjuntor", "ok"]
  ]);
});

test("componentes do PDF extraem fotos unicas e assinatura", () => {
  const foto = Buffer.from("foto");
  const outras = Buffer.from("outra");
  const fotos = carregarFotosRelatorioTecnico(
    {
      evidencias: [{ storage_url: "/storage/os/foto.jpg" }],
      checklist_respostas: [
        { codigo: "C3", valor: "/storage/os/foto.jpg" },
        { codigo: "M18", valor: "/storage/os/outra.jpg" }
      ]
    },
    (url) => url.endsWith("outra.jpg") ? outras : foto
  );

  assert.deepEqual(fotos, [foto, outras]);
  assert.deepEqual(montarLinhasAssinaturaRelatorioTecnico({
    assinatura: { nome_responsavel: "Cliente Teste" },
    eventos: [{ latitude: -23.3047, longitude: -51.1696 }]
  }), [
    ["Coordenadas GPS", "-23.304700, -51.169600"],
    ["Assinatura do Cliente", "Cliente Teste"]
  ]);
});
