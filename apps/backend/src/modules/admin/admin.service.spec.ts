import { test } from "node:test";
import * as assert from "node:assert/strict";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { AutomacaoTipo, OrdemServicoEventoAcao, OrdemServicoStatus, PmocRelatorioStatus, Prisma, UsuarioRole } from "@prisma/client";
import { AdminService } from "./admin.service";

const usuario = {
  id: "admin-1",
  empresa_id: "empresa-1",
  email: "admin@airmovebr.local",
  role: UsuarioRole.admin
};

function criarService(prisma: unknown) {
  return new AdminService(prisma as never);
}

test("listarPreChamados filtra exclusivamente por empresa do usuario e status pre_chamado", async () => {
  const chamadas = {
    where: undefined as unknown
  };
  const prisma = {
    ordemServico: {
      findMany: async ({ where }: { where: unknown }) => {
        chamadas.where = where;
        return [
          {
            id: "os-1",
            titulo: "Limpeza",
            problemaRelatado: "Filtro sujo",
            status: OrdemServicoStatus.pre_chamado,
            criadaEm: new Date("2026-06-10T10:00:00.000Z"),
            cliente: {
              nome: "Maria",
              telefone: "43999999999",
              email: "maria@example.com"
            },
            endereco: {
              bairro: "Centro",
              cidade: "Londrina",
              uf: "PR",
              logradouro: "Rua A"
            }
          }
        ];
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.listarPreChamados(usuario);

  assert.deepEqual(chamadas.where, {
    empresaId: "empresa-1",
    status: OrdemServicoStatus.pre_chamado
  });
  assert.equal(resposta.total, 1);
  assert.equal(resposta.items[0].id, "os-1");
});

test("listarLocalizacoesFrota filtra veiculos ativos pela empresa do usuario", async () => {
  const chamadas = {
    where: undefined as unknown
  };
  const prisma = {
    veiculo: {
      findMany: async ({ where }: { where: unknown }) => {
        chamadas.where = where;
        return [
          {
            id: "veiculo-1",
            nome: "Carro 1",
            placa: "ABC1D23",
            rastreadorImei: "123456789",
            localizacoes: [
              {
                latitude: new Prisma.Decimal(-23.3048),
                longitude: new Prisma.Decimal(-51.1701),
                velocidadeKmh: new Prisma.Decimal(42.5),
                ignicao: true,
                registradoEm: new Date("2026-06-10T10:30:00.000Z")
              }
            ]
          }
        ];
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.listarLocalizacoesFrota(usuario);

  assert.deepEqual(chamadas.where, {
    empresaId: "empresa-1",
    ativo: true
  });
  assert.equal(resposta.items[0].localizacao?.latitude, -23.3048);
  assert.equal(resposta.items[0].localizacao?.velocidade_kmh, 42.5);
});

test("obterRelatorios consolida clientes, OS, frota, receitas e automacoes por dia mes e ano", async () => {
  const prisma = {
    ordemServico: {
      findMany: async () => [
        {
          status: OrdemServicoStatus.pre_chamado,
          valorCobrado: new Prisma.Decimal(100),
          criadaEm: new Date("2026-06-15T10:00:00.000Z"),
          agendadaPara: null,
          concluidaEm: null
        },
        {
          status: OrdemServicoStatus.aberta,
          valorCobrado: new Prisma.Decimal(200),
          criadaEm: new Date("2026-06-01T10:00:00.000Z"),
          agendadaPara: new Date("2026-06-15T13:00:00.000Z"),
          concluidaEm: null
        },
        {
          status: OrdemServicoStatus.em_atendimento,
          valorCobrado: new Prisma.Decimal(300),
          criadaEm: new Date("2026-01-10T10:00:00.000Z"),
          agendadaPara: new Date("2026-06-10T13:00:00.000Z"),
          concluidaEm: null
        },
        {
          status: OrdemServicoStatus.concluida,
          valorCobrado: new Prisma.Decimal(400),
          criadaEm: new Date("2026-05-01T10:00:00.000Z"),
          agendadaPara: new Date("2026-06-14T13:00:00.000Z"),
          concluidaEm: new Date("2026-06-15T16:00:00.000Z")
        },
        {
          status: OrdemServicoStatus.concluida,
          valorCobrado: new Prisma.Decimal(500),
          criadaEm: new Date("2025-12-01T10:00:00.000Z"),
          agendadaPara: new Date("2025-12-10T13:00:00.000Z"),
          concluidaEm: new Date("2025-12-10T16:00:00.000Z")
        }
      ]
    },
    cliente: {
      count: async () => 7
    },
    veiculo: {
      count: async () => 2,
      findMany: async () => [
        {
          id: "veiculo-1",
          nome: "Carro 1",
          placa: "ABC1D23",
          abastecimentos: [
            {
              odometroKm: new Prisma.Decimal(1000),
              litros: new Prisma.Decimal(10),
              valorTotal: new Prisma.Decimal(60),
              abastecidoEm: new Date("2026-06-01T09:00:00.000Z")
            },
            {
              odometroKm: new Prisma.Decimal(1120),
              litros: new Prisma.Decimal(12),
              valorTotal: new Prisma.Decimal(72),
              abastecidoEm: new Date("2026-06-15T09:00:00.000Z")
            }
          ]
        }
      ]
    },
    automacaoAgendada: {
      count: async () => 3
    }
  };
  const service = criarService(prisma);

  const resposta = await service.obterRelatorios(usuario, new Date("2026-06-15T12:00:00.000Z"));

  assert.equal(resposta.clientes, 7);
  assert.equal(resposta.veiculos_ativos, 2);
  assert.equal(resposta.automacoes_pendentes, 3);
  assert.equal(resposta.receita_prevista, 1000);
  assert.equal(resposta.receita_arrecadada, 400);
  assert.deepEqual(resposta.pre_chamados, { dia: 1, mes: 1, ano: 1 });
  assert.deepEqual(resposta.os_abertas, { dia: 1, mes: 1, ano: 1 });
  assert.deepEqual(resposta.em_atendimento, { dia: 0, mes: 1, ano: 1 });
  assert.deepEqual(resposta.concluidas, { dia: 1, mes: 1, ano: 1 });
  assert.deepEqual(resposta.manutencoes, { dia: 1, mes: 1, ano: 1 });
  assert.deepEqual(resposta.frota.km_rodados_periodo, { dia: 120, mes: 120, ano: 120 });
});

test("obterEmpresa retorna cadastro completo da empresa do usuario", async () => {
  const prisma = {
    empresa: {
      findUnique: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, { id: usuario.empresa_id });
        return {
          id: "empresa-1",
          nome: "AIRMOVEBR",
          razaoSocial: "AIRMOVEBR LTDA",
          nomeFantasia: "AIRMOVEBR",
          cnpj: "12345678000190",
          email: "contato@airmovebr.com.br",
          telefone: "43999999999",
          logradouro: "Rua Teste",
          numero: "100",
          complemento: "Sala 1",
          bairro: "Centro",
          cidade: "Londrina",
          uf: "PR",
          cep: "86000000",
          inscricaoEstadual: "ISENTO",
          inscricaoMunicipal: "12345",
          responsavelLegal: "Fabio Dias",
          responsavelCpf: "12345678901",
          contatoPrincipal: "Fabio Dias",
          contatoCargo: "Diretor",
          status: "ativa",
          observacoes: "Empresa piloto",
          ativa: true,
          criadoEm: new Date("2026-06-10T10:00:00.000Z"),
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z")
        };
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.obterEmpresa(usuario);

  assert.equal(resposta.razao_social, "AIRMOVEBR LTDA");
  assert.equal(resposta.nome_fantasia, "AIRMOVEBR");
  assert.equal(resposta.cnpj, "12.345.678/0001-90");
  assert.equal(resposta.responsavel_cpf, "123.456.789-01");
  assert.equal(resposta.status, "ativa");
});

test("atualizarEmpresa normaliza cadastro fiscal e status da empresa do usuario", async () => {
  const chamadas = {
    updateWhere: undefined as unknown,
    updateData: undefined as unknown
  };
  const prisma = {
    empresa: {
      update: async ({ where, data }: { where: unknown; data: unknown }) => {
        chamadas.updateWhere = where;
        chamadas.updateData = data;
        return {
          id: "empresa-1",
          nome: (data as { nome: string }).nome,
          razaoSocial: (data as { razaoSocial?: string }).razaoSocial,
          nomeFantasia: (data as { nomeFantasia?: string }).nomeFantasia,
          cnpj: (data as { cnpj?: string }).cnpj,
          email: (data as { email?: string }).email,
          telefone: (data as { telefone?: string }).telefone,
          logradouro: (data as { logradouro?: string }).logradouro,
          numero: (data as { numero?: string }).numero,
          complemento: null,
          bairro: (data as { bairro?: string }).bairro,
          cidade: (data as { cidade?: string }).cidade,
          uf: (data as { uf?: string }).uf,
          cep: (data as { cep?: string }).cep,
          inscricaoEstadual: (data as { inscricaoEstadual?: string }).inscricaoEstadual,
          inscricaoMunicipal: (data as { inscricaoMunicipal?: string }).inscricaoMunicipal,
          responsavelLegal: (data as { responsavelLegal?: string }).responsavelLegal,
          responsavelCpf: (data as { responsavelCpf?: string }).responsavelCpf,
          contatoPrincipal: (data as { contatoPrincipal?: string }).contatoPrincipal,
          contatoCargo: (data as { contatoCargo?: string }).contatoCargo,
          status: (data as { status?: string }).status,
          observacoes: (data as { observacoes?: string }).observacoes,
          ativa: (data as { ativa?: boolean }).ativa,
          criadoEm: new Date("2026-06-10T10:00:00.000Z"),
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z")
        };
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.atualizarEmpresa(
    {
      razao_social: " AIRMOVEBR LTDA ",
      nome_fantasia: " AirMove BR ",
      cnpj: "12.345.678/0001-90",
      email: "CONTATO@AIRMOVEBR.COM.BR",
      telefone: "(43) 99999-9999",
      logradouro: "Rua Teste",
      numero: "100",
      bairro: "Centro",
      cidade: "Londrina",
      uf: "pr",
      cep: "86000-000",
      inscricao_estadual: " isento ",
      inscricao_municipal: " 12345 ",
      responsavel_legal: " Fabio Dias ",
      responsavel_cpf: "123.456.789-01",
      contato_principal: " Fabio ",
      contato_cargo: " Diretor ",
      status: "suspensa",
      observacoes: "  Revisar documentos "
    },
    usuario
  );

  assert.deepEqual(chamadas.updateWhere, { id: usuario.empresa_id });
  assert.deepEqual(chamadas.updateData, {
    nome: "AirMove BR",
    razaoSocial: "AIRMOVEBR LTDA",
    nomeFantasia: "AirMove BR",
    cnpj: "12345678000190",
    email: "contato@airmovebr.com.br",
    telefone: "43999999999",
    logradouro: "Rua Teste",
    numero: "100",
    complemento: null,
    bairro: "Centro",
    cidade: "Londrina",
    uf: "PR",
    cep: "86000000",
    inscricaoEstadual: "isento",
    inscricaoMunicipal: "12345",
    responsavelLegal: "Fabio Dias",
    responsavelCpf: "12345678901",
    contatoPrincipal: "Fabio",
    contatoCargo: "Diretor",
    status: "suspensa",
    observacoes: "Revisar documentos",
    ativa: false
  });
  assert.equal(resposta.nome_fantasia, "AirMove BR");
  assert.equal(resposta.status, "suspensa");
});

test("aprovarPreChamado esconde pre-chamado de outra empresa", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-2",
        status: OrdemServicoStatus.pre_chamado
      })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await assert.rejects(() => service.aprovarPreChamado("os-1", usuario), NotFoundException);
});

test("rejeitarPreChamado rejeita OS que nao esta pendente", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-1",
        status: OrdemServicoStatus.aberta
      })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await assert.rejects(() => service.rejeitarPreChamado("os-1", usuario), ConflictException);
});

test("aprovarPreChamado atualiza status e registra evento com empresa e usuario corretos", async () => {
  const chamadas = {
    updateData: undefined as unknown,
    eventoData: undefined as unknown
  };
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-1",
        status: OrdemServicoStatus.pre_chamado
      }),
      update: async ({ data }: { data: unknown }) => {
        chamadas.updateData = data;
        return {
          id: "os-1",
          status: OrdemServicoStatus.aberta,
          atualizadaEm: new Date("2026-06-10T11:00:00.000Z")
        };
      }
    },
    ordemServicoEvento: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.eventoData = data;
      }
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.aprovarPreChamado("os-1", usuario);

  assert.deepEqual(chamadas.updateData, { status: OrdemServicoStatus.aberta });
  assert.equal((chamadas.eventoData as { empresaId: string }).empresaId, "empresa-1");
  assert.equal((chamadas.eventoData as { usuarioId: string }).usuarioId, "admin-1");
  assert.equal((chamadas.eventoData as { acao: OrdemServicoEventoAcao }).acao, OrdemServicoEventoAcao.aprovar);
  assert.deepEqual(resposta, {
    os_id: "os-1",
    status: OrdemServicoStatus.aberta,
    atualizado_em: "2026-06-10T11:00:00.000Z"
  });
});

test("criarCliente exige telefone com DDD", async () => {
  const service = criarService({});

  await assert.rejects(
    () =>
      service.criarCliente(
        {
          tipo: "pf",
          nome: "Maria",
          telefone: "99999-9999",
          documento: "12345678900"
        },
        usuario
      ),
    BadRequestException
  );
});

test("criarCliente exige CNPJ valido para pessoa juridica", async () => {
  const service = criarService({});

  await assert.rejects(
    () =>
      service.criarCliente(
        {
          tipo: "pj",
          nome: "Empresa",
          telefone: "(43) 3333-4444",
          documento: "12.345.678/0001"
        },
        usuario
      ),
    BadRequestException
  );
});

test("apagarCliente remove cliente sem historico nem equipamentos", async () => {
  const chamadas = {
    deleteManyWhere: undefined as unknown,
    deleteWhere: undefined as unknown
  };
  const tx = {
    clienteEndereco: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.deleteManyWhere = where;
      }
    },
    cliente: {
      delete: async ({ where }: { where: unknown }) => {
        chamadas.deleteWhere = where;
      }
    }
  };
  const prisma = {
    cliente: {
      findFirst: async () => ({
        id: "cliente-1",
        nome: "Maria",
        _count: {
          ordensServico: 0,
          equipamentos: 0
        }
      })
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.apagarCliente("cliente-1", usuario);

  assert.deepEqual(chamadas.deleteManyWhere, {
    clienteId: "cliente-1",
    empresaId: "empresa-1"
  });
  assert.deepEqual(chamadas.deleteWhere, {
    id: "cliente-1"
  });
  assert.deepEqual(resposta, {
    id: "cliente-1",
    apagado: true
  });
});

test("apagarCliente bloqueia cliente com historico operacional", async () => {
  const prisma = {
    cliente: {
      findFirst: async () => ({
        id: "cliente-1",
        nome: "Maria",
        _count: {
          ordensServico: 1,
          equipamentos: 0
        }
      })
    }
  };
  const service = criarService(prisma);

  await assert.rejects(() => service.apagarCliente("cliente-1", usuario), ConflictException);
});

test("listarEquipamentosCliente exige cliente da empresa e retorna links publicos", async () => {
  const prisma = {
    cliente: {
      findFirst: async () => ({ id: "cliente-1" })
    },
    equipamento: {
      findMany: async () => [
        {
          id: "equipamento-1",
          codigoPublico: "EQ-ABC123",
          acessoPublicoAtivo: true,
          tipo: "Split",
          patrimonio: "PAT-1",
          codigoBarras: "789",
          marca: "LG",
          modelo: "Dual",
          capacidadeBtu: 12000,
          gasRefrigerante: "R-410A",
          numeroSerie: "SN1",
          localInstalacao: "Sala",
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
          ordensServico: [{ id: "os-1", status: OrdemServicoStatus.aberta }]
        }
      ]
    }
  };
  const service = criarService(prisma);

  const resposta = await service.listarEquipamentosCliente("cliente-1", usuario);

  assert.equal(resposta.total, 1);
  assert.equal(resposta.items[0].codigo_publico, "EQ-ABC123");
  assert.equal(resposta.items[0].link_publico, "/landing/equipamento.html?codigo=EQ-ABC123");
  assert.equal(resposta.items[0].gas_refrigerante, "R-410A");
  assert.equal(resposta.items[0].os_abertas, 1);
});

test("apagarEquipamento remove maquina e historico operacional vinculado", async () => {
  const chamadas = [] as { tabela: string; where: unknown }[];
  const tx = {
    automacaoAgendada: {
      deleteMany: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "automacaoAgendada", where })
    },
    ordemServicoPeca: {
      deleteMany: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "ordemServicoPeca", where })
    },
    ordemServicoChecklist: {
      deleteMany: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "ordemServicoChecklist", where })
    },
    ordemServicoEvidencia: {
      deleteMany: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "ordemServicoEvidencia", where })
    },
    ordemServicoAssinatura: {
      deleteMany: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "ordemServicoAssinatura", where })
    },
    ordemServicoObservacao: {
      deleteMany: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "ordemServicoObservacao", where })
    },
    ordemServicoEvento: {
      deleteMany: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "ordemServicoEvento", where })
    },
    ordemServico: {
      deleteMany: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "ordemServico", where })
    },
    equipamento: {
      delete: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "equipamento", where })
    }
  };
  const prisma = {
    equipamento: {
      findFirst: async () => ({
        id: "equipamento-1",
        clienteId: "cliente-1",
        marca: "LG",
        modelo: "Dual"
      })
    },
    ordemServico: {
      findMany: async () => [
        {
          id: "os-1",
          checklist: {
            id: "checklist-1"
          }
        }
      ]
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.apagarEquipamento("equipamento-1", usuario);

  assert.deepEqual(resposta, {
    id: "equipamento-1",
    cliente_id: "cliente-1",
    ordens_removidas: 1,
    apagado: true
  });
  assert.deepEqual(chamadas.map((item) => item.tabela), [
    "automacaoAgendada",
    "ordemServicoPeca",
    "ordemServicoChecklist",
    "ordemServicoEvidencia",
    "ordemServicoAssinatura",
    "ordemServicoObservacao",
    "ordemServicoEvento",
    "ordemServico",
    "equipamento"
  ]);
  assert.deepEqual(chamadas.at(-1), {
    tabela: "equipamento",
    where: {
      id: "equipamento-1"
    }
  });
});

test("apagarEquipamento exige maquina da empresa", async () => {
  const prisma = {
    equipamento: {
      findFirst: async () => null
    }
  };
  const service = criarService(prisma);

  await assert.rejects(() => service.apagarEquipamento("equipamento-1", usuario), NotFoundException);
});

test("obterPreviaPmocCliente retorna cliente, engenheiro, maquinas e OS concluidas separadas", async () => {
  const prisma = {
    cliente: {
      findFirst: async () => ({
        id: "cliente-1",
        nome: "Maria Souza",
        tipo: "pf",
        documento: "12345678900",
        telefone: "43988887777",
        email: "maria@example.com",
        pmocAtivo: true,
        atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
        engenheiroResponsavel: {
          id: "engenheiro-1",
          nome: "Paulo Londriclima",
          cpf: "12345678901",
          crea: "CREA-PR 123456",
          email: "paulo@example.com",
          telefone: "43999991111",
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z")
        },
        enderecos: [{ cidade: "Londrina", uf: "PR", bairro: "Centro" }],
        equipamentos: [
          {
            id: "equipamento-1",
            tipo: "Split",
            patrimonio: "PMOC-001",
            codigoBarras: "789",
            marca: "LG",
            modelo: "Dual Inverter",
            capacidadeBtu: 12000,
            gasRefrigerante: "R-410A",
            numeroSerie: "SN-1",
            localInstalacao: "Sala",
            atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
            ordensServico: [
              {
                id: "os-1",
                titulo: "PMOC mensal",
                problemaRelatado: "Rotina mensal",
                status: OrdemServicoStatus.concluida,
                agendadaPara: new Date("2026-06-11T12:00:00.000Z"),
                concluidaEm: new Date("2026-06-11T15:00:00.000Z"),
                valorCobrado: new Prisma.Decimal(250),
                tecnico: { id: "tecnico-1", nome: "Joao", email: "joao@example.com" },
                equipe: { id: "equipe-1", nome: "Equipe 1" },
                eventos: [
                  {
                    id: "evento-1",
                    acao: OrdemServicoEventoAcao.finalizar,
                    statusAnterior: OrdemServicoStatus.em_atendimento,
                    statusNovo: OrdemServicoStatus.concluida,
                    latitude: new Prisma.Decimal(-23.3047),
                    longitude: new Prisma.Decimal(-51.1697),
                    registradoEm: new Date("2026-06-11T15:00:00.000Z")
                  }
                ],
                evidencias: [
                  {
                    id: "ev-1",
                    tipo: "antes",
                    descricao: "Antes",
                    storageUrl: "/antes.webp",
                    mimeType: "image/webp",
                    tamanhoBytes: 1000,
                    criadoEm: new Date("2026-06-11T12:30:00.000Z")
                  }
                ],
                checklist: {
                  id: "check-1",
                  servicoRealizado: "Limpeza",
                  procedimentos: ["limpeza_filtro"],
                  custoTotalPecas: new Prisma.Decimal(18),
                  criadoEm: new Date("2026-06-11T14:00:00.000Z"),
                  atualizadoEm: new Date("2026-06-11T14:00:00.000Z"),
                  pecas: [
                    {
                      id: "peca-1",
                      descricaoPeca: "Produto",
                      quantidade: 1,
                      custoUnitario: new Prisma.Decimal(18)
                    }
                  ]
                },
                assinatura: {
                  id: "assinatura-1",
                  nomeResponsavel: "Maria Souza",
                  storageUrl: "/assinatura.png",
                  latitude: new Prisma.Decimal(-23.3047),
                  longitude: new Prisma.Decimal(-51.1697),
                  assinadoEm: new Date("2026-06-11T15:00:00.000Z")
                },
                observacoes: [
                  {
                    id: "obs-1",
                    texto: "Tudo ok",
                    visivelNoRelatorio: true,
                    criadoEm: new Date("2026-06-11T14:50:00.000Z")
                  }
                ]
              }
            ]
          }
        ]
      })
    },
    pmocRelatorio: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        assert.equal(where.empresaId, usuario.empresa_id);
        assert.equal(where.clienteId, "cliente-1");
        return [
          {
            id: "relatorio-jan",
            status: PmocRelatorioStatus.assinado,
            pdfHash: "hash-jan",
            assinafyDocumentId: "doc-jan",
            assinafyAssignmentId: "assignment-jan",
            assinafyStatus: "completed",
            criadoEm: new Date("2026-01-15T12:00:00.000Z"),
            emailAgendadoEm: new Date("2026-01-15T12:00:00.000Z"),
            assinadoEm: new Date("2026-01-16T12:00:00.000Z")
          },
          {
            id: "relatorio-jun",
            status: PmocRelatorioStatus.aguardando_assinatura_engenheiro,
            pdfHash: "hash-jun",
            assinafyDocumentId: "doc-jun",
            assinafyAssignmentId: "assignment-jun",
            assinafyStatus: "pending",
            criadoEm: new Date("2026-06-12T12:00:00.000Z"),
            emailAgendadoEm: new Date("2026-06-12T12:00:00.000Z"),
            assinadoEm: null
          },
          {
            id: "relatorio-jun-assinado",
            status: PmocRelatorioStatus.assinado,
            pdfHash: "hash-jun-assinado",
            assinafyDocumentId: "doc-jun-assinado",
            assinafyAssignmentId: "assignment-jun-assinado",
            assinafyStatus: "certificated",
            criadoEm: new Date("2026-06-12T11:00:00.000Z"),
            emailAgendadoEm: new Date("2026-06-12T11:30:00.000Z"),
            assinadoEm: new Date("2026-06-12T11:30:00.000Z")
          }
        ];
      }
    },
    automacaoAgendada: {
      findMany: async () => [
        {
          payload: {
            tipo: "pmoc_relatorio_assinado",
            relatorio_id: "relatorio-jan",
            smtp_entrega: {
              destinatario: "maria@example.com",
              resposta: "250 OK",
              enviado_em: "2026-01-15T12:05:00.000Z"
            }
          }
        },
        {
          payload: {
            tipo: "pmoc_relatorio_assinado",
            relatorio_id: "relatorio-jun-assinado",
            smtp_entrega: {
              destinatario: "maria@example.com",
              resposta: "250 OK",
              enviado_em: "2026-06-12T11:35:00.000Z"
            }
          }
        }
      ]
    }
  };
  const service = criarService(prisma);

  const resposta = await service.obterPreviaPmocCliente("cliente-1", usuario);

  assert.equal(resposta.cliente.nome, "Maria Souza");
  assert.equal(resposta.engenheiro_responsavel?.crea, "CREA-PR 123456");
  assert.equal(resposta.total_maquinas, 1);
  assert.equal(resposta.total_os_concluidas, 1);
  assert.equal(resposta.pronto_para_pdf, true);
  assert.deepEqual(resposta.pendencias, []);
  assert.equal(resposta.pmoc_meses.length, 12);
  assert.deepEqual(
    resposta.pmoc_meses.map((mes) => ({ mes: mes.mes, status: mes.status })),
    [
      { mes: "jan", status: "enviado" },
      { mes: "fev", status: "pendente" },
      { mes: "mar", status: "pendente" },
      { mes: "abr", status: "pendente" },
      { mes: "mai", status: "pendente" },
      { mes: "jun", status: "enviado" },
      { mes: "jul", status: "pendente" },
      { mes: "ago", status: "pendente" },
      { mes: "set", status: "pendente" },
      { mes: "out", status: "pendente" },
      { mes: "nov", status: "pendente" },
      { mes: "dez", status: "pendente" }
    ]
  );
  assert.equal(resposta.pmoc_meses[5].relatorio_id, "relatorio-jun-assinado");
  assert.equal(resposta.pmoc_meses[5].relatorio_status, PmocRelatorioStatus.assinado);
  assert.equal(resposta.assinatura_atual?.status, PmocRelatorioStatus.assinado);
  assert.equal(resposta.assinatura_atual?.assinafy_document_id, "doc-jun-assinado");
  assert.equal(resposta.assinatura_atual?.assinafy_status, "certificated");
  assert.equal(resposta.assinatura_atual?.email_entregue, true);
  assert.equal(resposta.maquinas[0].os_concluidas[0].checklist?.servico_realizado, "Limpeza");
  assert.equal(resposta.maquinas[0].os_concluidas[0].assinatura?.latitude, -23.3047);
});

test("obterPreviaPmocCliente nao bloqueia reenvio quando PMOC assinado ainda nao foi entregue ao cliente", async () => {
  const prisma = {
    cliente: {
      findFirst: async () => ({
        id: "cliente-1",
        nome: "Maria Souza",
        tipo: "pf",
        documento: "12345678900",
        telefone: "43988887777",
        email: "maria@example.com",
        pmocAtivo: true,
        atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
        engenheiroResponsavel: {
          id: "engenheiro-1",
          nome: "Paulo Londriclima",
          cpf: "12345678901",
          crea: "CREA-PR 123456",
          email: "paulo@example.com",
          telefone: "43999991111",
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z")
        },
        enderecos: [{ cidade: "Londrina", uf: "PR", bairro: "Centro" }],
        equipamentos: [
          criarEquipamentoPmocTeste("equipamento-1", "Sala", "PMOC-001", "SN-1", "2026-06-11T12:00:00.000Z")
        ]
      })
    },
    pmocRelatorio: {
      findMany: async () => [
        {
          id: "relatorio-assinado-sem-entrega",
          status: PmocRelatorioStatus.assinado,
          pdfHash: "hash-jun",
          assinafyDocumentId: "doc-jun",
          assinafyAssignmentId: "assignment-jun",
          assinafyStatus: "certificated",
          criadoEm: new Date("2026-06-12T12:00:00.000Z"),
          emailAgendadoEm: new Date("2026-06-12T12:00:00.000Z"),
          assinadoEm: new Date("2026-06-12T12:00:00.000Z")
        }
      ]
    },
    automacaoAgendada: {
      findMany: async () => []
    }
  };
  const service = criarService(prisma);

  const resposta = await service.obterPreviaPmocCliente("cliente-1", usuario);

  assert.equal(resposta.pmoc_meses[5].status, "pendente");
  assert.equal(resposta.pmoc_meses[5].relatorio_status, PmocRelatorioStatus.assinado);
  assert.equal(resposta.pmoc_meses[5].email_entregue, false);
  assert.equal(resposta.assinatura_atual?.status, PmocRelatorioStatus.assinado);
  assert.equal(resposta.assinatura_atual?.email_entregue, false);
});

test("gerarPdfPmocCliente retorna PDF com nome de arquivo e conteudo oficial", async () => {
  const prisma = {
    cliente: {
      findFirst: async () => ({
        id: "cliente-1",
        nome: "Maria Souza",
        tipo: "pf",
        documento: "12345678900",
        telefone: "43988887777",
        email: "maria@example.com",
        pmocAtivo: true,
        atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
        engenheiroResponsavel: {
          id: "engenheiro-1",
          nome: "Fabio Dias",
          cpf: "45678912345",
          crea: "CREA-PR 654321",
          email: "fabio@example.com",
          telefone: "43999991111",
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z")
        },
        enderecos: [{ cidade: "Londrina", uf: "PR", bairro: "Centro" }],
        equipamentos: [
          criarEquipamentoPmocTeste("equipamento-1", "Sala 09", "CRIS-009", "SN-CRIS-0009", "2026-06-01T20:01:00.000Z"),
          criarEquipamentoPmocTeste("equipamento-2", "Sala 19", "CRIS-019", "SN-CRIS-0019", "2026-06-11T20:01:00.000Z")
        ]
      })
    },
    pmocRelatorio: {
      findMany: async () => []
    }
  };
  const service = criarService(prisma);

  const resposta = await service.gerarPdfPmocCliente("cliente-1", usuario);

  assert.equal(resposta.contentType, "application/pdf");
  assert.equal(resposta.filename, "pmoc-maria-souza.pdf");
  assert.equal(resposta.buffer.subarray(0, 4).toString("utf8"), "%PDF");
  const pdf = resposta.buffer.toString("latin1");
  assert.match(pdf, /Maria Souza/);
  assert.match(pdf, /AIRMOVEBR - RELATORIO PMOC/);
  assert.match(pdf, /Campo\s+Informacao/);
  assert.match(pdf, /Cliente\s+Maria Souza/);
  assert.match(pdf, /Engenheiro Responsavel\s+Fabio Dias - CREA-PR 654321/);
  assert.match(pdf, /MAQUINA N:001/);
  assert.match(pdf, /MAQUINA N:002/);
  assert.match(pdf, /DECLARACAO DE CONFORMIDADE TECNICA/);
  assert.match(pdf, /Lei Federal n 13\.589\/2018/);
  assert.match(pdf, /Portaria MS n 3\.523\/1998/);
  assert.match(pdf, /Resolucao ANVISA RE n 09\/2003/);
  assert.match(pdf, /\/Count 4/);
  assert.ok(pdf.indexOf("(AIRMOVEBR - RELATORIO PMOC") < pdf.indexOf("(MAQUINA N:001"));
  assert.ok(pdf.indexOf("(MAQUINA N:001") < pdf.indexOf("(MAQUINA N:002"));
  assert.ok(pdf.indexOf("(MAQUINA N:002") < pdf.indexOf("(DECLARACAO DE CONFORMIDADE TECNICA"));
  const declaracao = pdf.slice(pdf.indexOf("(DECLARACAO DE CONFORMIDADE"));
  assert.doesNotMatch(declaracao, /Engenheiro Responsavel: Fabio Dias/);
  assert.doesNotMatch(declaracao, /CPF: 456789123-45/);
  assert.doesNotMatch(declaracao, /CREA: CREA-PR 654321/);
  assert.doesNotMatch(declaracao, /Referente: junho de 2026/);
  assert.doesNotMatch(declaracao, /______________________________________________/);
  assert.doesNotMatch(pdf, /Responsavel pelo Empreendimento/);
});

test("obterPreviaRelatorioAvulsoCliente retorna cliente sem PMOC com OS concluidas", async () => {
  const prisma = {
    cliente: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        assert.equal(where.id, "cliente-1");
        assert.equal(where.empresaId, usuario.empresa_id);
        return {
          id: "cliente-1",
          nome: "Cliente Avulso",
          tipo: "pf",
          documento: "12345678900",
          telefone: "43988887777",
          email: "cliente@example.com",
          pmocAtivo: false,
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
          enderecos: [{ cidade: "Londrina", uf: "PR", bairro: "Centro" }],
          equipamentos: [
            criarEquipamentoPmocTeste("equipamento-1", "Sala", "AV-001", "SN-AV-1", "2026-06-11T12:00:00.000Z")
          ]
        };
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.obterPreviaRelatorioAvulsoCliente("cliente-1", usuario);

  assert.equal(resposta.cliente.nome, "Cliente Avulso");
  assert.equal(resposta.total_maquinas, 1);
  assert.equal(resposta.total_os_concluidas, 1);
  assert.equal(resposta.pronto_para_envio, true);
  assert.deepEqual(resposta.pendencias, []);
});

test("enviarRelatorioAvulsoCliente agenda email direto ao cliente com copia interna via automacao", async () => {
  const chamadas = {
    emailData: undefined as unknown
  };
  const prisma = {
    cliente: {
      findFirst: async () => ({
        id: "cliente-1",
        nome: "Cliente Avulso",
        tipo: "pf",
        documento: "12345678900",
        telefone: "43988887777",
        email: "cliente@example.com",
        pmocAtivo: false,
        atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
        enderecos: [{ cidade: "Londrina", uf: "PR", bairro: "Centro" }],
        equipamentos: [
          criarEquipamentoPmocTeste("equipamento-1", "Sala", "AV-001", "SN-AV-1", "2026-06-11T12:00:00.000Z")
        ]
      })
    },
    automacaoAgendada: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.emailData = data;
        return { id: "automacao-1" };
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.enviarRelatorioAvulsoCliente("cliente-1", usuario);

  assert.equal(resposta.email_cliente_agendado, true);
  assert.equal((chamadas.emailData as { tipo: AutomacaoTipo }).tipo, AutomacaoTipo.enviar_email);
  const payload = (chamadas.emailData as { payload: Record<string, unknown> }).payload;
  assert.equal(payload.tipo, "relatorio_tecnico_avulso");
  assert.equal(payload.cliente_id, "cliente-1");
  assert.equal(payload.cliente_email, "cliente@example.com");
  assert.match(String(payload.pdf_filename), /^relatorio-tecnico-cliente-avulso\.pdf$/);
  assert.match(String(payload.pdf_base64), /^[A-Za-z0-9+/]+=*$/);
  assert.deepEqual(payload.os_ids, ["os-equipamento-1"]);
});

function criarEquipamentoPmocTeste(id: string, localInstalacao: string, patrimonio: string, numeroSerie: string, inicioIso: string) {
  const inicio = new Date(inicioIso);
  const fim = new Date(inicio.getTime() + 170 * 60000);
  const sufixo = patrimonio.toLowerCase().replace(/\D/g, "") || id;

  return {
    id,
    tipo: "Split",
    patrimonio,
    codigoBarras: `7890000000${sufixo}`,
    marca: "Springer",
    modelo: "Split Hi Wall",
    capacidadeBtu: 21000,
    gasRefrigerante: "R-410A",
    numeroSerie,
    localInstalacao,
    atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
    ordensServico: [
      {
        id: `os-${id}`,
        titulo: "PMOC mensal",
        problemaRelatado: "Rotina mensal",
        status: OrdemServicoStatus.concluida,
        agendadaPara: inicio,
        concluidaEm: fim,
        valorCobrado: new Prisma.Decimal(250),
        tecnico: { id: "tecnico-1", nome: "Joao Tecnico", email: "joao@example.com" },
        equipe: null,
        eventos: [
          {
            id: `evento-${id}`,
            acao: OrdemServicoEventoAcao.finalizar,
            statusAnterior: OrdemServicoStatus.em_atendimento,
            statusNovo: OrdemServicoStatus.concluida,
            latitude: new Prisma.Decimal(-23.3047),
            longitude: new Prisma.Decimal(-51.1697),
            registradoEm: fim
          }
        ],
        evidencias: [
          {
            id: `ev-antes-${id}`,
            tipo: "antes",
            descricao: "Evidencia antes da manutencao PMOC",
            storageUrl: `/storage/demo/cris/pmoc-${sufixo}-antes.jpg`,
            mimeType: "image/jpeg",
            tamanhoBytes: 1000,
            criadoEm: inicio
          },
          {
            id: `ev-depois-${id}`,
            tipo: "depois",
            descricao: "Evidencia depois da manutencao PMOC",
            storageUrl: `/storage/demo/cris/pmoc-${sufixo}-depois.jpg`,
            mimeType: "image/jpeg",
            tamanhoBytes: 1000,
            criadoEm: fim
          }
        ],
        checklist: {
          id: `check-${id}`,
          servicoRealizado: "Limpeza de filtros",
          procedimentos: ["limpeza_filtro", "limpeza_evaporadora"],
          custoTotalPecas: new Prisma.Decimal(0),
          criadoEm: inicio,
          atualizadoEm: fim,
          pecas: []
        },
        assinatura: {
          id: `assinatura-${id}`,
          nomeResponsavel: "Maria Souza",
          storageUrl: "/assinatura.png",
          latitude: new Prisma.Decimal(-23.3047),
          longitude: new Prisma.Decimal(-51.1697),
          assinadoEm: fim
        },
        observacoes: [
          {
            id: `obs-${id}`,
            texto: "Sem observacoes visiveis.",
            visivelNoRelatorio: true,
            criadoEm: fim
          }
        ]
      }
    ]
  };
}

test("solicitarAssinaturaPmocEngenheiro cria relatorio com token e hash do PDF", async () => {
  const chamadas = {
    createData: undefined as unknown,
    emailData: undefined as unknown
  };
  const prisma = {
    cliente: {
      findFirst: async () => ({
        id: "cliente-1",
        nome: "Maria Souza",
        tipo: "pf",
        documento: "12345678900",
        telefone: "43988887777",
        email: "maria@example.com",
        pmocAtivo: true,
        atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
        engenheiroResponsavel: {
          id: "engenheiro-1",
          nome: "Paulo Londriclima",
          cpf: "12345678901",
          crea: "CREA-PR 123456",
          email: "paulo@example.com",
          telefone: "43999991111",
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z")
        },
        enderecos: [{ cidade: "Londrina", uf: "PR", bairro: "Centro" }],
        equipamentos: []
      })
    },
    pmocRelatorio: {
      findMany: async () => [],
      create: async ({ data }: { data: unknown }) => {
        chamadas.createData = data;
        return {
          id: "relatorio-1",
          ...(data as object),
          status: "aguardando_assinatura_engenheiro",
          criadoEm: new Date("2026-06-12T11:00:00.000Z"),
          atualizadoEm: new Date("2026-06-12T11:00:00.000Z")
        };
      }
    },
    automacaoAgendada: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.emailData = data;
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.solicitarAssinaturaPmocEngenheiro("cliente-1", usuario);

  assert.equal((chamadas.createData as { clienteId: string }).clienteId, "cliente-1");
  assert.equal((chamadas.createData as { engenheiroResponsavelId: string }).engenheiroResponsavelId, "engenheiro-1");
  assert.equal((chamadas.createData as { status: string }).status, "aguardando_assinatura_engenheiro");
  assert.match((chamadas.createData as { tokenAssinatura: string }).tokenAssinatura, /^[a-f0-9]{48}$/);
  assert.match((chamadas.createData as { pdfHash: string }).pdfHash, /^[a-f0-9]{64}$/);
  assert.equal((chamadas.emailData as { tipo: AutomacaoTipo }).tipo, AutomacaoTipo.enviar_email);
  const tokenAssinatura = (chamadas.createData as { tokenAssinatura: string }).tokenAssinatura;
  const payload = (chamadas.emailData as { payload: Record<string, unknown> }).payload;
  assert.match(String(payload.data_envio), /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(
    {
      ...payload,
      pdf_base64: "base64-validado",
      data_envio: "data-validada"
    },
    {
      tipo: "pmoc_assinatura_engenheiro",
      relatorio_id: "relatorio-1",
      cliente_nome: "Maria Souza",
      cliente_email: "maria@example.com",
      data_envio: "data-validada",
      engenheiro_email: "paulo@example.com",
      engenheiro_nome: "Paulo Londriclima",
      link_assinatura: `http://127.0.0.1:5174/landing/assinatura-pmoc?token=${tokenAssinatura}`,
      pdf_hash: (chamadas.createData as { pdfHash: string }).pdfHash,
      pdf_filename: "pmoc-maria-souza.pdf",
      pdf_base64: "base64-validado"
    }
  );
  assert.match(String(payload.pdf_base64), /^[A-Za-z0-9+/]+=*$/);
  assert.equal(resposta.status, "aguardando_assinatura_engenheiro");
  assert.equal(resposta.engenheiro_responsavel.crea, "CREA-PR 123456");
  assert.equal((resposta as { email_engenheiro_agendado: boolean }).email_engenheiro_agendado, true);
  assert.equal("token_assinatura" in resposta, false);
});

test("criarEquipamentoCliente gera codigo publico e senha inicial", async () => {
  const chamadas = {
    createData: undefined as unknown
  };
  const prisma = {
    cliente: {
      findFirst: async () => ({ id: "cliente-1" })
    },
    equipamento: {
      findUnique: async () => null,
      create: async ({ data }: { data: unknown }) => {
        chamadas.createData = data;
        return {
          id: "equipamento-1",
          codigoPublico: (data as { codigoPublico: string }).codigoPublico,
          acessoPublicoAtivo: true,
          tipo: "Split",
          patrimonio: "PAT-1",
          codigoBarras: "789",
          marca: "LG",
          modelo: "Dual",
          capacidadeBtu: 12000,
          gasRefrigerante: (data as { gasRefrigerante?: string }).gasRefrigerante ?? null,
          numeroSerie: "SN1",
          localInstalacao: "Sala",
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
          ordensServico: []
        };
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.criarEquipamentoCliente(
    "cliente-1",
    {
      tipo: "Split",
      patrimonio: "PAT-1",
      codigo_barras: "789",
      marca: "LG",
      modelo: "Dual",
      capacidade_btu: 12000,
      gas_refrigerante: "R-410A",
      numero_serie: "SN1",
      local_instalacao: "Sala"
    },
    usuario
  );

  assert.match((chamadas.createData as { codigoPublico: string }).codigoPublico, /^EQ-[0-9A-F]{10}$/);
  assert.equal((chamadas.createData as { gasRefrigerante: string }).gasRefrigerante, "R-410A");
  assert.match((chamadas.createData as { senhaPublicaHash: string }).senhaPublicaHash, /^scrypt:/);
  assert.match(resposta.senha_publica, /^\d{6}$/);
});

