import { BadRequestException } from "@nestjs/common";
import { ChecklistTipo, PlanoRecorrenciaFrequencia } from "@prisma/client";

export type CalendarioRecorrencia = Partial<Record<number, ChecklistTipo>>;

const CHECKLISTS = new Set<string>(Object.values(ChecklistTipo));

export function normalizarCalendarioRecorrencia(valor: unknown, _frequencia: PlanoRecorrenciaFrequencia): CalendarioRecorrencia {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return {};
  }

  const calendario: CalendarioRecorrencia = {};

  for (const [mesTexto, tipo] of Object.entries(valor)) {
    const mes = Number(mesTexto);

    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      throw new BadRequestException("Calendario da recorrencia possui mes invalido.");
    }

    if (tipo === "nenhum" || tipo === "" || tipo === null) {
      continue;
    }

    if (typeof tipo !== "string" || !CHECKLISTS.has(tipo)) {
      throw new BadRequestException("Calendario da recorrencia possui checklist invalido.");
    }

    calendario[mes] = tipo as ChecklistTipo;
  }

  return calendario;
}

export function checklistTipoDaFrequencia(frequencia: PlanoRecorrenciaFrequencia): ChecklistTipo {
  const porFrequencia: Record<PlanoRecorrenciaFrequencia, ChecklistTipo> = {
    [PlanoRecorrenciaFrequencia.mensal]: ChecklistTipo.mensal,
    [PlanoRecorrenciaFrequencia.trimestral]: ChecklistTipo.trimestral,
    [PlanoRecorrenciaFrequencia.semestral]: ChecklistTipo.semestral,
    [PlanoRecorrenciaFrequencia.anual]: ChecklistTipo.anual
  };
  return porFrequencia[frequencia];
}

export function obterChecklistDoMes(
  calendario: CalendarioRecorrencia,
  data: Date,
  fallback: ChecklistTipo
) {
  const mes = data.getUTCMonth() + 1;
  return calendario[mes] ?? fallback;
}

export function calcularProximaExecucaoPorCalendario(data: Date, calendario: CalendarioRecorrencia, frequencia: PlanoRecorrenciaFrequencia) {
  if (!Object.keys(calendario).length) {
    return calcularProximaExecucaoPorFrequencia(data, frequencia);
  }

  const dia = data.getUTCDate();
  const hora = data.getUTCHours();
  const minuto = data.getUTCMinutes();
  const segundo = data.getUTCSeconds();

  for (let deslocamento = 1; deslocamento <= 24; deslocamento += 1) {
    const candidata = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + deslocamento, 1, hora, minuto, segundo));
    const mes = candidata.getUTCMonth() + 1;

    if (!calendario[mes]) {
      continue;
    }

    candidata.setUTCDate(Math.min(dia, ultimoDiaDoMesUtc(candidata.getUTCFullYear(), candidata.getUTCMonth())));
    return candidata;
  }

  return calcularProximaExecucaoPorFrequencia(data, frequencia);
}

export function normalizarDiaGeracao(valor: number | undefined) {
  if (valor === undefined || valor === null) {
    return 1;
  }

  if (!Number.isInteger(valor) || valor < 1 || valor > 31) {
    throw new BadRequestException("Dia de geracao deve ficar entre 1 e 31.");
  }

  return valor;
}

export function aplicarDiaGeracao(data: Date, dia: number) {
  const ajustada = new Date(data);
  ajustada.setUTCDate(Math.min(dia, ultimoDiaDoMesUtc(ajustada.getUTCFullYear(), ajustada.getUTCMonth())));
  return ajustada;
}

function calcularProximaExecucaoPorFrequencia(data: Date, frequencia: PlanoRecorrenciaFrequencia) {
  const mesesPorFrequencia: Record<PlanoRecorrenciaFrequencia, number> = {
    [PlanoRecorrenciaFrequencia.mensal]: 1,
    [PlanoRecorrenciaFrequencia.trimestral]: 3,
    [PlanoRecorrenciaFrequencia.semestral]: 6,
    [PlanoRecorrenciaFrequencia.anual]: 12
  };
  const proxima = new Date(data);
  proxima.setUTCMonth(proxima.getUTCMonth() + mesesPorFrequencia[frequencia]);
  return proxima;
}

function ultimoDiaDoMesUtc(ano: number, mesIndex: number) {
  return new Date(Date.UTC(ano, mesIndex + 1, 0)).getUTCDate();
}
