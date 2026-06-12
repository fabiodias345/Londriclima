import { test } from "node:test";
import * as assert from "node:assert/strict";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { OrdemServicoEventoAcao, OrdemServicoStatus, Prisma, UsuarioRole } from "@prisma/client";
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

