import {
AutomacaoTipo,
OrdemServicoEventoAcao,
OrdemServicoStatus,
PmocRelatorioStatus,
Prisma,
UsuarioRole
} from "@prisma/client";
import * as assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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
        pmocArtNumero: null,
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
        pmocArtNumero: "1720263699262",
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
  assert.match(pdf, /PLANO DE MANUTENÇÃO, OPERAÇÃO E CONTROLE - PMOC/);
  assert.match(pdf, /Cliente\s+Maria Souza/);
  assert.match(pdf, /EMPRESA CONTRATADA/);
  assert.match(pdf, /M\. Lima Manutenções Prediais e Industriais LTDA/);
  assert.match(pdf, /RESPONSÁVEL TÉCNICO/);
  assert.match(pdf, /Nome\s+Fabio Dias/);
  assert.match(pdf, /CREA\/Carteira\s+CREA-PR 654321/);
  assert.match(pdf, /ART anual PMOC\s+1720263699262/);
  assert.match(pdf, /RESUMO DAS MÁQUINAS DO CLIENTE/);
  const planoGeral = pdf.slice(pdf.indexOf("(OBJETIVO, RESPONSABILIDADES"), pdf.indexOf("(RESUMO DAS MÁQUINAS"));
  assert.match(planoGeral, /Periodicidade prevista/);
  assert.doesNotMatch(planoGeral, /Executado neste relatório/);
  assert.match(pdf, /Manutenção executada\s+Mensal/);
  assert.doesNotMatch(pdf, /"Mensal", "Trimestral", "Semestral"/);
  assert.match(pdf, /MÁQUINA N:001 - PÁGINA EXCLUSIVA/);
  assert.match(pdf, /MÁQUINA N:002 - PÁGINA EXCLUSIVA/);
  const paginaMaquina = pdf.slice(pdf.indexOf("(MÁQUINA N:001"), pdf.indexOf("(MÁQUINA N:002"));
  assert.match(paginaMaquina, /Executado neste relatório/);
  assert.doesNotMatch(paginaMaquina, /Periodicidade prevista/);
  assert.doesNotMatch(paginaMaquina, /PLANO DE MANUTENÇÃO DA MÁQUINA|ÚLTIMA EXECUÇÃO \/ OCORRÊNCIAS/);
  assert.match(pdf, /Área climatizada m2\s+Não informado/);
  assert.match(pdf, /Ocupantes fixos\s+Não informado/);
  assert.match(pdf, /Ocupantes variáveis\s+Não informado/);
  assert.match(pdf, /DECLARAÇÃO TÉCNICA E ASSINATURAS/);
  assert.match(pdf, /Lei Federal nº 13\.589\/2018/);
  assert.match(pdf, /Portaria MS nº 3\.523\/1998/);
  assert.match(pdf, /Resolução ANVISA RE nº 09\/2003/);
  assert.match(pdf, /\/Count 7/);
  assert.ok(pdf.indexOf("(AIRMOVEBR") < pdf.indexOf("(IDENTIFICAÇÃO DO CLIENTE"));
  assert.ok(pdf.indexOf("(IDENTIFICAÇÃO DO CLIENTE") < pdf.indexOf("(OBJETIVO, RESPONSABILIDADES"));
  assert.ok(pdf.indexOf("(RESUMO DAS MÁQUINAS") < pdf.indexOf("(MÁQUINA N:001"));
  assert.ok(pdf.indexOf("(MÁQUINA N:001") < pdf.indexOf("(MÁQUINA N:002"));
  assert.ok(pdf.indexOf("(MÁQUINA N:002") < pdf.indexOf("(DECLARAÇÃO TÉCNICA E ASSINATURAS"));
  const declaracao = pdf.slice(pdf.indexOf("(DECLARAÇÃO TÉCNICA E ASSINATURAS"));
  assert.doesNotMatch(declaracao, /CPF: 456789123-45/);
  assert.doesNotMatch(declaracao, /Referente: junho de 2026/);
  assert.doesNotMatch(pdf, /assinatura digitalizada reutilizavel/);
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

test("gerarPdfRelatorioAvulsoCliente usa respostas reais da corretiva sem checklist PMOC", async () => {
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
    }
  };
  const service = criarService(prisma);

  const resposta = await service.gerarPdfRelatorioAvulsoCliente("cliente-1", usuario);
  const pdf = resposta.buffer.toString("latin1");

  assert.match(pdf, /RELATORIO DE MANUTENCAO/);
  assert.match(pdf, /Problema encontrado\s+Motor travado/);
  assert.match(pdf, /Acao realizada\s+Motor destravado e testado/);
  assert.match(pdf, /Pecas utilizadas\s+Produtos de limpeza/);
  assert.match(pdf, /Observacao final\s+Funcionando/);
  assert.doesNotMatch(pdf, /Filtro lavado|Operacao em modo DRY|Evidencia apos a limpeza/);
  assert.doesNotMatch(pdf, /C3\.jpg|C6|pendente/);
});

test("gerarPdfRelatorioAvulsoCliente imprime checklist preventivo do app com respostas humanas", async () => {
  const equipamento = criarEquipamentoPmocTeste("equipamento-1", "Sala", "AV-001", "SN-AV-1", "2026-06-11T12:00:00.000Z");
  const fotoFiltroPath = resolve(process.cwd(), "..", "..", "storage", "os", "os-1", "checklist", "equipamento-1", "M4.jpg");
  const fotoCondensadoraPath = resolve(process.cwd(), "..", "..", "storage", "os", "os-1", "checklist", "equipamento-1", "S3.jpg");
  const fotoEvaporadoraPath = resolve(process.cwd(), "..", "..", "storage", "os", "os-1", "checklist", "equipamento-1", "M18.jpg");
  mkdirSync(dirname(fotoFiltroPath), { recursive: true });
  writeFileSync(fotoFiltroPath, Buffer.from([0xff, 0xd8, 0xff, 0xd9, 0x00]));
  writeFileSync(fotoCondensadoraPath, Buffer.from([0xff, 0xd8, 0xff, 0xd9, 0x01]));
  writeFileSync(fotoEvaporadoraPath, Buffer.from([0xff, 0xd8, 0xff, 0xd9, 0x02]));
  equipamento.ordensServico[0].tecnico = null as never;
  equipamento.ordensServico[0].equipe = {
    id: "equipe-10",
    nome: "Equipe 10",
    membros: [
      { usuario: { nome: "Marcela Londriclima" } },
      { usuario: { nome: "Paulo Londriclima" } }
    ]
  } as never;
  equipamento.ordensServico[0].evidencias = [];
  equipamento.ordensServico[0].checklistRespostas = [
    { codigo: "M1", tipo: "checkbox", valor: "Sim", observacao: null },
    { codigo: "M2", tipo: "checkbox", valor: "Nao", observacao: "controle sem pilha" },
    { codigo: "M4", tipo: "foto", valor: "/storage/os/os-1/checklist/equipamento-1/M4.jpg", observacao: null },
    { codigo: "M5", tipo: "checkbox", valor: "Sim", observacao: null },
    { codigo: "M18", tipo: "foto", valor: "/storage/os/os-1/checklist/equipamento-1/M18.jpg", observacao: null },
    { codigo: "S3", tipo: "foto", valor: "/storage/os/os-1/checklist/equipamento-1/S3.jpg", observacao: null },
    { codigo: "S6", tipo: "numerico", valor: "7.5", observacao: "pressao ok" }
  ] as typeof equipamento.ordensServico[number]["checklistRespostas"];
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
        equipamentos: [equipamento]
      })
    }
  };
  const service = criarService(prisma);

  try {
    const resposta = await service.gerarPdfRelatorioAvulsoCliente("cliente-1", usuario);
    const pdf = resposta.buffer.toString("latin1");

    assert.match(pdf, /EPIs utilizados\s+Sim/);
    assert.match(pdf, /Tecnico\s+Equipe 10 - Marcela Londriclima \/ Paulo Londriclima/);
    assert.match(pdf, /Desligar pelo controle remoto\s+Nao \\?\(controle sem pilha\\?\)/);
    assert.match(pdf, /Lavar filtros\s+Sim/);
    assert.match(pdf, /Pressao do fluido refrigerante\s+7\.5 \\?\(pressao ok\\?\)/);
    assert.equal((pdf.match(/\/Subtype \/Image/g) ?? []).length, 3);
    assert.doesNotMatch(pdf, /M4\.jpg|S3\.jpg/);
  } finally {
    rmSync(resolve(process.cwd(), "..", "..", "storage", "os", "os-1"), { recursive: true, force: true });
  }
});

test("gerarPdfRelatorioAvulsoCliente nao imprime foto pendente quando evidencia nao tem arquivo", async () => {
  const equipamento = criarEquipamentoPmocTeste("equipamento-1", "Sala", "AV-001", "SN-AV-1", "2026-06-11T12:00:00.000Z");
  equipamento.ordensServico[0].evidencias[1].storageUrl = null as never;
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
        equipamentos: [equipamento]
      })
    }
  };
  const service = criarService(prisma);

  const resposta = await service.gerarPdfRelatorioAvulsoCliente("cliente-1", usuario);
  const pdf = resposta.buffer.toString("latin1");

  assert.match(pdf, /Antes --- pmoc-001-antes\.jpg/);
  assert.doesNotMatch(pdf, /Depois --- pendente|pendente/);
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

test("apagarRelatorioAvulsoCliente remove envios gerados do cliente", async () => {
  const chamadas = {
    deleteWhere: undefined as unknown,
    createData: undefined as unknown
  };
  const equipamento = criarEquipamentoPmocTeste("equipamento-1", "Sala", "AV-001", "SN-AV-1", "2026-06-11T12:00:00.000Z");
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
        equipamentos: [equipamento]
      })
    },
    automacaoAgendada: {
      deleteMany: async ({ where }: { where: unknown }) => {
        chamadas.deleteWhere = where;
        return { count: 2 };
      },
      create: async ({ data }: { data: unknown }) => {
        chamadas.createData = data;
        return { id: "automacao-apagada" };
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.apagarRelatorioAvulsoCliente("cliente-1", usuario);

  assert.equal(resposta.relatorios_apagados, 2);
  assert.deepEqual(chamadas.deleteWhere, {
    empresaId: "empresa-1",
    tipo: AutomacaoTipo.enviar_email,
    AND: [
      { payload: { path: ["tipo"], equals: "relatorio_tecnico_avulso" } },
      { payload: { path: ["cliente_id"], equals: "cliente-1" } }
    ]
  });
  const createData = chamadas.createData as { status: string; payload: Record<string, unknown> };
  assert.equal(createData.status, "concluida");
  assert.equal(createData.payload.tipo, "relatorio_tecnico_avulso_apagado");
  assert.deepEqual(createData.payload.os_ids, ["os-equipamento-1"]);
});

test("listarRelatoriosAvulsos esconde cliente com relatorio apagado ate nova OS", async () => {
  const equipamento = criarEquipamentoPmocTeste("equipamento-1", "Sala", "AV-001", "SN-AV-1", "2026-06-11T12:00:00.000Z");
  const prisma = {
    cliente: {
      findMany: async () => [
        {
          id: "cliente-1",
          nome: "Cliente Avulso",
          email: "cliente@example.com",
          telefone: "43988887777",
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
          equipamentos: [{ id: equipamento.id, ordensServico: [{ id: "os-equipamento-1" }] }]
        }
      ]
    },
    automacaoAgendada: {
      findMany: async () => [
        {
          payload: {
            tipo: "relatorio_tecnico_avulso_apagado",
            cliente_id: "cliente-1",
            os_ids: ["os-equipamento-1"]
          }
        }
      ]
    }
  };
  const service = criarService(prisma);

  const resposta = await service.listarRelatoriosAvulsos(usuario);

  assert.equal(resposta.total, 0);
  assert.deepEqual(resposta.items, []);
});

test("listarRelatoriosAvulsos mostra OS multi-equipamento pelas respostas do checklist", async () => {
  const prisma = {
    cliente: {
      findMany: async () => [
        {
          id: "cliente-1",
          nome: "Cliente Avulso",
          email: "cliente@example.com",
          telefone: "43988887777",
          atualizadoEm: new Date("2026-06-12T10:00:00.000Z"),
          equipamentos: [{ id: "equipamento-1", ordensServico: [] }],
          ordensServico: [
            {
              id: "os-multi-1",
              checklistRespostas: [{ equipamentoId: "equipamento-1" }]
            }
          ]
        }
      ]
    },
    automacaoAgendada: {
      findMany: async () => []
    }
  };
  const service = criarService(prisma);

  const resposta = await service.listarRelatoriosAvulsos(usuario);

  assert.equal(resposta.total, 1);
  assert.equal(resposta.items[0].total_os_concluidas, 1);
  assert.equal(resposta.items[0].pronto_para_envio, true);
});

test("gerarPdfRelatorioAvulsoCliente separa duas manutencoes da mesma maquina", async () => {
  const fotoAntesPath = resolve(process.cwd(), "..", "..", "storage", "os", "os-equipamento-1-corretiva", "evidencias", "antes.jpg");
  const fotoDepoisPath = resolve(process.cwd(), "..", "..", "storage", "os", "os-equipamento-1-corretiva", "evidencias", "depois.jpg");
  mkdirSync(dirname(fotoAntesPath), { recursive: true });
  writeFileSync(fotoAntesPath, Buffer.from([0xff, 0xd8, 0xff, 0xd9, 0x00]));
  writeFileSync(fotoDepoisPath, Buffer.from([0xff, 0xd8, 0xff, 0xd9, 0x00]));
  const equipamento = criarEquipamentoPmocTeste("equipamento-1", "Sala", "AV-001", "SN-AV-1", "2026-06-11T12:00:00.000Z");
  equipamento.ordensServico.unshift({
    ...equipamento.ordensServico[0],
    id: "os-equipamento-1-corretiva",
    titulo: "Corretiva compressor",
    problemaRelatado: "Compressor queimado",
    agendadaPara: new Date("2026-06-12T09:00:00.000Z"),
    concluidaEm: new Date("2026-06-12T10:30:00.000Z"),
    evidencias: [
      {
        id: "ev-antes-corretiva",
        tipo: "antes",
        descricao: "Foto do compressor antes da troca",
        storageUrl: "/storage/os/os-equipamento-1-corretiva/evidencias/antes.jpg",
        mimeType: "image/jpeg",
        tamanhoBytes: 1000,
        criadoEm: new Date("2026-06-12T09:00:00.000Z")
      },
      {
        id: "ev-depois-corretiva",
        tipo: "depois",
        descricao: "Foto do compressor depois da troca",
        storageUrl: "/storage/os/os-equipamento-1-corretiva/evidencias/depois.jpg",
        mimeType: "image/jpeg",
        tamanhoBytes: 1000,
        criadoEm: new Date("2026-06-12T10:30:00.000Z")
      }
    ],
    checklistRespostas: [
      { codigo: "C1", tipo: "texto", valor: "queimou o compressor", observacao: null },
      { codigo: "C2", tipo: "texto", valor: "trocado o mesmo", observacao: null },
      { codigo: "C4", tipo: "texto", valor: "compressor", observacao: null }
    ]
  });
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
        equipamentos: [equipamento]
      })
    }
  };
  const service = criarService(prisma);

  try {
    const pdf = await service.gerarPdfRelatorioAvulsoCliente("cliente-1", usuario);
    const textoPdf = pdf.buffer.toString("latin1");

    assert.match(textoPdf, /MANUTENCAO N:001 DE 002/);
    assert.match(textoPdf, /MANUTENCAO N:002 DE 002/);
    assert.match(textoPdf, /OS: Corretiva compressor/);
    assert.match(textoPdf, /Problema encontrado\s+queimou o compressor/);
    assert.match(textoPdf, /Acao realizada\s+trocado o mesmo/);
    assert.match(textoPdf, /Pecas utilizadas\s+compressor/);
    assert.match(textoPdf, /OS: PMOC mensal/);
    assert.match(textoPdf, /Antes --- antes\.jpg/);
    assert.match(textoPdf, /Depois --- depois\.jpg/);
    assert.match(textoPdf, /\/Subtype \/Image/);
  } finally {
    rmSync(resolve(process.cwd(), "..", "..", "storage", "os", "os-equipamento-1-corretiva"), { recursive: true, force: true });
  }
});

test("obterPreviaRelatorioAvulsoCliente inclui OS multi-equipamento pelas respostas do checklist", async () => {
  const equipamento = criarEquipamentoPmocTeste("equipamento-1", "Sala", "AV-001", "SN-AV-1", "2026-06-11T12:00:00.000Z");
  const ordem = {
    ...equipamento.ordensServico[0],
    id: "os-multi-1",
    equipamentoId: null,
    checklistRespostas: equipamento.ordensServico[0].checklistRespostas.map((resposta) => ({
      ...resposta,
      equipamentoId: equipamento.id
    }))
  };
  equipamento.ordensServico = [];
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
        equipamentos: [equipamento],
        ordensServico: [ordem]
      })
    }
  };
  const service = criarService(prisma);

  const resposta = await service.obterPreviaRelatorioAvulsoCliente("cliente-1", usuario);

  assert.equal(resposta.total_maquinas, 1);
  assert.equal(resposta.total_os_concluidas, 1);
  assert.equal(resposta.maquinas[0].os_concluidas[0].id, "os-multi-1");
  assert.deepEqual(resposta.pendencias, []);
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
        tipoServico: "corretiva",
        checklistTipo: "mensal",
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
        checklistRespostas: [
          { codigo: "C1", tipo: "texto", valor: "Motor travado", observacao: null },
          { codigo: "C2", tipo: "texto", valor: "Motor destravado e testado", observacao: null },
          { codigo: "C3", tipo: "foto", valor: "/storage/os/os-1/checklist/equipamento-1/C3.jpg", observacao: null },
          { codigo: "C4", tipo: "texto", valor: "Produtos de limpeza", observacao: null },
          { codigo: "C5", tipo: "texto", valor: "Funcionando", observacao: null },
          { codigo: "C6", tipo: "texto", valor: "pendente", observacao: null }
        ],
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
        pmocArtNumero: "1720263699262",
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
