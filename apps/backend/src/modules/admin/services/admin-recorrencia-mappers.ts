import { ChecklistTipo, OrdemServicoStatus, PlanoRecorrenciaFrequencia, Prisma } from "@prisma/client";

export function mapearPlanoRecorrencia(plano: {
  id: string;
  titulo: string;
  detalhes: string | null;
  frequencia: PlanoRecorrenciaFrequencia;
  checklistTipo: ChecklistTipo;
  calendario: Prisma.JsonValue;
  diaGeracao: number;
  proximaExecucao: Date;
  valorCobrado: Prisma.Decimal | null;
  ativo: boolean;
  atualizadoEm: Date;
  cliente: { id: string; nome: string; telefone: string | null };
  equipamento: { id: string; patrimonio: string | null; marca: string; modelo: string; localInstalacao: string | null } | null;
  equipe: { id: string; nome: string } | null;
  tecnico: { id: string; nome: string } | null;
  ultimoOs: { id: string; titulo: string; agendadaPara: Date | null; status: OrdemServicoStatus } | null;
}) {
  return {
    id: plano.id,
    titulo: plano.titulo,
    detalhes: plano.detalhes,
    frequencia: plano.frequencia,
    checklist_tipo: plano.checklistTipo,
    calendario: plano.calendario,
    dia_geracao: plano.diaGeracao,
    proxima_execucao: plano.proximaExecucao.toISOString(),
    valor_cobrado: plano.valorCobrado?.toNumber() ?? null,
    ativo: plano.ativo,
    atualizado_em: plano.atualizadoEm.toISOString(),
    cliente: plano.cliente,
    equipamento: plano.equipamento,
    equipe: plano.equipe,
    tecnico: plano.tecnico,
    ultima_os: plano.ultimoOs
      ? {
          id: plano.ultimoOs.id,
          titulo: plano.ultimoOs.titulo,
          agendada_para: plano.ultimoOs.agendadaPara?.toISOString() ?? null,
          status: plano.ultimoOs.status
        }
      : null
  };
}

export function mapearAtualizacaoOrdem(ordem: { id: string; status: OrdemServicoStatus; atualizadaEm: Date }) {
  return {
    os_id: ordem.id,
    status: ordem.status,
    atualizado_em: ordem.atualizadaEm.toISOString()
  };
}
