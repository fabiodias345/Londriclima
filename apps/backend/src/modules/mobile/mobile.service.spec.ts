import { ChecklistTipo, OrdemServicoStatus, OrdemServicoTipoServico, UsuarioRole } from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { MobileService } from "./mobile.service";
import { montarChecklistMobile } from "./mobile-checklists";

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

test("listarOrdens permite admin ver OS de campo da empresa sem atribuicao direta", async () => {
  const admin = { ...usuario, role: UsuarioRole.admin };
  const prisma = {
    ordemServico: {
      findMany: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, {
          empresaId: admin.empresa_id,
          status: { in: [OrdemServicoStatus.aberta, OrdemServicoStatus.em_deslocamento, OrdemServicoStatus.em_atendimento] }
        });

        return [];
      }
    }
  };

  const resultado = await criarService(prisma).listarOrdens(admin);

  assert.deepEqual(resultado.items, []);
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

test("listarOrdens retorna checklist semestral independente definido pelo backend", async () => {
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
  assert.deepEqual(
    ordem.checklist.map((item: { codigo: string }) => item.codigo),
    [
      "SEM_CONTROLE",
      "SEM_HIGIENIZACAO_EVAP",
      "SEM_FOTO_BOLSAO",
      "SEM_MOTORES",
      "SEM_FIXACOES",
      "SEM_TEMP_INSUFLAMENTO",
      "SEM_FOTO_INSUFLAMENTO"
    ]
  );
  assert.equal(ordem.checklist[0].tipo, "select_obs");
});

test("listarOrdens retorna checklist mensal simplificado sem seguranca interna", async () => {
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
    [
      "MEN_FILTRO",
      "MEN_CONTROLE",
      "MEN_DRENO",
      "MEN_VISUAL",
      "MEN_TEMP_INSUFLAMENTO",
      "MEN_TEMP_RETORNO",
      "MEN_FOTO_INSUFLAMENTO",
      "MEN_FOTO_FILTRO"
    ]
  );
  assert.equal(checklist[0].item, "Limpeza ou substituição dos filtros");
  assert.deepEqual(checklist[0].opcoes, ["Executado", "Não executado"]);
  assert.equal(checklist[4].item, "Temperatura de insuflamento");
  assert.equal(checklist[4].unidade, "°C");
  assert.equal(checklist.some((item: { item: string }) => item.item.includes("EPI")), false);
});

test("listarOrdens retorna opções profissionais no checklist semestral", async () => {
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

  assert.deepEqual(porCodigo.SEM_CONTROLE, {
    item: "Teste do controle remoto/comandos",
    tipo: "select_obs"
  });
  assert.deepEqual(porCodigo.SEM_TEMP_INSUFLAMENTO, {
    item: "Temperatura de insuflamento",
    tipo: "numerico",
    unidade: "°C"
  });
  assert.deepEqual(
    resultado.items[0].checklist.map((item: { codigo: string }) => item.codigo),
    [
      "SEM_CONTROLE",
      "SEM_HIGIENIZACAO_EVAP",
      "SEM_FOTO_BOLSAO",
      "SEM_MOTORES",
      "SEM_FIXACOES",
      "SEM_TEMP_INSUFLAMENTO",
      "SEM_FOTO_INSUFLAMENTO"
    ]
  );
});

test("listarOrdens mantém checklists independentes por periodicidade", async () => {
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
  assert.equal(fotos("mensal").length, 2);
  assert.equal(fotos("trimestral").length, 2);
  assert.equal(fotos("semestral").length, 2);
  assert.equal(fotos("anual").length, 3);
  assert.equal(codigos("trimestral").some((codigo: string) => codigo.startsWith("MEN_")), false);
  assert.equal(codigos("semestral").some((codigo: string) => codigo.startsWith("TRI_")), false);
  assert.equal(new Set(codigos("anual")).size, codigos("anual").length);
});

test("listarOrdens anual nao marca rascunho completo como equipamento feito", async () => {
  const equipamento = { id: "eq-1", modelo: "Split", localInstalacao: "Sala 1" };
  const respostas = montarChecklistMobile(ChecklistTipo.anual).map((item) => ({
    equipamentoId: equipamento.id,
    codigo: item.codigo,
    tipo: item.tipo,
    valor: "preenchido",
    observacao: null
  }));
  const ordem = {
    id: "os-anual",
    clienteId: "cliente-1",
    titulo: "PMOC anual",
    tipoServico: "preventiva",
    checklistTipo: ChecklistTipo.anual,
    status: OrdemServicoStatus.em_atendimento,
    agendadaPara: new Date("2026-06-22T12:00:00.000Z"),
    cliente: { nome: "Hospital Norte", equipamentos: [equipamento] },
    endereco: null,
    equipamento: null,
    responsaveis: [],
    checklistRespostas: respostas
  };
  const prisma = { ordemServico: { findMany: async () => [ordem] } };
  const service = criarService(prisma);

  const rascunho = await service.listarOrdens(usuario);
  assert.equal(rascunho.items[0].equipamentos[0].status_execucao, "em_andamento");

  ordem.checklistRespostas.push(
    ...["EVAPORADORA", "CONDENSADORA"].map((etapa) => ({
      equipamentoId: equipamento.id,
      codigo: `ANU_ETAPA_${etapa}_CONCLUIDA`,
      tipo: "etapa",
      valor: "concluida",
      observacao: null
    })) as never[]
  );
  (ordem.checklistRespostas.at(-1) as any).valor = "sim";
  const formatoInvalido = await service.listarOrdens(usuario);
  assert.equal(formatoInvalido.items[0].equipamentos[0].status_execucao, "em_andamento");
  (ordem.checklistRespostas.at(-1) as any).valor = "concluida";
  const concluido = await service.listarOrdens(usuario);
  assert.equal(concluido.items[0].equipamentos[0].status_execucao, "feito");
});

test("listarOrdens retorna checklist de instalacao e marca equipamento feito", async () => {
  const equipamento = { id: "eq-1", modelo: "Split", localInstalacao: "Sala 1" };
  const ordem = {
    id: "os-inst",
    clienteId: "cliente-1",
    titulo: "Instalacao split",
    tipoServico: OrdemServicoTipoServico.instalacao,
    checklistTipo: ChecklistTipo.anual,
    status: OrdemServicoStatus.em_atendimento,
    agendadaPara: new Date("2026-06-22T12:00:00.000Z"),
    cliente: { nome: "Hospital Norte", equipamentos: [equipamento] },
    endereco: null,
    equipamento: null,
    responsaveis: [],
    checklistRespostas: [
      { equipamentoId: equipamento.id, codigo: "INS_FIXACAO", tipo: "select_obs", valor: "Executado", observacao: null },
      { equipamentoId: equipamento.id, codigo: "INS_TUBULACAO", tipo: "select_obs", valor: "Executado", observacao: null },
      { equipamentoId: equipamento.id, codigo: "INS_DRENO", tipo: "select_obs", valor: "Executado", observacao: null },
      { equipamentoId: equipamento.id, codigo: "INS_ELETRICA", tipo: "select_obs", valor: "Executado", observacao: null },
      { equipamentoId: equipamento.id, codigo: "INS_ESTANQUEIDADE", tipo: "select_obs", valor: "Executado", observacao: null },
      { equipamentoId: equipamento.id, codigo: "INS_TESTE", tipo: "select_obs", valor: "Executado", observacao: null },
      { equipamentoId: equipamento.id, codigo: "INS_TEMP_INSUFLAMENTO", tipo: "numerico", valor: "18", observacao: null },
      { equipamentoId: equipamento.id, codigo: "INS_TEMP_RETORNO", tipo: "numerico", valor: "24", observacao: null },
      { equipamentoId: equipamento.id, codigo: "INS_FOTO_EVAP", tipo: "foto", valor: "/storage/evap.jpg", observacao: null },
      { equipamentoId: equipamento.id, codigo: "INS_FOTO_COND", tipo: "foto", valor: "/storage/cond.jpg", observacao: null }
    ]
  };
  const prisma = { ordemServico: { findMany: async () => [ordem] } };

  const resultado = await criarService(prisma).listarOrdens(usuario);

  assert.equal(resultado.items[0].tipo_servico, OrdemServicoTipoServico.instalacao);
  assert.deepEqual(
    resultado.items[0].checklist.map((item: { codigo: string }) => item.codigo),
    [
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
    ]
  );
  assert.equal(resultado.items[0].equipamentos[0].status_execucao, "feito");
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
