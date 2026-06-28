import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EvidenciaTipo,OrdemServicoEventoAcao,OrdemServicoStatus,PmocRelatorioStatus,Prisma,UsuarioRole } from "@prisma/client";
import * as assert from "node:assert/strict";
import { after,before,test } from "node:test";
import { AppModule } from "./app.module";
import { PrismaService } from "./database/prisma.service";
import { PasswordHashService } from "./modules/auth/password-hash.service";

const empresaId = "11111111-1111-4111-8111-111111111111";
const usuarioId = "22222222-2222-4222-8222-222222222222";
const osId = "33333333-3333-4333-8333-333333333333";
const clienteId = "44444444-4444-4444-8444-444444444444";
const enderecoId = "55555555-5555-4555-8555-555555555555";
const veiculo1Id = "66666666-6666-4666-8666-666666666666";
const veiculo2Id = "77777777-7777-4777-8777-777777777777";

let app: INestApplication;
let baseUrl = "";
let senhaHash = "";
let accessToken = "";
let assinaturaPmocToken = "token-assinatura";
let assinaturaPmocStatus: PmocRelatorioStatus = PmocRelatorioStatus.aguardando_assinatura_engenheiro;

function jsonHeaders(token?: string) {
  return {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {})
  };
}

async function lerJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

function criarPrismaMock() {
  const ordem = {
    id: osId,
    empresaId,
    status: OrdemServicoStatus.aberta
  };

  const tx = {
    cliente: {
      create: async () => ({ id: clienteId }),
      update: async () => ({ id: clienteId })
    },
    clienteEndereco: {
      create: async () => ({ id: enderecoId })
    },
    ordemServico: {
      findUnique: async () => ordem,
      create: async () => ({
        id: osId,
        status: OrdemServicoStatus.pre_chamado,
        criadaEm: new Date("2026-06-10T12:00:00.000Z")
      }),
      update: async ({ data }: { data: { status: OrdemServicoStatus } }) => ({
        id: osId,
        status: data.status
      })
    },
    ordemServicoEvento: {
      create: async ({ data }: { data: unknown }) => ({
        ...(data as object),
        latitude: new Prisma.Decimal(-23.3045),
        longitude: new Prisma.Decimal(-51.1696),
        registradoEm: new Date("2026-06-10T08:45:00.000Z")
      })
    },
    ordemServicoAssinatura: {
      create: async () => ({ id: "assinatura-1" })
    },
    automacaoAgendada: {
      createMany: async () => ({ count: 4 }),
      create: async () => ({ id: "automacao-email-1" })
    },
    pmocRelatorio: {
      update: async ({ data }: { data: { status: PmocRelatorioStatus } }) => {
        assinaturaPmocStatus = data.status;
        return {
          id: "99999999-9999-4999-8999-999999999999",
          status: assinaturaPmocStatus,
          pdfHash: "hash-pdf",
          assinadoEm: new Date("2026-06-12T12:00:00.000Z"),
          emailCliente: "maria@example.com",
          emailAgendadoEm: new Date("2026-06-12T12:00:00.000Z"),
          historicoFinalizadoEm: new Date("2026-06-12T12:00:00.000Z")
        };
      }
    }
  };

  return {
    $queryRaw: async () => [{ "?column?": 1 }],
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx),
    empresa: {
      findUnique: async () => ({ id: empresaId })
    },
    usuario: {
      findFirst: async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email && where.email !== "tecnico@airmovebr.local") {
          return null;
        }

        return {
          id: usuarioId,
          empresaId,
          nome: "Tecnico AIRMOVEBR",
          email: "tecnico@airmovebr.local",
          senhaHash,
          role: UsuarioRole.admin
        };
      },
      update: async () => ({ id: usuarioId })
    },
    ordemServico: {
      findMany: async () => [
        {
          id: osId,
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
      ],
      findUnique: async () => ({
        ...ordem,
        evidencias: [{ tipo: EvidenciaTipo.antes }, { tipo: EvidenciaTipo.depois }],
        equipamento: {
          marca: "LG",
          modelo: "Dual Inverter"
        },
        checklist: {
          servicoRealizado: "Limpeza completa"
        },
        assinatura: null
      })
    },
    veiculo: {
      findMany: async () => [
        {
          id: veiculo1Id,
          nome: "Carro 1",
          placa: "ABC1D23",
          rastreadorImei: "123",
          abastecimentos: [
            {
              odometroKm: new Prisma.Decimal(51200),
              litros: new Prisma.Decimal(42),
              valorTotal: new Prisma.Decimal(247.8),
              abastecidoEm: new Date("2026-06-01T11:00:00.000Z")
            },
            {
              odometroKm: new Prisma.Decimal(51635),
              litros: new Prisma.Decimal(40.5),
              valorTotal: new Prisma.Decimal(238.95),
              abastecidoEm: new Date("2026-06-08T11:20:00.000Z")
            }
          ],
          localizacoes: [
              {
                latitude: new Prisma.Decimal(-23.2865),
                longitude: new Prisma.Decimal(-51.1698),
                velocidadeKmh: new Prisma.Decimal(42),
                ignicao: true,
                registradoEm: new Date("2026-06-10T10:30:00.000Z")
              }
            ]
          },
          {
            id: veiculo2Id,
            nome: "Carro 2",
            placa: "BCD2E34",
            rastreadorImei: "456",
            abastecimentos: [
              {
                odometroKm: new Prisma.Decimal(38440),
                litros: new Prisma.Decimal(38),
                valorTotal: new Prisma.Decimal(224.2),
                abastecidoEm: new Date("2026-06-02T10:30:00.000Z")
              },
              {
                odometroKm: new Prisma.Decimal(38778),
                litros: new Prisma.Decimal(36),
                valorTotal: new Prisma.Decimal(212.4),
                abastecidoEm: new Date("2026-06-09T10:10:00.000Z")
              }
            ],
            localizacoes: [
              {
                latitude: new Prisma.Decimal(-23.3385),
                longitude: new Prisma.Decimal(-51.1865),
                velocidadeKmh: new Prisma.Decimal(0),
                ignicao: false,
                registradoEm: new Date("2026-06-10T10:30:00.000Z")
              }
            ]
          }
        ],
      findFirst: async () => ({
        id: veiculo1Id,
        empresaId,
        nome: "Carro 1"
      }),
      count: async () => 2
    },
    veiculoAbastecimento: {
      findMany: async () => [
        {
          id: "abastecimento-1",
          odometroKm: new Prisma.Decimal(51635),
          litros: new Prisma.Decimal(40.5),
          valorTotal: new Prisma.Decimal(238.95),
          precoPorLitro: new Prisma.Decimal(5.9),
          abastecidoEm: new Date("2026-06-08T11:20:00.000Z"),
          posto: "Posto Centro",
          observacao: null,
          veiculo: {
            id: veiculo1Id,
            nome: "Carro 1",
            placa: "ABC1D23"
          },
          usuario: {
            nome: "Tecnico AIRMOVEBR"
          }
        }
      ],
      findFirst: async () => ({
        odometroKm: new Prisma.Decimal(51635)
      }),
      create: async () => ({
        id: "abastecimento-2",
        odometroKm: new Prisma.Decimal(51700),
        litros: new Prisma.Decimal(20),
        valorTotal: new Prisma.Decimal(118),
        precoPorLitro: new Prisma.Decimal(5.9),
        abastecidoEm: new Date("2026-06-10T12:00:00.000Z"),
        posto: "Posto Centro",
        observacao: null
      })
    },
    cliente: {
      findFirst: async ({ where }: { where?: { id?: string } } = {}) => {
        if (where?.id === clienteId) {
          return {
            id: clienteId,
            nome: "Maria Souza",
            tipo: "pf",
            documento: "12345678900",
            telefone: "43999999999",
            email: "maria@example.com",
            pmocAtivo: true,
            atualizadoEm: new Date("2026-06-10T12:00:00.000Z"),
            engenheiroResponsavel: {
              id: "engenheiro-1",
              nome: "Paulo Londriclima",
              cpf: "12345678901",
              crea: "CREA-PR 123456",
              email: "paulo@example.com",
              telefone: "43999991111",
              atualizadoEm: new Date("2026-06-10T12:00:00.000Z")
            },
            enderecos: [{ bairro: "Centro", cidade: "Londrina", uf: "PR" }],
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
                atualizadoEm: new Date("2026-06-10T12:00:00.000Z"),
                ordensServico: [
                  {
                    id: osId,
                    titulo: "PMOC mensal",
                    problemaRelatado: "Rotina mensal",
                    status: OrdemServicoStatus.concluida,
                    agendadaPara: new Date("2026-06-10T12:00:00.000Z"),
                    concluidaEm: new Date("2026-06-10T15:00:00.000Z"),
                    valorCobrado: new Prisma.Decimal(250),
                    tecnico: { id: usuarioId, nome: "Tecnico AIRMOVEBR", email: "tecnico@airmovebr.local" },
                    equipe: { id: "equipe-1", nome: "Equipe 1" },
                    eventos: [
                      {
                        id: "evento-1",
                        acao: OrdemServicoEventoAcao.finalizar,
                        statusAnterior: OrdemServicoStatus.em_atendimento,
                        statusNovo: OrdemServicoStatus.concluida,
                        latitude: new Prisma.Decimal(-23.3047),
                        longitude: new Prisma.Decimal(-51.1697),
                        registradoEm: new Date("2026-06-10T15:00:00.000Z")
                      }
                    ],
                    evidencias: [],
                    checklist: {
                      id: "check-1",
                      servicoRealizado: "Limpeza",
                      procedimentos: ["limpeza_filtro"],
                      custoTotalPecas: new Prisma.Decimal(0),
                      criadoEm: new Date("2026-06-10T14:00:00.000Z"),
                      atualizadoEm: new Date("2026-06-10T14:00:00.000Z"),
                      pecas: []
                    },
                    assinatura: null,
                    observacoes: []
                  }
                ]
              }
            ]
          };
        }

        return null;
      },
      findMany: async () => [
        {
          id: clienteId,
          nome: "Maria Souza",
          tipo: "pf",
          documento: null,
          telefone: "43999999999",
          email: "maria@example.com",
          atualizadoEm: new Date("2026-06-10T12:00:00.000Z"),
          enderecos: [{ bairro: "Centro", cidade: "Londrina", uf: "PR" }],
          equipamentos: [{ id: "equipamento-1" }],
          ordensServico: [{ id: osId, status: OrdemServicoStatus.aberta }]
        }
      ],
      count: async () => 1
    },
    automacaoAgendada: {
      count: async () => 2,
      findMany: async () => [],
      create: async () => ({ id: "automacao-email-engenheiro-1" })
    },
    pmocRelatorio: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        assinaturaPmocToken = String(data.tokenAssinatura);
        return {
          id: "99999999-9999-4999-8999-999999999999",
          ...data,
          status: PmocRelatorioStatus.aguardando_assinatura_engenheiro,
          criadoEm: new Date("2026-06-12T12:00:00.000Z"),
          atualizadoEm: new Date("2026-06-12T12:00:00.000Z")
        };
      },
      findMany: async () => [
        {
          id: "relatorio-jun",
          status: PmocRelatorioStatus.aguardando_assinatura_engenheiro,
          pdfHash: "hash-pdf",
          criadoEm: new Date("2026-06-12T12:00:00.000Z"),
          emailAgendadoEm: new Date("2026-06-12T12:00:00.000Z"),
          assinadoEm: null
        }
      ],
      findUnique: async ({ where }: { where: { tokenAssinatura?: string } }) =>
        where.tokenAssinatura === assinaturaPmocToken
          ? {
              id: "99999999-9999-4999-8999-999999999999",
              empresaId,
              clienteId,
              engenheiroResponsavelId: "engenheiro-1",
              status: assinaturaPmocStatus,
              tokenAssinatura: assinaturaPmocToken,
              pdfHash: "hash-pdf",
              assinadoEm: assinaturaPmocStatus === PmocRelatorioStatus.assinado ? new Date("2026-06-12T12:00:00.000Z") : null,
              emailCliente: assinaturaPmocStatus === PmocRelatorioStatus.assinado ? "maria@example.com" : null,
              emailAgendadoEm: assinaturaPmocStatus === PmocRelatorioStatus.assinado ? new Date("2026-06-12T12:00:00.000Z") : null,
              historicoFinalizadoEm: assinaturaPmocStatus === PmocRelatorioStatus.assinado ? new Date("2026-06-12T12:00:00.000Z") : null,
              cliente: {
                id: clienteId,
                nome: "Maria Souza",
                email: "maria@example.com"
              },
              engenheiroResponsavel: {
                nome: "Paulo Londriclima",
                cpf: "12345678901",
                crea: "CREA-PR 123456",
                email: "paulo@example.com"
              }
            }
          : null,
      update: async ({ data }: { data: { status: PmocRelatorioStatus } }) => {
        assinaturaPmocStatus = data.status;
        return {
          id: "99999999-9999-4999-8999-999999999999",
          status: assinaturaPmocStatus,
          pdfHash: "hash-pdf",
          assinadoEm: new Date("2026-06-12T12:00:00.000Z"),
          emailCliente: "maria@example.com",
          emailAgendadoEm: new Date("2026-06-12T12:00:00.000Z"),
          historicoFinalizadoEm: new Date("2026-06-12T12:00:00.000Z")
        };
      }
    }
  };
}

before(async () => {
  senhaHash = await new PasswordHashService().hash("123456");
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  })
    .overrideProvider(PrismaService)
    .useValue(criarPrismaMock())
    .compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  await app.listen(0);
  baseUrl = await app.getUrl();

  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: "tecnico@airmovebr.local",
      senha: "123456"
    })
  });
  const loginBody = await lerJson(loginResponse);
  accessToken = loginBody.access_token as string;
});

after(async () => {
  await app.close();
});

test("PATCH /api/v1/os/:osId/status executa fluxo autenticado do controller", async () => {
  const response = await fetch(`${baseUrl}/api/v1/os/${osId}/status`, {
    method: "PATCH",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify({
      acao: OrdemServicoEventoAcao.iniciar_rota,
      latitude: -23.3045,
      longitude: -51.1696,
      registrado_em: "2026-06-10T08:45:00-03:00"
    })
  });
  const body = await lerJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.os_id, osId);
  assert.equal(body.status, OrdemServicoStatus.em_deslocamento);
});
