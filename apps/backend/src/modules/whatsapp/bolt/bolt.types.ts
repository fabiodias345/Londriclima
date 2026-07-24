export type BoltStatus =
  | "BOT_MENU"
  | "BOT_QUALIFYING"
  | "HUMAN_QUEUE"
  | "HUMAN_ATTENDING"
  | "CLOSED";

export type BoltServiceType = "manutencao" | "instalacao" | "pmoc" | "locacao";

export type BoltData = {
  nome: string | null;
  cep: string | null;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  servico: BoltServiceType | null;
  cidade_bairro: string | null;
  detalhes: string | null;
  campos_extra: Record<string, string | number | null>;
  status: BoltStatus;
  etapa_atual: string | null;
  tentativas_fallback: number;
  ultima_interacao?: string;
};

export type BoltOption = {
  id: string;
  title: string;
  description?: string;
};

export type BoltResult = {
  texto: string;
  assumir: boolean;
  dados: BoltData;
  opcoes?: BoltOption[];
  rotuloOpcoes?: string;
};

export type BoltMessage = {
  texto: string;
  nomeContato?: string;
};