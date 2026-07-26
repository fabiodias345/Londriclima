import { strict as assert } from "node:assert";
import { test } from "node:test";
import { WhatsAppService } from "./whatsapp.service";
import { BoltRules, estaNoHorarioComercial } from "./bolt/bolt.rules";

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
  assert.match(chamadas[1].texto, /Move/);
  assert.match(chamadas[1].texto, /como posso te chamar/i);
});

test("Bolt inicia conversa natural sem menus", () => {
  const bolt = new BoltRules();
  const primeiro = bolt.processar({ texto: "xyz" }, null);
  const segundo = bolt.processar({ texto: "abc" }, primeiro.dados);
  assert.equal(primeiro.assumir, false);
  assert.equal(segundo.assumir, false);
  assert.equal(primeiro.opcoes, undefined);
  assert.equal(segundo.opcoes, undefined);
  assert.match(primeiro.texto, /Move/);
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
  const service = new WhatsAppService(prisma as never, { get: () => undefined } as never, sender as never, new BoltRules());

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
test("Bolt remove menus e confirma o endereço pelo CEP", () => {
  const bolt = new BoltRules();
  const menu = bolt.processar({ texto: "Oi" }, null);
  assert.equal(menu.opcoes, undefined);
  assert.match(menu.texto, /Move/);
  const iniciado = bolt.processar({ texto: "menu_manutencao" }, null);
  const comNome = bolt.processar({ texto: "Maria Silva" }, iniciado.dados);
  assert.equal(comNome.dados.nome, "Maria Silva");
  assert.equal(comNome.dados.etapa_atual, "aguardando_descricao");
  const comEndereco = { ...comNome.dados, detalhes: "Manutenção do ar", cep: "86000000", cidade: "Londrina", uf: "PR", cidade_bairro: "Londrina", etapa_atual: "aguardando_confirmacao_endereco" as const };
  const confirmado = bolt.processar({ texto: "cep_confirmar" }, comEndereco);
  assert.equal(confirmado.opcoes, undefined);
  assert.equal(confirmado.dados.etapa_atual, "aguardando_numero");
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

test("Bolt coleta número e e-mail um por vez", () => {
  const bolt = new BoltRules();
  const inicio = bolt.processar({ texto: "Oi" }, null);
  const nome = bolt.processar({ texto: "Fábio Dias" }, inicio.dados);
  const problema = bolt.processar({ texto: "Meu ar parou de gelar" }, nome.dados);
  assert.match(problema.texto, /Puxa, que pena/i);
  const confirmado = bolt.processar({ texto: "sim" }, { ...problema.dados, cep: "86000000", cidade: "Londrina", uf: "PR", etapa_atual: "aguardando_confirmacao_endereco" });
  const comNumero = bolt.processar({ texto: "42" }, confirmado.dados);
  assert.match(comNumero.texto, /seu e-mail/i);
  assert.equal(comNumero.dados.numero, "42");
  const invalido = bolt.processar({ texto: "sem email" }, comNumero.dados);
  assert.match(invalido.texto, /e-mail válido/i);
  assert.equal(invalido.dados.etapa_atual, "aguardando_email");
  const final = bolt.processar({ texto: "F@bio.com" }, comNumero.dados);
  assert.equal(final.dados.email, "f@bio.com");
  assert.equal(final.dados.status, "HUMAN_QUEUE");
  assert.equal(final.assumir, true);
  assert.match(final.texto, /especialista|horário/i);
  assert.equal(final.opcoes, undefined);
});

test("horário comercial respeita dias úteis e limites de 08h a 18h", () => {
  assert.equal(estaNoHorarioComercial(new Date("2026-07-27T11:00:00Z")), true);
  assert.equal(estaNoHorarioComercial(new Date("2026-07-27T10:59:00Z")), false);
  assert.equal(estaNoHorarioComercial(new Date("2026-07-27T21:00:00Z")), false);
  assert.equal(estaNoHorarioComercial(new Date("2026-07-25T15:00:00Z")), false);
});

test("Bolt não usa pena para instalação e preserva campos do estado", () => {
  const bolt = new BoltRules();
  const inicio = bolt.processar({ texto: "Oi" }, null);
  assert.equal(inicio.dados.numero, null);
  assert.equal(inicio.dados.email, null);
  const nome = bolt.processar({ texto: "Maria Silva" }, inicio.dados);
  const instalacao = bolt.processar({ texto: "Quero instalar um ar novo" }, nome.dados);
  assert.doesNotMatch(instalacao.texto, /pena/i);
  assert.equal(instalacao.dados.servico, "instalacao");
  const preservado = bolt.processar({ texto: "abc" }, { numero: "42", email: "a@b.com" });
  assert.equal(preservado.dados.numero, "42");
  assert.equal(preservado.dados.email, "a@b.com");
});

test("criar cliente pelo WhatsApp salva endereço e e-mail sem exigir CPF", async () => {
  const atualizacoes: Array<Record<string, unknown>> = [];
  const conversa = { id: "conversa-1", empresaId: "empresa-1", telefone: "5543999999999", nomeContato: "Fábio", clienteId: null, ordemServicoId: null, dados: { nome: "Fábio", cep: "86000000", logradouro: "Rua Teste", bairro: "Centro", cidade: "Londrina", uf: "PR", numero: "42", email: "fabio@example.com", servico: "instalacao", cidade_bairro: "Londrina", detalhes: "Instalar equipamento", campos_extra: {} }, mensagens: [], cliente: null, ordemServico: null };
  const prisma = {
    whatsAppConversa: {
      findFirstOrThrow: async () => conversa,
      update: async (input: Record<string, unknown>) => { atualizacoes.push(input); }
    }
  };
  const chamadas: Array<Record<string, unknown>> = [];
  const admin = {
    criarCliente: async (dto: Record<string, unknown>) => { chamadas.push(dto); return { id: "cliente-1" }; }
  };
  const service = new WhatsAppService(prisma as never, {} as never, {} as never, new BoltRules(), admin as never);

  await service.criarClienteDaConversa("conversa-1", "empresa-1", { nome: "Fábio" }, { id: "usuario-1", empresa_id: "empresa-1" } as never);

  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].email, "fabio@example.com");
  assert.equal(chamadas[0].numero, "42");
  assert.equal(chamadas[0].logradouro, "Rua Teste");
  assert.equal(chamadas[0].documento, undefined);
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
test("confirmar agendamento envia mensagem final ao cliente", async () => {
  const mensagens: Array<{ texto: string; direcao: string }> = [];
  const conversa = { id: "conversa-1", empresaId: "empresa-1", telefone: "5543999999999", nomeContato: "Fábio", clienteId: "cliente-1", ordemServicoId: null, dados: { servico: "instalacao", cidade_bairro: "Londrina", detalhes: "Instalar equipamento", campos_extra: {} }, mensagens: [], cliente: { id: "cliente-1", nome: "Fábio" }, ordemServico: null };
  const atualizacoes: Array<{ data: Record<string, unknown> }> = [];
  const prisma = {
    whatsAppConversa: { findFirstOrThrow: async () => conversa, update: async (input: { data: Record<string, unknown> }) => { atualizacoes.push(input); } },
    ordemServico: { findFirst: async () => null },
    whatsAppMensagem: { create: async ({ data }: { data: { texto: string; direcao: string } }) => { mensagens.push(data); } },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations)
  };
  const enviados: string[] = [];
  const sender = { enviar: async ({ text }: { text: string }) => { enviados.push(text); return { messageId: "wamid.agendamento", recipient: "5543999999999" }; } };
  const admin = { criarOrdemAgenda: async () => ({ os_id: "os-1" }) };
  const service = new WhatsAppService(prisma as never, { get: () => undefined } as never, sender as never, new BoltRules(), admin as never);

  const resultado = await service.criarOrdemDaConversa("conversa-1", "empresa-1", { titulo: "Instalação", origem: "servico_gratuito", equipe_id: "equipe-1", agendada_para: "2026-07-22T10:00:00" }, { id: "usuario-1", empresa_id: "empresa-1" } as never);

  assert.equal(resultado.confirmacaoAgendamentoEnviada, true);
  assert.match(enviados[0], /quarta-feira, 22 de julho/i);
  assert.match(enviados[0], /adulto responsável/i);
  assert.equal(mensagens[0].direcao, "saida");
  assert.equal(atualizacoes.at(-1)?.data.status, "encerrada");
  assert.equal(atualizacoes.at(-1)?.data.encerramentoMotivo, "agendamento_confirmado");
});

test("nova mensagem reabre conversa encerrada para o Bolt responder", async () => {
  const chamadas: string[] = [];
  const prisma = {
    empresa: { findFirst: async () => ({ id: "empresa-1" }) },
    whatsAppConversa: {
      upsert: async () => ({ id: "conversa-1", telefone: "5543999999999", status: "encerrada", dados: null }),
      update: async () => ({ id: "conversa-1", telefone: "5543999999999", status: "bot", dados: null }),
      updateMany: async () => ({ count: 1 })
    },
    whatsAppMensagem: {
      findUnique: async () => null,
      create: async ({ data }: { data: { direcao: string } }) => { chamadas.push(data.direcao); }
    },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations)
  };
  const sender = { enviar: async () => ({ messageId: "wamid.out", recipient: "5543999999999" }) };
  const service = new WhatsAppService(prisma as never, { get: () => undefined } as never, sender as never, new BoltRules());

  await service.receberWebhook({ entry: [{ changes: [{ value: { messages: [{ id: "wamid.in", from: "5543999999999", type: "text", text: { body: "Oi" } }] } }] }] });

  assert.deepEqual(chamadas, ["entrada", "saida"]);
});
