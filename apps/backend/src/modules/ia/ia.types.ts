export type AtendimentoAiInput = {
  mensagens: Array<{ direcao: "entrada" | "saida"; texto: string; criadoEm?: string }>;
  cliente?: { nome?: string | null; telefone?: string | null; email?: string | null } | null;
};

export type AtendimentoAiResult = {
  resumo: string;
  cliente: { nome: string | null; telefone: string | null; email: string | null };
  servico: { descricao: string | null; equipamento: string | null; urgencia: "baixa" | "normal" | "alta" | null };
  endereco: { texto: string | null; cep: string | null };
  perguntasPendentes: string[];
  sugestaoResposta: string | null;
};
