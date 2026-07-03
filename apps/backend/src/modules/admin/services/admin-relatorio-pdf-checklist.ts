export type RespostaRelatorioTecnicoPdf = {
  codigo: string;
  valor: string;
  observacao?: string | null;
};

export type ChecklistRelatorioTecnicoPdf = {
  problemaRelatado?: string | null;
  servicoRealizado?: string | null;
  respostas?: RespostaRelatorioTecnicoPdf[];
};

export function montarLinhasChecklistRelatorioTecnico(checklist: ChecklistRelatorioTecnicoPdf) {
  const linhas = ordenarRespostasRelatorioTecnico(checklist.respostas ?? [])
    .filter(deveExibirRespostaRelatorioTecnico)
    .map((resposta) => {
      const observacao = resposta.observacao?.trim() ? ` (${resposta.observacao.trim()})` : "";
      return [obterLabelRespostaRelatorioTecnico(resposta.codigo), `${resposta.valor.trim()}${observacao}`] as [string, string];
    });

  if (linhas.length) {
    return linhas;
  }

  return [
    ["Problema relatado", checklist.problemaRelatado || "nao informado"],
    ["Servico realizado", checklist.servicoRealizado || "nao informado"]
  ] as Array<[string, string]>;
}

export function ordenarRespostasRelatorioTecnico<T extends { codigo: string }>(respostas: T[]) {
  const ordem = obterOrdemRespostasRelatorioTecnico(respostas);
  return [...respostas].sort((a, b) => {
    const ordemA = ordem.indexOf(a.codigo);
    const ordemB = ordem.indexOf(b.codigo);
    const posicaoA = ordemA === -1 ? 999 : ordemA;
    const posicaoB = ordemB === -1 ? 999 : ordemB;
    return posicaoA === posicaoB ? a.codigo.localeCompare(b.codigo) : posicaoA - posicaoB;
  });
}

export function deveExibirRespostaRelatorioTecnico(resposta: { codigo: string; valor: string }) {
  const valor = resposta.valor?.trim() ?? "";

  if (!valor || /^pendente$/i.test(valor)) {
    return false;
  }

  if (resposta.codigo === "C3" || valor.startsWith("/storage/")) {
    return false;
  }

  return true;
}

export function obterLabelRespostaRelatorioTecnico(codigo: string) {
  return {
    C1: "Problema encontrado",
    C2: "Acao realizada",
    C4: "Pecas utilizadas",
    C5: "Observacao final",
    M1: "EPIs utilizados",
    M2: "Desligar pelo controle remoto",
    M3: "Abrir tampa frontal",
    M5: "Lavar filtros",
    M6: "Condicao dos filtros",
    M7: "Limpeza da serpentina",
    M8: "Limpeza da evaporadora",
    M9: "Dreno desobstruido",
    M10: "Bandeja do condensado",
    M11: "Reinstalar filtros",
    M12: "Fechar tampa",
    M13: "Ligar disjuntor",
    M14: "Funcao Dry se existir por 10 minutos",
    M15: "Temperatura de entrada do ar",
    M17: "Temperatura de insuflamento",
    M18: "Foto da evaporadora limpa",
    T1: "Fixacao e suportes",
    T2: "Isolamento termico",
    T3: "Dreno limpo",
    T4: "Gabinete limpo",
    T5: "Ruido",
    T6: "Fluxo de ar pelas aletas normal",
    S1: "Acesso a condensadora",
    S2: "Limpar serpentina condensadora",
    S3: "Foto da condensadora limpa",
    S4: "Oxidacao, danos ou entupimentos",
    S5: "Efetuado limpeza geral",
    S6: "Pressao do fluido refrigerante",
    S7: "Tipo de fluido refrigerante",
    S8: "Efetuado inspecao eletrica conexoes",
    S9: "Corrente",
    S10: "Protecoes eletricas funcionando",
    S11: "Reinstalar componentes",
    S12: "Religado e verificado",
    S13: "Observacao",
    A1: "Inspecao geral anual",
    A2: "Teste de rendimento",
    A3: "Avaliacao de ruido",
    A4: "Avaliacao de vibracao",
    A5: "Recomendacoes tecnicas",
    A6: "Plano de acoes",
    A7: "Relatorio consolidado anual"
  }[codigo] ?? codigo;
}

function obterOrdemRespostasRelatorioTecnico(respostas: Array<{ codigo: string }>) {
  const acumulado = respostas.some((resposta) => /^[TSA]/.test(resposta.codigo));
  const ordemMensal = [
    "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12", "M14", "M15", "M17"
  ];

  if (!acumulado) {
    return [...ordemMensal, "M13", "M16"];
  }

  return [
    ...ordemMensal,
    "T1", "T2", "T3", "T4", "T5", "T6", "M18", "S1", "S2", "S4", "S5", "S6", "S7", "S8", "S9", "S10",
    "S11", "M13", "S12", "S3", "S13", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "M16"
  ];
}
