import { strict as assert } from "node:assert";
import { test } from "node:test";
import { WhatsAppService } from "./whatsapp.service";
import { BoltRules } from "./bolt/bolt.rules";

test("webhook WhatsApp salva mensagem e responde a saudacao do bot", async () => {
  const chamadas: Array<{ direcao: string; texto: string }> = [];
  const prisma = {
    empresa: { findFirst: async () => ({ id: "empresa-1" }) },
    whatsAppConversa: {
      upsert: async () => ({ id: "conversa-1", telefone: "5543999999999", status: "bot", dados: null }),
      update: async () => undefined,
      $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations)
    },
    whatsAppMensagem: {
      findUnique: async () => null,
      create: async ({ data }: { data: { direcao: string; texto: string } }) => {
        chamadas.push(data);
        return data;
      }
    }
  };
  const sender = {
    enviar: async ({ text }: { to: string; text: string }) => ({ messageId: `wamid.${text.length}`, recipient: "5543999999999" })
  };
  const config = { get: (key: string) => key === "WHATSAPP_WEBHOOK_VERIFY_TOKEN" ? "segredo" : undefined };
  const service = new WhatsAppService(prisma as never, config as never, sender as never, new BoltRules());

  await service.receberWebhook({
    entry: [{ changes: [{ value: { contacts: [{ profile: { name: "Cliente" } }], messages: [{ id: "wamid.in", from: "5543999999999", type: "text", text: { body: "Oi" } }] } }] }]
  });

  assert.equal(chamadas[0].direcao, "entrada");
  assert.equal(chamadas[1].direcao, "saida");
  assert.match(chamadas[1].texto, /Seja bem-vindo/);
});

test("Bolt transfere apos dois fallbacks", () => {
  const bolt = new BoltRules();
  const primeiro = bolt.processar({ texto: "xyz" }, null);
  const segundo = bolt.processar({ texto: "abc" }, primeiro.dados);
  assert.equal(primeiro.assumir, false);
  assert.equal(segundo.assumir, true);
  assert.equal(segundo.dados.status, "HUMAN_QUEUE");
});

test("webhook aceita somente o token configurado", () => {
  const service = new WhatsAppService({} as never, { get: () => "segredo" } as never, {} as never, new BoltRules());
  assert.equal(service.verificarWebhookToken("segredo"), true);
  assert.equal(service.verificarWebhookToken("outro"), false);
});
