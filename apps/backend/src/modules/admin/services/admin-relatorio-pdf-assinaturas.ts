export type OrdemAssinaturaRelatorioTecnicoPdf = {
  assinatura?: { nome_responsavel?: string | null } | null;
  eventos?: Array<{ latitude: number | null; longitude: number | null }>;
};

export function montarLinhasAssinaturaRelatorioTecnico(ordem: OrdemAssinaturaRelatorioTecnicoPdf | null) {
  return [
    ["Coordenadas GPS", formatarGpsRelatorioTecnico(ordem)],
    ["Assinatura do Cliente", ordem?.assinatura?.nome_responsavel || "pendente"]
  ] as Array<[string, string]>;
}

function formatarGpsRelatorioTecnico(ordem: OrdemAssinaturaRelatorioTecnicoPdf | null) {
  const evento = ordem?.eventos?.find((item) => item.latitude !== null && item.longitude !== null);

  if (!evento || evento.latitude === null || evento.longitude === null) {
    return "não informado";
  }

  return `${evento.latitude.toFixed(6)}, ${evento.longitude.toFixed(6)}`;
}
