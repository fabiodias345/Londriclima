import * as assert from "node:assert/strict";
import { test } from "node:test";
import { LevantamentosNotificacaoService } from "./levantamentos-notificacao.service";

function config(valores: Record<string, string | undefined> = {}) {
  return { get: <T = string>(chave: string, padrao?: T) => (valores[chave] ?? padrao) as T };
}

function levantamento(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "levantamento-1", status: "agendado", problema: "Equipamento sem resfriar", agendadaPara: new Date("2026-07-27T13:00:00.000Z"), tecnicoAvisadoEm: null, lembreteTecnicoEm: null,
    tecnico: { nome: "Ana Tecnica", telefone: "(43) 99999-9999" },
    cliente: { nome: "Cliente Teste", enderecos: [{ logradouro: "Rua A", numero: "10", bairro: "Centro", cidade: "Londrina", uf: "PR" }] },
    ...overrides
  };
}

function criarServico(items = [levantamento()]) {
  const chamadas: { templates: unknown[]; updates: unknown[]; reservas: unknown[] } = { templates: [], updates: [], reservas: [] };
  const prisma = { levantamentoTecnico: {
    findFirst: async () => items[0] ?? null,
    findMany: async () => items,
    update: async (args: unknown) => { chamadas.updates.push(args); },
    updateMany: async (args: unknown) => { chamadas.reservas.push(args); return { count: 1 }; }
  } };
  const sender = { enviar: async () => ({ messageId: "nao-usado", recipient: "" }), enviarTemplate: async (to: string, template: unknown) => { chamadas.templates.push({ to, template }); return { messageId: "wamid.1", recipient: to }; } };
  const service = new LevantamentosNotificacaoService(prisma as never, config({ WHATSAPP_TEMPLATE_LEVANTAMENTO_AGENDADO: "levantamento_agendado", WHATSAPP_TEMPLATE_LEVANTAMENTO_ALTERADO: "levantamento_alterado", WHATSAPP_TEMPLATE_LEVANTAMENTO_CANCELADO: "levantamento_cancelado", WHATSAPP_TEMPLATE_LEVANTAMENTO_LEMBRETE: "levantamento_lembrete", WHATSAPP_TEMPLATE_LANGUAGE: "pt_BR" }) as never, sender);
  return { service, chamadas, sender };
}

test("envia confirmacao uma unica vez e persiste sucesso", async () => {
  const item = levantamento();
  const { service, chamadas } = criarServico([item]);
  assert.equal(await service.enviarConfirmacao(item.id, "empresa-1"), true);
  (item as { tecnicoAvisadoEm: Date | null }).tecnicoAvisadoEm = new Date();
  assert.equal(await service.enviarConfirmacao(item.id, "empresa-1"), false);
  assert.equal(chamadas.templates.length, 1);
  assert.deepEqual(chamadas.templates[0], { to: "(43) 99999-9999", template: { name: "levantamento_agendado", language: "pt_BR", parameters: ["Ana Tecnica", "Cliente Teste", "Rua A, 10, Centro, Londrina, PR", "27/07/2026, 10:00", "Equipamento sem resfriar"] } });
  const atualizacao = chamadas.updates[0] as { where: { id: string }; data: { notificacaoErro: null; tecnicoAvisadoEm: Date } };
  assert.equal(atualizacao.where.id, item.id);
  assert.equal(atualizacao.data.notificacaoErro, null);
  assert.ok(atualizacao.data.tecnicoAvisadoEm instanceof Date);
});

test("persiste erro de entrega sem cancelar levantamento", async () => {
  const { service, chamadas, sender } = criarServico();
  sender.enviarTemplate = async () => { throw new Error("Meta indisponivel"); };
  assert.equal(await service.enviarAlteracao("levantamento-1", "empresa-1"), false);
  assert.deepEqual(chamadas.updates[0], { where: { id: "levantamento-1" }, data: { notificacaoErro: "Meta indisponivel" } });
});

test("usa os templates de alteracao e cancelamento", async () => {
  const { service, chamadas } = criarServico([levantamento({ status: "cancelado" })]);
  assert.equal(await service.enviarAlteracao("levantamento-1", "empresa-1"), true);
  assert.equal(await service.enviarCancelamento("levantamento-1", "empresa-1"), true);
  assert.equal((chamadas.templates[0] as { template: { name: string } }).template.name, "levantamento_alterado");
  assert.equal((chamadas.templates[1] as { template: { name: string } }).template.name, "levantamento_cancelado");
});

test("envia lembrete apenas para reserva idempotente dentro da janela", async () => {
  const agora = new Date("2026-07-27T12:00:00.000Z");
  const { service, chamadas } = criarServico([levantamento({ agendadaPara: new Date("2026-07-27T13:00:00.000Z") })]);
  const resultado = await service.enviarLembretesPendentes(agora);
  assert.deepEqual(resultado, { enviados: 1, falhas: 0 });
  assert.equal(chamadas.reservas.length, 1);
  assert.equal(chamadas.templates.length, 1);
  assert.equal((chamadas.templates[0] as { template: { name: string } }).template.name, "levantamento_lembrete");
});
