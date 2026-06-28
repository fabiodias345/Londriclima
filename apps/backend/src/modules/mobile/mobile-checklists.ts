import { ChecklistTipo } from "@prisma/client";

export type ChecklistItemTipo = "select_obs" | "numerico" | "foto";
export type ChecklistEtapa = "geral" | "evaporadora" | "condensadora" | "medicoes";

export type ChecklistItem = {
  codigo: string;
  item: string;
  tipo: ChecklistItemTipo;
  opcoes?: string[];
  unidade?: string;
  obrigatorio: true;
  etapa: ChecklistEtapa;
};

const executar = ["Executado", "Não executado"];
const verificar = ["Normal", "Irregularidade encontrada", "Não testado"];

const acao = (codigo: string, item: string, etapa: ChecklistEtapa): ChecklistItem => ({
  codigo,
  item,
  tipo: "select_obs",
  opcoes: executar,
  obrigatorio: true,
  etapa
});

const inspecao = (codigo: string, item: string, etapa: ChecklistEtapa): ChecklistItem => ({
  codigo,
  item,
  tipo: "select_obs",
  opcoes: verificar,
  obrigatorio: true,
  etapa
});

const temperatura = (codigo: string, item: string): ChecklistItem => ({
  codigo,
  item,
  tipo: "numerico",
  unidade: "°C",
  obrigatorio: true,
  etapa: "medicoes"
});

const foto = (codigo: string, item: string, etapa: ChecklistEtapa): ChecklistItem => ({
  codigo,
  item,
  tipo: "foto",
  obrigatorio: true,
  etapa
});

const checklistPorTipo: Record<ChecklistTipo, ChecklistItem[]> = {
  mensal: [
    acao("MEN_FILTRO", "Limpeza ou substituição dos filtros", "evaporadora"),
    inspecao("MEN_CONTROLE", "Teste do controle remoto/comandos", "geral"),
    inspecao("MEN_DRENO", "Teste do dreno", "evaporadora"),
    inspecao("MEN_VISUAL", "Inspeção visual: ruídos, vibrações, vazamentos e danos aparentes", "geral"),
    temperatura("MEN_TEMP_INSUFLAMENTO", "Temperatura de insuflamento"),
    temperatura("MEN_TEMP_RETORNO", "Temperatura de retorno/exaustão"),
    foto("MEN_FOTO_INSUFLAMENTO", "Foto do insuflamento mostrando a medição", "medicoes"),
    foto("MEN_FOTO_FILTRO", "Foto da máquina aberta com o filtro limpo", "evaporadora")
  ],
  trimestral: [
    acao("TRI_FILTRO", "Limpeza ou substituição dos filtros", "evaporadora"),
    inspecao("TRI_CONTROLE", "Teste do controle remoto/comandos", "geral"),
    inspecao("TRI_DRENO", "Teste do dreno", "evaporadora"),
    inspecao("TRI_VISUAL", "Inspeção visual: ruídos, vibrações, vazamentos e danos aparentes", "geral"),
    acao("TRI_SERPENTINA", "Limpeza superficial da serpentina da evaporadora", "evaporadora"),
    inspecao("TRI_ELETRICA", "Revisão das conexões elétricas", "geral"),
    inspecao("TRI_MOTORES", "Revisão dos motores e ventiladores", "evaporadora"),
    inspecao("TRI_ISOLAMENTO", "Verificação do isolamento térmico das tubulações", "geral"),
    inspecao("TRI_CIRCUITO", "Inspeção visual do circuito frigorífico para indícios de vazamentos", "geral"),
    temperatura("TRI_TEMP_INSUFLAMENTO", "Temperatura de insuflamento"),
    temperatura("TRI_TEMP_RETORNO", "Temperatura de retorno/exaustão"),
    foto("TRI_FOTO_INSUFLAMENTO", "Foto do insuflamento mostrando a medição", "medicoes"),
    foto("TRI_FOTO_FILTRO", "Foto da máquina aberta com o filtro limpo", "evaporadora")
  ],
  semestral: [
    inspecao("SEM_CONTROLE", "Teste do controle remoto/comandos", "geral"),
    acao("SEM_HIGIENIZACAO_EVAP", "Higienização completa da evaporadora", "evaporadora"),
    foto("SEM_FOTO_BOLSAO", "Foto da máquina aberta e desmontada com bolsão embaixo", "evaporadora"),
    inspecao("SEM_MOTORES", "Revisão dos motores e ventiladores", "evaporadora"),
    inspecao("SEM_FIXACOES", "Verificação das fixações: suportes, coxins e parafusos", "evaporadora"),
    temperatura("SEM_TEMP_INSUFLAMENTO", "Temperatura de insuflamento"),
    foto("SEM_FOTO_INSUFLAMENTO", "Foto do insuflamento mostrando a medição", "medicoes")
  ],
  anual: [
    inspecao("ANU_CONTROLE", "Teste do controle remoto/comandos", "geral"),
    acao("ANU_HIGIENIZACAO_EVAP", "Higienização completa da evaporadora", "evaporadora"),
    foto("ANU_FOTO_BOLSAO", "Foto da máquina aberta e desmontada com bolsão embaixo", "evaporadora"),
    acao("ANU_HIGIENIZACAO_COND", "Higienização completa da condensadora", "condensadora"),
    foto("ANU_FOTO_BOLSAO_COND", "Foto da condensadora aberta e desmontada com bolsão embaixo", "condensadora"),
    foto("ANU_FOTO_COND", "Foto da condensadora limpa", "condensadora"),
    inspecao("ANU_CIRCUITO", "Verificação completa do circuito frigorífico: pressões, estanqueidade e carga quando necessário", "geral"),
    inspecao("ANU_ELETRICA", "Inspeção completa dos componentes elétricos", "geral"),
    inspecao("ANU_ISOLAMENTO", "Verificação do isolamento térmico das tubulações", "geral"),
    temperatura("ANU_TEMP_INSUFLAMENTO", "Temperatura de insuflamento"),
    temperatura("ANU_TEMP_RETORNO", "Temperatura de retorno/exaustão"),
    foto("ANU_FOTO_INSUFLAMENTO", "Foto do insuflamento mostrando a medição", "medicoes")
  ]
};

export function montarChecklistMobile(tipo: ChecklistTipo): ChecklistItem[] {
  return checklistPorTipo[tipo].map((item) => ({
    ...item,
    ...(item.opcoes ? { opcoes: [...item.opcoes] } : {})
  }));
}

export function codigosObrigatoriosChecklist(tipo: ChecklistTipo): string[] {
  return checklistPorTipo[tipo].map((item) => item.codigo);
}
