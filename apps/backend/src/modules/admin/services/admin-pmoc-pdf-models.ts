export type EnderecoPmoc = {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
} | null;

export type OrdemPmoc = {
  titulo?: string | null;
  problema_relatado?: string | null;
  agendada_para?: string | null;
  concluida_em?: string | null;
  tecnico?: {
    nome?: string | null;
    foto_perfil_storage_url?: string | null;
    assinatura_storage_url?: string | null;
  } | null;
  tecnico_executor?: {
    nome?: string | null;
    foto_perfil_storage_url?: string | null;
    assinatura_storage_url?: string | null;
  } | null;
  equipe?: { nome?: string | null } | null;
  checklist_tipo?: "mensal" | "trimestral" | "semestral" | "anual" | null;
  eventos?: Array<{ latitude?: number | null; longitude?: number | null; registrado_em?: string | null }>;
  evidencias?: Array<{ tipo?: string | null; storage_url?: string | null }>;
  checklist?: { procedimentos?: string[]; servico_realizado?: string | null } | null;
  checklist_respostas?: Array<{ codigo?: string | null; tipo?: string | null; valor?: string | null; observacao?: string | null }>;
  assinatura?: { nome_responsavel?: string | null; storage_url?: string | null } | null;
  observacoes?: Array<{ texto?: string | null }>;
};

export type MaquinaPmoc = {
  tipo?: string | null;
  patrimonio?: string | null;
  codigo_barras?: string | null;
  marca?: string | null;
  modelo?: string | null;
  capacidade_btu?: number | null;
  gas_refrigerante?: string | null;
  numero_serie?: string | null;
  local_instalacao?: string | null;
  area_climatizada_m2?: number | null;
  ocupantes_fixo?: number | null;
  ocupantes_variavel?: number | null;
  pendencias?: string[];
  os_concluidas: OrdemPmoc[];
};

export type PreviaPmoc = {
  cliente: {
    nome: string;
    documento?: string | null;
    telefone?: string | null;
    email?: string | null;
    pmoc_art_numero?: string | null;
    endereco: EnderecoPmoc;
  };
  engenheiro_responsavel?: {
    nome?: string | null;
    cpf?: string | null;
    crea?: string | null;
    email?: string | null;
    telefone?: string | null;
  } | null;
  periodo: { inicio: string | null; fim: string | null };
  total_maquinas: number;
  total_os_concluidas: number;
  pronto_para_pdf: boolean;
  pendencias: string[];
  maquinas: MaquinaPmoc[];
};

export type PeriodicidadePmoc = "mensal" | "trimestral" | "semestral" | "anual";

export const PAGE = { width: 612, height: 842, margin: 36 };

export const CONTRATADA_PMOC = {
  razaoSocial: "M. Lima Manutenções Prediais e Industriais LTDA",
  nomeFantasia: "Clima do Brasil",
  cnpj: "04.959.153/0001-11",
  endereco: "Avenida Paissandu, 526 - Maringá/PR - CEP 87050-130",
  telefone: "(43) 99100-0035",
  email: "airmovebr@gmail.com"
};

export const ENGENHEIRO_PADRAO_PMOC = {
  nome: "André Mendes dos Santos",
  titulo: "Eng. Mecânico",
  crea: "PR-206737/D",
  registro: "89389",
  rnp: "1721220267"
};

export const ATIVIDADES_MANUTENCAO: Array<[string, string, PeriodicidadePmoc]> = [
  ["4.1", "Limpeza dos filtros de ar e/ou substituição", "mensal"],
  ["4.2", "Limpeza externa do gabinete do evaporador", "mensal"],
  ["4.3", "Verificar operação de drenagem", "mensal"],
  ["4.4", "Verificar e corrigir ruídos e vibrações anormais", "mensal"],
  ["4.5", "Verificar termostatos, controles e sensores", "mensal"],
  ["4.6", "Higienizar evaporadores com bactericida", "mensal"],
  ["4.7", "Verificar e eliminar odores desagradáveis", "mensal"],
  ["4.8", "Limpeza das serpentinas do evaporador", "trimestral"],
  ["4.9", "Limpeza do ventilador/rotor do evaporador", "trimestral"],
  ["4.10", "Limpeza da bandeja de condensado", "trimestral"],
  ["4.11", "Reaperto de terminais/conexões elétricas", "trimestral"],
  ["4.12", "Verificar corrente/pressão/tensão", "semestral"],
  ["4.13", "Limpeza do condensador", "semestral"],
  ["4.14", "Verificar estado dos compressores", "semestral"],
  ["4.15", "Lubrificação geral do equipamento", "semestral"],
  ["4.16", "Verificar estado dos suportes/coxins", "semestral"],
  ["4.17", "Verificar e corrigir focos de corrosão", "semestral"],
  ["4.18", "Verificar isolantes térmicos das linhas", "semestral"],
  ["4.19", "Teste do controle remoto e comandos", "anual"],
  ["4.20", "Higienização completa da evaporadora", "anual"],
  ["4.21", "Higienização completa da condensadora", "anual"],
  ["4.22", "Verificação completa do circuito frigorífico", "anual"],
  ["4.23", "Inspeção completa dos componentes elétricos", "anual"],
  ["4.24", "Verificação do isolamento térmico das tubulações", "anual"],
  ["4.25", "Medição das temperaturas de insuflamento e retorno", "anual"]
];
