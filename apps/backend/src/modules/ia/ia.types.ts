export type AiDraftItem = {
  item_catalogo_id?: string | null;
  tipo: "servico" | "material" | "peca" | "equipamento";
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario?: number | null;
};

export type AiDraft = {
  cliente: Record<string, unknown>;
  atendimento: { servico?: string | null; equipamento?: string | null; capacidade_btu?: number | null; urgencia?: string | null; detalhes?: string | null };
  orcamento: { titulo?: string | null; itens: AiDraftItem[]; desconto: number; subtotal: number; total: number };
  perguntas_pendentes: string[];
  confianca: number;
};

export type AiWhatsappAction = "perguntar_cidade" | "perguntar_uf" | "buscar_cep_rua" | "confirmar_endereco" | "continuar" | "transferir";

export type AiWhatsappData = {
  nome: string | null;
  cidade: string | null;
  uf: string | null;
  logradouro: string | null;
  numero: string | null;
  cep: string | null;
  servico: string | null;
  detalhes: string | null;
};

export type AiWhatsappResult = {
  resposta: string;
  intencao: "instalacao" | "manutencao" | "orcamento" | "endereco" | "outro";
  dados: AiWhatsappData;
  proxima_acao: AiWhatsappAction;
  perguntas_pendentes: string[];
};
