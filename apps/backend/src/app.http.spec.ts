import { after, before, test } from "node:test";
import * as assert from "node:assert/strict";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { EvidenciaTipo, OrdemServicoEventoAcao, OrdemServicoStatus, Prisma, UsuarioRole } from "@prisma/client";
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
      createMany: async () => ({ count: 4 })
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
        if (where.email && where.email !== "tecnico@londriclima.local") {
          return null;
        }

        return {
          id: usuarioId,
          empresaId,
          nome: "Tecnico LondriClima",
          email: "tecnico@londriclima.local",
          senhaHash,
          role: UsuarioRole.tecnico
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
            nome: "Tecnico LondriClima"
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
      findFirst: async () => null,
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
      count: async () => 2
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
});

after(async () => {
  await app.close();
});

test("GET /api/v1/health responde status ok", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`);
  const body = await lerJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("POST /api/v1/auth/login autentica com credenciais validas", async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: "tecnico@londriclima.local",
      senha: "123456"
    })
  });
  const body = await lerJson(response);

  assert.equal(response.status, 201);
  assert.equal(body.token_type, "Bearer");
  assert.equal(typeof body.access_token, "string");
  assert.equal(typeof body.refresh_token, "string");
  accessToken = body.access_token as string;
});

test("POST /api/v1/auth/refresh renova tokens com refresh valido", async () => {
  const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: "tecnico@londriclima.local",
      senha: "123456"
    })
  });
  const loginBody = await lerJson(login);
  const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      refresh_token: loginBody.refresh_token
    })
  });
  const body = await lerJson(response);

  assert.equal(response.status, 201);
  assert.equal(body.token_type, "Bearer");
  assert.equal(typeof body.access_token, "string");
});

test("rotas protegidas rejeitam token ausente e invalido", async () => {
  const semToken = await fetch(`${baseUrl}/api/v1/admin/pre-chamados`);
  const tokenInvalido = await fetch(`${baseUrl}/api/v1/admin/pre-chamados`, {
    headers: {
      authorization: "Bearer token-invalido"
    }
  });

  assert.equal(semToken.status, 401);
  assert.equal(tokenInvalido.status, 401);
});

test("GET /api/v1/admin/pre-chamados responde lista autenticada", async () => {
  const response = await fetch(`${baseUrl}/api/v1/admin/pre-chamados`, {
    headers: jsonHeaders(accessToken)
  });
  const body = await lerJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.total, 1);
});

test("GET /api/v1/admin/agenda responde agenda autenticada", async () => {
  const response = await fetch(`${baseUrl}/api/v1/admin/agenda`, {
    headers: jsonHeaders(accessToken)
  });
  const body = await lerJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.total, 1);
});

test("GET /api/v1/admin/clientes responde clientes autenticados", async () => {
  const response = await fetch(`${baseUrl}/api/v1/admin/clientes`, {
    headers: jsonHeaders(accessToken)
  });
  const body = await lerJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.total, 1);
});

test("GET /api/v1/admin/relatorios responde indicadores autenticados", async () => {
  const response = await fetch(`${baseUrl}/api/v1/admin/relatorios`, {
    headers: jsonHeaders(accessToken)
  });
  const body = await lerJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.total_os, 1);
  assert.equal(body.clientes, 1);
});

test("GET /api/v1/admin/relatorios/frota responde consumo da frota", async () => {
  const response = await fetch(`${baseUrl}/api/v1/admin/relatorios/frota`, {
    headers: jsonHeaders(accessToken)
  });
  const body = await lerJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.total_veiculos, 2);
  assert.equal(body.km_rodados, 773);
});

test("POST /api/v1/admin/frota/abastecimentos registra abastecimento autenticado", async () => {
  const response = await fetch(`${baseUrl}/api/v1/admin/frota/abastecimentos`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify({
      veiculo_id: veiculo1Id,
      odometro_km: 51700,
      litros: 20,
      valor_total: 118,
      abastecido_em: "2026-06-10T12:00:00.000Z",
      posto: "Posto Centro"
    })
  });
  const body = await lerJson(response);

  assert.equal(response.status, 201);
  assert.equal(body.preco_por_litro, 5.9);
});

test("POST /api/v1/site/pre-chamados cria pre-chamado publico com DTO validado", async () => {
  const response = await fetch(`${baseUrl}/api/v1/site/pre-chamados`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      nome: "Maria Souza",
      telefone: "(43) 99999-9999",
      servico: "Limpeza",
      local: "Centro, Londrina"
    })
  });
  const body = await lerJson(response);

  assert.equal(response.status, 201);
  assert.equal(body.pre_chamado_id, osId);
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
