export function formatarLinhaCampoRelatorioPdf(campo: string, valor: string) {
  return `${campo.padEnd(35, " ")} ${valor || "não informado"}`;
}

export function montarCartaoRelatorioTecnico(titulo: string, campos: Array<[string, string]>) {
  return [
    titulo,
    ...campos.map(([campo, valor]) => formatarLinhaCampoRelatorioPdf(campo, valor))
  ];
}
