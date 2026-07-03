export function montarCabecalhoRelatorioTecnico(maquinaIndice: number, ordemIndice: number, totalOrdens: number) {
  return [
    `MÁQUINA N:${String(maquinaIndice + 1).padStart(3, "0")}`,
    `MANUTENÇÃO N:${String(ordemIndice + 1).padStart(3, "0")} DE ${String(totalOrdens).padStart(3, "0")}`,
    ""
  ];
}
