import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AutomacaoStatus, OrdemServicoEventoAcao, OrdemServicoStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUser } from "../auth/auth-user";
import { CriarAbastecimentoDto } from "./dto/criar-abastecimento.dto";

const STATUS_OS_OPERACIONAIS: OrdemServicoStatus[] = [
  OrdemServicoStatus.aberta,
  OrdemServicoStatus.em_deslocamento,
  OrdemServicoStatus.em_atendimento
];

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

  async listarAbastecimentos(usuario: AuthenticatedUser) {
    const abastecimentos = await this.prisma.veiculoAbastecimento.findMany({
      where: {
        empresaId: usuario.empresa_id
      },
      orderBy: {
        abastecidoEm: "desc"
      },
      take: 50,
      select: {
        id: true,
        odometroKm: true,
        litros: true,
        valorTotal: true,
        precoPorLitro: true,
        abastecidoEm: true,
        posto: true,
        observacao: true,
        veiculo: {
          select: {
            id: true,
            nome: true,
            placa: true
          }
        },
        usuario: {
          select: {
            nome: true
          }
        }
      }
    });

    return {
      total: abastecimentos.length,
      items: abastecimentos.map((abastecimento) => ({
        id: abastecimento.id,
        veiculo: abastecimento.veiculo,
        usuario: abastecimento.usuario,
        odometro_km: abastecimento.odometroKm.toNumber(),
        litros: abastecimento.litros.toNumber(),
        valor_total: abastecimento.valorTotal.toNumber(),
        preco_por_litro: abastecimento.precoPorLitro.toNumber(),
        abastecido_em: abastecimento.abastecidoEm.toISOString(),
        posto: abastecimento.posto,
        observacao: abastecimento.observacao
      }))
    };
  }

  async criarAbastecimento(dto: CriarAbastecimentoDto, usuario: AuthenticatedUser) {
    const veiculo = await this.prisma.veiculo.findFirst({
      where: {
        id: dto.veiculo_id,
        empresaId: usuario.empresa_id,
        ativo: true
      },
      select: {
        id: true,
        empresaId: true,
        nome: true
      }
    });

    if (!veiculo) {
      throw new NotFoundException("Veiculo nao encontrado.");
    }

    const ultimoAbastecimento = await this.prisma.veiculoAbastecimento.findFirst({
      where: {
        veiculoId: veiculo.id
      },
      orderBy: {
        odometroKm: "desc"
      },
      select: {
        odometroKm: true
      }
    });

    if (ultimoAbastecimento && dto.odometro_km < ultimoAbastecimento.odometroKm.toNumber()) {
      throw new ConflictException("Odometro nao pode ser menor que o ultimo abastecimento.");
    }

    const precoPorLitro = dto.valor_total / dto.litros;
    const abastecimento = await this.prisma.veiculoAbastecimento.create({
      data: {
        empresaId: veiculo.empresaId,
        veiculoId: veiculo.id,
        usuarioId: usuario.id,
        odometroKm: new Prisma.Decimal(dto.odometro_km),
        litros: new Prisma.Decimal(dto.litros),
        valorTotal: new Prisma.Decimal(dto.valor_total),
        precoPorLitro: new Prisma.Decimal(precoPorLitro),
        abastecidoEm: new Date(dto.abastecido_em),
        posto: dto.posto?.trim() || null,
        observacao: dto.observacao?.trim() || null
      },
      select: {
        id: true,
        odometroKm: true,
        litros: true,
        valorTotal: true,
        precoPorLitro: true,
        abastecidoEm: true,
        posto: true,
        observacao: true
      }
    });

    return {
      id: abastecimento.id,
      veiculo_id: veiculo.id,
      veiculo_nome: veiculo.nome,
      odometro_km: abastecimento.odometroKm.toNumber(),
      litros: abastecimento.litros.toNumber(),
      valor_total: abastecimento.valorTotal.toNumber(),
      preco_por_litro: abastecimento.precoPorLitro.toNumber(),
      abastecido_em: abastecimento.abastecidoEm.toISOString(),
      posto: abastecimento.posto,
      observacao: abastecimento.observacao
    };
  }

  async obterRelatorioFrota(usuario: AuthenticatedUser) {
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
        abastecimentos: {
          orderBy: {
            odometroKm: "asc"
          },
          select: {
            odometroKm: true,
            litros: true,
            valorTotal: true,
            abastecidoEm: true
          }
        }
      }
    });

    const items = veiculos.map((veiculo) => {
      const abastecimentos = veiculo.abastecimentos;
      const primeiro = abastecimentos[0];
      const ultimo = abastecimentos[abastecimentos.length - 1];
      const kmRodados =
        primeiro && ultimo ? Math.max(0, ultimo.odometroKm.toNumber() - primeiro.odometroKm.toNumber()) : 0;
      const litros = abastecimentos.reduce((total, item) => total + item.litros.toNumber(), 0);
      const valorTotal = abastecimentos.reduce((total, item) => total + item.valorTotal.toNumber(), 0);
      const kmPorLitro = kmRodados > 0 && litros > 0 ? kmRodados / litros : null;
      const custoPorKm = kmRodados > 0 ? valorTotal / kmRodados : null;

      return {
        veiculo_id: veiculo.id,
        nome: veiculo.nome,
        placa: veiculo.placa,
        abastecimentos: abastecimentos.length,
        km_rodados: kmRodados,
        litros,
        valor_total: valorTotal,
        km_por_litro: kmPorLitro,
        custo_por_km: custoPorKm,
        ultimo_abastecimento: ultimo?.abastecidoEm.toISOString() ?? null
      };
    });

    return {
      total_veiculos: items.length,
      km_rodados: items.reduce((total, item) => total + item.km_rodados, 0),
      litros: items.reduce((total, item) => total + item.litros, 0),
      valor_total: items.reduce((total, item) => total + item.valor_total, 0),
      items
    };
  }

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
        status: true,
        agendadaPara: true,
        criadaEm: true,
        cliente: {
          select: {
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
            nome: true
          }
        },
        tecnico: {
          select: {
            nome: true
          }
        }
      }
    });

    return {
      total: ordens.length,
      items: ordens.map((ordem) => ({
        id: ordem.id,
        titulo: ordem.titulo,
        status: ordem.status,
        agendada_para: ordem.agendadaPara?.toISOString() ?? null,
        criada_em: ordem.criadaEm.toISOString(),
        cliente: ordem.cliente,
        endereco: ordem.endereco,
        equipe: ordem.equipe,
        tecnico: ordem.tecnico
      }))
    };
  }

  async listarClientes(usuario: AuthenticatedUser) {
    const clientes = await this.prisma.cliente.findMany({
      where: {
        empresaId: usuario.empresa_id
      },
      orderBy: {
        atualizadoEm: "desc"
      },
      take: 50,
      select: {
        id: true,
        nome: true,
        tipo: true,
        documento: true,
        telefone: true,
        email: true,
        atualizadoEm: true,
        enderecos: {
          orderBy: {
            principal: "desc"
          },
          take: 1,
          select: {
            bairro: true,
            cidade: true,
            uf: true
          }
        },
        equipamentos: {
          select: {
            id: true
          }
        },
        ordensServico: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    return {
      total: clientes.length,
      items: clientes.map((cliente) => ({
        id: cliente.id,
        nome: cliente.nome,
        tipo: cliente.tipo,
        documento: cliente.documento,
        telefone: cliente.telefone,
        email: cliente.email,
        atualizado_em: cliente.atualizadoEm.toISOString(),
        endereco: cliente.enderecos[0] ?? null,
        total_equipamentos: cliente.equipamentos.length,
        total_os: cliente.ordensServico.length,
        os_abertas: cliente.ordensServico.filter((ordem) =>
          STATUS_OS_OPERACIONAIS.includes(ordem.status)
        ).length
      }))
    };
  }

  async obterRelatorios(usuario: AuthenticatedUser) {
    const relatorioFrota = await this.obterRelatorioFrota(usuario);
    const [ordens, clientes, veiculos, automacoesPendentes] = await Promise.all([
      this.prisma.ordemServico.findMany({
        where: {
          empresaId: usuario.empresa_id
        },
        select: {
          status: true,
          valorCobrado: true
        }
      }),
      this.prisma.cliente.count({
        where: {
          empresaId: usuario.empresa_id
        }
      }),
      this.prisma.veiculo.count({
        where: {
          empresaId: usuario.empresa_id,
          ativo: true
        }
      }),
      this.prisma.automacaoAgendada.count({
        where: {
          empresaId: usuario.empresa_id,
          status: AutomacaoStatus.pendente
        }
      })
    ]);

    const porStatus = ordens.reduce<Record<string, number>>((acc, ordem) => {
      acc[ordem.status] = (acc[ordem.status] ?? 0) + 1;
      return acc;
    }, {});
    const receitaPrevista = ordens.reduce(
      (total, ordem) => total + (ordem.valorCobrado?.toNumber() ?? 0),
      0
    );

    return {
      total_os: ordens.length,
      clientes,
      veiculos_ativos: veiculos,
      automacoes_pendentes: automacoesPendentes,
      receita_prevista: receitaPrevista,
      por_status: porStatus,
      frota: {
        km_rodados: relatorioFrota.km_rodados,
        litros: relatorioFrota.litros,
        valor_total: relatorioFrota.valor_total
      }
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
