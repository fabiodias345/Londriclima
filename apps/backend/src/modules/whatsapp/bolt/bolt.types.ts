export type BoltStatus =
  | "BOT_MENU"
  | "BOT_QUALIFYING"
  | "HUMAN_QUEUE"
  | "HUMAN_ATTENDING"
  | "CLOSED";

export type BoltServiceType =
  | "instalacao"
  | "desinstalacao"
  | "manutencao_corretiva"
  | "manutencao_preventiva"
  | "limpeza_filtro"
  | "aluguel"
  | "pmoc"
  | "venda_equipamento"
  | "nao_identificado";

export type BoltFieldStatus = "nao_informado" | "informado" | "recusado" | "invalido";

export type BoltFieldState = {
  valor: string | null;
  status: BoltFieldStatus;
};

export type BoltMemory = {
  equipamento: string | null;
  btus: string | null;
  possui_aparelho: BoltFieldStatus;
  infraestrutura: string | null;
  fotos: BoltFieldStatus;
  urgencia: string | null;
  objecoes: string[];
  proximo_passo: string | null;
  nome_status: BoltFieldStatus;
  cep_status: BoltFieldStatus;
  email_status: BoltFieldStatus;
};

export type BoltData = {
  nome: string | null;
  cep: string | null;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  numero: string | null;
  email: string | null;
  servico: BoltServiceType | null;
  cidade_bairro: string | null;
  detalhes: string | null;
  campos_extra: Record<string, string | number | null>;
  memoria: BoltMemory;
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
