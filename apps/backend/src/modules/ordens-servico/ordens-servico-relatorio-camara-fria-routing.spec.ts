import {
  AutomacaoTipo,
  CategoriaAtendimento,
  ChecklistTipo,
  EvidenciaTipo,
  OrdemServicoStatus,
  OrdemServicoTipoServico,
  UsuarioRole
} from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { OrdensServicoService } from "./ordens-servico.service";

const assinatura = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(300)
]).toString("base64");

test("camara fria agenda relatorio proprio mesmo para cliente com PMOC", async () => {
  let automacoes: Array<{ tipo: AutomacaoTipo; payload?: Record<string, unknown> }> = [];
  const ordem = {
    id: "os-cf",
    empresaId: "empresa-1",
    status: OrdemServicoStatus.em_atendimento,
    titulo: "Corretiva camara fria",
    tipoServico: OrdemServicoTipoServico.corretiva,
    categoriaServico: CategoriaAtendimento.camara_fria,
    checklistTipo: ChecklistTipo.mensal,
    agendadaPara: new Date("2026-07-02T12:00:00.000Z"),
    equipamento: null,
    cliente: {
      id: "cliente-1",
      nome: "Mercado Central",
      documento: null,
      email: "cliente@example.com",
      pmocAtivo: true,
      enderecos: [],
      equipamentos: []
    },
    evidencias: [{
      tipo: EvidenciaTipo.antes,
      descricao: "Vista geral",
      storageUrl: "/storage/os/os-cf/foto.jpg",
      criadoEm: new Date("2026-07-02T12:30:00.000Z")
    }],
    checklist: { servicoRealizado: "Diagnostico" },
    assinatura: null,
    checklistRespostas: []
  };
  const tx = {
    usuario: {
      findFirst: async () => ({
        nome: "Joao Tecnico",
        fotoPerfilStorageUrl: "/storage/funcionarios/tecnico-1/foto.jpg",
        assinaturaStorageUrl: "/storage/funcionarios/tecnico-1/assinatura.png"
      })
    },
    ordemServico: { findUnique: async () => ordem, update: async () => undefined },
    ordemServicoAssinatura: { create: async () => undefined },
    ordemServicoEvento: { create: async () => undefined },
    automacaoAgendada: {
      createMany: async ({ data }: { data: typeof automacoes }) => {
        automacoes = data;
      }
    }
  };
  const service = new OrdensServicoService({
    $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx)
  } as never);
  (service as unknown as {
    salvarAssinatura: (osId: string, buffer: Buffer, nome?: string) => Promise<string>;
  }).salvarAssinatura = async (_osId, _buffer, nome = "assinatura.png") => `/storage/os/os-cf/${nome}`;

  await service.finalizarOs("os-cf", {
    assinatura_cliente_base64: assinatura,
    nome_responsavel_assinatura: "Maria Responsavel",
    assinatura_tecnico_base64: assinatura,
    nome_tecnico_assinatura: "Joao Tecnico",
    latitude: -23.3,
    longitude: -51.1,
    finalizado_em: "2026-07-02T14:00:00.000Z"
  }, {
    id: "tecnico-1",
    empresa_id: "empresa-1",
    email: "tecnico@example.com",
    role: UsuarioRole.tecnico
  });

  const email = automacoes.find((item) => item.tipo === AutomacaoTipo.enviar_email);
  assert.match(String(email?.payload?.pdf_filename), /^relatorio-camara-fria-/);
  const texto = Buffer.from(String(email?.payload?.pdf_base64), "base64").toString("latin1");
  assert.match(texto, /RELATÓRIO CÂMARA FRIA/);
});
