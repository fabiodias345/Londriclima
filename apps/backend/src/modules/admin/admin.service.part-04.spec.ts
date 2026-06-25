import { ConflictException,NotFoundException } from "@nestjs/common";
import {
OrdemServicoEventoAcao,
OrdemServicoStatus,
PmocRelatorioStatus,
Prisma,
UsuarioRole
} from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
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

test("apagarEngenheiroResponsavel desvincula clientes e remove engenheiro sem relatorio PMOC", async () => {
  const chamadas = {
    updateMany: undefined as unknown,
    deleteWhere: undefined as unknown
  };
  const tx = {
    cliente: {
      updateMany: async ({ where, data }: { where: unknown; data: unknown }) => {
        chamadas.updateMany = { where, data };
      }
    },
    engenheiroResponsavel: {
      delete: async ({ where }: { where: unknown }) => {
        chamadas.deleteWhere = where;
      }
    }
  };
  const prisma = {
    engenheiroResponsavel: {
      findFirst: async () => ({
        id: "engenheiro-1",
        _count: {
          clientes: 2,
          pmocRelatorios: 0
        }
      })
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.apagarEngenheiroResponsavel("engenheiro-1", usuario);

  assert.deepEqual(chamadas.updateMany, {
    where: {
      empresaId: "empresa-1",
      engenheiroResponsavelId: "engenheiro-1"
    },
    data: {
      engenheiroResponsavelId: null
    }
  });
  assert.deepEqual(chamadas.deleteWhere, {
    id: "engenheiro-1"
  });
  assert.deepEqual(resposta, {
    id: "engenheiro-1",
    clientes_desvinculados: 2,
    apagado: true
  });
});

test("apagarEngenheiroResponsavel bloqueia engenheiro com relatorio PMOC", async () => {
  const prisma = {
    engenheiroResponsavel: {
      findFirst: async () => ({
        id: "engenheiro-1",
        _count: {
          clientes: 0,
          pmocRelatorios: 1
        }
      })
    }
  };
  const service = criarService(prisma);

  await assert.rejects(() => service.apagarEngenheiroResponsavel("engenheiro-1", usuario), ConflictException);
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

test("apagarOrdemAgenda remove ordem e historico operacional vinculado", async () => {
  const chamadas = [] as { tabela: string; where: unknown; data?: unknown }[];
  const tx = {
    planoRecorrencia: {
      updateMany: async ({ where, data }: { where: unknown; data: unknown }) =>
        chamadas.push({ tabela: "planoRecorrencia", where, data })
    },
    automacaoAgendada: {
      deleteMany: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "automacaoAgendada", where })
    },
    ordemServicoResponsavel: {
      deleteMany: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "ordemServicoResponsavel", where })
    },
    ordemServicoPeca: {
      deleteMany: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "ordemServicoPeca", where })
    },
    ordemServicoChecklistResposta: {
      deleteMany: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "ordemServicoChecklistResposta", where })
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
      delete: async ({ where }: { where: unknown }) => chamadas.push({ tabela: "ordemServico", where })
    }
  };
  const prisma = {
    ordemServico: {
      findFirst: async () => ({
        id: "os-1",
        clienteId: "cliente-1",
        checklist: {
          id: "checklist-1"
        }
      })
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.apagarOrdemAgenda("os-1", usuario);

  assert.deepEqual(resposta, {
    id: "os-1",
    cliente_id: "cliente-1",
    apagada: true
  });
  assert.deepEqual(chamadas.map((item) => item.tabela), [
    "planoRecorrencia",
    "automacaoAgendada",
    "ordemServicoResponsavel",
    "ordemServicoPeca",
    "ordemServicoChecklistResposta",
    "ordemServicoChecklist",
    "ordemServicoEvidencia",
    "ordemServicoAssinatura",
    "ordemServicoObservacao",
    "ordemServicoEvento",
    "ordemServico"
  ]);
});

test("apagarOrdemAgenda exige OS da empresa", async () => {
  const prisma = {
    ordemServico: {
      findFirst: async () => null
    }
  };
  const service = criarService(prisma);

  await assert.rejects(() => service.apagarOrdemAgenda("os-1", usuario), NotFoundException);
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
