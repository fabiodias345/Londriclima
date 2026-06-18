import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  OrdemServicoEventoAcao,
  OrdemServicoStatus,
  PlanoRecorrenciaFrequencia,
  Prisma,
  UsuarioRole
} from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { SalvarOsAgendaDto } from "../dto/salvar-os-agenda.dto";
import { SalvarPlanoRecorrenciaDto } from "../dto/salvar-plano-recorrencia.dto";

@Injectable()
export class AdminRecorrenciaService {
  constructor(private readonly prisma: PrismaService) {}

  async listarPlanosRecorrencia(usuario: AuthenticatedUser) {
    const planos = await this.prisma.planoRecorrencia.findMany({
      where: {
        empresaId: usuario.empresa_id
      },
      orderBy: [
        {
          ativo: "desc"
        },
        {
          proximaExecucao: "asc"
        }
      ],
      take: 80,
      select: {
        id: true,
        titulo: true,
        detalhes: true,
        frequencia: true,
        proximaExecucao: true,
        valorCobrado: true,
        ativo: true,
        atualizadoEm: true,
        cliente: {
          select: {
            id: true,
            nome: true,
            telefone: true
          }
        },
        equipamento: {
          select: {
            id: true,
            patrimonio: true,
            marca: true,
            modelo: true,
            localInstalacao: true
          }
        },
        equipe: {
          select: {
            id: true,
            nome: true
          }
        },
        tecnico: {
          select: {
            id: true,
            nome: true
          }
        },
        ultimoOs: {
          select: {
            id: true,
            titulo: true,
            agendadaPara: true,
            status: true
          }
        }
      }
    });

    const agora = new Date();

    return {
      total: planos.length,
      ativos: planos.filter((plano) => plano.ativo).length,
      vencidos: planos.filter((plano) => plano.ativo && plano.proximaExecucao <= agora).length,
      items: planos.map((plano) => this.mapearPlanoRecorrencia(plano))
    };
  }

  async criarPlanoRecorrencia(dto: SalvarPlanoRecorrenciaDto, usuario: AuthenticatedUser) {
    await this.garantirClienteAgenda(dto.cliente_id, usuario);
    await this.validarDestinoAgenda(this.prisma, dto, usuario);

    const plano = await this.prisma.planoRecorrencia.create({
      data: {
        empresaId: usuario.empresa_id,
        clienteId: dto.cliente_id,
        equipamentoId: dto.equipamento_id || undefined,
        equipeId: dto.equipe_id || undefined,
        tecnicoId: dto.tecnico_id || undefined,
        titulo: this.normalizarTextoObrigatorio(dto.titulo, "Titulo do plano e obrigatorio."),
        detalhes: this.normalizarTextoOpcional(dto.detalhes),
        frequencia: dto.frequencia,
        proximaExecucao: new Date(dto.proxima_execucao),
        valorCobrado: dto.valor_cobrado !== undefined ? new Prisma.Decimal(dto.valor_cobrado) : undefined,
        ativo: dto.ativo ?? true
      },
      select: {
        id: true,
        atualizadoEm: true
      }
    });

    return {
      plano_id: plano.id,
      atualizado_em: plano.atualizadoEm.toISOString()
    };
  }

  async atualizarPlanoRecorrencia(planoId: string, dto: SalvarPlanoRecorrenciaDto, usuario: AuthenticatedUser) {
    const planoExistente = await this.prisma.planoRecorrencia.findFirst({
      where: {
        id: planoId,
        empresaId: usuario.empresa_id
      },
      select: {
        id: true
      }
    });

    if (!planoExistente) {
      throw new NotFoundException("Plano recorrente nao encontrado.");
    }

    await this.garantirClienteAgenda(dto.cliente_id, usuario);
    await this.validarDestinoAgenda(this.prisma, dto, usuario);

    const plano = await this.prisma.planoRecorrencia.update({
      where: {
        id: planoId
      },
      data: {
        clienteId: dto.cliente_id,
        equipamentoId: dto.equipamento_id || null,
        equipeId: dto.equipe_id || null,
        tecnicoId: dto.tecnico_id || null,
        titulo: this.normalizarTextoObrigatorio(dto.titulo, "Titulo do plano e obrigatorio."),
        detalhes: this.normalizarTextoOpcional(dto.detalhes),
        frequencia: dto.frequencia,
        proximaExecucao: new Date(dto.proxima_execucao),
        valorCobrado: dto.valor_cobrado !== undefined ? new Prisma.Decimal(dto.valor_cobrado) : null,
        ativo: dto.ativo ?? true
      },
      select: {
        id: true,
        atualizadoEm: true
      }
    });

    return {
      plano_id: plano.id,
      atualizado_em: plano.atualizadoEm.toISOString()
    };
  }

  async gerarOrdemPlanoRecorrencia(planoId: string, usuario: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const plano = await tx.planoRecorrencia.findFirst({
        where: {
          id: planoId,
          empresaId: usuario.empresa_id
        },
        select: {
          id: true,
          empresaId: true,
          clienteId: true,
          equipamentoId: true,
          equipeId: true,
          tecnicoId: true,
          titulo: true,
          detalhes: true,
          frequencia: true,
          proximaExecucao: true,
          valorCobrado: true,
          ativo: true,
          cliente: {
            select: {
              enderecos: {
                orderBy: {
                  principal: "desc"
                },
                take: 1,
                select: {
                  id: true
                }
              }
            }
          }
        }
      });

      if (!plano) {
        throw new NotFoundException("Plano recorrente nao encontrado.");
      }

      if (!plano.ativo) {
        throw new ConflictException("Plano recorrente inativo.");
      }

      const ordem = await tx.ordemServico.create({
        data: {
          empresaId: plano.empresaId,
          clienteId: plano.clienteId,
          enderecoId: plano.cliente.enderecos[0]?.id ?? undefined,
          equipamentoId: plano.equipamentoId ?? undefined,
          equipeId: plano.equipeId ?? undefined,
          tecnicoId: plano.tecnicoId ?? undefined,
          status: OrdemServicoStatus.aberta,
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

      await tx.ordemServicoEvento.create({
        data: {
          empresaId: usuario.empresa_id,
          ordemServicoId: ordem.id,
          usuarioId: usuario.id,
          acao: OrdemServicoEventoAcao.aprovar,
          statusAnterior: OrdemServicoStatus.pre_chamado,
          statusNovo: OrdemServicoStatus.aberta,
          registradoEm: new Date()
        }
      });

      const proximaExecucao = this.calcularProximaExecucao(plano.proximaExecucao, plano.frequencia);
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
        ...this.mapearAtualizacaoOrdem(ordem),
        proxima_execucao: proximaExecucao.toISOString()
      };
    });
  }

  private async validarDestinoAgenda(
    tx: Pick<Prisma.TransactionClient, "equipamento" | "equipe" | "usuario">,
    dto: SalvarOsAgendaDto,
    usuario: AuthenticatedUser
  ) {
    if (dto.equipamento_id) {
      const equipamento = await tx.equipamento.findFirst({
        where: {
          id: dto.equipamento_id,
          empresaId: usuario.empresa_id,
          clienteId: dto.cliente_id
        },
        select: {
          id: true
        }
      });

      if (!equipamento) {
        throw new NotFoundException("Equipamento nao encontrado.");
      }
    }

    if (dto.equipe_id) {
      const equipe = await tx.equipe.findFirst({
        where: {
          id: dto.equipe_id,
          empresaId: usuario.empresa_id,
          ativa: true
        },
        select: {
          id: true
        }
      });

      if (!equipe) {
        throw new NotFoundException("Equipe nao encontrada.");
      }
    }

    if (dto.tecnico_id) {
      const tecnico = await tx.usuario.findFirst({
        where: {
          id: dto.tecnico_id,
          empresaId: usuario.empresa_id,
          ativo: true,
          role: {
            in: [UsuarioRole.tecnico, UsuarioRole.auxiliar]
          }
        },
        select: {
          id: true
        }
      });

      if (!tecnico) {
        throw new NotFoundException("Tecnico nao encontrado.");
      }
    }
  }

  private async garantirClienteAgenda(clienteId: string, usuario: AuthenticatedUser) {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id: clienteId,
        empresaId: usuario.empresa_id
      },
      select: {
        id: true
      }
    });

    if (!cliente) {
      throw new NotFoundException("Cliente nao encontrado.");
    }
  }

  private calcularProximaExecucao(data: Date, frequencia: PlanoRecorrenciaFrequencia) {
    const mesesPorFrequencia: Record<PlanoRecorrenciaFrequencia, number> = {
      [PlanoRecorrenciaFrequencia.mensal]: 1,
      [PlanoRecorrenciaFrequencia.trimestral]: 3,
      [PlanoRecorrenciaFrequencia.semestral]: 6,
      [PlanoRecorrenciaFrequencia.anual]: 12
    };
    const proxima = new Date(data);
    proxima.setMonth(proxima.getMonth() + mesesPorFrequencia[frequencia]);
    return proxima;
  }

  private mapearPlanoRecorrencia(plano: {
    id: string;
    titulo: string;
    detalhes: string | null;
    frequencia: PlanoRecorrenciaFrequencia;
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

  private normalizarTextoObrigatorio(valor: string | undefined, mensagem: string) {
    const texto = valor?.trim();

    if (!texto) {
      throw new BadRequestException(mensagem);
    }

    return texto;
  }

  private normalizarTextoOpcional(valor: string | undefined) {
    const texto = valor?.trim();
    return texto || null;
  }

  private mapearAtualizacaoOrdem(ordem: { id: string; status: OrdemServicoStatus; atualizadaEm: Date }) {
    return {
      os_id: ordem.id,
      status: ordem.status,
      atualizado_em: ordem.atualizadaEm.toISOString()
    };
  }
}
