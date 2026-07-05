import { Injectable } from "@nestjs/common";
import {
  ChecklistTipo,
  OrdemServicoEventoAcao,
  OrdemServicoStatus,
  OrdemServicoTipoServico,
  Prisma
} from "@prisma/client";

@Injectable()
export class AdminRelatorioTecnicoMapper {
  ordemRelatorioTecnicoSelect() {
    return {
      id: true,
      titulo: true,
      tipoServico: true,
      checklistTipo: true,
      problemaRelatado: true,
      status: true,
      agendadaPara: true,
      concluidaEm: true,
      valorCobrado: true,
      tecnico: {
        select: {
          id: true,
          nome: true,
          email: true,
          fotoPerfilStorageUrl: true,
          assinaturaStorageUrl: true
        }
      },
      equipe: {
        select: {
          id: true,
          nome: true,
          membros: {
            where: {
              ativo: true
            },
            select: {
              usuario: {
                select: {
                  nome: true,
                  fotoPerfilStorageUrl: true,
                  assinaturaStorageUrl: true
                }
              }
            }
          }
        }
      },
      eventos: {
        orderBy: {
          registradoEm: "asc"
        },
        select: {
          id: true,
          acao: true,
          statusAnterior: true,
          statusNovo: true,
          latitude: true,
          longitude: true,
          registradoEm: true
        }
      },
      evidencias: {
        orderBy: {
          criadoEm: "asc"
        },
        select: {
          id: true,
          tipo: true,
          descricao: true,
          storageUrl: true,
          mimeType: true,
          tamanhoBytes: true,
          criadoEm: true
        }
      },
      checklist: {
        select: {
          id: true,
          servicoRealizado: true,
          procedimentos: true,
          custoTotalPecas: true,
          criadoEm: true,
          atualizadoEm: true,
          pecas: {
            select: {
              id: true,
              descricaoPeca: true,
              quantidade: true,
              custoUnitario: true
            }
          }
        }
      },
      checklistRespostas: {
        orderBy: {
          codigo: "asc"
        },
        select: {
          equipamentoId: true,
          codigo: true,
          tipo: true,
          valor: true,
          observacao: true
        }
      },
      assinatura: {
        select: {
          id: true,
          nomeResponsavel: true,
          storageUrl: true,
          nomeTecnico: true,
          assinaturaTecnicoStorageUrl: true,
          fotoTecnicoStorageUrl: true,
          latitude: true,
          longitude: true,
          assinadoEm: true
        }
      },
      observacoes: {
        where: {
          visivelNoRelatorio: true
        },
        orderBy: {
          criadoEm: "asc"
        },
        select: {
          id: true,
          texto: true,
          visivelNoRelatorio: true,
          criadoEm: true
        }
      }
    } satisfies Prisma.OrdemServicoSelect;
  }

  mapearMaquinaRelatorioTecnico(equipamento: {
    id: string;
    tipo: string | null;
    patrimonio: string | null;
    codigoBarras: string | null;
    marca: string;
    modelo: string;
    capacidadeBtu: number | null;
    gasRefrigerante: string | null;
    numeroSerie: string | null;
    localInstalacao: string | null;
    areaClimatizadaM2: number | null;
    ocupantesFixo: number | null;
    ocupantesVariavel: number | null;
    atualizadoEm: Date;
    ordensServico: Array<{
      id: string;
      titulo: string;
      tipoServico: OrdemServicoTipoServico;
      checklistTipo: ChecklistTipo;
      problemaRelatado: string | null;
      status: OrdemServicoStatus;
      agendadaPara: Date | null;
      concluidaEm: Date | null;
      valorCobrado: Prisma.Decimal | null;
      tecnico: { id: string; nome: string; email: string; fotoPerfilStorageUrl: string | null; assinaturaStorageUrl: string | null } | null;
      equipe: { id: string; nome: string; membros?: Array<{ usuario: { nome: string } }> } | null;
      eventos: Array<{
        id: string;
        acao: OrdemServicoEventoAcao;
        statusAnterior: OrdemServicoStatus | null;
        statusNovo: OrdemServicoStatus;
        latitude: Prisma.Decimal | null;
        longitude: Prisma.Decimal | null;
        registradoEm: Date;
      }>;
      evidencias: Array<{
        id: string;
        tipo: string;
        descricao: string;
        storageUrl: string;
        mimeType: string | null;
        tamanhoBytes: number | null;
        criadoEm: Date;
      }>;
      checklist: {
        id: string;
        servicoRealizado: string;
        procedimentos: string[];
        custoTotalPecas: Prisma.Decimal;
        criadoEm: Date;
        atualizadoEm: Date;
        pecas: Array<{
          id: string;
          descricaoPeca: string;
          quantidade: number;
          custoUnitario: Prisma.Decimal;
        }>;
      } | null;
      checklistRespostas?: Array<{
        equipamentoId?: string | null;
        codigo: string;
        tipo: string;
        valor: string;
        observacao: string | null;
      }>;
      assinatura: {
        id: string;
        nomeResponsavel: string;
        storageUrl: string;
        nomeTecnico: string | null;
        assinaturaTecnicoStorageUrl: string | null;
        fotoTecnicoStorageUrl: string | null;
        latitude: Prisma.Decimal;
        longitude: Prisma.Decimal;
        assinadoEm: Date;
      } | null;
      observacoes: Array<{
        id: string;
        texto: string;
        visivelNoRelatorio: boolean;
        criadoEm: Date;
      }>;
    }>;
  }) {
    const osConcluidas = equipamento.ordensServico.map((ordem) => this.mapearOrdemRelatorioTecnico(ordem));

    return {
      id: equipamento.id,
      tipo: equipamento.tipo,
      patrimonio: equipamento.patrimonio,
      codigo_barras: equipamento.codigoBarras,
      marca: equipamento.marca,
      modelo: equipamento.modelo,
      capacidade_btu: equipamento.capacidadeBtu,
      gas_refrigerante: equipamento.gasRefrigerante,
      numero_serie: equipamento.numeroSerie,
      local_instalacao: equipamento.localInstalacao,
      area_climatizada_m2: equipamento.areaClimatizadaM2,
      ocupantes_fixo: equipamento.ocupantesFixo,
      ocupantes_variavel: equipamento.ocupantesVariavel,
      atualizado_em: equipamento.atualizadoEm.toISOString(),
      pendencias: this.obterPendenciasMaquinaRelatorioTecnico(equipamento, osConcluidas),
      os_concluidas: osConcluidas
    };
  }

  mapearOrdemRelatorioTecnico(ordem: {
    id: string;
    titulo: string;
    tipoServico: OrdemServicoTipoServico;
    checklistTipo: ChecklistTipo;
    problemaRelatado: string | null;
    status: OrdemServicoStatus;
    agendadaPara: Date | null;
    concluidaEm: Date | null;
    valorCobrado: Prisma.Decimal | null;
    tecnico: { id: string; nome: string; email: string; fotoPerfilStorageUrl: string | null; assinaturaStorageUrl: string | null } | null;
    equipe: { id: string; nome: string; membros?: Array<{ usuario: { nome: string; fotoPerfilStorageUrl?: string | null; assinaturaStorageUrl?: string | null } }> } | null;
    eventos: Array<{
      id: string;
      acao: OrdemServicoEventoAcao;
      statusAnterior: OrdemServicoStatus | null;
      statusNovo: OrdemServicoStatus;
      latitude: Prisma.Decimal | null;
      longitude: Prisma.Decimal | null;
      registradoEm: Date;
    }>;
    evidencias: Array<{
      id: string;
      tipo: string;
      descricao: string;
      storageUrl: string;
      mimeType: string | null;
      tamanhoBytes: number | null;
      criadoEm: Date;
    }>;
    checklist: {
      id: string;
      servicoRealizado: string;
      procedimentos: string[];
      custoTotalPecas: Prisma.Decimal;
      criadoEm: Date;
      atualizadoEm: Date;
      pecas: Array<{
        id: string;
        descricaoPeca: string;
        quantidade: number;
        custoUnitario: Prisma.Decimal;
      }>;
    } | null;
    checklistRespostas?: Array<{
      equipamentoId?: string | null;
      codigo: string;
      tipo: string;
      valor: string;
      observacao: string | null;
    }>;
    assinatura: {
      id: string;
      nomeResponsavel: string;
      storageUrl: string;
      nomeTecnico: string | null;
      assinaturaTecnicoStorageUrl: string | null;
      fotoTecnicoStorageUrl: string | null;
      latitude: Prisma.Decimal;
      longitude: Prisma.Decimal;
      assinadoEm: Date;
    } | null;
    observacoes: Array<{
      id: string;
      texto: string;
      visivelNoRelatorio: boolean;
      criadoEm: Date;
    }>;
  }) {
    return {
      id: ordem.id,
      titulo: ordem.titulo,
      tipo_servico: ordem.tipoServico,
      checklist_tipo: ordem.checklistTipo,
      problema_relatado: ordem.problemaRelatado,
      status: ordem.status,
      agendada_para: ordem.agendadaPara?.toISOString() ?? null,
      concluida_em: ordem.concluidaEm?.toISOString() ?? null,
      valor_cobrado: ordem.valorCobrado?.toNumber() ?? null,
      tecnico: ordem.tecnico ? {
        id: ordem.tecnico.id,
        nome: ordem.tecnico.nome,
        email: ordem.tecnico.email,
        foto_perfil_storage_url: ordem.tecnico.fotoPerfilStorageUrl,
        assinatura_storage_url: ordem.tecnico.assinaturaStorageUrl
      } : null,
      tecnico_executor: ordem.assinatura?.nomeTecnico ? {
        nome: ordem.assinatura.nomeTecnico,
        foto_perfil_storage_url: ordem.assinatura.fotoTecnicoStorageUrl,
        assinatura_storage_url: ordem.assinatura.assinaturaTecnicoStorageUrl
      } : null,
      equipe: ordem.equipe,
      eventos: ordem.eventos.map((evento) => ({
        id: evento.id,
        acao: evento.acao,
        status_anterior: evento.statusAnterior,
        status_novo: evento.statusNovo,
        latitude: evento.latitude?.toNumber() ?? null,
        longitude: evento.longitude?.toNumber() ?? null,
        registrado_em: evento.registradoEm.toISOString()
      })),
      evidencias: ordem.evidencias.map((evidencia) => ({
        id: evidencia.id,
        tipo: evidencia.tipo,
        descricao: evidencia.descricao,
        storage_url: evidencia.storageUrl,
        mime_type: evidencia.mimeType,
        tamanho_bytes: evidencia.tamanhoBytes,
        criado_em: evidencia.criadoEm.toISOString()
      })),
      checklist: ordem.checklist
        ? {
          id: ordem.checklist.id,
          servico_realizado: ordem.checklist.servicoRealizado,
          procedimentos: ordem.checklist.procedimentos,
          custo_total_pecas: ordem.checklist.custoTotalPecas.toNumber(),
          criado_em: ordem.checklist.criadoEm.toISOString(),
          atualizado_em: ordem.checklist.atualizadoEm.toISOString(),
          pecas: ordem.checklist.pecas.map((peca) => ({
            id: peca.id,
            descricao_peca: peca.descricaoPeca,
            quantidade: peca.quantidade,
            custo_unitario: peca.custoUnitario.toNumber(),
            subtotal: peca.custoUnitario.toNumber() * peca.quantidade
          }))
        }
        : null,
      checklist_respostas: (ordem.checklistRespostas ?? [])
        .filter((resposta) => resposta.tipo !== "etapa" && !resposta.codigo.startsWith("ANU_ETAPA_"))
        .map((resposta) => ({
          equipamento_id: resposta.equipamentoId ?? null,
          codigo: resposta.codigo,
          tipo: resposta.tipo,
          valor: resposta.valor,
          observacao: resposta.observacao
        })),
      assinatura: ordem.assinatura
        ? {
          id: ordem.assinatura.id,
          nome_responsavel: ordem.assinatura.nomeResponsavel,
          storage_url: ordem.assinatura.storageUrl,
          latitude: ordem.assinatura.latitude.toNumber(),
          longitude: ordem.assinatura.longitude.toNumber(),
          assinado_em: ordem.assinatura.assinadoEm.toISOString()
        }
        : null,
      observacoes: ordem.observacoes.map((observacao) => ({
        id: observacao.id,
        texto: observacao.texto,
        visivel_no_relatorio: observacao.visivelNoRelatorio,
        criado_em: observacao.criadoEm.toISOString()
      }))
    };
  }

  obterPendenciasMaquinaRelatorioTecnico(
    equipamento: { gasRefrigerante: string | null },
    osConcluidas: Array<{ evidencias: unknown[]; checklist: unknown; assinatura: unknown; eventos: Array<{ latitude: number | null; longitude: number | null }> }>
  ) {
    const pendencias: string[] = [];

    if (!equipamento.gasRefrigerante) {
      pendencias.push("gas_refrigerante_pendente");
    }

    if (!osConcluidas.length) {
      pendencias.push("sem_os_concluida");
    }

    for (const ordem of osConcluidas) {
      if (!ordem.checklist) {
        pendencias.push("checklist_pendente");
      }

      if (!ordem.assinatura) {
        pendencias.push("assinatura_cliente_pendente");
      }

      if (!ordem.evidencias.length) {
        pendencias.push("evidencias_pendentes");
      }

      if (!ordem.eventos.some((evento) => evento.latitude !== null && evento.longitude !== null)) {
        pendencias.push("gps_pendente");
      }
    }

    return Array.from(new Set(pendencias));
  }

  obterPeriodoRelatorioTecnico(maquinas: Array<{ os_concluidas: Array<{ concluida_em: string | null }> }>) {
    const datas = maquinas
      .flatMap((maquina) => maquina.os_concluidas.map((ordem) => ordem.concluida_em))
      .filter((data): data is string => Boolean(data))
      .sort();

    return {
      inicio: datas[0] ?? null,
      fim: datas[datas.length - 1] ?? null
    };
  }

  slugArquivo(valor: string) {
    const slug = valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug || "pmoc";
  }
}
