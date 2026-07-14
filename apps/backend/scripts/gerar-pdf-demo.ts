/**
 * Script de demonstracao: gera um PDF de relatorio tecnico avulso com dados ficticios
 * para inspecionar visualmente o layout (multiplos tecnicos, fotos, assinaturas).
 *
 * Uso: npx ts-node scripts/gerar-pdf-demo.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AdminRelatorioResumoCoreService } from "../src/modules/admin/services/admin-relatorio-resumo-core.service";

// Imagens reais existentes no storage para deixar o exemplo realista.
const FOTO_TECNICO_1 = "/storage/test-antes.jpg";
const FOTO_TECNICO_2 = "/storage/test-depois.jpg";
const ASSINATURA_1 = "/storage/os/55555555-5555-4555-8555-555555555555/assinatura.png";
const ASSINATURA_2 = "/storage/os/9d0bf462-6668-4ec4-b18b-7dcd5bec0dbf/assinatura.png";
const EVIDENCIA_ANTES = "/storage/os/55555555-5555-4555-8555-555555555555/evidencias/antes.jpg";
const EVIDENCIA_DEPOIS = "/storage/os/55555555-5555-4555-8555-555555555555/evidencias/depois.jpg";

const ordemDemo = {
  id: "os-demo-0001",
  titulo: "Manutencao preventiva anual - Split 12.000 BTU",
  tipo_servico: "manutencao",
  checklist_tipo: "anual",
  problema_relatado: "Baixo desempenho de refrigeracao e ruido no compressor durante operacao continua.",
  status: "concluida",
  agendada_para: "2026-06-10T13:00:00.000Z",
  concluida_em: "2026-06-10T15:30:00.000Z",
  valor_cobrado: 450,
  // Tecnico principal (com foto + assinatura)
  tecnico: {
    id: "tec-1",
    nome: "Carlos Eduardo Mendes",
    email: "carlos@airmovebr.com.br",
    foto_perfil_storage_url: FOTO_TECNICO_1,
    assinatura_storage_url: ASSINATURA_1
  },
  // Tecnico executor identificado na assinatura (auxiliar, com foto + assinatura)
  tecnico_executor: {
    nome: "Rafael Souza (Auxiliar)",
    foto_perfil_storage_url: FOTO_TECNICO_2,
    assinatura_storage_url: ASSINATURA_2
  },
  equipe: {
    id: "eq-1",
    nome: "Equipe Alpha",
    membros: [
      { usuario: { nome: "Carlos Eduardo Mendes" } },
      { usuario: { nome: "Rafael Souza" } }
    ]
  },
  eventos: [
    { id: "ev-1", acao: "checkin", latitude: -23.31028, longitude: -51.16278, registrado_em: "2026-06-10T13:05:00.000Z" }
  ],
  evidencias: [
    { id: "ev-a", tipo: "antes", descricao: "Antes da limpeza", storage_url: EVIDENCIA_ANTES, mime_type: "image/jpeg", tamanho_bytes: 1000, criado_em: "2026-06-10T13:10:00.000Z" },
    { id: "ev-d", tipo: "depois", descricao: "Depois da limpeza", storage_url: EVIDENCIA_DEPOIS, mime_type: "image/jpeg", tamanho_bytes: 1000, criado_em: "2026-06-10T15:20:00.000Z" }
  ],
  checklist: {
    id: "chk-1",
    servico_realizado: "Limpeza completa do evaporador e condensador, verificacao de carga de gas, aperto de conexoes eletricas, medicao de corrente e tensao, higienizacao com produto bactericida e teste de operacao.",
    procedimentos: ["Limpeza evaporador", "Limpeza condensador", "Verificacao gas"],
    custo_total_pecas: 0,
    criado_em: "2026-06-10T15:00:00.000Z",
    atualizado_em: "2026-06-10T15:00:00.000Z",
    pecas: []
  },
  checklist_respostas: [
    { equipamento_id: "eqp-1", codigo: "ANU_TEMP_INSUFLAMENTO", tipo: "texto", valor: "12 C", observacao: null },
    { equipamento_id: "eqp-1", codigo: "ANU_PRESSAO_SUCCAO", tipo: "texto", valor: "68 PSI", observacao: null },
    { equipamento_id: "eqp-1", codigo: "ANU_CORRENTE", tipo: "texto", valor: "4.2 A", observacao: "Dentro do padrao" }
  ],
  assinatura: {
    id: "ass-1",
    nome_responsavel: "Maria Aparecida (Sindica)",
    storage_url: ASSINATURA_1,
    latitude: -23.31028,
    longitude: -51.16278,
    assinado_em: "2026-06-10T15:30:00.000Z"
  },
  observacoes: [
    { id: "obs-1", texto: "Cliente orientado sobre limpeza periodica dos filtros a cada 30 dias.", visivel_no_relatorio: true, criado_em: "2026-06-10T15:30:00.000Z" }
  ]
};

const maquinaDemo = {
  id: "eqp-1",
  tipo: "split",
  patrimonio: "PAT-00123",
  codigo_barras: "789456123",
  marca: "Consul",
  modelo: "CBV12EBBNA",
  capacidade_btu: 12000,
  gas_refrigerante: "R-410A",
  numero_serie: "SN-998877",
  local_instalacao: "Sala de reuniao - 2 andar",
  area_climatizada_m2: 24,
  ocupantes_fixo: 6,
  ocupantes_variavel: 4,
  atualizado_em: "2026-06-10T15:30:00.000Z",
  pendencias: [],
  os_concluidas: [ordemDemo]
};

const previaDemo = {
  cliente: {
    id: "cli-1",
    nome: "Condominio Edificio Aurora",
    tipo: "pj",
    documento: "12.345.678/0001-90",
    telefone: "(43) 99999-8888",
    email: "contato@edificioaurora.com.br",
    endereco: {
      id: "end-1",
      logradouro: "Rua das Palmeiras",
      numero: "1500",
      complemento: "Bloco A",
      bairro: "Centro",
      cidade: "Londrina",
      uf: "PR",
      cep: "86010-000"
    },
    pmoc_ativo: false,
    atualizado_em: "2026-06-10T15:30:00.000Z"
  },
  periodo: { inicio: "2026-06-10T15:30:00.000Z", fim: "2026-06-10T15:30:00.000Z" },
  total_maquinas: 1,
  total_os_concluidas: 1,
  pronto_para_envio: true,
  pendencias: [] as string[],
  maquinas: [maquinaDemo]
};

const service = new AdminRelatorioResumoCoreService({} as never);
// gerarPdfBasicoRelatorioAvulso e privado; acessamos via cast para o demo.
const buffer = (service as unknown as {
  gerarPdfBasicoRelatorioAvulso: (previa: unknown) => Buffer;
}).gerarPdfBasicoRelatorioAvulso(previaDemo);

const destino = resolve(process.cwd(), "..", "..", "relatorio-demo.pdf");
writeFileSync(destino, buffer);
console.log(`PDF gerado em: ${destino} (${buffer.length} bytes)`);
