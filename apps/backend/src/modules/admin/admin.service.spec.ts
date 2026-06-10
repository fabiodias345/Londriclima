import { test } from "node:test";
import * as assert from "node:assert/strict";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { OrdemServicoEventoAcao, OrdemServicoStatus, Prisma, UsuarioRole } from "@prisma/client";
import { AdminService } from "./admin.service";

const usuario = {
  id: "admin-1",
  empresa_id: "empresa-1",
  email: "admin@londriclima.local",
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
