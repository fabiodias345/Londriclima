import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { OrdemServicoEventoAcao, OrdemServicoStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUser } from "../auth/auth-user";

@Injectable()
export class AdminService {
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

  async listarLocalizacoesFrota(usuario: AuthenticatedUser) {
    const veiculos = await this.prisma.veiculo.findMany({
      where: {
        empresaId: usuario.empresa_id,
        ativo: true
      },
      orderBy: {
        nome: "asc"
      },
      select: {
        id: true,
        nome: true,
        placa: true,
        rastreadorImei: true,
        localizacoes: {
          orderBy: {
            registradoEm: "desc"
          },
          take: 1,
          select: {
            latitude: true,
            longitude: true,
            velocidadeKmh: true,
            ignicao: true,
            registradoEm: true
          }
        }
      }
    });

    return {
      total: veiculos.length,
      items: veiculos.map((veiculo) => {
        const localizacao = veiculo.localizacoes[0];

        return {
          id: veiculo.id,
          nome: veiculo.nome,
          placa: veiculo.placa,
          rastreador_imei: veiculo.rastreadorImei,
          localizacao: localizacao
            ? {
                latitude: localizacao.latitude.toNumber(),
                longitude: localizacao.longitude.toNumber(),
                velocidade_kmh: localizacao.velocidadeKmh?.toNumber() ?? null,
                ignicao: localizacao.ignicao,
                registrado_em: localizacao.registradoEm.toISOString()
              }
            : null
        };
      })
    };
  }

  async aprovarPreChamado(osId: string, usuario: AuthenticatedUser) {
    return this.atualizarStatusPreChamado({
      osId,
      usuario,
      acao: OrdemServicoEventoAcao.aprovar,
      statusNovo: OrdemServicoStatus.aberta
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
        throw new NotFoundException("Pré-chamado não encontrado.");
      }

      if (ordem.status !== OrdemServicoStatus.pre_chamado) {
        throw new ConflictException("Somente pré-chamados pendentes podem ser atualizados.");
      }

      const ordemAtualizada = await tx.ordemServico.update({
        where: {
          id: input.osId
        },
        data: {
          status: input.statusNovo
        },
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

      return ordemAtualizada;
    });

    return {
      os_id: resultado.id,
      status: resultado.status,
      atualizado_em: resultado.atualizadaEm.toISOString()
    };
  }
}
