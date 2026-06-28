import type { SegurancaInternaDto } from "./dto/atualizar-status-os.dto";

const rotulos: Array<[keyof SegurancaInternaDto, string]> = [
  ["epis_confirmados", "EPIs obrigatorios nao confirmados"],
  ["equipamento_desligado", "equipamento nao desligado"],
  ["area_ferramentas_seguras", "area ou ferramentas inseguras"]
];

export function avaliarSegurancaInterna(seguranca: SegurancaInternaDto) {
  const pendencias = rotulos
    .filter(([campo]) => seguranca[campo] !== true)
    .map(([, rotulo]) => rotulo);

  if (seguranca.trabalho_altura) {
    if (!seguranca.nr35_valida) pendencias.push("NR-35 invalida ou ausente");
    if (!seguranca.cinto_paraquedista) pendencias.push("cinto paraquedista ausente");
    if (!seguranca.talabarte_ancorado) pendencias.push("talabarte nao ancorado");
    if (!seguranca.area_isolada) pendencias.push("area nao isolada");
  }

  return {
    aprovado: pendencias.length === 0,
    motivoBloqueio: pendencias.length === 0 ? null : pendencias.join("; ")
  };
}
