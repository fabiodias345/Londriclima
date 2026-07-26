import * as assert from "node:assert/strict";
import { test } from "node:test";
import { ComercialService } from "./comercial.service";

function criarService(overrides: {
  total?: number;
  email?: { enviar: (message: unknown) => Promise<void> };
  whatsapp?: { enviar: (message: unknown) => Promise<{ messageId: string }>; enviarDocumento: (telefone: string, documento: unknown) => Promise<{ messageId: string }> };
  pdf?: { gerar: (input: unknown) => Buffer };
} = {}) {
  const atualizacoes: unknown[] = [];
  const orcamento = {
    id: "11111111-1111-4111-8111-111111111111",
    empresaId: "empresa-1",
    conversaId: null,
    titulo: "Manutenção preventiva",
    detalhes: "Atendimento comercial",
    validoAte: new Date("2026-08-01T23:59:59Z"),
    subtotal: 1800,
    desconto: 100,
    total: overrides.total ?? 1700,
    status: "rascunho",
    enviadoEm: null,
    assinafyDocumentId: null,
    empresa: { nome: "AIRMOVEBR", razaoSocial: null, cnpj: null, telefone: null, email: "comercial@airmovebr.com.br", logradouro: null, numero: null, bairro: null, cidade: null, uf: null, cep: null },
    cliente: { nome: "Cliente Teste", telefone: "43999999999", email: "cliente@example.com", enderecos: [] },
    conversa: null,
    itens: []
  };
  const prisma = {
    orcamento: {
      findFirst: async () => orcamento,
      update: async (args: unknown) => { atualizacoes.push(args); return { ...orcamento, status: "aguardando_aprovacao" }; }
    }
  };
  const email = overrides.email || { enviar: async () => undefined };
  const whatsapp = overrides.whatsapp || { enviar: async () => ({ messageId: "message" }), enviarDocumento: async () => ({ messageId: "document" }) };
  const pdf = overrides.pdf || { gerar: () => Buffer.from("pdf") };
  const service = new ComercialService(
    prisma as never,
    whatsapp as never,
    email as never,
    pdf as never,
    { enviarOrcamento: async () => ({ documentId: "doc", assignmentId: "assignment", status: "pending", evento: {} }) } as never
  );
  return { service, atualizacoes };
}

test("orçamento de R$ 2.000,00 permite WhatsApp e e-mail, mas não assinatura", async () => {
  const { service } = criarService({ total: 2000 });
  const resultado = await service.obterOrcamento("11111111-1111-4111-8111-111111111111", "empresa-1");
  assert.equal(resultado.acoes.whatsapp, true);
  assert.equal(resultado.acoes.email, true);
  assert.equal(resultado.acoes.assinafy, false);
});

test("orçamento de R$ 2.000,01 permite somente assinatura por e-mail", async () => {
  const { service } = criarService({ total: 2000.01 });
  const resultado = await service.obterOrcamento("11111111-1111-4111-8111-111111111111", "empresa-1");
  assert.equal(resultado.acoes.whatsapp, false);
  assert.equal(resultado.acoes.email, false);
  assert.equal(resultado.acoes.assinafy, true);
});

test("envio Assinafy retorna o canal e a mensagem operacional", async () => {
  const { service } = criarService({ total: 2000.01 });
  const resultado = await service.enviarAssinafy("11111111-1111-4111-8111-111111111111", "empresa-1");
  assert.equal(resultado.canal, "assinatura_email");
  assert.equal(resultado.mensagem, "O cliente receberá um e-mail para assinar digitalmente.");
});

test("envio de e-mail anexa o PDF e só atualiza depois do sucesso", async () => {
  let mensagem: unknown;
  const { service, atualizacoes } = criarService({ email: { enviar: async (value) => { mensagem = value; } } });
  const resposta = await service.enviarEmail("11111111-1111-4111-8111-111111111111", {}, "empresa-1");
  assert.equal(resposta.status, "aguardando_aprovacao");
  assert.equal(atualizacoes.length, 1);
  assert.equal((mensagem as { attachments: Array<{ contentBase64: string }> }).attachments[0].contentBase64, Buffer.from("pdf").toString("base64"));
});

test("falha de e-mail não atualiza o orçamento", async () => {
  const { service, atualizacoes } = criarService({ email: { enviar: async () => { throw new Error("SMTP indisponível"); } } });
  await assert.rejects(() => service.enviarEmail("11111111-1111-4111-8111-111111111111", {}, "empresa-1"), /SMTP indisponível/);
  assert.equal(atualizacoes.length, 0);
});

test("orçamento acima de R$ 2.000,00 bloqueia WhatsApp antes de gerar PDF, enviar ou atualizar", async () => {
  let documentos = 0;
  let mensagens = 0;
  let pdfs = 0;
  const { service, atualizacoes } = criarService({
    total: 2000.01,
    whatsapp: {
      enviar: async () => { mensagens += 1; return { messageId: "message" }; },
      enviarDocumento: async () => { documentos += 1; return { messageId: "document" }; }
    },
    pdf: { gerar: () => { pdfs += 1; return Buffer.from("pdf"); } }
  });

  await assert.rejects(() => service.enviarWhatsApp("11111111-1111-4111-8111-111111111111", "empresa-1"), /acima de R\$ 2.000,00/);
  assert.equal(pdfs, 0);
  assert.equal(documentos, 0);
  assert.equal(mensagens, 0);
  assert.equal(atualizacoes.length, 0);
});

test("orçamento acima de R$ 2.000,00 bloqueia e-mail antes de gerar PDF, enviar ou atualizar", async () => {
  let emails = 0;
  let pdfs = 0;
  const { service, atualizacoes } = criarService({
    total: 2000.01,
    email: { enviar: async () => { emails += 1; } },
    pdf: { gerar: () => { pdfs += 1; return Buffer.from("pdf"); } }
  });

  await assert.rejects(() => service.enviarEmail("11111111-1111-4111-8111-111111111111", {}, "empresa-1"), /acima de R\$ 2.000,00/);
  assert.equal(pdfs, 0);
  assert.equal(emails, 0);
  assert.equal(atualizacoes.length, 0);
});
