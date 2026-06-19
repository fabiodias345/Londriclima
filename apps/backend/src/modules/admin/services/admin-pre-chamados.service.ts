import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  OrdemServicoEventoAcao,
  OrdemServicoResponsavelTipo,
  OrdemServicoStatus,
  Prisma,
  UsuarioRole
} from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { AprovarPreChamadoDto } from "../dto/aprovar-pre-chamado.dto";

@Injectable()
export class AdminPreChamadosService {
  constructor(private readonly prisma: PrismaService) {}

  async listarPreChamados(usuario: AuthenticatedUser) {
    const ordens = await this.prisma.ordemServico.findMany({
      where: {
        empresaId: usuario.empresa_id,
        status: OrdemServicoStatus.pre_chamado
      },
      orderBy: {
        criadaEm: "desc"
      },
      select: {
        id: true,
        titulo: true,
        problemaRelatado: true,
        status: true,
        criadaEm: true,
        cliente: {
          select: {
            nome: true,
            telefone: true,
            email: true
          }
        },
        endereco: {
          select: {
            bairro: true,
            cidade: true,
            uf: true,
            logradouro: true
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
        criado_em: ordem.criadaEm.toISOString(),
        cliente: ordem.cliente,
        endereco: ordem.endereco
      }))
    };
  }

  async aprovarPreChamado(osId: string, usuario: AuthenticatedUser, dto: AprovarPreChamadoDto = {}) {
    return this.atualizarStatusPreChamado({
      osId,
      usuario,
      acao: OrdemServicoEventoAcao.aprovar,
      statusNovo: OrdemServicoStatus.aberta,
      dto
    });
  }

  async rejeitarPreChamado(osId: string, usuario: AuthenticatedUser) {
    return this.atualizarStatusPreChamado({
      osId,
      usuario,
      acao: OrdemServicoEventoAcao.rejeitar,
      statusNovo: OrdemServicoStatus.rejeitada
    });
  }

  private async atualizarStatusPreChamado(input: {
    osId: string;
    usuario: AuthenticatedUser;
    acao: OrdemServicoEventoAcao;
    statusNovo: OrdemServicoStatus;
    dto?: AprovarPreChamadoDto;
  }) {
    const resultado = await this.prisma.$transaction(async (tx) => {
      const ordem = await tx.ordemServico.findUnique({
        where: {
          id: input.osId
        },
        select: {
          id: true,
          empresaId: true,
          status: true
        }
      });

      if (!ordem || ordem.empresaId !== input.usuario.empresa_id) {
        throw new NotFoundException("Pre-chamado nao encontrado.");
      }

      if (ordem.status !== OrdemServicoStatus.pre_chamado) {
        throw new ConflictException("Somente pre-chamados pendentes podem ser atualizados.");
      }

      const equipeIds = this.obterIdsUnicos([...(input.dto?.equipe_ids || []), input.dto?.equipe_id]);
      const usuarioIds = this.obterIdsUnicos([...(input.dto?.usuario_ids || []), input.dto?.tecnico_id]);

      await this.validarEquipes(equipeIds, tx, input.usuario);
      await this.validarTecnicos(usuarioIds, tx, input.usuario);

      const updateData: Prisma.OrdemServicoUncheckedUpdateInput = {
        status: input.statusNovo
      };

      if (input.dto?.agendada_para) {
        updateData.agendadaPara = new Date(input.dto.agendada_para);
      }

      if (equipeIds[0]) {
        updateData.equipeId = equipeIds[0];
      }

      if (usuarioIds[0]) {
        updateData.tecnicoId = usuarioIds[0];
      }

      if (input.dto?.valor_cobrado !== undefined) {
        updateData.valorCobrado = new Prisma.Decimal(input.dto.valor_cobrado);
      }

      const ordemAtualizada = await tx.ordemServico.update({
        where: {
          id: input.osId
        },
        data: updateData,
        select: {
          id: true,
          status: true,
          atualizadaEm: true
        }
      });

      await tx.ordemServicoEvento.create({
        data: {
          empresaId: ordem.empresaId,
          ordemServicoId: ordem.id,
          usuarioId: input.usuario.id,
          acao: input.acao,
          statusAnterior: ordem.status,
          statusNovo: input.statusNovo,
          registradoEm: new Date()
        }
      });

      if (tx.ordemServicoResponsavel) {
        await tx.ordemServicoResponsavel.deleteMany({
          where: {
            ordemServicoId: ordem.id
          }
        });

        if (input.statusNovo === OrdemServicoStatus.aberta && (usuarioIds.length > 0 || equipeIds.length > 0)) {
          await tx.ordemServicoResponsavel.createMany({
            data: [
              ...usuarioIds.map((usuarioId) => ({
                empresaId: ordem.empresaId,
                ordemServicoId: ordem.id,
                tipo: OrdemServicoResponsavelTipo.usuario,
                usuarioId
              })),
              ...equipeIds.map((equipeId) => ({
                empresaId: ordem.empresaId,
                ordemServicoId: ordem.id,
                tipo: OrdemServicoResponsavelTipo.equipe,
                equipeId
              }))
            ],
            skipDuplicates: true
          });
        }
      }

      return ordemAtualizada;
    });

    return {
      os_id: resultado.id,
      status: resultado.status,
      atualizado_em: resultado.atualizadaEm.toISOString()
    };
  }

  private async validarEquipes(
    equipeIds: string[],
    tx: Prisma.TransactionClient,
    usuario: AuthenticatedUser
  ) {
    if (!equipeIds.length) {
      return;
    }

    const total = await tx.equipe.count({
      where: {
        id: {
          in: equipeIds
        },
        empresaId: usuario.empresa_id,
        ativa: true
      }
    });

    if (total !== equipeIds.length) {
      throw new NotFoundException("Equipe nao encontrada.");
    }
  }

  private async validarTecnicos(
    usuarioIds: string[],
    tx: Prisma.TransactionClient,
    usuario: AuthenticatedUser
  ) {
    if (!usuarioIds.length) {
      return;
    }

    const total = await tx.usuario.count({
      where: {
        id: {
          in: usuarioIds
        },
        empresaId: usuario.empresa_id,
        ativo: true,
        role: {
          in: [UsuarioRole.tecnico, UsuarioRole.auxiliar]
        }
      }
    });

    if (total !== usuarioIds.length) {
      throw new NotFoundException("Tecnico nao encontrado.");
    }
  }

  private obterIdsUnicos(ids: Array<string | undefined>) {
    return [...new Set(ids.map((id) => id?.trim()).filter((id): id is string => Boolean(id)))];
  }
}
