import { CategoriaAtendimento, ChecklistTipo, OrdemServicoTipoServico } from "@prisma/client";

export type ChecklistItemTipo = "select_obs" | "numerico" | "foto";
export type ChecklistEtapa = "geral" | "evaporadora" | "condensadora" | "medicoes";
export type ChecklistEtapaAnual = "evaporadora" | "condensadora";

export const MARCADORES_CONCLUSAO_CHECKLIST_ANUAL = {
  evaporadora: "ANU_ETAPA_EVAPORADORA_CONCLUIDA",
  condensadora: "ANU_ETAPA_CONDENSADORA_CONCLUIDA"
} as const;

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

const temperatura = (
  codigo: string,
  item: string,
  etapa: ChecklistEtapa = "medicoes"
): ChecklistItem => ({
  codigo,
  item,
  tipo: "numerico",
  unidade: "°C",
  obrigatorio: true,
  etapa
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
    inspecao("ANU_CONTROLE", "Teste do controle remoto/comandos", "evaporadora"),
    acao("ANU_HIGIENIZACAO_EVAP", "Higienização completa da evaporadora", "evaporadora"),
    foto("ANU_FOTO_BOLSAO", "Foto da máquina aberta e desmontada com bolsão embaixo", "evaporadora"),
    acao("ANU_HIGIENIZACAO_COND", "Higienização completa da condensadora", "condensadora"),
    foto("ANU_FOTO_COND", "Foto da condensadora limpa", "condensadora"),
    inspecao("ANU_CIRCUITO", "Verificação completa do circuito frigorífico: pressões, estanqueidade e carga quando necessário", "condensadora"),
    inspecao("ANU_ELETRICA", "Inspeção completa dos componentes elétricos", "condensadora"),
    inspecao("ANU_ISOLAMENTO", "Verificação do isolamento térmico das tubulações", "condensadora"),
    temperatura("ANU_TEMP_INSUFLAMENTO", "Temperatura de insuflamento", "evaporadora"),
    temperatura("ANU_TEMP_RETORNO", "Temperatura de retorno/exaustão", "evaporadora"),
    foto("ANU_FOTO_INSUFLAMENTO", "Foto do insuflamento mostrando a medição", "evaporadora")
  ]
};

const checklistInstalacao: ChecklistItem[] = [
  acao("INS_FIXACAO", "Fixacao e nivelamento das unidades", "geral"),
  acao("INS_TUBULACAO", "Tubulacao frigorigena instalada e isolada", "geral"),
  acao("INS_DRENO", "Dreno instalado e testado", "geral"),
  inspecao("INS_ELETRICA", "Alimentacao eletrica, disjuntor e conexoes conferidos", "geral"),
  inspecao("INS_ESTANQUEIDADE", "Vacuo, estanqueidade e carga verificados", "geral"),
  inspecao("INS_TESTE", "Teste de funcionamento e comandos", "geral"),
  temperatura("INS_TEMP_INSUFLAMENTO", "Temperatura de insuflamento"),
  temperatura("INS_TEMP_RETORNO", "Temperatura de retorno/exaustao"),
  foto("INS_FOTO_EVAP", "Foto da evaporadora instalada", "evaporadora"),
  foto("INS_FOTO_COND", "Foto da condensadora instalada", "condensadora")
];

const checklistCamaraFriaPorTipo: Record<ChecklistTipo, ChecklistItem[]> = {
  mensal: [
    inspecao("CFM_PORTA", "Vedação e fechamento da porta", "geral"),
    inspecao("CFM_CONTROLADOR", "Controlador, setpoint e alarmes", "geral"),
    inspecao("CFM_DEGELO", "Funcionamento do degelo", "geral"),
    acao("CFM_EVAP_DRENO", "Limpeza do evaporador e conferência do dreno", "evaporadora"),
    temperatura("CFM_TEMP_AMBIENTE", "Temperatura ambiente da câmara"),
    temperatura("CFM_TEMP_RETORNO", "Temperatura de retorno"),
    foto("CFM_FOTO_CONTROLADOR", "Foto do controlador com temperatura visivel", "evaporadora"),
    foto("CFM_FOTO_EVAP", "Foto da evaporadora", "evaporadora"),
    foto("CFM_FOTO_COND", "Foto da condensadora", "condensadora")
  ],
  trimestral: [
    inspecao("CFT_PORTA", "Vedação e fechamento da porta", "geral"),
    inspecao("CFT_CONTROLADOR", "Controlador, sensores e alarmes", "geral"),
    inspecao("CFT_DEGELO", "Funcionamento do degelo", "geral"),
    acao("CFT_EVAP_SERPENTINA", "Limpeza da serpentina do evaporador", "evaporadora"),
    inspecao("CFT_VENTILADORES", "Ventiladores do evaporador", "evaporadora"),
    acao("CFT_CONDENSADORA", "Limpeza superficial da condensadora", "condensadora"),
    temperatura("CFT_TEMP_AMBIENTE", "Temperatura ambiente da câmara"),
    temperatura("CFT_TEMP_RETORNO", "Temperatura de retorno"),
    foto("CFT_FOTO_CONTROLADOR", "Foto do controlador com temperatura visivel", "evaporadora"),
    foto("CFT_FOTO_EVAP", "Foto da evaporadora", "evaporadora"),
    foto("CFT_FOTO_COND", "Foto da condensadora", "condensadora")
  ],
  semestral: [
    inspecao("CFS_CONTROLADOR", "Controlador, sensores e alarmes", "geral"),
    inspecao("CFS_VEDACAO_PORTA", "Vedação e fechamento da porta", "geral"),
    acao("CFS_HIGIENIZACAO_EVAP", "Higienização completa do evaporador", "evaporadora"),
    acao("CFS_HIGIENIZACAO_COND", "Higienização completa da condensadora", "condensadora"),
    inspecao("CFS_ELETRICA", "Componentes elétricos e conexões", "geral"),
    inspecao("CFS_DEGELO", "Ciclo de degelo e drenagem", "geral"),
    temperatura("CFS_TEMP_AMBIENTE", "Temperatura ambiente da câmara"),
    temperatura("CFS_TEMP_RETORNO", "Temperatura de retorno"),
    foto("CFS_FOTO_CONTROLADOR", "Foto do controlador com temperatura visivel", "evaporadora"),
    foto("CFS_FOTO_EVAP", "Foto da evaporadora", "evaporadora"),
    foto("CFS_FOTO_COND", "Foto da condensadora", "condensadora")
  ],
  anual: [
    inspecao("CFA_CONTROLADOR", "Controlador, setpoint e alarmes", "evaporadora"),
    inspecao("CFA_PORTA", "Vedação e fechamento da porta", "evaporadora"),
    inspecao("CFA_DEGELO", "Funcionamento do degelo", "evaporadora"),
    acao("CFA_HIGIENIZACAO_EVAP", "Higienização completa do evaporador", "evaporadora"),
    inspecao("CFA_DRENO_EVAP", "Dreno e bandeja do evaporador", "evaporadora"),
    acao("CFA_HIGIENIZACAO_COND", "Higienização completa da condensadora", "condensadora"),
    inspecao("CFA_CIRCUITO", "Circuito frigorífico, pressões e estanqueidade", "condensadora"),
    inspecao("CFA_ELETRICA", "Componentes elétricos da condensadora", "condensadora"),
    temperatura("CFA_TEMP_AMBIENTE", "Temperatura ambiente da câmara", "evaporadora"),
    temperatura("CFA_TEMP_RETORNO", "Temperatura de retorno", "evaporadora"),
    foto("CFA_FOTO_CONTROLADOR", "Foto do controlador com temperatura visivel", "evaporadora"),
    foto("CFA_FOTO_EVAP", "Foto da evaporadora", "evaporadora"),
    foto("CFA_FOTO_COND", "Foto da condensadora", "condensadora")
  ]
};

function copiarChecklist(checklist: ChecklistItem[]): ChecklistItem[] {
  return checklist.map((item) => ({
    ...item,
    ...(item.opcoes ? { opcoes: [...item.opcoes] } : {})
  }));
}

export function montarChecklistMobile(tipo: ChecklistTipo): ChecklistItem[] {
  return copiarChecklist(checklistPorTipo[tipo]);
}

export function codigosObrigatoriosChecklist(tipo: ChecklistTipo): string[] {
  return checklistPorTipo[tipo].map((item) => item.codigo);
}

export function montarChecklistMobilePorServico(
  tipoServico: OrdemServicoTipoServico | "preventiva" | "corretiva",
  checklistTipo: ChecklistTipo,
  categoria: CategoriaAtendimento = CategoriaAtendimento.ar_condicionado
): ChecklistItem[] {
  if (tipoServico === OrdemServicoTipoServico.instalacao) {
    return copiarChecklist(checklistInstalacao);
  }

  if (categoria === CategoriaAtendimento.camara_fria) {
    return copiarChecklist(checklistCamaraFriaPorTipo[checklistTipo]);
  }

  return montarChecklistMobile(checklistTipo);
}

export function codigosObrigatoriosChecklistPorServico(
  tipoServico: OrdemServicoTipoServico | "preventiva" | "corretiva",
  checklistTipo: ChecklistTipo,
  categoria: CategoriaAtendimento = CategoriaAtendimento.ar_condicionado
): string[] {
  if (tipoServico === OrdemServicoTipoServico.instalacao) {
    return checklistInstalacao.map((item) => item.codigo);
  }

  if (categoria === CategoriaAtendimento.camara_fria) {
    return checklistCamaraFriaPorTipo[checklistTipo].map((item) => item.codigo);
  }

  return codigosObrigatoriosChecklist(checklistTipo);
}

export function codigosObrigatoriosChecklistEtapaAnual(
  etapa: ChecklistEtapaAnual,
  categoria: CategoriaAtendimento = CategoriaAtendimento.ar_condicionado
): string[] {
  const checklistAnual = categoria === CategoriaAtendimento.camara_fria
    ? checklistCamaraFriaPorTipo.anual
    : checklistPorTipo.anual;

  return checklistAnual.filter((item) => item.etapa === etapa).map((item) => item.codigo);
}

export function etapaAnualDoMarcador(codigo: string): ChecklistEtapaAnual | null {
  const encontrada = Object.entries(MARCADORES_CONCLUSAO_CHECKLIST_ANUAL).find(
    ([, marcador]) => marcador === codigo
  );
  return (encontrada?.[0] as ChecklistEtapaAnual | undefined) ?? null;
}

export function marcadorConclusaoChecklistAnualValido(resposta: {
  codigo: string;
  tipo?: string | null;
  valor?: string | null;
}): boolean {
  return etapaAnualDoMarcador(resposta.codigo) !== null &&
    resposta.tipo === "etapa" &&
    resposta.valor === "concluida";
}
