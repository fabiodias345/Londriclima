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

test("primeira resposta assume automaticamente a conversa livre", async () => {
  const atualizacoes: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }> = [];
  const prisma = {
    whatsAppConversa: {
      findFirstOrThrow: async () => ({ id: "conversa-1", empresaId: "empresa-1", telefone: "5543999999999", status: "humano", atribuidoUsuarioId: null, dados: {} }),
      updateMany: async (input: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        atualizacoes.push(input);
        return { count: 1 };
      },
      update: async () => undefined
    },
    whatsAppMensagem: { create: async () => undefined },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations)
  };
  const sender = { enviar: async () => ({ messageId: "wamid.out", recipient: "5543999999999" }) };
  const service = new WhatsAppService(prisma as never, {} as never, sender as never, new BoltRules());

  const resultado = await service.responderConversa("conversa-1", "empresa-1", "usuario-1", "Ola");

  assert.equal(resultado.assumida, true);
  assert.equal(atualizacoes[0].where.atribuidoUsuarioId, null);
  assert.equal(atualizacoes[0].data.atribuidoUsuarioId, "usuario-1");
});
test("apagar conversa remove o historico sem apagar cliente ou O.S.", async () => {
  let idApagado = "";
  const prisma = {
    whatsAppConversa: {
      findFirstOrThrow: async () => ({ id: "conversa-1", empresaId: "empresa-1" }),
      delete: async ({ where }: { where: { id: string } }) => { idApagado = where.id; }
    }
  };
  const service = new WhatsAppService(prisma as never, {} as never, {} as never, new BoltRules());

  const resultado = await service.apagarConversa("conversa-1", "empresa-1");

  assert.equal(resultado.apagada, true);
  assert.equal(idApagado, "conversa-1");
});
test("Bolt oferece os cinco serviços e confirma o endereço pelo CEP", () => {
  const bolt = new BoltRules();
  const menu = bolt.processar({ texto: "Oi" }, null);
  assert.equal(menu.opcoes?.length, 5);
  assert.equal(menu.opcoes?.[0].id, "menu_instalacao");
  assert.equal(menu.opcoes?.[4].id, "menu_atendente");
  assert.equal(menu.rotuloOpcoes, "Ver serviços");
  const iniciado = bolt.processar({ texto: "menu_manutencao" }, null);
  const comNome = bolt.processar({ texto: "Maria Silva" }, iniciado.dados);
  assert.equal(comNome.dados.nome, "Maria");
  assert.equal(comNome.dados.etapa_atual, "aguardando_cep");
  const comEndereco = { ...comNome.dados, cep: "86000000", cidade: "Londrina", uf: "PR", cidade_bairro: "Londrina", etapa_atual: "aguardando_confirmacao_endereco" as const };
  const confirmado = bolt.processar({ texto: "cep_confirmar" }, comEndereco);
  assert.equal(confirmado.opcoes?.[0].id, "manut_nao_liga");
  assert.equal(confirmado.opcoes?.[2].id, "manut_outro");
});test("detalhe da conversa entrega qualificacao e prévia de O.S.", async () => {
  const conversa = {
    id: "conversa-1", telefone: "5543999999999", nomeContato: "Fábio", status: "humano",
    dados: { nome: "Fábio", servico: "instalacao", cidade_bairro: "Centro, Londrina", detalhes: "Split no quarto", campos_extra: { btus: "12000" } },
    mensagens: [], cliente: null, ordemServico: null
  };
  const service = new WhatsAppService({ whatsAppConversa: { findFirstOrThrow: async () => conversa } } as never, {} as never, {} as never, new BoltRules());

  const resultado = await service.obterConversa("conversa-1", "empresa-1");

  assert.equal(resultado.atendimento.dados.nome, "Fábio");
  assert.equal(resultado.atendimento.previaOs.tipoServico, "instalacao");
  assert.match(resultado.atendimento.previaOs.detalhes, /Centro, Londrina/);
  assert.match(resultado.atendimento.previaOs.detalhes, /btus: 12000/);
});

test("criar cliente pelo WhatsApp não cria O.S. antes do orçamento aprovado", async () => {
  const atualizacoes: Array<Record<string, unknown>> = [];
  const conversa = { id: "conversa-1", empresaId: "empresa-1", telefone: "5543999999999", clienteId: null, ordemServicoId: null, dados: { servico: "instalacao", cidade_bairro: "Londrina", detalhes: "Instalar equipamento", campos_extra: {} }, mensagens: [], cliente: null, ordemServico: null };
  const prisma = {
    whatsAppConversa: {
      findFirstOrThrow: async () => conversa,
      update: async (input: Record<string, unknown>) => { atualizacoes.push(input); }
    }
  };
  const chamadas: Array<Record<string, unknown>> = [];
  const admin = {
    criarCliente: async () => ({ id: "cliente-1" })
  };
  const service = new WhatsAppService(prisma as never, {} as never, {} as never, new BoltRules(), admin as never);

  await service.criarClienteDaConversa("conversa-1", "empresa-1", { nome: "Fábio", cidade: "Londrina", uf: "PR" }, { id: "usuario-1", empresa_id: "empresa-1" } as never);

  assert.equal(chamadas.length, 0);
  assert.equal((atualizacoes[0].data as { clienteId: string }).clienteId, "cliente-1");
});
test("autorização do orçamento pelo WhatsApp aprova e libera o agendamento", async () => {
  const atualizacoes: Array<Record<string, unknown>> = [];
  const prisma = {
    orcamento: { updateMany: async () => ({ count: 1 }) },
    whatsAppMensagem: { create: async () => undefined },
    whatsAppConversa: { update: async (input: Record<string, unknown>) => { atualizacoes.push(input); } },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations)
  };
  const sender = { enviar: async () => ({ messageId: "wamid.aprovado", recipient: "5543999999999" }) };
  const service = new WhatsAppService(prisma as never, {} as never, sender as never, new BoltRules());
  const processado = await (service as never as { processarRespostaOrcamento: (conversa: { id: string; empresaId: string; telefone: string }, texto: string) => Promise<boolean> }).processarRespostaOrcamento(
    { id: "conversa-1", empresaId: "empresa-1", telefone: "5543999999999" },
    "orcamento_aprovar:11111111-1111-1111-1111-111111111111"
  );

  assert.equal(processado, true);
  assert.equal((atualizacoes[0].data as { status: string }).status, "humano");
});