import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  OrdemServicoEventoAcao,
  OrdemServicoStatus,
  Prisma,
  UsuarioRole
} from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { SalvarOsAgendaDto } from "../dto/salvar-os-agenda.dto";

const STATUS_OS_OPERACIONAIS: OrdemServicoStatus[] = [
  OrdemServicoStatus.aberta,
  OrdemServicoStatus.em_deslocamento,
  OrdemServicoStatus.em_atendimento
];

@Injectable()
export class AdminAgendaService {
  constructor(private readonly prisma: PrismaService) {}

  async listarAgenda(usuario: AuthenticatedUser) {
    const ordens = await this.prisma.ordemServico.findMany({
      where: {
        empresaId: usuario.empresa_id,
        status: {
          in: STATUS_OS_OPERACIONAIS
        }
      },
      orderBy: [
        {
          agendadaPara: "asc"
        },
        {
          criadaEm: "desc"
        }
      ],
      select: {
        id: true,
        titulo: true,
        problemaRelatado: true,
        status: true,
        agendadaPara: true,
        criadaEm: true,
        valorCobrado: true,
        checklistTipo: true,
        cliente: {
          select: {
            id: true,
            nome: true,
            telefone: true
          }
        },
        endereco: {
          select: {
            bairro: true,
            cidade: true,
            uf: true
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
        equipamento: {
          select: {
            id: true,
            patrimonio: true,
            marca: true,
            modelo: true,
            localInstalacao: true
          }
        }
      }
    });

    return {
      total: ordens.length,
      items: ordens.map((ordem) => ({
        id: ordem.id,
        titulo: ordem.titulo,
        detalhes: ordem.problemaRelatado,
        status: ordem.status,
        agendada_para: ordem.agendadaPara?.toISOString() ?? null,
        criada_em: ordem.criadaEm.toISOString(),
        valor_cobrado: ordem.valorCobrado?.toNumber() ?? null,
        checklist_tipo: ordem.checklistTipo,
        cliente: ordem.cliente,
        endereco: ordem.endereco,
        equipe: ordem.equipe,
        tecnico: ordem.tecnico,
        equipamento: ordem.equipamento
      }))
    };
  }

  async criarOrdemAgenda(dto: SalvarOsAgendaDto, usuario: AuthenticatedUser) {
    if (!dto.cliente_id) {
      throw new BadRequestException("Cliente e obrigatorio.");
    }

    return this.prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.findFirst({
        where: {
          id: dto.cliente_id,
          empresaId: usuario.empresa_id
        },
        select: {
          id: true,
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
      });

      if (!cliente) {
        throw new NotFoundException("Cliente nao encontrado.");
      }

      await this.validarDestinoAgenda(tx, dto, usuario);

      const ordem = await tx.ordemServico.create({
        data: {
          empresaId: usuario.empresa_id,
          clienteId: cliente.id,
          enderecoId: cliente.enderecos[0]?.id ?? undefined,
          equipamentoId: dto.equipamento_id || undefined,
          equipeId: dto.equipe_id || undefined,
          tecnicoId: dto.tecnico_id || undefined,
          status: OrdemServicoStatus.aberta,
          titulo: this.normalizarTextoObrigatorio(dto.titulo, "Titulo da OS e obrigatorio."),
          problemaRelatado: this.normalizarTextoOpcional(dto.detalhes),
          agendadaPara: dto.agendada_para ? new Date(dto.agendada_para) : undefined,
          valorCobrado: dto.valor_cobrado !== undefined ? new Prisma.Decimal(dto.valor_cobrado) : undefined
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

      return this.mapearAtualizacaoOrdem(ordem);
    });
  }

  async reprogramarOrdemAgenda(osId: string, dto: SalvarOsAgendaDto, usuario: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const ordemExistente = await tx.ordemServico.findUnique({
        where: {
          id: osId
        },
        select: {
          id: true,
          empresaId: true,
          status: true,
          clienteId: true
        }
      });

      if (!ordemExistente || ordemExistente.empresaId !== usuario.empresa_id) {
        throw new NotFoundException("OS nao encontrada.");
      }

      if (!STATUS_OS_OPERACIONAIS.includes(ordemExistente.status)) {
        throw new ConflictException("Somente OS operacionais podem ser reprogramadas.");
      }

      let enderecoId: string | null | undefined;
      const clienteId = dto.cliente_id || ordemExistente.clienteId;

      if (dto.cliente_id) {
        const cliente = await tx.cliente.findFirst({
          where: {
            id: dto.cliente_id,
            empresaId: usuario.empresa_id
          },
          select: {
            id: true,
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
        });

        if (!cliente) {
          throw new NotFoundException("Cliente nao encontrado.");
        }

        enderecoId = cliente.enderecos[0]?.id ?? null;
      }

      await this.validarDestinoAgenda(tx, { ...dto, cliente_id: clienteId }, usuario);

      const data: Prisma.OrdemServicoUncheckedUpdateInput = {};

      if (dto.cliente_id !== undefined) {
        data.clienteId = dto.cliente_id;
        data.enderecoId = enderecoId;
      }

      if (dto.titulo !== undefined) {
        data.titulo = this.normalizarTextoObrigatorio(dto.titulo, "Titulo da OS e obrigatorio.");
      }

      if (dto.detalhes !== undefined) {
        data.problemaRelatado = this.normalizarTextoOpcional(dto.detalhes);
      }

      if (dto.agendada_para !== undefined) {
        data.agendadaPara = dto.agendada_para ? new Date(dto.agendada_para) : null;
      }

      if (dto.equipamento_id !== undefined) {
        data.equipamentoId = dto.equipamento_id || null;
      }

      if (dto.equipe_id !== undefined) {
        data.equipeId = dto.equipe_id || null;
      }

      if (dto.tecnico_id !== undefined) {
        data.tecnicoId = dto.tecnico_id || null;
      }

      if (dto.valor_cobrado !== undefined) {
        data.valorCobrado = new Prisma.Decimal(dto.valor_cobrado);
      }

      const ordem = await tx.ordemServico.update({
        where: {
          id: osId
        },
        data,
        select: {
          id: true,
          status: true,
          atualizadaEm: true
        }
      });

      return this.mapearAtualizacaoOrdem(ordem);
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
