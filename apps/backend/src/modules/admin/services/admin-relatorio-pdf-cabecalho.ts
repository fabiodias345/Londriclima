export function montarCabecalhoRelatorioTecnico(maquinaIndice: number, ordemIndice: number, totalOrdens: number) {
  return [
    `MAQUINA N:${String(maquinaIndice + 1).padStart(3, "0")}`,
    `MANUTENCAO N:${String(ordemIndice + 1).padStart(3, "0")} DE ${String(totalOrdens).padStart(3, "0")}`,
    ""
  ];
}
