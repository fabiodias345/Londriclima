import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ordens = await prisma.ordemServico.findMany({
    select: {
      id: true,
      checklist: {
        select: {
          id: true
        }
      }
    }
  });

  const ordemIds = ordens.map((ordem) => ordem.id);
  const checklistIds = ordens.map((ordem) => ordem.checklist?.id).filter((id): id is string => Boolean(id));

  const resultado = await prisma.$transaction(async (tx) => {
    const planosAtualizados = await tx.planoRecorrencia.updateMany({
      where: {
        ultimoOsId: {
          in: ordemIds
        }
      },
      data: {
        ultimoOsId: null
      }
    });

    const relatoriosPmoc = await tx.pmocRelatorio.deleteMany({});

    const automacoes = ordemIds.length
      ? await tx.automacaoAgendada.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            }
          }
        })
      : { count: 0 };

    const responsaveis = ordemIds.length
      ? await tx.ordemServicoResponsavel.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            }
          }
        })
      : { count: 0 };

    const pecas = checklistIds.length
      ? await tx.ordemServicoPeca.deleteMany({
          where: {
            checklistId: {
              in: checklistIds
            }
          }
        })
      : { count: 0 };

    const checklistRespostas = ordemIds.length
      ? await tx.ordemServicoChecklistResposta.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            }
          }
        })
      : { count: 0 };

    const checklists = ordemIds.length
      ? await tx.ordemServicoChecklist.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            }
          }
        })
      : { count: 0 };

    const evidencias = ordemIds.length
      ? await tx.ordemServicoEvidencia.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            }
          }
        })
      : { count: 0 };

    const assinaturas = ordemIds.length
      ? await tx.ordemServicoAssinatura.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            }
          }
        })
      : { count: 0 };

    const observacoes = ordemIds.length
      ? await tx.ordemServicoObservacao.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            }
          }
        })
      : { count: 0 };

    const eventos = ordemIds.length
      ? await tx.ordemServicoEvento.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            }
          }
        })
      : { count: 0 };

    const ordensRemovidas = ordemIds.length
      ? await tx.ordemServico.deleteMany({
          where: {
            id: {
              in: ordemIds
            }
          }
        })
      : { count: 0 };

    return {
      planos_recorrencia_desvinculados: planosAtualizados.count,
      pmoc_relatorios: relatoriosPmoc.count,
      automacoes_agendadas: automacoes.count,
      ordem_servico_responsaveis: responsaveis.count,
      ordem_servico_pecas: pecas.count,
      ordem_servico_checklist_respostas: checklistRespostas.count,
      ordem_servico_checklists: checklists.count,
      ordem_servico_evidencias: evidencias.count,
      ordem_servico_assinaturas: assinaturas.count,
      ordem_servico_observacoes: observacoes.count,
      ordem_servico_eventos: eventos.count,
      ordens_servico: ordensRemovidas.count
    };
  });

  console.log(JSON.stringify(resultado, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
