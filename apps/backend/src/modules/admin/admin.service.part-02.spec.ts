import { BadRequestException, ConflictException,NotFoundException } from "@nestjs/common";
import {
OrdemServicoStatus,
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

test("gerencia veiculos da frota por empresa e apaga por inativacao", async () => {
  const chamadas = {
    findManyWhere: undefined as unknown,
    createData: undefined as unknown,
    updateWhere: undefined as unknown,
    updateData: undefined as unknown,
    deleteWhere: undefined as unknown,
    deleteData: undefined as unknown
  };
  const prisma = {
    veiculo: {
      findMany: async ({ where }: { where: unknown }) => {
        chamadas.findManyWhere = where;
        return [
          {
            id: "veiculo-1",
            nome: "Carro 1",
            placa: "ABC1D23",
            rastreadorImei: "123456789",
            ativo: true,
            criadoEm: new Date("2026-06-10T10:00:00.000Z"),
            atualizadoEm: new Date("2026-06-11T10:00:00.000Z")
          }
        ];
      },
      findFirst: async ({ where }: { where: { id?: string } }) =>
        where.id === "veiculo-1" ? { id: "veiculo-1" } : null,
      create: async ({ data }: { data: unknown }) => {
        chamadas.createData = data;
        return {
          id: "veiculo-2",
          nome: "Carro 2",
          placa: "DEF2E34",
          rastreadorImei: (data as { rastreadorImei?: string }).rastreadorImei || null,
          ativo: true,
          criadoEm: new Date("2026-06-12T10:00:00.000Z"),
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z")
        };
      },
      update: async ({ where, data }: { where: unknown; data: unknown }) => {
        if ((data as { ativo?: boolean }).ativo === false) {
          chamadas.deleteWhere = where;
          chamadas.deleteData = data;
          return { id: "veiculo-1" };
        }

        chamadas.updateWhere = where;
        chamadas.updateData = data;
        return {
          id: "veiculo-1",
          nome: (data as { nome: string }).nome,
          placa: (data as { placa?: string | null }).placa,
          rastreadorImei: (data as { rastreadorImei?: string | null }).rastreadorImei,
          ativo: (data as { ativo?: boolean }).ativo,
          criadoEm: new Date("2026-06-10T10:00:00.000Z"),
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z")
        };
      }
    }
  };
  const service = criarService(prisma);

  const lista = await service.listarVeiculosFrota(usuario);
  const criado = await service.criarVeiculoFrota(
    { nome: " Carro 2 ", placa: " def2e34 ", rastreador_imei: " 987654321 " },
    usuario
  );
  const atualizado = await service.atualizarVeiculoFrota(
    "veiculo-1",
    { nome: " Carro 1 ", placa: " abc1d23 ", rastreador_imei: " 123456789 ", ativo: true },
    usuario
  );
  const apagado = await service.apagarVeiculoFrota("veiculo-1", usuario);

  assert.deepEqual(chamadas.findManyWhere, { empresaId: "empresa-1", ativo: true });
  assert.deepEqual(chamadas.createData, {
    empresaId: "empresa-1",
    nome: "Carro 2",
    placa: "DEF2E34",
    rastreadorImei: "987654321",
    ativo: true
  });
  assert.deepEqual(chamadas.updateWhere, { id: "veiculo-1" });
  assert.deepEqual(chamadas.updateData, {
    nome: "Carro 1",
    placa: "ABC1D23",
    rastreadorImei: "123456789",
    ativo: true
  });
  assert.deepEqual(chamadas.deleteWhere, { id: "veiculo-1" });
  assert.deepEqual(chamadas.deleteData, { ativo: false });
  assert.equal(lista.total, 1);
  assert.equal(criado.placa, "DEF2E34");
  assert.equal(atualizado.placa, "ABC1D23");
  assert.deepEqual(apagado, { id: "veiculo-1", apagado: true });
});

test("criarVeiculoFrota exige IMEI do rastreador", async () => {
  const service = criarService({
    veiculo: {
      create: async () => {
        throw new Error("nao deve cadastrar sem IMEI");
      }
    }
  });

  await assert.rejects(
    () => service.criarVeiculoFrota({ nome: "Carro 2", placa: "DEF2E34", rastreador_imei: " " }, usuario),
    BadRequestException
  );
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

test("listarTecnicos retorna usuarios tecnicos e auxiliares ativos da empresa", async () => {
  const chamadas = {
    where: undefined as unknown
  };
  const prisma = {
    usuario: {
      findMany: async ({ where }: { where: unknown }) => {
        chamadas.where = where;
        return [
          {
            id: "tecnico-1",
            nome: "Joao Tecnico",
            login: "joao",
            email: "joao@airmovebr.local",
            telefone: "43999999999",
            role: UsuarioRole.tecnico,
            ativo: true,
            criadoEm: new Date("2026-06-17T10:00:00.000Z"),
            atualizadoEm: new Date("2026-06-17T10:00:00.000Z")
          }
        ];
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.listarTecnicos(usuario);

  assert.deepEqual(chamadas.where, {
    empresaId: "empresa-1",
    ativo: true,
    role: {
      in: [UsuarioRole.tecnico, "auxiliar"]
    }
  });
  assert.equal(resposta.total, 1);
  assert.equal(resposta.items[0].login, "joao");
  assert.equal(resposta.items[0].email, "joao@airmovebr.local");
});

test("listarEquipes retorna equipes por cliente com membros ilimitados", async () => {
  const prisma = {
    equipe: {
      findMany: async () => [
        {
          id: "equipe-1",
          nome: "Equipe 01 HU",
          ativa: true,
          criadoEm: new Date("2026-06-17T10:00:00.000Z"),
          atualizadoEm: new Date("2026-06-17T10:00:00.000Z"),
          clientes: [
            {
              cliente: {
                id: "cliente-1",
                nome: "HU"
              }
            }
          ],
          membros: [
            {
              id: "membro-1",
              funcao: "tecnico",
              usuario: {
                id: "usuario-1",
                nome: "Joao",
                email: "joao@airmovebr.local",
                role: UsuarioRole.tecnico
              }
            },
            {
              id: "membro-2",
              funcao: "auxiliar",
              usuario: {
                id: "usuario-2",
                nome: "Maria",
                email: "maria@airmovebr.local",
                role: "auxiliar"
              }
            }
          ]
        }
      ]
    }
  };
  const service = criarService(prisma);

  const resposta = await service.listarEquipes(usuario);

  assert.equal(resposta.total, 1);
  assert.equal(resposta.items[0].clientes[0].nome, "HU");
  assert.equal(resposta.items[0].membros.length, 2);
  assert.equal(resposta.items[0].membros[1].funcao, "auxiliar");
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
