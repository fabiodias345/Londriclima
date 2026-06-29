import { ChecklistTipo } from "@prisma/client";
import { montarChecklistMobile } from "../../mobile/mobile-checklists";

type RespostaChecklistPmoc = {
  codigo?: string | null;
  tipo?: string | null;
  valor?: string | null;
  observacao?: string | null;
};

const tiposValidos = new Set<string>(["mensal", "trimestral", "semestral", "anual"]);

export function resumirChecklistPmoc(
  checklistTipo: string | null | undefined,
  respostas: RespostaChecklistPmoc[] | null | undefined,
  nomeArquivo: (storageUrl?: string | null) => string
) {
  if (!respostas?.length) {
    return [];
  }

  const tipo = tiposValidos.has(checklistTipo ?? "") ? (checklistTipo as ChecklistTipo) : ChecklistTipo.mensal;
  const labels = new Map(montarChecklistMobile(tipo).map((item) => [item.codigo, item.item]));

  return respostas
    .filter((resposta) => resposta.codigo && resposta.valor && resposta.tipo !== "etapa" && !resposta.codigo.startsWith("ANU_ETAPA_"))
    .map((resposta) => {
      const label = labels.get(resposta.codigo ?? "") ?? resposta.codigo ?? "Item";
      const valor = resposta.tipo === "foto" ? nomeArquivo(resposta.valor) : resposta.valor ?? "";
      const observacao = resposta.observacao?.trim() ? ` (${resposta.observacao.trim()})` : "";
      return `${label}: ${valor}${observacao}`;
    });
}
