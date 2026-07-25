import * as assert from "node:assert/strict";
import { test } from "node:test";
import { ComercialService } from "./comercial.service";

function criarService(overrides: { email?: { enviar: (message: unknown) => Promise<void> }; update?: (args: unknown) => Promise<unknown> } = {}) {
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
    total: 1700,
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
  const service = new ComercialService(
    prisma as never,
    { enviar: async () => ({ messageId: "message" }), enviarDocumento: async () => ({ messageId: "document" }) } as never,
    email as never,
    { gerar: () => Buffer.from("pdf") } as never,
    { enviarOrcamento: async () => ({ documentId: "doc", assignmentId: "assignment", status: "pending", evento: {} }) } as never
  );
  return { service, atualizacoes, update: overrides.update };
}

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
