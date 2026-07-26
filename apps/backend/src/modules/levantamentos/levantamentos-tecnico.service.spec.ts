import * as assert from "node:assert/strict";
import { test } from "node:test";
import { LevantamentosTecnicoService } from "./levantamentos-tecnico.service";

const tecnico = { id: "tecnico-1", empresa_id: "empresa-1", email: "t@teste", role: "tecnico" };
const base = { id: "levantamento-1", empresaId: "empresa-1", clienteId: "cliente-1", tecnicoId: "tecnico-1", equipeId: null, status: "em_levantamento", problema: "Nao gela", laudoFinalizadoEm: null, fotos: [] };

function criar(overrides: Record<string, unknown> = {}) {
  const item = { ...base, ...overrides };
  const chamadas: unknown[] = [];
  const prisma = { levantamentoTecnico: { findFirst: async (args: { where?: { empresaId?: string; OR?: Array<{ tecnicoId?: string }> } }) => args.where?.empresaId && args.where.empresaId !== item.empresaId || args.where?.OR && !args.where.OR.some((clause) => clause.tecnicoId === item.tecnicoId) ? null : item, findMany: async () => [item], update: async (args: unknown) => { chamadas.push(args); return item; } }, levantamentoFoto: { findFirst: async () => null } };
  return { service: new LevantamentosTecnicoService(prisma as never), chamadas };
}

test("rejeita levantamento de outra empresa ou tecnico", async () => {
  const { service } = criar({ empresaId: "empresa-2", tecnicoId: "tecnico-2" });
  await assert.rejects(() => service.salvarRascunho("levantamento-1", { diagnostico: "Teste" }, tecnico), /levantamento nao encontrado/i);
});

test("salva rascunho do tecnico atribuido", async () => {
  const { service, chamadas } = criar();
  await service.salvarRascunho("levantamento-1", { diagnostico: "Serpentina suja" }, tecnico);
  assert.equal(chamadas.length, 1);
});

test("exige diagnostico para finalizar", async () => {
  const { service } = criar();
  await assert.rejects(() => service.finalizar("levantamento-1", { decisao: "precisa_orcamento" }, tecnico), /diagnostico obrigatorio/i);
});

test("finaliza para orcamento sem aceitar preco no laudo", async () => {
  const { service, chamadas } = criar();
  await service.finalizar("levantamento-1", { diagnostico: "Falha no compressor", decisao: "precisa_orcamento" }, tecnico);
  const args = chamadas[0] as { data: { status: string; laudoFinalizadoPorId: string } };
  assert.equal(args.data.status, "diagnostico_concluido");
  assert.equal(args.data.laudoFinalizadoPorId, tecnico.id);
});

test("bloqueia rascunho depois da finalizacao", async () => {
  const { service } = criar({ laudoFinalizadoEm: new Date() });
  await assert.rejects(() => service.salvarRascunho("levantamento-1", { diagnostico: "Novo" }, tecnico), /imutavel/i);
});

test("bloqueia arquivo que nao e imagem", async () => {
  const { service } = criar();
  await assert.rejects(() => service.adicionarFoto("levantamento-1", { originalname: "arquivo.pdf", mimetype: "application/pdf", size: 20, buffer: Buffer.from("pdf") }, tecnico), /formato de arquivo/i);
});

test("exige foto de limpeza ao recomendar limpeza", async () => {
  const { service } = criar();
  await assert.rejects(() => service.finalizar("levantamento-1", { diagnostico: "Serpentina suja", limpeza_recomendada: "recomendada", decisao: "precisa_orcamento" }, tecnico), /foto obrigatoria para limpeza recomendada/i);
});
