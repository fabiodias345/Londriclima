import { OrdemServicoStatus, UsuarioRole } from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { MobileService } from "./mobile.service";

const usuario = {
  id: "usuario-1",
  empresa_id: "empresa-1",
  email: "tecnico@airmovebr.local",
  role: UsuarioRole.tecnico
};

function criarService(prisma: unknown) {
  return new MobileService(prisma as never);
}

test("listarOrdens retorna somente equipamento escolhido na OS", async () => {
  const prisma = {
    ordemServico: {
      findMany: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, {
          empresaId: usuario.empresa_id,
          status: { in: [OrdemServicoStatus.aberta, OrdemServicoStatus.em_deslocamento, OrdemServicoStatus.em_atendimento] },
          OR: [
            { tecnicoId: usuario.id },
            { responsaveis: { some: { usuarioId: usuario.id } } },
            { equipe: { membros: { some: { usuarioId: usuario.id, ativo: true } } } },
            { responsaveis: { some: { equipe: { membros: { some: { usuarioId: usuario.id, ativo: true } } } } } }
          ]
        });

        return [
          {
            id: "os-1",
            clienteId: "cliente-1",
            titulo: "Limpeza de filtros",
            status: OrdemServicoStatus.aberta,
            agendadaPara: new Date("2026-06-22T12:00:00.000Z"),
            cliente: {
              nome: "Hospital Norte",
              equipamentos: [
                { id: "eq-1", modelo: "Split Hi-Wall", localInstalacao: "Sala 101", capacidadeBtu: 24000 },
                { id: "eq-2", modelo: "Split Hi-Wall", localInstalacao: "Sala 102", capacidadeBtu: 24000 }
              ]
            },
            endereco: { logradouro: "Av. Santos Dumont", numero: "1480", cidade: "Londrina", uf: "PR" },
            equipamento: { id: "eq-1", modelo: "Split Hi-Wall", localInstalacao: "Sala 101", capacidadeBtu: 24000 },
            responsaveis: []
          }
        ];
      }
    }
  };

  const resultado = await criarService(prisma).listarOrdens(usuario);

  assert.equal(resultado.items.length, 1);
  assert.equal(resultado.items[0].cliente, "Hospital Norte");
  assert.equal(resultado.items[0].equipamentos.length, 1);
  assert.equal(resultado.items[0].equipamentos[0].nome, "Sala 101");
});

test("listarOrdens retorna todos equipamentos quando OS nao define equipamento", async () => {
  const prisma = {
    ordemServico: {
      findMany: async () => [
        {
          id: "os-todos",
          clienteId: "cliente-1",
          titulo: "PMOC completo",
          status: OrdemServicoStatus.aberta,
          agendadaPara: new Date("2026-06-22T12:00:00.000Z"),
          cliente: {
            nome: "Hospital Norte",
            equipamentos: [
              { id: "eq-1", modelo: "Split Hi-Wall", localInstalacao: "Sala 101", capacidadeBtu: 24000 },
              { id: "eq-2", modelo: "Split Hi-Wall", localInstalacao: "Sala 102", capacidadeBtu: 24000 }
            ]
          },
          endereco: null,
          equipamento: null,
          responsaveis: [],
          checklistRespostas: []
        }
      ]
    }
  };

  const resultado = await criarService(prisma).listarOrdens(usuario);

  assert.equal(resultado.items[0].equipamentos.length, 2);
  assert.equal(resultado.items[0].equipamentos[0].nome, "Sala 101");
  assert.equal(resultado.items[0].equipamentos[1].nome, "Sala 102");
});

test("listarOrdens retorna checklist flat definido pelo backend", async () => {
  const prisma = {
    ordemServico: {
      findMany: async () => [
        {
          id: "os-2",
          clienteId: "cliente-1",
          titulo: "Texto livre qualquer",
          checklistTipo: "semestral",
          status: OrdemServicoStatus.aberta,
          agendadaPara: new Date("2026-06-22T12:00:00.000Z"),
          cliente: {
            nome: "Hospital Norte",
            equipamentos: []
          },
          endereco: null,
          equipamento: null,
          responsaveis: []
        }
      ]
    }
  };

  const resultado = await criarService(prisma).listarOrdens(usuario);
  const ordem = resultado.items[0];

  assert.equal(ordem.checklist_tipo, "semestral");
  assert.ok(Array.isArray(ordem.checklist));
  assert.equal(ordem.checklist[0].codigo, "M1");
  assert.equal(ordem.checklist[0].tipo, "checkbox");
  assert.ok(ordem.checklist.some((item: { codigo: string }) => item.codigo === "T1"));
  assert.ok(ordem.checklist.some((item: { codigo: string }) => item.codigo === "S6"));
  assert.equal(ordem.checklist.some((item: { codigo: string }) => item.codigo === "A1"), false);
});

test("listarOrdens retorna checklist mensal operacional com EPIs filtro e temperaturas", async () => {
  const prisma = {
    ordemServico: {
      findMany: async () => [
        {
          id: "os-mensal",
          clienteId: "cliente-1",
          titulo: "PMOC mensal",
          checklistTipo: "mensal",
          status: OrdemServicoStatus.aberta,
          agendadaPara: new Date("2026-06-22T12:00:00.000Z"),
          cliente: {
            nome: "Hospital Norte",
            equipamentos: []
          },
          endereco: null,
          equipamento: null,
          responsaveis: []
        }
      ]
    }
  };

  const resultado = await criarService(prisma).listarOrdens(usuario);
  const checklist = resultado.items[0].checklist;

  assert.deepEqual(
    checklist.map((item: { codigo: string }) => item.codigo),
    ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12", "M13", "M14", "M15", "M17", "M16"]
  );
  assert.equal(checklist[0].item, "EPIs utilizados");
  assert.equal(checklist[3].item, "Foto inicial");
  assert.deepEqual(checklist[8].opcoes, ["Interna limpa", "Interna suja"]);
  assert.deepEqual(checklist[9].opcoes, ["Bandeja limpa", "Bandeja suja"]);
  assert.equal(checklist[14].item, "Temperatura de entrada do ar");
  assert.equal(checklist[14].unidade, "°C");
  assert.equal(checklist[15].item, "Temperatura de insuflamento");
});

test("listarOrdens retorna checklist trimestral e semestral com respostas sim nao profissionais", async () => {
  const prisma = {
    ordemServico: {
      findMany: async () => [
        {
          id: "os-semestral",
          clienteId: "cliente-1",
          titulo: "PMOC semestral",
          checklistTipo: "semestral",
          status: OrdemServicoStatus.aberta,
          agendadaPara: new Date("2026-06-22T12:00:00.000Z"),
          cliente: { nome: "Hospital Norte", equipamentos: [] },
          endereco: null,
          equipamento: null,
          responsaveis: []
        }
      ]
    }
  };

  const resultado = await criarService(prisma).listarOrdens(usuario);
  const porCodigo = Object.fromEntries(
    resultado.items[0].checklist.map((item: { codigo: string; item: string; tipo: string; unidade?: string; obrigatorio?: boolean }) => [
      item.codigo,
      {
        item: item.item,
        tipo: item.tipo,
        ...(item.unidade ? { unidade: item.unidade } : {}),
        ...(item.obrigatorio === false ? { obrigatorio: false } : {})
      }
    ])
  );

  assert.deepEqual(porCodigo.T3, { item: "Dreno limpo", tipo: "checkbox" });
  assert.deepEqual(porCodigo.T4, { item: "Gabinete limpo", tipo: "checkbox" });
  assert.deepEqual(porCodigo.T5, { item: "Ruido", tipo: "checkbox" });
  assert.deepEqual(porCodigo.T6, { item: "Fluxo de ar pelas aletas normal", tipo: "checkbox" });
  assert.deepEqual(porCodigo.S4, { item: "Oxidacao, danos ou entupimentos", tipo: "checkbox" });
  assert.deepEqual(porCodigo.S5, { item: "Efetuado limpeza geral", tipo: "checkbox" });
  assert.deepEqual(porCodigo.S8, { item: "Efetuado inspecao eletrica conexoes", tipo: "checkbox" });
  assert.deepEqual(porCodigo.S9, { item: "Corrente", tipo: "numerico", unidade: "A" });
  assert.deepEqual(porCodigo.S10, { item: "Protecoes eletricas funcionando", tipo: "checkbox" });
  assert.deepEqual(porCodigo.S12, { item: "Religado e verificado", tipo: "checkbox" });
  assert.deepEqual(porCodigo.S13, { item: "Observacao", tipo: "texto", obrigatorio: false });
  assert.deepEqual(
    resultado.items[0].checklist.map((item: { codigo: string }) => item.codigo),
    [
      "M1",
      "M2",
      "M3",
      "M4",
      "M5",
      "M6",
      "M7",
      "M8",
      "M9",
      "M10",
      "M11",
      "M12",
      "M14",
      "M15",
      "M17",
      "T1",
      "T2",
      "T3",
      "T4",
      "T5",
      "T6",
      "M18",
      "S1",
      "S2",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "S9",
      "S10",
      "S11",
      "M13",
      "S12",
      "S3",
      "S13",
      "M16"
    ]
  );
});

test("listarOrdens compoe checklists acumulados sem duplicar seguranca fotos e finalizacao", async () => {
  const tipos = ["mensal", "trimestral", "semestral", "anual"];
  const prisma = {
    ordemServico: {
      findMany: async () =>
        tipos.map((checklistTipo) => ({
          id: `os-${checklistTipo}`,
          clienteId: "cliente-1",
          titulo: `PMOC ${checklistTipo}`,
          checklistTipo,
          status: OrdemServicoStatus.aberta,
          agendadaPara: new Date("2026-06-22T12:00:00.000Z"),
          cliente: {
            nome: "Hospital Norte",
            equipamentos: []
          },
          endereco: null,
          equipamento: null,
          responsaveis: []
        }))
    }
  };

  const resultado = await criarService(prisma).listarOrdens(usuario);
  const porTipo = Object.fromEntries(resultado.items.map((item: any) => [item.checklist_tipo, item.checklist]));
  const codigos = (tipo: string) => porTipo[tipo].map((item: { codigo: string }) => item.codigo);
  const fotos = (tipo: string) => porTipo[tipo].filter((item: { tipo: string }) => item.tipo === "foto");
  const finalizacoes = (tipo: string) => porTipo[tipo].filter((item: { tipo: string }) => item.tipo === "finalizacao");

  assert.equal(fotos("mensal").length, 1);
  assert.equal(fotos("trimestral").length, 2);
  assert.equal(fotos("semestral").length, 3);
  assert.equal(fotos("anual").length, 3);
  assert.ok(fotos("semestral").some((item: { item: string }) => item.item === "Foto da condensadora limpa"));
  assert.ok(fotos("semestral").some((item: { item: string }) => item.item === "Foto da evaporadora limpa"));
  assert.equal(finalizacoes("anual").length, 1);
  assert.equal(codigos("trimestral").filter((codigo: string) => codigo === "M3").length, 1);
  assert.equal(new Set(codigos("anual")).size, codigos("anual").length);
});

test("listarVeiculos retorna carros ativos da empresa para o app", async () => {
  const prisma = {
    veiculo: {
      findMany: async ({ where, orderBy }: { where: unknown; orderBy: unknown }) => {
        assert.deepEqual(where, { empresaId: usuario.empresa_id, ativo: true });
        assert.deepEqual(orderBy, { nome: "asc" });
        return [
          { id: "veiculo-1", nome: "Carro 01", placa: "ABC1D23" },
          { id: "veiculo-2", nome: "Carro 02", placa: "XYZ9A87" }
        ];
      }
    }
  };

  const resultado = await criarService(prisma).listarVeiculos(usuario);

  assert.equal(resultado.total, 2);
  assert.deepEqual(resultado.items[0], { id: "veiculo-1", nome: "Carro 01", placa: "ABC1D23" });
});

test("registrarAbastecimento salva somente carro odometro litros e valor", async () => {
  const chamadas: Record<string, unknown> = {};
  const prisma = {
    veiculo: {
      findFirst: async ({ where }: { where: unknown }) => {
        chamadas.veiculoWhere = where;
        return { id: "veiculo-1", nome: "Carro 01", empresaId: usuario.empresa_id };
      }
    },
    veiculoAbastecimento: {
      findFirst: async ({ where, orderBy }: { where: unknown; orderBy: unknown }) => {
        chamadas.ultimoWhere = where;
        chamadas.ultimoOrderBy = orderBy;
        return { odometroKm: { toNumber: () => 51635 } };
      },
      create: async ({ data }: { data: any }) => {
        chamadas.createData = data;
        return {
          id: "abastecimento-1",
          odometroKm: { toNumber: () => 51700 },
          litros: { toNumber: () => 20 },
          valorTotal: { toNumber: () => 120 },
          precoPorLitro: { toNumber: () => 6 },
          abastecidoEm: new Date("2026-06-24T12:00:00.000Z")
        };
      }
    }
  };

  const resultado = await criarService(prisma).registrarAbastecimento(usuario, {
    veiculo_id: "veiculo-1",
    odometro_km: 51700,
    litros: 20,
    valor_total: 120
  });

  assert.deepEqual(chamadas.veiculoWhere, {
    id: "veiculo-1",
    empresaId: usuario.empresa_id,
    ativo: true
  });
  assert.equal((chamadas.createData as any).usuarioId, usuario.id);
  assert.equal((chamadas.createData as any).posto, undefined);
  assert.equal((chamadas.createData as any).observacao, undefined);
  assert.equal(resultado.veiculo_nome, "Carro 01");
  assert.equal(resultado.preco_por_litro, 6);
});
