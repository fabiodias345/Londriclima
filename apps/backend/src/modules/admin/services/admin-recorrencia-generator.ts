import { ConflictException } from "@nestjs/common";
import { ChecklistTipo, OrdemServicoEventoAcao, OrdemServicoStatus, PlanoRecorrenciaFrequencia, Prisma } from "@prisma/client";
import {
  aplicarDiaGeracao,
  calcularProximaExecucaoPorCalendario,
  normalizarCalendarioRecorrencia,
  obterChecklistDoMes
} from "./admin-recorrencia-calendario";
import { mapearAtualizacaoOrdem } from "./admin-recorrencia-mappers";

export type PlanoRecorrenciaParaGeracao = {
  id: string;
  empresaId: string;
  clienteId: string;
  equipamentoId: string | null;
  equipeId: string | null;
  tecnicoId: string | null;
  titulo: string;
  detalhes: string | null;
  frequencia: PlanoRecorrenciaFrequencia;
  checklistTipo: ChecklistTipo;
  calendario: Prisma.JsonValue;
  diaGeracao: number;
  proximaExecucao: Date;
  valorCobrado: Prisma.Decimal | null;
  cliente: { enderecos: Array<{ id: string }> };
};

export async function criarOrdemRecorrente(
  tx: Prisma.TransactionClient,
  plano: PlanoRecorrenciaParaGeracao,
  usuarioId: string | null
) {
  const calendario = normalizarCalendarioRecorrencia(plano.calendario, plano.frequencia);
  const checklistTipo = obterChecklistDoMes(calendario, plano.proximaExecucao, plano.checklistTipo);
  const competenciaAno = plano.proximaExecucao.getUTCFullYear();
  const competenciaMes = plano.proximaExecucao.getUTCMonth() + 1;
  const ordem = await tx.ordemServico.create({
    data: {
      empresaId: plano.empresaId,
      clienteId: plano.clienteId,
      enderecoId: plano.cliente.enderecos[0]?.id ?? undefined,
      equipamentoId: plano.equipamentoId ?? undefined,
      equipeId: plano.equipeId ?? undefined,
      tecnicoId: plano.tecnicoId ?? undefined,
      status: OrdemServicoStatus.aberta,
      checklistTipo,
      titulo: plano.titulo,
      problemaRelatado: plano.detalhes,
      agendadaPara: plano.proximaExecucao,
      valorCobrado: plano.valorCobrado ?? undefined
    },
    select: {
      id: true,
      status: true,
      atualizadaEm: true
    }
  });

  try {
    await tx.planoRecorrenciaGeracao.create({
      data: {
        empresaId: plano.empresaId,
        planoId: plano.id,
        ordemServicoId: ordem.id,
        competenciaAno,
        competenciaMes
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException("OS recorrente ja gerada para este mes.");
    }
    throw error;
  }

  await tx.ordemServicoEvento.create({
    data: {
      empresaId: plano.empresaId,
      ordemServicoId: ordem.id,
      usuarioId: usuarioId ?? undefined,
      acao: OrdemServicoEventoAcao.aprovar,
      statusAnterior: OrdemServicoStatus.pre_chamado,
      statusNovo: OrdemServicoStatus.aberta,
      registradoEm: new Date()
    }
  });

  const proximaExecucao = aplicarDiaGeracao(
    calcularProximaExecucaoPorCalendario(plano.proximaExecucao, calendario, plano.frequencia),
    plano.diaGeracao
  );
  await tx.planoRecorrencia.update({
    where: {
      id: plano.id
    },
    data: {
      ultimoOsId: ordem.id,
      proximaExecucao
    }
  });

  return {
    ...mapearAtualizacaoOrdem(ordem),
    checklist_tipo: checklistTipo,
    competencia: `${competenciaAno}-${String(competenciaMes).padStart(2, "0")}`,
    proxima_execucao: proximaExecucao.toISOString()
  };
}
