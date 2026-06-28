import { BadRequestException } from "@nestjs/common";
import { NotFoundException } from "@nestjs/common";
import {
ChecklistTipo,
OrdemServicoEventoAcao,
OrdemServicoStatus,
OrdemServicoTipoServico,
PlanoRecorrenciaFrequencia,
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

test("criarOrdemAgenda cria OS aberta para cliente da empresa e registra evento", async () => {
  const chamadas = {
    createData: undefined as unknown,
    eventoData: undefined as unknown
  };
  const tx = {
    cliente: {
      findFirst: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, {
          id: "cliente-1",
          empresaId: "empresa-1"
        });
        return {
          id: "cliente-1",
          enderecos: [{ id: "endereco-1" }]
        };
      }
    },
    ordemServico: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.createData = data;
        return {
          id: "os-agenda-1",
          status: OrdemServicoStatus.aberta,
          atualizadaEm: new Date("2026-06-18T11:00:00.000Z")
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

  const resposta = await service.criarOrdemAgenda(
    {
      cliente_id: "cliente-1",
      titulo: "Manutencao preventiva",
      tipo_servico: OrdemServicoTipoServico.preventiva,
      checklist_tipo: ChecklistTipo.anual,
      detalhes: "Limpeza e revisao",
      agendada_para: "2026-06-18T08:00:00.000Z",
      valor_cobrado: 350
    },
    usuario
  );

  assert.equal((chamadas.createData as { empresaId: string }).empresaId, "empresa-1");
  assert.equal((chamadas.createData as { clienteId: string }).clienteId, "cliente-1");
  assert.equal((chamadas.createData as { enderecoId: string }).enderecoId, "endereco-1");
  assert.equal((chamadas.createData as { status: OrdemServicoStatus }).status, OrdemServicoStatus.aberta);
  assert.equal((chamadas.createData as { tipoServico: OrdemServicoTipoServico }).tipoServico, OrdemServicoTipoServico.preventiva);
  assert.equal((chamadas.createData as { checklistTipo: ChecklistTipo }).checklistTipo, ChecklistTipo.anual);
  assert.equal((chamadas.createData as { titulo: string }).titulo, "Manutencao preventiva");
  assert.equal((chamadas.createData as { problemaRelatado: string }).problemaRelatado, "Limpeza e revisao");
  assert.equal((chamadas.createData as { valorCobrado: Prisma.Decimal }).valorCobrado.toNumber(), 350);
  assert.equal((chamadas.eventoData as { acao: OrdemServicoEventoAcao }).acao, OrdemServicoEventoAcao.aprovar);
  assert.deepEqual(resposta, {
    os_id: "os-agenda-1",
    status: OrdemServicoStatus.aberta,
    atualizado_em: "2026-06-18T11:00:00.000Z"
  });
});

test("reprogramarOrdemAgenda atualiza horario e responsaveis de OS operacional", async () => {
  const chamadas = {
    updateData: undefined as unknown
  };
  const tx = {
    ordemServico: {
      findUnique: async () => ({
        id: "os-1",
        empresaId: "empresa-1",
        status: OrdemServicoStatus.aberta,
        clienteId: "cliente-antigo"
      }),
      update: async ({ data }: { data: unknown }) => {
        chamadas.updateData = data;
        return {
          id: "os-1",
          status: OrdemServicoStatus.aberta,
          atualizadaEm: new Date("2026-06-18T12:00:00.000Z")
        };
      }
    },
    cliente: {
      findFirst: async () => ({
        id: "cliente-1",
        enderecos: [{ id: "endereco-1" }]
      })
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.reprogramarOrdemAgenda(
    "os-1",
    {
      cliente_id: "cliente-1",
      titulo: "Revisao remarcada",
      tipo_servico: OrdemServicoTipoServico.corretiva,
      checklist_tipo: ChecklistTipo.anual,
      agendada_para: "2026-06-18T13:30:00.000Z"
    },
    usuario
  );

  assert.equal((chamadas.updateData as { titulo: string }).titulo, "Revisao remarcada");
  assert.equal((chamadas.updateData as { tipoServico: OrdemServicoTipoServico }).tipoServico, OrdemServicoTipoServico.corretiva);
  assert.equal((chamadas.updateData as { checklistTipo: ChecklistTipo }).checklistTipo, ChecklistTipo.mensal);
  assert.equal((chamadas.updateData as { clienteId: string }).clienteId, "cliente-1");
  assert.equal((chamadas.updateData as { enderecoId: string }).enderecoId, "endereco-1");
  assert.equal((chamadas.updateData as { agendadaPara: Date }).agendadaPara.toISOString(), "2026-06-18T13:30:00.000Z");
  assert.deepEqual(resposta, {
    os_id: "os-1",
    status: OrdemServicoStatus.aberta,
    atualizado_em: "2026-06-18T12:00:00.000Z"
  });
});

test("listarAgenda retorna checklist_tipo para conferencia do app tecnico", async () => {
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
          titulo: "PMOC mensal",
          problemaRelatado: "Limpeza preventiva",
          status: OrdemServicoStatus.aberta,
          tipoServico: OrdemServicoTipoServico.preventiva,
          agendadaPara: new Date("2026-06-18T13:30:00.000Z"),
          criadaEm: new Date("2026-06-18T12:00:00.000Z"),
          valorCobrado: new Prisma.Decimal(280),
          checklistTipo: ChecklistTipo.trimestral,
          cliente: { id: "cliente-1", nome: "Hospital Norte", telefone: "43999990000" },
          endereco: { bairro: "Centro", cidade: "Londrina", uf: "PR" },
          equipe: null,
          tecnico: { id: "tecnico-1", nome: "Tecnico Campo" },
          equipamento: {
            id: "equipamento-1",
            patrimonio: "AC1",
            marca: "Gree",
            modelo: "Split",
            localInstalacao: "Recepcao"
          }
          }
        ];
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.listarAgenda(usuario);

  assert.equal(resposta.items[0].tipo_servico, OrdemServicoTipoServico.preventiva);
  assert.equal(resposta.items[0].checklist_tipo, ChecklistTipo.trimestral);
  assert.deepEqual(chamadas.where, {
    empresaId: "empresa-1",
    status: {
      in: [
        OrdemServicoStatus.aberta,
        OrdemServicoStatus.em_deslocamento,
        OrdemServicoStatus.em_atendimento,
        OrdemServicoStatus.concluida,
        OrdemServicoStatus.cancelada,
        OrdemServicoStatus.rejeitada
      ]
    }
  });
});

test("criarPlanoRecorrencia cadastra rotina operacional para cliente da empresa", async () => {
  const chamadas = {
    createData: undefined as unknown
  };
  const prisma = {
    cliente: {
      findFirst: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, {
          id: "cliente-1",
          empresaId: "empresa-1"
        });
        return { id: "cliente-1" };
      }
    },
    planoRecorrencia: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.createData = data;
        return {
          id: "plano-1",
          atualizadoEm: new Date("2026-06-18T10:00:00.000Z")
        };
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.criarPlanoRecorrencia(
    {
      cliente_id: "cliente-1",
      titulo: "PMOC mensal",
      detalhes: "Limpeza preventiva",
      frequencia: PlanoRecorrenciaFrequencia.mensal,
      proxima_execucao: "2026-07-01T11:00:00.000Z",
      valor_cobrado: 280
    },
    usuario
  );

  assert.equal((chamadas.createData as { empresaId: string }).empresaId, "empresa-1");
  assert.equal((chamadas.createData as { clienteId: string }).clienteId, "cliente-1");
  assert.equal((chamadas.createData as { titulo: string }).titulo, "PMOC mensal");
  assert.equal((chamadas.createData as { frequencia: PlanoRecorrenciaFrequencia }).frequencia, PlanoRecorrenciaFrequencia.mensal);
  assert.equal((chamadas.createData as { checklistTipo: ChecklistTipo }).checklistTipo, ChecklistTipo.mensal);
  assert.equal((chamadas.createData as { valorCobrado: Prisma.Decimal }).valorCobrado.toNumber(), 280);
  assert.deepEqual(resposta, {
    plano_id: "plano-1",
    atualizado_em: "2026-06-18T10:00:00.000Z"
  });
});

test("gerarOrdemPlanoRecorrencia anual cria OS anual e avanca doze meses", async () => {
  const chamadas = {
    osData: undefined as unknown,
    planoUpdate: undefined as unknown
  };
  const tx = {
    planoRecorrencia: {
      findFirst: async () => ({
        id: "plano-1",
        empresaId: "empresa-1",
        clienteId: "cliente-1",
        equipamentoId: "equipamento-1",
        equipeId: "equipe-1",
        tecnicoId: "tecnico-1",
        titulo: "PMOC anual",
        detalhes: "Limpeza preventiva",
        frequencia: PlanoRecorrenciaFrequencia.anual,
        checklistTipo: ChecklistTipo.anual,
        proximaExecucao: new Date("2026-07-01T11:00:00.000Z"),
        valorCobrado: new Prisma.Decimal(280),
        ativo: true,
        cliente: {
          enderecos: [{ id: "endereco-1" }]
        }
      }),
      update: async ({ data }: { data: unknown }) => {
        chamadas.planoUpdate = data;
      }
    },
    ordemServico: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.osData = data;
        return {
          id: "os-recorrente-1",
          status: OrdemServicoStatus.aberta,
          atualizadaEm: new Date("2026-06-18T12:00:00.000Z")
        };
      }
    },
    ordemServicoEvento: {
      create: async () => undefined
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.gerarOrdemPlanoRecorrencia("plano-1", usuario);

  assert.equal((chamadas.osData as { clienteId: string }).clienteId, "cliente-1");
  assert.equal((chamadas.osData as { equipamentoId: string }).equipamentoId, "equipamento-1");
  assert.equal((chamadas.osData as { status: OrdemServicoStatus }).status, OrdemServicoStatus.aberta);
  assert.equal((chamadas.osData as { checklistTipo: ChecklistTipo }).checklistTipo, ChecklistTipo.anual);
  assert.equal((chamadas.planoUpdate as { ultimoOsId: string }).ultimoOsId, "os-recorrente-1");
  assert.equal((chamadas.planoUpdate as { proximaExecucao: Date }).proximaExecucao.toISOString(), "2027-07-01T11:00:00.000Z");
  assert.deepEqual(resposta, {
    os_id: "os-recorrente-1",
    status: OrdemServicoStatus.aberta,
    atualizado_em: "2026-06-18T12:00:00.000Z",
    proxima_execucao: "2027-07-01T11:00:00.000Z"
  });
});

test("apagarPlanoRecorrencia remove plano da empresa", async () => {
  const chamadas = {
    deleteWhere: undefined as unknown
  };
  const prisma = {
    planoRecorrencia: {
      findFirst: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, {
          id: "plano-1",
          empresaId: "empresa-1"
        });
        return {
          id: "plano-1",
          clienteId: "cliente-1"
        };
      },
      delete: async ({ where }: { where: unknown }) => {
        chamadas.deleteWhere = where;
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.apagarPlanoRecorrencia("plano-1", usuario);

  assert.deepEqual(chamadas.deleteWhere, {
    id: "plano-1"
  });
  assert.deepEqual(resposta, {
    id: "plano-1",
    cliente_id: "cliente-1",
    apagado: true
  });
});

test("apagarPlanoRecorrencia exige plano da empresa", async () => {
  const prisma = {
    planoRecorrencia: {
      findFirst: async () => null
    }
  };
  const service = criarService(prisma);

  await assert.rejects(() => service.apagarPlanoRecorrencia("plano-1", usuario), NotFoundException);
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

test("criarCliente aceita CNPJ com pontuacao e salva somente numeros", async () => {
  const chamadas = {
    clienteData: undefined as unknown
  };
  const tx = {
    cliente: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.clienteData = data;
        return { id: "cliente-pj-1" };
      }
    },
    clienteEndereco: {
      create: async () => undefined
    },
    clienteEquipe: {
      deleteMany: async () => undefined
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx),
    cliente: {
      findFirst: async () => ({
        id: "cliente-pj-1",
        nome: "Black Workout",
        tipo: "pj",
        documento: "50536236000115",
        telefone: "4333334444",
        email: null,
        pmocAtivo: false,
        engenheiroResponsavel: null,
        tecnicoResponsavel: null,
        equipes: [],
        atualizadoEm: new Date("2026-06-20T10:00:00.000Z"),
        enderecos: []
      })
    }
  };
  const service = criarService(prisma);

  await service.criarCliente(
    {
      tipo: "pj",
      nome: "Black Workout",
      telefone: "(43) 3333-4444",
      documento: "50.536.236/0001-15"
    },
    usuario
  );

  assert.equal((chamadas.clienteData as { documento: string }).documento, "50536236000115");
});

test("apagarCliente remove cliente sem historico nem equipamentos", async () => {
  const chamadas = {
    clienteEquipeWhere: undefined as unknown,
    deleteManyWhere: undefined as unknown,
    deleteWhere: undefined as unknown
  };
  const tx = {
    planoRecorrencia: {
      deleteMany: async () => undefined
    },
    pmocRelatorio: {
      deleteMany: async () => undefined
    },
    clienteEquipe: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.clienteEquipeWhere = where;
      }
    },
    equipamento: {
      deleteMany: async () => undefined
    },
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
    ordemServico: {
      findMany: async () => []
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.apagarCliente("cliente-1", usuario);

  assert.deepEqual(chamadas.deleteManyWhere, {
    clienteId: "cliente-1",
    empresaId: "empresa-1"
  });
  assert.deepEqual(chamadas.clienteEquipeWhere, {
    clienteId: "cliente-1",
    empresaId: "empresa-1"
  });
  assert.deepEqual(chamadas.deleteWhere, {
    id: "cliente-1"
  });
  assert.deepEqual(resposta, {
    id: "cliente-1",
    ordens_removidas: 0,
    equipamentos_removidos: 0,
    apagado: true
  });
});

test("apagarCliente remove historico operacional e equipamentos do cliente", async () => {
  const chamadas = {
    automacoesWhere: undefined as unknown,
    responsaveisWhere: undefined as unknown,
    pecasWhere: undefined as unknown,
    checklistWhere: undefined as unknown,
    evidenciasWhere: undefined as unknown,
    assinaturaWhere: undefined as unknown,
    observacaoWhere: undefined as unknown,
    eventosWhere: undefined as unknown,
    ordensWhere: undefined as unknown,
    equipamentosWhere: undefined as unknown,
    clienteWhere: undefined as unknown
  };
  const tx = {
    planoRecorrencia: {
      deleteMany: async () => undefined
    },
    pmocRelatorio: {
      deleteMany: async () => undefined
    },
    clienteEquipe: {
      deleteMany: async () => undefined
    },
    automacaoAgendada: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.automacoesWhere = where;
      }
    },
    ordemServicoResponsavel: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.responsaveisWhere = where;
      }
    },
    ordemServicoPeca: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.pecasWhere = where;
      }
    },
    ordemServicoChecklist: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.checklistWhere = where;
      }
    },
    ordemServicoEvidencia: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.evidenciasWhere = where;
      }
    },
    ordemServicoAssinatura: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.assinaturaWhere = where;
      }
    },
    ordemServicoObservacao: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.observacaoWhere = where;
      }
    },
    ordemServicoEvento: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.eventosWhere = where;
      }
    },
    ordemServico: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.ordensWhere = where;
      }
    },
    equipamento: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.equipamentosWhere = where;
      }
    },
    clienteEndereco: {
      deleteMany: async () => undefined
    },
    cliente: {
      delete: async ({ where }: { where: unknown }) => {
        chamadas.clienteWhere = where;
      }
    }
  };
  const prisma = {
    cliente: {
      findFirst: async () => ({
        id: "cliente-1",
        nome: "Maria",
        _count: {
          ordensServico: 1,
          equipamentos: 1
        }
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

  const resposta = await service.apagarCliente("cliente-1", usuario);
  const ordemFiltro = {
    ordemServicoId: {
      in: ["os-1"]
    },
    empresaId: "empresa-1"
  };

  assert.deepEqual(chamadas.automacoesWhere, ordemFiltro);
  assert.deepEqual(chamadas.responsaveisWhere, ordemFiltro);
  assert.deepEqual(chamadas.pecasWhere, {
    checklistId: {
      in: ["checklist-1"]
    },
    empresaId: "empresa-1"
  });
  assert.deepEqual(chamadas.checklistWhere, ordemFiltro);
  assert.deepEqual(chamadas.evidenciasWhere, ordemFiltro);
  assert.deepEqual(chamadas.assinaturaWhere, ordemFiltro);
  assert.deepEqual(chamadas.observacaoWhere, ordemFiltro);
  assert.deepEqual(chamadas.eventosWhere, ordemFiltro);
  assert.deepEqual(chamadas.ordensWhere, {
    id: {
      in: ["os-1"]
    },
    empresaId: "empresa-1"
  });
  assert.deepEqual(chamadas.equipamentosWhere, {
    clienteId: "cliente-1",
    empresaId: "empresa-1"
  });
  assert.deepEqual(chamadas.clienteWhere, {
    id: "cliente-1"
  });
  assert.deepEqual(resposta, {
    id: "cliente-1",
    ordens_removidas: 1,
    equipamentos_removidos: 1,
    apagado: true
  });
});
