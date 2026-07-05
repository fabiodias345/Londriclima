import { NotFoundException,UnauthorizedException } from "@nestjs/common";
import { AutomacaoTipo,OrdemServicoEventoAcao,OrdemServicoStatus,PmocRelatorioStatus } from "@prisma/client";
import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
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

function criarService(prisma: unknown, adminService?: unknown) {
  return new SiteService(prisma as never, adminService as never);
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

test("criarPreChamado grava endereco estruturado enviado pelo formulario do site", async () => {
  const chamadas = {
    enderecoCreateData: undefined as unknown
  };
  const tx = {
    cliente: {
      create: async () => ({ id: "cliente-1" })
    },
    clienteEndereco: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.enderecoCreateData = data;
        return { id: "endereco-1" };
      }
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
      findFirst: async () => null
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.criarPreChamado({
    ...dto,
    local: "Centro, Londrina",
    cep: "86010-000",
    logradouro: "Rua Sergipe",
    numero: "123",
    complemento: "Sala 4",
    bairro: "Centro",
    cidade: "Londrina",
    uf: "PR"
  });

  assert.deepEqual(
    {
      ...(chamadas.enderecoCreateData as Record<string, unknown>),
      empresaId: "empresa-validada",
      clienteId: "cliente-validado"
    },
    {
      empresaId: "empresa-validada",
      clienteId: "cliente-validado",
      nome: "Endereco informado no site",
      logradouro: "Rua Sergipe",
      numero: "123",
      complemento: "Sala 4",
      bairro: "Centro",
      cidade: "Londrina",
      uf: "PR",
      cep: "86010000"
    }
  );
  assert.equal(resposta.mensagem, "Pre-chamado registrado. A equipe Clima do Brasil acompanhara pelo painel de atendimento.");
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

test("consultarAssinaturaPmoc retorna relatorio publico pelo token", async () => {
  const prisma = {
    pmocRelatorio: {
      findUnique: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, { tokenAssinatura: "token-assinatura" });
        return {
          id: "relatorio-1",
          status: PmocRelatorioStatus.aguardando_assinatura_engenheiro,
          pdfHash: "hash-pdf",
          assinadoEm: null,
          emailCliente: null,
          cliente: {
            nome: "Maria Souza",
            email: "maria@example.com"
          },
          engenheiroResponsavel: {
            nome: "Paulo Londriclima",
            cpf: "12345678901",
            crea: "CREA-PR 123456",
            email: "paulo@example.com"
          }
        };
      }
    }
  };
  const adminService = {
    gerarPdfPmocCliente: async () => ({
      filename: "pmoc-maria-souza.pdf",
      contentType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\npmoc")
    })
  };
  const service = criarService(prisma, adminService);

  const resposta = await service.consultarAssinaturaPmoc("token-assinatura");

  assert.equal(resposta.id, "relatorio-1");
  assert.equal(resposta.status, PmocRelatorioStatus.aguardando_assinatura_engenheiro);
  assert.equal(resposta.cliente.nome, "Maria Souza");
  assert.equal(resposta.engenheiro_responsavel.crea, "CREA-PR 123456");
  assert.equal(resposta.pdf_hash, "hash-pdf");
});

test("confirmarAssinaturaPmoc exige PDF assinado no Gov.br e agenda envio de email ao cliente", async () => {
  const pdfAssinado = Buffer.from("%PDF-1.7\nassinado-govbr");
  const pdfAssinadoBase64 = pdfAssinado.toString("base64");
  const pdfAssinadoHash = createHash("sha256").update(pdfAssinado).digest("hex");
  const chamadas = {
    updateData: undefined as unknown,
    emailData: undefined as unknown
  };
  const tx = {
    pmocRelatorio: {
      update: async ({ data }: { data: unknown }) => {
        chamadas.updateData = data;
        return {
          id: "relatorio-1",
          status: PmocRelatorioStatus.assinado,
          pdfHash: (data as { pdfHash: string }).pdfHash,
          assinadoEm: new Date("2026-06-12T12:00:00.000Z"),
          emailCliente: "maria@example.com",
          emailAgendadoEm: new Date("2026-06-12T12:00:00.000Z"),
          historicoFinalizadoEm: new Date("2026-06-12T12:00:00.000Z")
        };
      }
    },
    automacaoAgendada: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.emailData = data;
      }
    }
  };
  const prisma = {
    pmocRelatorio: {
      findUnique: async () => ({
        id: "relatorio-1",
        empresaId: "empresa-1",
        clienteId: "cliente-1",
        engenheiroResponsavelId: "engenheiro-1",
        status: PmocRelatorioStatus.aguardando_assinatura_engenheiro,
        tokenAssinatura: "token-assinatura",
        pdfHash: "hash-pdf",
        assinadoEm: null,
        cliente: {
          id: "cliente-1",
          nome: "Maria Souza",
          email: "maria@example.com"
        },
        engenheiroResponsavel: {
          nome: "Paulo Londriclima",
          cpf: "12345678901",
          crea: "CREA-PR 123456",
          email: "paulo@example.com"
        }
      })
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx)
  };
  const service = criarService(prisma);

  const resposta = await service.confirmarAssinaturaPmoc("token-assinatura", {
    pdf_assinado_base64: pdfAssinadoBase64,
    pdf_assinado_filename: "pmoc-maria-souza-assinado-govbr.pdf"
  });

  assert.equal((chamadas.updateData as { status: PmocRelatorioStatus }).status, PmocRelatorioStatus.assinado);
  assert.equal((chamadas.updateData as { emailCliente: string }).emailCliente, "maria@example.com");
  assert.equal((chamadas.emailData as { tipo: AutomacaoTipo }).tipo, AutomacaoTipo.enviar_email);
  assert.equal((chamadas.emailData as { empresaId: string }).empresaId, "empresa-1");
  const payload = (chamadas.emailData as { payload: Record<string, unknown> }).payload;
  assert.match(String(payload.data_envio), /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(
    {
      ...payload,
      data_envio: "data-validada"
    },
    {
      tipo: "pmoc_relatorio_assinado",
      relatorio_id: "relatorio-1",
      cliente_id: "cliente-1",
      cliente_nome: "Maria Souza",
      cliente_email: "maria@example.com",
      data_envio: "data-validada",
      engenheiro_nome: "Paulo Londriclima",
      engenheiro_cpf: "12345678901",
      engenheiro_crea: "CREA-PR 123456",
      pdf_hash: pdfAssinadoHash,
      pdf_filename: "pmoc-maria-souza-assinado-govbr.pdf",
      pdf_base64: pdfAssinadoBase64
    }
  );
  assert.equal(resposta.status, PmocRelatorioStatus.assinado);
  assert.equal(resposta.pdf_hash, pdfAssinadoHash);
  assert.equal(resposta.email_agendado, true);
  assert.equal(resposta.historico_finalizado, true);
});
