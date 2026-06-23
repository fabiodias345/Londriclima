import { BadRequestException,ConflictException,NotFoundException,UnprocessableEntityException } from "@nestjs/common";
import {
AutomacaoTipo,
EvidenciaTipo,
OrdemServicoEventoAcao,
OrdemServicoStatus,
Prisma,
UsuarioRole
} from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { OrdensServicoService } from "./ordens-servico.service";

const usuario = {
  id: "usuario-1",
  empresa_id: "empresa-1",
  email: "tecnico@airmovebr.local",
  role: UsuarioRole.tecnico
};

function criarService(prisma: unknown, options: { onSalvarAssinatura?: () => void } = {}) {
  const service = new OrdensServicoService(prisma as never);
  (service as unknown as { salvarAssinatura: () => Promise<string> }).salvarAssinatura = async () => {
    options.onSalvarAssinatura?.();
    return "/storage/os/os-1/assinatura.png";
  };
  return service;
}

const finalizarDto = {
  assinatura_cliente_base64: "data:image/png;base64,aGVsbG8=",
  nome_responsavel_assinatura: "Maria Souza",
  latitude: -23.3048,
  longitude: -51.1701,
  finalizado_em: "2026-06-10T12:05:00-03:00"
};

function criarOrdemProntaParaFinalizar(overrides: Record<string, unknown> = {}) {
  return {
    id: "os-1",
    empresaId: "empresa-1",
    status: OrdemServicoStatus.em_atendimento,
    equipamento: {
      marca: "LG",
      modelo: "Dual Inverter",
      gasRefrigerante: "R-410A"
    },
    evidencias: [{ tipo: EvidenciaTipo.antes }, { tipo: EvidenciaTipo.depois }],
    checklist: {
      servicoRealizado: "Limpeza completa"
    },
    assinatura: null,
    ...overrides
  };
}

test("atualizarStatus muda OS aberta para em_deslocamento e registra evento com GPS", async () => {
  const registradoEm = "2026-06-10T08:45:00-03:00";
  const eventoCriado = {
    acao: OrdemServicoEventoAcao.iniciar_rota,
    latitude: new Prisma.Decimal(-23.3045),
    longitude: new Prisma.Decimal(-51.1696),
    registradoEm: new Date(registradoEm)
  };
  const chamadas = {
    updateData: undefined as unknown,
    eventoData: undefined as unknown
  };
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-1",
        status: OrdemServicoStatus.aberta
      }),
      update: async ({ data }: { data: unknown }) => {
        chamadas.updateData = data;
        return {
          id: "os-1",
          status: OrdemServicoStatus.em_deslocamento
        };
      }
    },
    ordemServicoEvento: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.eventoData = data;
        return eventoCriado;
      }
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.atualizarStatus(
    "os-1",
    {
      acao: OrdemServicoEventoAcao.iniciar_rota,
      latitude: -23.3045,
      longitude: -51.1696,
      registrado_em: registradoEm
    },
    usuario
  );

  assert.deepEqual(chamadas.updateData, { status: OrdemServicoStatus.em_deslocamento });
  assert.deepEqual(resposta, {
    os_id: "os-1",
    status: OrdemServicoStatus.em_deslocamento,
    evento: {
      acao: OrdemServicoEventoAcao.iniciar_rota,
      latitude: -23.3045,
      longitude: -51.1696,
      registrado_em: eventoCriado.registradoEm.toISOString()
    }
  });
  assert.equal((chamadas.eventoData as { empresaId: string }).empresaId, "empresa-1");
  assert.equal((chamadas.eventoData as { usuarioId: string }).usuarioId, "usuario-1");
});

test("atualizarStatus inicia atendimento direto a partir de OS aberta", async () => {
  const registradoEm = "2026-06-10T08:45:00-03:00";
  const eventoCriado = {
    acao: OrdemServicoEventoAcao.iniciar_atendimento,
    latitude: new Prisma.Decimal(-23.3045),
    longitude: new Prisma.Decimal(-51.1696),
    registradoEm: new Date(registradoEm)
  };
  const chamadas = {
    updateData: undefined as unknown
  };
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-1",
        status: OrdemServicoStatus.aberta
      }),
      update: async ({ data }: { data: unknown }) => {
        chamadas.updateData = data;
        return {
          id: "os-1",
          status: OrdemServicoStatus.em_atendimento
        };
      }
    },
    ordemServicoEvento: {
      create: async () => eventoCriado
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.atualizarStatus(
    "os-1",
    {
      acao: OrdemServicoEventoAcao.iniciar_atendimento,
      latitude: -23.3045,
      longitude: -51.1696,
      registrado_em: registradoEm
    },
    usuario
  );

  assert.deepEqual(chamadas.updateData, { status: OrdemServicoStatus.em_atendimento });
  assert.equal(resposta.status, OrdemServicoStatus.em_atendimento);
  assert.equal(resposta.evento.acao, OrdemServicoEventoAcao.iniciar_atendimento);
});

test("atualizarStatus rejeita transicao fora do fluxo permitido", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-1",
        status: OrdemServicoStatus.pre_chamado
      })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await assert.rejects(
    () =>
      service.atualizarStatus(
        "os-1",
        {
          acao: OrdemServicoEventoAcao.iniciar_rota,
          latitude: -23.3045,
          longitude: -51.1696,
          registrado_em: "2026-06-10T08:45:00-03:00"
        },
        usuario
      ),
    ConflictException
  );
});

test("atualizarStatus esconde OS de outra empresa", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-2",
        status: OrdemServicoStatus.aberta
      })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await assert.rejects(
    () =>
      service.atualizarStatus(
        "os-1",
        {
          acao: OrdemServicoEventoAcao.iniciar_rota,
          latitude: -23.3045,
          longitude: -51.1696,
          registrado_em: "2026-06-10T08:45:00-03:00"
        },
        usuario
      ),
    NotFoundException
  );
});

test("registrarChecklist exige evidencia inicial antes de salvar servico", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-1",
        status: OrdemServicoStatus.em_atendimento,
        evidencias: [{ tipo: EvidenciaTipo.depois }],
        checklist: null
      })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await assert.rejects(
    () =>
      service.registrarChecklist(
        "os-1",
        {
          servico_realizado: "Limpeza completa",
          procedimentos: ["limpeza_filtro"],
          pecas: []
        },
        usuario
      ),
    UnprocessableEntityException
  );
});

test("registrarChecklist salva respostas estruturadas por equipamento", async () => {
  const chamadas = {
    respostasDeleteWhere: undefined as unknown,
    respostasCreateData: undefined as unknown
  };
  const checklistCriado = {
    id: "checklist-1",
    servicoRealizado: "Checklist PMOC mensal",
    procedimentos: ["M1", "M6"],
    custoTotalPecas: new Prisma.Decimal(0),
    atualizadoEm: new Date("2026-06-10T15:30:00.000Z"),
    pecas: []
  };
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-1",
        clienteId: "cliente-1",
        status: OrdemServicoStatus.em_atendimento,
        evidencias: [{ tipo: EvidenciaTipo.antes }],
        checklist: null
      })
    },
    equipamento: {
      findFirst: async () => ({
        id: "equip-1",
        empresaId: "empresa-1",
        clienteId: "cliente-1"
      })
    },
    ordemServicoChecklist: {
      create: async () => checklistCriado
    },
    ordemServicoChecklistResposta: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.respostasDeleteWhere = where;
      },
      createMany: async ({ data }: { data: unknown }) => {
        chamadas.respostasCreateData = data;
      }
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.registrarChecklist(
    "os-1",
    {
      equipamento_id: "equip-1",
      checklist_tipo: "mensal",
      servico_realizado: "Checklist PMOC mensal",
      respostas: [
        {
          codigo: "M1",
          tipo: "checkbox",
          valor: "true"
        },
        {
          codigo: "M6",
          tipo: "select",
          valor: "danificado",
          observacao: "Filtro rasgado"
        }
      ]
    },
    usuario
  );

  assert.deepEqual(chamadas.respostasDeleteWhere, {
    ordemServicoId: "os-1",
    equipamentoId: "equip-1"
  });
  assert.deepEqual(chamadas.respostasCreateData, [
    {
      empresaId: "empresa-1",
      ordemServicoId: "os-1",
      checklistId: "checklist-1",
      equipamentoId: "equip-1",
      checklistTipo: "mensal",
      codigo: "M1",
      tipo: "checkbox",
      valor: "true",
      observacao: null
    },
    {
      empresaId: "empresa-1",
      ordemServicoId: "os-1",
      checklistId: "checklist-1",
      equipamentoId: "equip-1",
      checklistTipo: "mensal",
      codigo: "M6",
      tipo: "select",
      valor: "danificado",
      observacao: "Filtro rasgado"
    }
  ]);
  assert.equal(resposta.equipamento_id, "equip-1");
  assert.equal(resposta.respostas_salvas, 2);
});

test("finalizarOs conclui a OS, registra assinatura, evento e automacoes", async () => {
  const chamadas = {
    assinaturaData: undefined as unknown,
    eventoData: undefined as unknown,
    updateData: undefined as unknown,
    automacoesData: undefined as unknown
  };
  const tx = {
    ordemServico: {
      findUnique: async () => criarOrdemProntaParaFinalizar(),
      update: async ({ data }: { data: unknown }) => {
        chamadas.updateData = data;
      }
    },
    ordemServicoAssinatura: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.assinaturaData = data;
      }
    },
    ordemServicoEvento: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.eventoData = data;
      }
    },
    automacaoAgendada: {
      createMany: async ({ data }: { data: unknown }) => {
        chamadas.automacoesData = data;
      }
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.finalizarOs("os-1", finalizarDto, usuario);

  assert.deepEqual(resposta, {
    os_id: "os-1",
    status: OrdemServicoStatus.concluida,
    finalizado_em: new Date(finalizarDto.finalizado_em).toISOString(),
    assinatura_url: "/storage/os/os-1/assinatura.png",
    automacoes_agendadas: [
      AutomacaoTipo.gerar_pdf,
      AutomacaoTipo.enviar_email,
      AutomacaoTipo.enviar_whatsapp,
      AutomacaoTipo.recorrencia_180_dias
    ]
  });
  assert.equal(
    (chamadas.assinaturaData as { nomeResponsavel: string }).nomeResponsavel,
    "Maria Souza"
  );
  assert.equal((chamadas.eventoData as { acao: OrdemServicoEventoAcao }).acao, OrdemServicoEventoAcao.finalizar);
  assert.deepEqual(chamadas.updateData, {
    status: OrdemServicoStatus.concluida,
    concluidaEm: new Date(finalizarDto.finalizado_em)
  });

  const automacoes = chamadas.automacoesData as Array<{ tipo: AutomacaoTipo; executarEm: Date }>;
  assert.deepEqual(
    automacoes.map((automacao) => automacao.tipo),
    [
      AutomacaoTipo.gerar_pdf,
      AutomacaoTipo.enviar_email,
      AutomacaoTipo.enviar_whatsapp,
      AutomacaoTipo.recorrencia_180_dias
    ]
  );
  assert.equal(
    automacoes.find((automacao) => automacao.tipo === AutomacaoTipo.recorrencia_180_dias)?.executarEm.toISOString(),
    "2026-12-07T15:05:00.000Z"
  );
});

test("finalizarOs permite OS sem equipamento unico quando checklist e evidencias existem", async () => {
  const chamadas = {
    assinaturaData: undefined as unknown,
    updateData: undefined as unknown
  };
  const tx = {
    ordemServico: {
      findUnique: async () =>
        criarOrdemProntaParaFinalizar({
          equipamento: null,
          cliente: {
            equipamentos: [{ id: "equip-1" }, { id: "equip-2" }]
          },
          checklistRespostas: [{ equipamentoId: "equip-1" }, { equipamentoId: "equip-2" }]
        }),
      update: async ({ data }: { data: unknown }) => {
        chamadas.updateData = data;
      }
    },
    ordemServicoAssinatura: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.assinaturaData = data;
      }
    },
    ordemServicoEvento: {
      create: async () => {}
    },
    automacaoAgendada: {
      createMany: async () => {}
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.finalizarOs("os-1", finalizarDto, usuario);

  assert.equal(resposta.status, OrdemServicoStatus.concluida);
  assert.equal((chamadas.updateData as { status: OrdemServicoStatus }).status, OrdemServicoStatus.concluida);
  assert.equal((chamadas.assinaturaData as { nomeResponsavel: string }).nomeResponsavel, "Maria Souza");
});

test("finalizarOs bloqueia OS multi-equipamento com maquina pendente", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () =>
        criarOrdemProntaParaFinalizar({
          equipamento: null,
          cliente: {
            equipamentos: [{ id: "equip-1" }, { id: "equip-2" }]
          },
          checklistRespostas: [{ equipamentoId: "equip-1" }]
        })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await assert.rejects(
    () => service.finalizarOs("os-1", finalizarDto, usuario),
    /Finalize todos os equipamentos/
  );
});

test("finalizarOs exige gas refrigerante do equipamento", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () =>
        criarOrdemProntaParaFinalizar({
          equipamento: {
            marca: "LG",
            modelo: "Dual Inverter",
            gasRefrigerante: null
          }
        })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await assert.rejects(
    () => service.finalizarOs("os-1", finalizarDto, usuario),
    UnprocessableEntityException
  );
});

test("finalizarOs exige evidencia inicial", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () =>
        criarOrdemProntaParaFinalizar({
          evidencias: [{ tipo: EvidenciaTipo.depois }]
        })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await assert.rejects(
    () => service.finalizarOs("os-1", finalizarDto, usuario),
    UnprocessableEntityException
  );
});

test("finalizarOs exige checklist registrado", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () => criarOrdemProntaParaFinalizar({ checklist: null })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await assert.rejects(
    () => service.finalizarOs("os-1", finalizarDto, usuario),
    UnprocessableEntityException
  );
});

test("finalizarOs permite finalizar sem evidencia final", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () =>
        criarOrdemProntaParaFinalizar({
          evidencias: [{ tipo: EvidenciaTipo.antes }]
        }),
      update: async () => undefined
    },
    ordemServicoAssinatura: {
      create: async () => undefined
    },
    ordemServicoEvento: {
      create: async () => undefined
    },
    automacaoAgendada: {
      createMany: async () => undefined
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.finalizarOs("os-1", finalizarDto, usuario);

  assert.equal(resposta.status, OrdemServicoStatus.concluida);
});

test("finalizarOs rejeita OS ja concluida", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () =>
        criarOrdemProntaParaFinalizar({
          status: OrdemServicoStatus.concluida
        })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await assert.rejects(() => service.finalizarOs("os-1", finalizarDto, usuario), ConflictException);
});

test("identificarEquipamento exige gas refrigerante na primeira identificacao", async () => {
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-1",
        clienteId: "cliente-1",
        equipamentoId: null,
        status: OrdemServicoStatus.em_atendimento
      })
    },
    equipamento: {
      create: async () => ({})
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await assert.rejects(
    () =>
      service.identificarEquipamento(
        "os-1",
        {
          codigo_qr: "QR-1",
          tipo: "Split",
          marca: "LG",
          modelo: "Dual Inverter"
        },
        usuario
      ),
    BadRequestException
  );
});
