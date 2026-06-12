import { test } from "node:test";
import * as assert from "node:assert/strict";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { OrdemServicoEventoAcao, OrdemServicoStatus } from "@prisma/client";
import { PasswordHashService } from "../auth/password-hash.service";
import { SiteService } from "./site.service";

const dto = {
  nome: "Maria Souza",
  telefone: "(43) 99999-9999",
  servico: "Limpeza de ar-condicionado",
  local: "Centro, Londrina",
  detalhes: "Equipamento pingando agua",
  empresa_id: "empresa-maliciosa"
};

function criarService(prisma: unknown) {
  return new SiteService(prisma as never);
}

test("criarPreChamado sempre busca empresa piloto por CNPJ fixo", async () => {
  const chamadas = {
    empresaWhere: undefined as unknown,
    clienteWhere: undefined as unknown
  };
  const prisma = {
    empresa: {
      findUnique: async ({ where }: { where: unknown }) => {
        chamadas.empresaWhere = where;
        return { id: "empresa-piloto" };
      }
    },
    cliente: {
      findFirst: async ({ where }: { where: unknown }) => {
        chamadas.clienteWhere = where;
        return null;
      }
    },
    $transaction: async () => ({
      id: "os-1",
      status: OrdemServicoStatus.pre_chamado,
      criadaEm: new Date("2026-06-10T12:00:00.000Z")
    })
  };
  const service = criarService(prisma);

  await service.criarPreChamado(dto);

  assert.deepEqual(chamadas.empresaWhere, { cnpj: "00000000000000" });
  assert.deepEqual(chamadas.clienteWhere, {
    empresaId: "empresa-piloto",
    telefone: "43999999999"
  });
});

test("criarPreChamado grava cliente, endereco, OS e evento na empresa piloto, ignorando empresa_id externo", async () => {
  const chamadas = {
    clienteCreateData: undefined as unknown,
    enderecoCreateData: undefined as unknown,
    ordemCreateData: undefined as unknown,
    eventoCreateData: undefined as unknown
  };
  const tx = {
    cliente: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.clienteCreateData = data;
        return { id: "cliente-1" };
      }
    },
    clienteEndereco: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.enderecoCreateData = data;
        return { id: "endereco-1" };
      }
    },
    ordemServico: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.ordemCreateData = data;
        return {
          id: "os-1",
          status: OrdemServicoStatus.pre_chamado,
          criadaEm: new Date("2026-06-10T12:00:00.000Z")
        };
      }
    },
    ordemServicoEvento: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.eventoCreateData = data;
      }
    }
  };
  const prisma = {
    empresa: {
      findUnique: async () => ({ id: "empresa-piloto" })
    },
    cliente: {
      findFirst: async () => null
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.criarPreChamado(dto);

  assert.equal((chamadas.clienteCreateData as { empresaId: string }).empresaId, "empresa-piloto");
  assert.equal((chamadas.enderecoCreateData as { empresaId: string }).empresaId, "empresa-piloto");
  assert.equal((chamadas.ordemCreateData as { empresaId: string }).empresaId, "empresa-piloto");
  assert.equal((chamadas.eventoCreateData as { empresaId: string }).empresaId, "empresa-piloto");
  assert.equal((chamadas.ordemCreateData as { empresa_id?: string }).empresa_id, undefined);
  assert.equal((chamadas.eventoCreateData as { acao: OrdemServicoEventoAcao }).acao, OrdemServicoEventoAcao.criar_pre_chamado);
  assert.equal(resposta.pre_chamado_id, "os-1");
  assert.equal(resposta.status, OrdemServicoStatus.pre_chamado);
  assert.equal(resposta.criado_em, "2026-06-10T12:00:00.000Z");
});

test("criarPreChamado atualiza cliente existente somente dentro da empresa piloto", async () => {
  const chamadas = {
    clienteUpdateArgs: undefined as unknown
  };
  const tx = {
    cliente: {
      update: async (args: unknown) => {
        chamadas.clienteUpdateArgs = args;
        return { id: "cliente-existente" };
      }
    },
    clienteEndereco: {
      create: async () => ({ id: "endereco-1" })
    },
    ordemServico: {
      create: async () => ({
        id: "os-1",
        status: OrdemServicoStatus.pre_chamado,
        criadaEm: new Date("2026-06-10T12:00:00.000Z")
      })
    },
    ordemServicoEvento: {
      create: async () => undefined
    }
  };
  const prisma = {
    empresa: {
      findUnique: async () => ({ id: "empresa-piloto" })
    },
    cliente: {
      findFirst: async () => ({ id: "cliente-existente" })
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  await service.criarPreChamado(dto);

  assert.deepEqual((chamadas.clienteUpdateArgs as { where: unknown }).where, {
    id: "cliente-existente"
  });
  assert.deepEqual((chamadas.clienteUpdateArgs as { data: unknown }).data, {
    nome: "Maria Souza",
    telefone: "43999999999"
  });
});

test("criarPreChamado falha se empresa piloto nao existir", async () => {
  const prisma = {
    empresa: {
      findUnique: async () => null
    }
  };
  const service = criarService(prisma);

  await assert.rejects(() => service.criarPreChamado(dto), NotFoundException);
});

test("consultarEquipamentoPublico exige senha correta e retorna dados limitados", async () => {
  const senhaPublicaHash = await new PasswordHashService().hash("123456");
  const prisma = {
    equipamento: {
      findUnique: async () => ({
        id: "equipamento-1",
        codigoPublico: "EQ-ABC123",
        senhaPublicaHash,
        acessoPublicoAtivo: true,
        tipo: "Split",
        marca: "LG",
        modelo: "Dual",
        capacidadeBtu: 12000,
        gasRefrigerante: "R-410A",
        numeroSerie: "SN1",
        localInstalacao: "Sala",
        atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
        cliente: {
          nome: "Maria"
        },
        ordensServico: [
          {
            id: "os-1",
            status: OrdemServicoStatus.concluida,
            titulo: "Limpeza",
            agendadaPara: null,
            concluidaEm: new Date("2026-06-12T09:00:00.000Z"),
            atualizadaEm: new Date("2026-06-12T09:10:00.000Z")
          }
        ]
      })
    }
  };
  const service = criarService(prisma);

  const resposta = await service.consultarEquipamentoPublico("EQ-ABC123", { senha: "123456" });

  assert.equal(resposta.cliente.nome, "Maria");
  assert.equal(resposta.equipamento.marca, "LG");
  assert.equal(resposta.equipamento.gas_refrigerante, "R-410A");
  assert.equal(resposta.manutencao.status, OrdemServicoStatus.concluida);
  assert.equal((resposta as { telefone?: string }).telefone, undefined);
});

test("consultarEquipamentoPublico rejeita senha incorreta", async () => {
  const senhaPublicaHash = await new PasswordHashService().hash("123456");
  const prisma = {
    equipamento: {
      findUnique: async () => ({
        id: "equipamento-1",
        codigoPublico: "EQ-ABC123",
        senhaPublicaHash,
        acessoPublicoAtivo: true,
        tipo: "Split",
        marca: "LG",
        modelo: "Dual",
        capacidadeBtu: 12000,
        gasRefrigerante: "R-410A",
        numeroSerie: "SN1",
        localInstalacao: "Sala",
        atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
        cliente: {
          nome: "Maria"
        },
        ordensServico: []
      })
    }
  };
  const service = criarService(prisma);

  await assert.rejects(
    () => service.consultarEquipamentoPublico("EQ-ABC123", { senha: "000000" }),
    UnauthorizedException
  );
});
