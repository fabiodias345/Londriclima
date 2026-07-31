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
