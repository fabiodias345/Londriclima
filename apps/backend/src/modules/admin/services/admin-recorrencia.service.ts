import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  UsuarioRole
} from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { SalvarOsAgendaDto } from "../dto/salvar-os-agenda.dto";
import { SalvarPlanoRecorrenciaDto } from "../dto/salvar-plano-recorrencia.dto";
import {
  aplicarDiaGeracao,
  checklistTipoDaFrequencia,
  normalizarCalendarioRecorrencia,
  normalizarDiaGeracao
} from "./admin-recorrencia-calendario";
import { criarOrdemRecorrente, PlanoRecorrenciaParaGeracao } from "./admin-recorrencia-generator";
import { mapearPlanoRecorrencia } from "./admin-recorrencia-mappers";

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
        checklistTipo: true,
        calendario: true,
        diaGeracao: true,
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
      items: planos.map((plano) => mapearPlanoRecorrencia(plano))
    };
  }

  async criarPlanoRecorrencia(dto: SalvarPlanoRecorrenciaDto, usuario: AuthenticatedUser) {
    await this.garantirClienteAgenda(dto.cliente_id, usuario);
    await this.validarDestinoAgenda(this.prisma, dto, usuario);
    const calendario = normalizarCalendarioRecorrencia(dto.calendario, dto.frequencia);
    const primeiraExecucao = new Date(dto.proxima_execucao);
    const diaGeracao = normalizarDiaGeracao(dto.dia_geracao ?? primeiraExecucao.getUTCDate());

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
        checklistTipo: dto.checklist_tipo ?? checklistTipoDaFrequencia(dto.frequencia),
        calendario,
        diaGeracao,
        proximaExecucao: aplicarDiaGeracao(primeiraExecucao, diaGeracao),
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
    const calendario = normalizarCalendarioRecorrencia(dto.calendario, dto.frequencia);
    const proximaExecucao = new Date(dto.proxima_execucao);
    const diaGeracao = normalizarDiaGeracao(dto.dia_geracao ?? proximaExecucao.getUTCDate());

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
        checklistTipo: dto.checklist_tipo ?? checklistTipoDaFrequencia(dto.frequencia),
        calendario,
        diaGeracao,
        proximaExecucao: aplicarDiaGeracao(proximaExecucao, diaGeracao),
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
          checklistTipo: true,
          calendario: true,
          diaGeracao: true,
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

      return criarOrdemRecorrente(tx, plano, usuario.id);
    });
  }

  async gerarOrdensRecorrentesVencidas(agora = new Date()) {
    const planos = await this.prisma.planoRecorrencia.findMany({
      where: {
        ativo: true,
        proximaExecucao: {
          lte: agora
        }
      },
      orderBy: {
        proximaExecucao: "asc"
      },
      take: 20,
      select: {
        id: true
      }
    });

    let geradas = 0;
    let falhas = 0;

    for (const plano of planos) {
      try {
        await this.gerarOrdemSistema(plano.id);
        geradas += 1;
      } catch {
        falhas += 1;
      }
    }

    return {
      verificados: planos.length,
      geradas,
      falhas
    };
  }

  async apagarPlanoRecorrencia(planoId: string, usuario: AuthenticatedUser) {
    const plano = await this.prisma.planoRecorrencia.findFirst({
      where: {
        id: planoId,
        empresaId: usuario.empresa_id
      },
      select: {
        id: true,
        clienteId: true
      }
    });

    if (!plano) {
      throw new NotFoundException("Plano recorrente nao encontrado.");
    }

    await this.prisma.planoRecorrencia.delete({
      where: {
        id: plano.id
      }
    });

    return {
      id: plano.id,
      cliente_id: plano.clienteId,
      apagado: true
    };
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

  private async gerarOrdemSistema(planoId: string) {
    return this.prisma.$transaction(async (tx) => {
      const plano = await tx.planoRecorrencia.findFirst({
        where: {
          id: planoId,
          ativo: true
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
          checklistTipo: true,
          calendario: true,
          diaGeracao: true,
          proximaExecucao: true,
          valorCobrado: true,
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

      return criarOrdemRecorrente(tx, plano as PlanoRecorrenciaParaGeracao, null);
    });
  }
}
