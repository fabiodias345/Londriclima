import {
AutomacaoTipo,
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

test("obterPreviaPmocCliente nao bloqueia reenvio quando PMOC assinado ainda nao foi entregue ao cliente", async () => {
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
          criarEquipamentoPmocTeste("equipamento-1", "Sala", "PMOC-001", "SN-1", "2026-06-11T12:00:00.000Z")
        ]
      })
    },
    pmocRelatorio: {
      findMany: async () => [
        {
          id: "relatorio-assinado-sem-entrega",
          status: PmocRelatorioStatus.assinado,
          pdfHash: "hash-jun",
          assinafyDocumentId: "doc-jun",
          assinafyAssignmentId: "assignment-jun",
          assinafyStatus: "certificated",
          criadoEm: new Date("2026-06-12T12:00:00.000Z"),
          emailAgendadoEm: new Date("2026-06-12T12:00:00.000Z"),
          assinadoEm: new Date("2026-06-12T12:00:00.000Z")
        }
      ]
    },
    automacaoAgendada: {
      findMany: async () => []
    }
  };
  const service = criarService(prisma);

  const resposta = await service.obterPreviaPmocCliente("cliente-1", usuario);

  assert.equal(resposta.pmoc_meses[5].status, "pendente");
  assert.equal(resposta.pmoc_meses[5].relatorio_status, PmocRelatorioStatus.assinado);
  assert.equal(resposta.pmoc_meses[5].email_entregue, false);
  assert.equal(resposta.assinatura_atual?.status, PmocRelatorioStatus.assinado);
  assert.equal(resposta.assinatura_atual?.email_entregue, false);
});

test("gerarPdfPmocCliente retorna PDF com nome de arquivo e conteudo oficial", async () => {
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
          nome: "Fabio Dias",
          cpf: "45678912345",
          crea: "CREA-PR 654321",
          email: "fabio@example.com",
          telefone: "43999991111",
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z")
        },
        enderecos: [{ cidade: "Londrina", uf: "PR", bairro: "Centro" }],
        equipamentos: [
          criarEquipamentoPmocTeste("equipamento-1", "Sala 09", "CRIS-009", "SN-CRIS-0009", "2026-06-01T20:01:00.000Z"),
          criarEquipamentoPmocTeste("equipamento-2", "Sala 19", "CRIS-019", "SN-CRIS-0019", "2026-06-11T20:01:00.000Z")
        ]
      })
    },
    pmocRelatorio: {
      findMany: async () => []
    }
  };
  const service = criarService(prisma);

  const resposta = await service.gerarPdfPmocCliente("cliente-1", usuario);

  assert.equal(resposta.contentType, "application/pdf");
  assert.equal(resposta.filename, "pmoc-maria-souza.pdf");
  assert.equal(resposta.buffer.subarray(0, 4).toString("utf8"), "%PDF");
  const pdf = resposta.buffer.toString("latin1");
  assert.match(pdf, /Maria Souza/);
  assert.match(pdf, /AIRMOVEBR - RELATORIO PMOC/);
  assert.match(pdf, /Campo\s+Informacao/);
  assert.match(pdf, /Cliente\s+Maria Souza/);
  assert.match(pdf, /Engenheiro Responsavel\s+Fabio Dias - CREA-PR 654321/);
  assert.match(pdf, /MAQUINA N:001/);
  assert.match(pdf, /MAQUINA N:002/);
  assert.match(pdf, /DECLARACAO DE CONFORMIDADE TECNICA/);
  assert.match(pdf, /Lei Federal n 13\.589\/2018/);
  assert.match(pdf, /Portaria MS n 3\.523\/1998/);
  assert.match(pdf, /Resolucao ANVISA RE n 09\/2003/);
  assert.match(pdf, /\/Count 4/);
  assert.ok(pdf.indexOf("(AIRMOVEBR - RELATORIO PMOC") < pdf.indexOf("(MAQUINA N:001"));
  assert.ok(pdf.indexOf("(MAQUINA N:001") < pdf.indexOf("(MAQUINA N:002"));
  assert.ok(pdf.indexOf("(MAQUINA N:002") < pdf.indexOf("(DECLARACAO DE CONFORMIDADE TECNICA"));
  const declaracao = pdf.slice(pdf.indexOf("(DECLARACAO DE CONFORMIDADE"));
  assert.doesNotMatch(declaracao, /Engenheiro Responsavel: Fabio Dias/);
  assert.doesNotMatch(declaracao, /CPF: 456789123-45/);
  assert.doesNotMatch(declaracao, /CREA: CREA-PR 654321/);
  assert.doesNotMatch(declaracao, /Referente: junho de 2026/);
  assert.doesNotMatch(declaracao, /______________________________________________/);
  assert.doesNotMatch(pdf, /Responsavel pelo Empreendimento/);
});

test("obterPreviaRelatorioAvulsoCliente retorna cliente sem PMOC com OS concluidas", async () => {
  const prisma = {
    cliente: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        assert.equal(where.id, "cliente-1");
        assert.equal(where.empresaId, usuario.empresa_id);
        return {
          id: "cliente-1",
          nome: "Cliente Avulso",
          tipo: "pf",
          documento: "12345678900",
          telefone: "43988887777",
          email: "cliente@example.com",
          pmocAtivo: false,
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
          enderecos: [{ cidade: "Londrina", uf: "PR", bairro: "Centro" }],
          equipamentos: [
            criarEquipamentoPmocTeste("equipamento-1", "Sala", "AV-001", "SN-AV-1", "2026-06-11T12:00:00.000Z")
          ]
        };
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.obterPreviaRelatorioAvulsoCliente("cliente-1", usuario);

  assert.equal(resposta.cliente.nome, "Cliente Avulso");
  assert.equal(resposta.total_maquinas, 1);
  assert.equal(resposta.total_os_concluidas, 1);
  assert.equal(resposta.pronto_para_envio, true);
  assert.deepEqual(resposta.pendencias, []);
});

test("enviarRelatorioAvulsoCliente agenda email direto ao cliente com copia interna via automacao", async () => {
  const chamadas = {
    emailData: undefined as unknown
  };
  const prisma = {
    cliente: {
      findFirst: async () => ({
        id: "cliente-1",
        nome: "Cliente Avulso",
        tipo: "pf",
        documento: "12345678900",
        telefone: "43988887777",
        email: "cliente@example.com",
        pmocAtivo: false,
        atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
        enderecos: [{ cidade: "Londrina", uf: "PR", bairro: "Centro" }],
        equipamentos: [
          criarEquipamentoPmocTeste("equipamento-1", "Sala", "AV-001", "SN-AV-1", "2026-06-11T12:00:00.000Z")
        ]
      })
    },
    automacaoAgendada: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.emailData = data;
        return { id: "automacao-1" };
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.enviarRelatorioAvulsoCliente("cliente-1", usuario);

  assert.equal(resposta.email_cliente_agendado, true);
  assert.equal((chamadas.emailData as { tipo: AutomacaoTipo }).tipo, AutomacaoTipo.enviar_email);
  const payload = (chamadas.emailData as { payload: Record<string, unknown> }).payload;
  assert.equal(payload.tipo, "relatorio_tecnico_avulso");
  assert.equal(payload.cliente_id, "cliente-1");
  assert.equal(payload.cliente_email, "cliente@example.com");
  assert.match(String(payload.pdf_filename), /^relatorio-tecnico-cliente-avulso\.pdf$/);
  assert.match(String(payload.pdf_base64), /^[A-Za-z0-9+/]+=*$/);
  assert.deepEqual(payload.os_ids, ["os-equipamento-1"]);
});

function criarEquipamentoPmocTeste(id: string, localInstalacao: string, patrimonio: string, numeroSerie: string, inicioIso: string) {
  const inicio = new Date(inicioIso);
  const fim = new Date(inicio.getTime() + 170 * 60000);
  const sufixo = patrimonio.toLowerCase().replace(/\D/g, "") || id;

  return {
    id,
    tipo: "Split",
    patrimonio,
    codigoBarras: `7890000000${sufixo}`,
    marca: "Springer",
    modelo: "Split Hi Wall",
    capacidadeBtu: 21000,
    gasRefrigerante: "R-410A",
    numeroSerie,
    localInstalacao,
    atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
    ordensServico: [
      {
        id: `os-${id}`,
        titulo: "PMOC mensal",
        problemaRelatado: "Rotina mensal",
        status: OrdemServicoStatus.concluida,
        agendadaPara: inicio,
        concluidaEm: fim,
        valorCobrado: new Prisma.Decimal(250),
        tecnico: { id: "tecnico-1", nome: "Joao Tecnico", email: "joao@example.com" },
        equipe: null,
        eventos: [
          {
            id: `evento-${id}`,
            acao: OrdemServicoEventoAcao.finalizar,
            statusAnterior: OrdemServicoStatus.em_atendimento,
            statusNovo: OrdemServicoStatus.concluida,
            latitude: new Prisma.Decimal(-23.3047),
            longitude: new Prisma.Decimal(-51.1697),
            registradoEm: fim
          }
        ],
        evidencias: [
          {
            id: `ev-antes-${id}`,
            tipo: "antes",
            descricao: "Evidencia antes da manutencao PMOC",
            storageUrl: `/storage/demo/cris/pmoc-${sufixo}-antes.jpg`,
            mimeType: "image/jpeg",
            tamanhoBytes: 1000,
            criadoEm: inicio
          },
          {
            id: `ev-depois-${id}`,
            tipo: "depois",
            descricao: "Evidencia depois da manutencao PMOC",
            storageUrl: `/storage/demo/cris/pmoc-${sufixo}-depois.jpg`,
            mimeType: "image/jpeg",
            tamanhoBytes: 1000,
            criadoEm: fim
          }
        ],
        checklist: {
          id: `check-${id}`,
          servicoRealizado: "Limpeza de filtros",
          procedimentos: ["limpeza_filtro", "limpeza_evaporadora"],
          custoTotalPecas: new Prisma.Decimal(0),
          criadoEm: inicio,
          atualizadoEm: fim,
          pecas: []
        },
        assinatura: {
          id: `assinatura-${id}`,
          nomeResponsavel: "Maria Souza",
          storageUrl: "/assinatura.png",
          latitude: new Prisma.Decimal(-23.3047),
          longitude: new Prisma.Decimal(-51.1697),
          assinadoEm: fim
        },
        observacoes: [
          {
            id: `obs-${id}`,
            texto: "Sem observacoes visiveis.",
            visivelNoRelatorio: true,
            criadoEm: fim
          }
        ]
      }
    ]
  };
}

test("solicitarAssinaturaPmocEngenheiro cria relatorio com token e hash do PDF", async () => {
  const chamadas = {
    createData: undefined as unknown,
    emailData: undefined as unknown
  };
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
        equipamentos: []
      })
    },
    pmocRelatorio: {
      findMany: async () => [],
      create: async ({ data }: { data: unknown }) => {
        chamadas.createData = data;
        return {
          id: "relatorio-1",
          ...(data as object),
          status: "aguardando_assinatura_engenheiro",
          criadoEm: new Date("2026-06-12T11:00:00.000Z"),
          atualizadoEm: new Date("2026-06-12T11:00:00.000Z")
        };
      }
    },
    automacaoAgendada: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.emailData = data;
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.solicitarAssinaturaPmocEngenheiro("cliente-1", usuario);

  assert.equal((chamadas.createData as { clienteId: string }).clienteId, "cliente-1");
  assert.equal((chamadas.createData as { engenheiroResponsavelId: string }).engenheiroResponsavelId, "engenheiro-1");
  assert.equal((chamadas.createData as { status: string }).status, "aguardando_assinatura_engenheiro");
  assert.match((chamadas.createData as { tokenAssinatura: string }).tokenAssinatura, /^[a-f0-9]{48}$/);
  assert.match((chamadas.createData as { pdfHash: string }).pdfHash, /^[a-f0-9]{64}$/);
  assert.equal((chamadas.emailData as { tipo: AutomacaoTipo }).tipo, AutomacaoTipo.enviar_email);
  const tokenAssinatura = (chamadas.createData as { tokenAssinatura: string }).tokenAssinatura;
  const payload = (chamadas.emailData as { payload: Record<string, unknown> }).payload;
  assert.match(String(payload.data_envio), /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(
    {
      ...payload,
      pdf_base64: "base64-validado",
      data_envio: "data-validada"
    },
    {
      tipo: "pmoc_assinatura_engenheiro",
      relatorio_id: "relatorio-1",
      cliente_nome: "Maria Souza",
      cliente_email: "maria@example.com",
      data_envio: "data-validada",
      engenheiro_email: "paulo@example.com",
      engenheiro_nome: "Paulo Londriclima",
      link_assinatura: `http://127.0.0.1:5174/landing/assinatura-pmoc?token=${tokenAssinatura}`,
      pdf_hash: (chamadas.createData as { pdfHash: string }).pdfHash,
      pdf_filename: "pmoc-maria-souza.pdf",
      pdf_base64: "base64-validado"
    }
  );
  assert.match(String(payload.pdf_base64), /^[A-Za-z0-9+/]+=*$/);
  assert.equal(resposta.status, "aguardando_assinatura_engenheiro");
  assert.equal(resposta.engenheiro_responsavel.crea, "CREA-PR 123456");
  assert.equal((resposta as { email_engenheiro_agendado: boolean }).email_engenheiro_agendado, true);
  assert.equal("token_assinatura" in resposta, false);
});
