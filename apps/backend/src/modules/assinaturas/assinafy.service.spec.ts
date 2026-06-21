import { strict as assert } from "node:assert";
import { test } from "node:test";
import { AutomacaoTipo, PmocRelatorioStatus, UsuarioRole } from "@prisma/client";
import { AssinafyService } from "./assinafy.service";

const usuario = {
  id: "usuario-1",
  empresa_id: "empresa-1",
  email: "admin@airmovebr.local",
  role: UsuarioRole.admin
};

function criarServico(options?: {
  signers?: Array<{ id: string; email: string; full_name: string }>;
  pendentesAssinafy?: Array<{ assinafyDocumentId: string; assinafyAssignmentId: string | null }>;
  documentStatus?: string;
  assignmentStatus?: string;
  relatorioStatus?: PmocRelatorioStatus;
  emailAgendadoEm?: Date | null;
  automacaoFinalExistente?: boolean;
  driveStorage?: {
    salvarPdfAssinadoPmoc: (input: {
      relatorioId: string;
      clienteNome: string;
      filename: string;
      pdf: Buffer;
    }) => Promise<string | null>;
  };
}) {
  const chamadas = {
    posts: [] as Array<{ url: string; data: unknown; config: unknown }>,
    gets: [] as Array<{ url: string; config?: unknown }>,
    relatorioData: undefined as unknown,
    updateManyWhere: undefined as unknown,
    updateManyData: undefined as unknown,
    transactionEvents: [] as string[],
    updateWhere: undefined as unknown,
    updateData: undefined as unknown,
    automacaoData: undefined as unknown,
    findFirstStatus: options?.relatorioStatus ?? PmocRelatorioStatus.aguardando_assinatura_engenheiro
  };

  const http = {
    post: async (url: string, data: unknown, config: unknown) => {
      chamadas.posts.push({ url, data, config });

      if (url === "/accounts/account-1/documents") {
        return { data: { data: { id: "doc-assinafy-1" } } };
      }

      if (url === "/accounts/account-1/signers") {
        return { data: { data: { id: "signer-1" } } };
      }

      if (url === "/documents/doc-assinafy-1/assignments") {
        return { data: { data: { id: "assignment-1", status: "pending" } } };
      }

      return { data: { id: "assignment-1", status: "pending" } };
    },
    get: async (url: string, config?: unknown) => {
      chamadas.gets.push({ url, config });
      if (url === "/accounts") {
        return { data: { data: [{ id: "account-1", name: "AIRMOVEBR" }] } };
      }
      if (url === "/accounts/account-1/signers") {
        return { data: { data: options?.signers ?? [] } };
      }
      if (url === "/documents/doc-assinafy-1") {
        return {
          data: {
            data: {
              id: "doc-assinafy-1",
              status: options?.documentStatus ?? "certificated",
              assignment: { id: "assignment-1", status: options?.assignmentStatus ?? "pending" }
            }
          }
        };
      }
      return { data: Buffer.from("%PDF-assinado"), status: 200 };
    }
  };

  const prisma = {
    pmocRelatorio: {
      create: async ({ data }: { data: unknown }) => {
        chamadas.transactionEvents.push("create");
        chamadas.relatorioData = data;
        return {
          id: "relatorio-1",
          status: PmocRelatorioStatus.aguardando_assinatura_engenheiro,
          assinafyDocumentId: "doc-assinafy-1",
          assinafyAssignmentId: "assignment-1",
          assinafyStatus: "pending"
        };
      },
      updateMany: async ({ where, data }: { where: unknown; data: unknown }) => {
        chamadas.transactionEvents.push("updateMany");
        chamadas.updateManyWhere = where;
        chamadas.updateManyData = data;
        return { count: 1 };
      },
      findFirst: async () => ({
        id: "relatorio-1",
        empresaId: "empresa-1",
        clienteId: "cliente-1",
        status: chamadas.findFirstStatus,
        assinafyStatus: chamadas.findFirstStatus === PmocRelatorioStatus.cancelado ? "superseded" : "pending",
        pdfStorageUrl: null,
        emailAgendadoEm: options?.emailAgendadoEm ?? null,
        cliente: { nome: "Hospital Teste", email: "cliente@example.com" },
        engenheiroResponsavel: { nome: "Paulo Silva", email: "paulo@example.com", cpf: "12345678901", crea: "CREA-PR 12345" }
      }),
      findMany: async () =>
        options?.pendentesAssinafy?.map((relatorio) => ({
          assinafyDocumentId: relatorio.assinafyDocumentId,
          assinafyAssignmentId: relatorio.assinafyAssignmentId
        })) ?? [],
      update: async ({ where, data }: { where: unknown; data: unknown }) => {
        chamadas.updateWhere = where;
        chamadas.updateData = data;
        const updateData = data as { status?: PmocRelatorioStatus; assinafyStatus?: string };
        return {
          id: "relatorio-1",
          status: updateData.status ?? PmocRelatorioStatus.assinado,
          assinafyStatus: updateData.assinafyStatus ?? "completed",
          pdfStorageUrl: "/storage/pmoc/assinaturas/relatorio-1.pdf"
        };
      }
    },
    automacaoAgendada: {
      findFirst: async () => (options?.automacaoFinalExistente ? { id: "automacao-existente" } : null),
      create: async ({ data }: { data: unknown }) => {
        chamadas.automacaoData = data;
        return { id: "automacao-1" };
      }
    },
    $transaction: async (callback: (tx: unknown) => unknown) => {
      return callback(prisma);
    }
  };

  const admin = {
    obterPreviaPmocCliente: async () => ({
      cliente: { id: "cliente-1", nome: "Hospital Teste" },
      engenheiro_responsavel: { id: "engenheiro-1", nome: "Paulo Silva", email: "paulo@example.com" }
    }),
    gerarPdfPmocCliente: async () => ({
      filename: "pmoc-hospital-teste.pdf",
      buffer: Buffer.from("%PDF-original"),
      contentType: "application/pdf"
    })
  };

  const config = {
    getOrThrow: (key: string) => {
      if (key === "ASSINAFY_API_KEY") {
        return "assinafy-secret";
      }
      throw new Error(`config ausente: ${key}`);
    },
    get: (key: string) => {
      if (key === "ASSINAFY_BASE_URL") {
        return "https://api.assinafy.test";
      }
      if (key === "STORAGE_DIR") {
        return "storage";
      }
      if (key === "ASSINAFY_SYNC_BATCH_SIZE") {
        return 10;
      }
      return undefined;
    }
  };

  const service = new AssinafyService(
    config as never,
    prisma as never,
    admin as never,
    http as never
  );

  return { service, chamadas };
}

test("enviarPmocParaAssinatura envia PDF e cadastra signatario na Assinafy sem expor API key", async () => {
  const { service, chamadas } = criarServico();

  const resposta = await service.enviarPmocParaAssinatura("cliente-1", usuario);

  assert.equal(chamadas.gets[0].url, "/accounts");
  assert.equal(chamadas.posts[0].url, "/accounts/account-1/signers");
  assert.equal((chamadas.posts[0].data as { full_name?: unknown }).full_name, "Paulo Silva");
  assert.match(JSON.stringify(chamadas.posts[0].data), /paulo@example.com/);
  assert.equal(chamadas.posts[1].url, "/accounts/account-1/documents");
  assert.equal(chamadas.posts[1].data instanceof FormData, true);
  assert.equal((chamadas.posts[1].data as FormData).get("title"), "PMOC - Hospital Teste");
  assert.equal((chamadas.posts[1].data as FormData).get("description"), "Relatorio PMOC gerado pela AIRMOVEBR.");
  assert.equal((chamadas.posts[1].data as FormData).get("file") instanceof Blob, true);
  assert.equal((chamadas.posts[1].config as { maxBodyLength?: unknown }).maxBodyLength, Infinity);
  assert.equal(chamadas.posts[2].url, "/documents/doc-assinafy-1/assignments");
  assert.equal(JSON.stringify(resposta).includes("assinafy-secret"), false);
  assert.equal(resposta.assinafy_document_id, "doc-assinafy-1");
  assert.equal(resposta.status, PmocRelatorioStatus.aguardando_assinatura_engenheiro);
});

test("enviarPmocParaAssinatura reutiliza signatario Assinafy quando email ja existe", async () => {
  const { service, chamadas } = criarServico({
    signers: [{ id: "signer-existente", email: "paulo@example.com", full_name: "Paulo Silva" }]
  });

  const resposta = await service.enviarPmocParaAssinatura("cliente-1", usuario);

  assert.equal(chamadas.gets[1].url, "/accounts/account-1/signers");
  assert.equal(chamadas.posts.some((post) => post.url === "/accounts/account-1/signers"), false);
  assert.equal(chamadas.posts[1].url, "/documents/doc-assinafy-1/assignments");
  assert.match(JSON.stringify(chamadas.posts[1].data), /signer-existente/);
  assert.equal(resposta.assinafy_assignment_id, "assignment-1");
});

test("enviarPmocParaAssinatura rejeita signatario com mesmo email e nome divergente", async () => {
  const { service, chamadas } = criarServico({
    signers: [{ id: "signer-existente", email: "paulo@example.com", full_name: "Andre Mendes" }]
  });

  await assert.rejects(
    service.enviarPmocParaAssinatura("cliente-1", usuario),
    /Signatario Assinafy.*outro nome/
  );

  assert.equal(chamadas.posts.some((post) => post.url.includes("/assignments")), false);
});

test("enviarPmocParaAssinatura cancela pendencias anteriores antes de gravar o reenvio", async () => {
  const { service, chamadas } = criarServico();

  await service.enviarPmocParaAssinatura("cliente-1", usuario);

  assert.deepEqual(chamadas.updateManyWhere, {
    empresaId: "empresa-1",
    clienteId: "cliente-1",
    status: PmocRelatorioStatus.aguardando_assinatura_engenheiro
  });
  assert.equal((chamadas.updateManyData as { status?: unknown }).status, PmocRelatorioStatus.cancelado);
  assert.equal((chamadas.updateManyData as { assinafyStatus?: unknown }).assinafyStatus, "superseded");
  assert.ok((chamadas.updateManyData as { historicoFinalizadoEm?: unknown }).historicoFinalizadoEm instanceof Date);
  assert.deepEqual(chamadas.transactionEvents, ["updateMany", "create"]);
});

test("processarWebhook salva status e baixa PDF assinado quando assinatura conclui", async () => {
  const { service, chamadas } = criarServico();

  const resposta = await service.processarWebhook({
    document_id: "doc-assinafy-1",
    assignment_id: "assignment-1",
    status: "completed"
  });

  assert.equal(chamadas.gets[0].url, "/documents/doc-assinafy-1/download/certificated");
  assert.deepEqual(chamadas.updateWhere, { id: "relatorio-1" });
  assert.match(JSON.stringify(chamadas.updateData), /completed/);
  assert.match(JSON.stringify(chamadas.updateData), /assinado/);
  assert.equal(resposta.status, PmocRelatorioStatus.assinado);
});

test("processarWebhook agenda envio do PMOC assinado para o cliente quando Assinafy certifica documento", async () => {
  const { service, chamadas } = criarServico();

  const resposta = await service.processarWebhook({
    document_id: "doc-assinafy-1",
    assignment_id: "assignment-1",
    status: "certificated"
  });

  assert.equal(chamadas.gets[0].url, "/documents/doc-assinafy-1/download/certificated");
  assert.equal((chamadas.updateData as { status?: unknown }).status, PmocRelatorioStatus.assinado);
  assert.equal((chamadas.updateData as { emailCliente?: unknown }).emailCliente, "cliente@example.com");
  assert.ok((chamadas.updateData as { emailAgendadoEm?: unknown }).emailAgendadoEm instanceof Date);

  const automacao = chamadas.automacaoData as { empresaId?: unknown; tipo?: unknown; payload?: Record<string, unknown> };
  assert.equal(automacao.empresaId, "empresa-1");
  assert.equal(automacao.tipo, AutomacaoTipo.enviar_email);
  assert.equal(automacao.payload?.tipo, "pmoc_relatorio_assinado");
  assert.equal(automacao.payload?.relatorio_id, "relatorio-1");
  assert.equal(automacao.payload?.cliente_id, "cliente-1");
  assert.equal(automacao.payload?.cliente_nome, "Hospital Teste");
  assert.equal(automacao.payload?.cliente_email, "cliente@example.com");
  assert.equal(automacao.payload?.engenheiro_nome, "Paulo Silva");
  assert.equal(automacao.payload?.engenheiro_cpf, "12345678901");
  assert.equal(automacao.payload?.engenheiro_crea, "CREA-PR 12345");
  assert.equal(automacao.payload?.pdf_base64, Buffer.from("%PDF-assinado").toString("base64"));
  assert.equal(automacao.payload?.pdf_filename, "pmoc-relatorio-1-assinado-assinafy.pdf");
  assert.equal(typeof automacao.payload?.pdf_hash, "string");
  assert.equal(resposta.status, PmocRelatorioStatus.assinado);
});

test("processarWebhook cria envio final mesmo quando relatorio ja estava marcado como email agendado", async () => {
  const { service, chamadas } = criarServico({
    emailAgendadoEm: new Date("2026-06-12T11:00:00.000Z")
  });

  await service.processarWebhook({
    document_id: "doc-assinafy-1",
    assignment_id: "assignment-1",
    status: "certificated"
  });

  assert.equal((chamadas.automacaoData as { tipo?: unknown }).tipo, AutomacaoTipo.enviar_email);
  assert.equal(
    ((chamadas.automacaoData as { payload?: Record<string, unknown> }).payload ?? {}).tipo,
    "pmoc_relatorio_assinado"
  );
});

test("processarWebhook nao duplica envio final quando automacao ja existe para o relatorio", async () => {
  const { service, chamadas } = criarServico({
    automacaoFinalExistente: true
  });

  await service.processarWebhook({
    document_id: "doc-assinafy-1",
    assignment_id: "assignment-1",
    status: "certificated"
  });

  assert.equal(chamadas.automacaoData, undefined);
});

test("processarWebhook nao arquiva PDF assinado no Drive quando assinatura Assinafy conclui", async () => {
  const chamadas = {
    driveChamado: false
  };
  const { service, chamadas: chamadasServico } = criarServico({
    driveStorage: {
      salvarPdfAssinadoPmoc: async () => {
        chamadas.driveChamado = true;
        return "https://drive.google.com/file/d/pdf-drive-1/view";
      }
    }
  });

  const resposta = await service.processarWebhook({
    document_id: "doc-assinafy-1",
    assignment_id: "assignment-1",
    status: "certificated"
  });

  assert.equal(chamadas.driveChamado, false);
  assert.equal("pdfDriveUrl" in (chamadasServico.updateData as Record<string, unknown>), false);
  assert.equal("pdf_drive_url" in resposta, false);
});

test("processarWebhook cancela PMOC e agenda alerta interno quando Assinafy recusa assinatura", async () => {
  const { service, chamadas } = criarServico();

  const resposta = await service.processarWebhook({
    document_id: "doc-assinafy-1",
    assignment_id: "assignment-1",
    status: "rejected_by_signer"
  });

  assert.deepEqual(chamadas.updateWhere, { id: "relatorio-1" });
  assert.equal((chamadas.updateData as { status?: unknown }).status, PmocRelatorioStatus.cancelado);
  assert.equal((chamadas.updateData as { assinafyStatus?: unknown }).assinafyStatus, "rejected_by_signer");
  assert.ok((chamadas.updateData as { historicoFinalizadoEm?: unknown }).historicoFinalizadoEm instanceof Date);

  const automacao = chamadas.automacaoData as { empresaId?: unknown; tipo?: unknown; payload?: Record<string, unknown> };
  assert.equal(automacao.empresaId, "empresa-1");
  assert.equal(automacao.tipo, AutomacaoTipo.enviar_email);
  assert.equal(automacao.payload?.tipo, "pmoc_assinatura_negada");
  assert.equal(automacao.payload?.relatorio_id, "relatorio-1");
  assert.equal(automacao.payload?.cliente_nome, "Hospital Teste");
  assert.equal(automacao.payload?.engenheiro_nome, "Paulo Silva");
  assert.equal(automacao.payload?.assinafy_status, "rejected_by_signer");
  assert.equal(resposta.status, PmocRelatorioStatus.cancelado);
});

test("processarWebhook nao duplica alerta interno quando PMOC ja esta cancelado", async () => {
  const { service, chamadas } = criarServico({
    relatorioStatus: PmocRelatorioStatus.cancelado
  });

  await service.processarWebhook({
    document_id: "doc-assinafy-1",
    assignment_id: "assignment-1",
    status: "refused"
  });

  assert.equal(chamadas.automacaoData, undefined);
});

test("processarWebhook ignora conclusao de solicitacao substituida", async () => {
  const { service, chamadas } = criarServico({
    relatorioStatus: PmocRelatorioStatus.cancelado
  });

  const resposta = await service.processarWebhook({
    document_id: "doc-assinafy-1",
    assignment_id: "assignment-1",
    status: "completed"
  });

  assert.equal(chamadas.gets.length, 0);
  assert.equal(chamadas.updateData, undefined);
  assert.equal(chamadas.automacaoData, undefined);
  assert.equal(resposta.status, PmocRelatorioStatus.cancelado);
});

test("sincronizarPendentesAssinafy fecha PMOC certificado mesmo sem webhook cadastrado", async () => {
  const { service, chamadas } = criarServico({
    pendentesAssinafy: [{ assinafyDocumentId: "doc-assinafy-1", assinafyAssignmentId: "assignment-1" }],
    documentStatus: "certificated"
  });

  const resultado = await service.sincronizarPendentesAssinafy();

  assert.equal(chamadas.gets[0].url, "/documents/doc-assinafy-1");
  assert.equal(chamadas.gets[1].url, "/documents/doc-assinafy-1/download/certificated");
  assert.equal((chamadas.updateData as { status?: unknown }).status, PmocRelatorioStatus.assinado);
  assert.equal((chamadas.automacaoData as { payload?: Record<string, unknown> }).payload?.tipo, "pmoc_relatorio_assinado");
  assert.deepEqual(resultado, { verificados: 1, sincronizados: 1, falhas: 0 });
});

test("sincronizarPendentesAssinafy cancela PMOC quando assignment vem recusado", async () => {
  const { service, chamadas } = criarServico({
    pendentesAssinafy: [{ assinafyDocumentId: "doc-assinafy-1", assinafyAssignmentId: "assignment-1" }],
    documentStatus: "pending",
    assignmentStatus: "rejected_by_signer"
  });

  const resultado = await service.sincronizarPendentesAssinafy();

  assert.equal(chamadas.gets[0].url, "/documents/doc-assinafy-1");
  assert.equal((chamadas.updateData as { status?: unknown }).status, PmocRelatorioStatus.cancelado);
  assert.equal((chamadas.automacaoData as { payload?: Record<string, unknown> }).payload?.tipo, "pmoc_assinatura_negada");
  assert.deepEqual(resultado, { verificados: 1, sincronizados: 1, falhas: 0 });
});
