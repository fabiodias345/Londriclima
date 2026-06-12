import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AutomacaoStatus,
  OrdemServicoEventoAcao,
  OrdemServicoStatus,
  PessoaTipo,
  Prisma,
  UsuarioRole
} from "@prisma/client";
import { randomBytes, randomInt } from "node:crypto";
import { PrismaService } from "../../database/prisma.service";
import { PasswordHashService } from "../auth/password-hash.service";
import { AuthenticatedUser } from "../auth/auth-user";
import { AprovarPreChamadoDto } from "./dto/aprovar-pre-chamado.dto";
import { CriarAbastecimentoDto } from "./dto/criar-abastecimento.dto";
import { SalvarEquipamentoDto } from "./dto/salvar-equipamento.dto";
import { SalvarClienteDto } from "./dto/salvar-cliente.dto";
import { SalvarEngenheiroResponsavelDto } from "./dto/salvar-engenheiro-responsavel.dto";

const STATUS_OS_OPERACIONAIS: OrdemServicoStatus[] = [
  OrdemServicoStatus.aberta,
  OrdemServicoStatus.em_deslocamento,
  OrdemServicoStatus.em_atendimento
];

@Injectable()
export class AdminService {
  private readonly passwordHash = new PasswordHashService();

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

  async listarOpcoesDespacho(usuario: AuthenticatedUser) {
    const [equipes, tecnicos] = await Promise.all([
      this.prisma.equipe.findMany({
        where: {
          empresaId: usuario.empresa_id,
          ativa: true
        },
        orderBy: {
          nome: "asc"
        },
        select: {
          id: true,
          nome: true,
          tecnico: {
            select: {
              id: true,
              nome: true
            }
          }
        }
      }),
      this.prisma.usuario.findMany({
        where: {
          empresaId: usuario.empresa_id,
          ativo: true,
          role: {
            in: [UsuarioRole.admin, UsuarioRole.supervisor, UsuarioRole.tecnico]
          }
        },
        orderBy: {
          nome: "asc"
        },
        select: {
          id: true,
          nome: true,
          role: true
        }
      })
    ]);

    return {
      equipes: equipes.map((equipe) => ({
        id: equipe.id,
        nome: equipe.nome,
        tecnico: equipe.tecnico
      })),
      tecnicos
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
        pmocAtivo: true,
        engenheiroResponsavel: {
          select: {
            id: true,
            nome: true,
            crea: true,
            email: true
          }
        },
        atualizadoEm: true,
        enderecos: {
          orderBy: {
            principal: "desc"
          },
          take: 1,
          select: {
            id: true,
            logradouro: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            uf: true,
            cep: true
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
        pmoc_ativo: cliente.pmocAtivo,
        engenheiro_responsavel: cliente.engenheiroResponsavel,
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

  async listarEngenheirosResponsaveis(usuario: AuthenticatedUser) {
    const engenheiros = await this.prisma.engenheiroResponsavel.findMany({
      where: {
        empresaId: usuario.empresa_id,
        ativo: true
      },
      orderBy: {
        nome: "asc"
      },
      select: this.engenheiroResponsavelSelect()
    });

    return {
      total: engenheiros.length,
      items: engenheiros.map((engenheiro) => this.mapearEngenheiroResponsavel(engenheiro))
    };
  }

  async criarEngenheiroResponsavel(dto: SalvarEngenheiroResponsavelDto, usuario: AuthenticatedUser) {
    const engenheiro = await this.prisma.engenheiroResponsavel.create({
      data: this.montarEngenheiroResponsavelData(dto, usuario.empresa_id),
      select: this.engenheiroResponsavelSelect()
    });

    return this.mapearEngenheiroResponsavel(engenheiro);
  }

  async atualizarEngenheiroResponsavel(
    engenheiroId: string,
    dto: SalvarEngenheiroResponsavelDto,
    usuario: AuthenticatedUser
  ) {
    await this.garantirEngenheiroDaEmpresa(engenheiroId, usuario);

    const engenheiro = await this.prisma.engenheiroResponsavel.update({
      where: {
        id: engenheiroId
      },
      data: this.montarEngenheiroResponsavelData(dto, usuario.empresa_id, false),
      select: this.engenheiroResponsavelSelect()
    });

    return this.mapearEngenheiroResponsavel(engenheiro);
  }

  async criarCliente(dto: SalvarClienteDto, usuario: AuthenticatedUser) {
    this.validarCadastroCliente(dto);
    await this.validarVinculoPmoc(dto, usuario);

    const cliente = await this.prisma.$transaction(async (tx) => {
      const criado = await tx.cliente.create({
        data: this.montarClienteData(dto, usuario.empresa_id),
        select: {
          id: true
        }
      });

      if (dto.logradouro && dto.cidade && dto.uf) {
        await tx.clienteEndereco.create({
          data: this.montarEnderecoData(dto, usuario.empresa_id, criado.id)
        });
      }

      return criado;
    });

    return this.obterClientePorId(cliente.id, usuario);
  }

  async atualizarCliente(clienteId: string, dto: SalvarClienteDto, usuario: AuthenticatedUser) {
    this.validarCadastroCliente(dto);
    await this.validarVinculoPmoc(dto, usuario);

    const clienteExiste = await this.prisma.cliente.findFirst({
      where: {
        id: clienteId,
        empresaId: usuario.empresa_id
      },
      select: {
        id: true
      }
    });

    if (!clienteExiste) {
      throw new NotFoundException("Cliente nao encontrado.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cliente.update({
        where: {
          id: clienteId
        },
        data: this.montarClienteData(dto, usuario.empresa_id)
      });

      if (dto.logradouro && dto.cidade && dto.uf) {
        const enderecoPrincipal = await tx.clienteEndereco.findFirst({
          where: {
            clienteId,
            empresaId: usuario.empresa_id,
            principal: true
          },
          select: {
            id: true
          }
        });

        if (enderecoPrincipal) {
          await tx.clienteEndereco.update({
            where: {
              id: enderecoPrincipal.id
            },
            data: this.montarEnderecoData(dto, usuario.empresa_id, clienteId, false)
          });
        } else {
          await tx.clienteEndereco.create({
            data: this.montarEnderecoData(dto, usuario.empresa_id, clienteId)
          });
        }
      }
    });

    return this.obterClientePorId(clienteId, usuario);
  }

  async apagarCliente(clienteId: string, usuario: AuthenticatedUser) {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id: clienteId,
        empresaId: usuario.empresa_id
      },
      select: {
        id: true,
        nome: true,
        _count: {
          select: {
            ordensServico: true,
            equipamentos: true
          }
        }
      }
    });

    if (!cliente) {
      throw new NotFoundException("Cliente nao encontrado.");
    }

    if (cliente._count.ordensServico > 0 || cliente._count.equipamentos > 0) {
      throw new ConflictException("Cliente possui historico ou equipamentos vinculados e nao pode ser apagado.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.clienteEndereco.deleteMany({
        where: {
          clienteId,
          empresaId: usuario.empresa_id
        }
      });

      await tx.cliente.delete({
        where: {
          id: clienteId
        }
      });
    });

    return {
      id: cliente.id,
      apagado: true
    };
  }

  async listarEquipamentosCliente(clienteId: string, usuario: AuthenticatedUser) {
    await this.garantirClienteDaEmpresa(clienteId, usuario);

    const equipamentos = await this.prisma.equipamento.findMany({
      where: {
        clienteId,
        empresaId: usuario.empresa_id
      },
      orderBy: [
        {
          localInstalacao: "asc"
        },
        {
          marca: "asc"
        }
      ],
      select: this.equipamentoSelect()
    });

    return {
      total: equipamentos.length,
      items: equipamentos.map((equipamento) => this.mapearEquipamento(equipamento))
    };
  }

  async criarEquipamentoCliente(
    clienteId: string,
    dto: SalvarEquipamentoDto,
    usuario: AuthenticatedUser
  ) {
    await this.garantirClienteDaEmpresa(clienteId, usuario);

    const codigoPublico = await this.gerarCodigoPublicoEquipamento();
    const senhaPublica = this.gerarSenhaPublica();
    const equipamento = await this.prisma.equipamento.create({
      data: {
        empresaId: usuario.empresa_id,
        clienteId,
        codigoPublico,
        senhaPublicaHash: await this.passwordHash.hash(senhaPublica),
        acessoPublicoAtivo: dto.acesso_publico_ativo ?? true,
        tipo: dto.tipo?.trim() || null,
        patrimonio: dto.patrimonio?.trim() || null,
        codigoBarras: dto.codigo_barras?.trim() || null,
        marca: dto.marca.trim(),
        modelo: dto.modelo.trim(),
        capacidadeBtu: dto.capacidade_btu,
        gasRefrigerante: dto.gas_refrigerante?.trim() || null,
        numeroSerie: dto.numero_serie?.trim() || null,
        localInstalacao: dto.local_instalacao?.trim() || null
      },
      select: this.equipamentoSelect()
    });

    return {
      ...this.mapearEquipamento(equipamento),
      senha_publica: senhaPublica
    };
  }

  async renovarAcessoPublicoEquipamento(equipamentoId: string, usuario: AuthenticatedUser) {
    const equipamentoExiste = await this.prisma.equipamento.findFirst({
      where: {
        id: equipamentoId,
        empresaId: usuario.empresa_id
      },
      select: {
        id: true,
        codigoPublico: true
      }
    });

    if (!equipamentoExiste) {
      throw new NotFoundException("Equipamento nao encontrado.");
    }

    const senhaPublica = this.gerarSenhaPublica();
    const codigoPublico = equipamentoExiste.codigoPublico || (await this.gerarCodigoPublicoEquipamento());
    const equipamento = await this.prisma.equipamento.update({
      where: {
        id: equipamentoId
      },
      data: {
        codigoPublico,
        senhaPublicaHash: await this.passwordHash.hash(senhaPublica),
        acessoPublicoAtivo: true
      },
      select: this.equipamentoSelect()
    });

    return {
      ...this.mapearEquipamento(equipamento),
      senha_publica: senhaPublica
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
        throw new NotFoundException("Pré-chamado não encontrado.");
      }

      if (ordem.status !== OrdemServicoStatus.pre_chamado) {
        throw new ConflictException("Somente pré-chamados pendentes podem ser atualizados.");
      }

      if (input.dto?.equipe_id) {
        const equipe = await tx.equipe.findFirst({
          where: {
            id: input.dto.equipe_id,
            empresaId: input.usuario.empresa_id,
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

      if (input.dto?.tecnico_id) {
        const tecnico = await tx.usuario.findFirst({
          where: {
            id: input.dto.tecnico_id,
            empresaId: input.usuario.empresa_id,
            ativo: true
          },
          select: {
            id: true
          }
        });

        if (!tecnico) {
          throw new NotFoundException("Tecnico nao encontrado.");
        }
      }

      const updateData: Prisma.OrdemServicoUncheckedUpdateInput = {
        status: input.statusNovo
      };

      if (input.dto?.agendada_para) {
        updateData.agendadaPara = new Date(input.dto.agendada_para);
      }

      if (input.dto?.equipe_id) {
        updateData.equipeId = input.dto.equipe_id;
      }

      if (input.dto?.tecnico_id) {
        updateData.tecnicoId = input.dto.tecnico_id;
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

      return ordemAtualizada;
    });

    return {
      os_id: resultado.id,
      status: resultado.status,
      atualizado_em: resultado.atualizadaEm.toISOString()
    };
  }

  private montarClienteData(dto: SalvarClienteDto, empresaId: string): Prisma.ClienteUncheckedCreateInput {
    const telefone = this.normalizarTelefoneComDdd(dto.telefone);
    const documento = this.normalizarDocumento(dto);

    return {
      empresaId,
      tipo: dto.tipo === "pj" ? PessoaTipo.pj : PessoaTipo.pf,
      nome: dto.nome.trim(),
      documento,
      email: dto.email?.trim() || null,
      telefone,
      pmocAtivo: dto.pmoc_ativo === true,
      engenheiroResponsavelId: dto.pmoc_ativo === true ? dto.engenheiro_responsavel_id?.trim() || null : null
    };
  }

  private validarCadastroCliente(dto: SalvarClienteDto) {
    this.normalizarTelefoneComDdd(dto.telefone);
    this.normalizarDocumento(dto);
  }

  private normalizarTelefoneComDdd(telefone?: string) {
    const digits = telefone?.replace(/\D/g, "") ?? "";

    if (!digits) {
      throw new BadRequestException("Telefone com DDD e obrigatorio.");
    }

    if (![10, 11].includes(digits.length)) {
      throw new BadRequestException("Telefone deve incluir DDD com 10 ou 11 digitos.");
    }

    return digits;
  }

  private normalizarDocumento(dto: SalvarClienteDto) {
    const tipo = dto.tipo === "pj" ? PessoaTipo.pj : PessoaTipo.pf;
    const documento = dto.documento?.trim() ?? "";

    if (!documento) {
      throw new BadRequestException(tipo === PessoaTipo.pj ? "CNPJ e obrigatorio." : "CPF ou RG e obrigatorio.");
    }

    if (tipo === PessoaTipo.pj) {
      const digits = documento.replace(/\D/g, "");

      if (digits.length !== 14) {
        throw new BadRequestException("CNPJ deve ter 14 digitos.");
      }

      return digits;
    }

    return documento;
  }

  private async garantirClienteDaEmpresa(clienteId: string, usuario: AuthenticatedUser) {
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

  private async garantirEngenheiroDaEmpresa(engenheiroId: string, usuario: AuthenticatedUser) {
    const engenheiro = await this.prisma.engenheiroResponsavel.findFirst({
      where: {
        id: engenheiroId,
        empresaId: usuario.empresa_id,
        ativo: true
      },
      select: {
        id: true
      }
    });

    if (!engenheiro) {
      throw new NotFoundException("Engenheiro responsavel nao encontrado.");
    }
  }

  private async validarVinculoPmoc(dto: SalvarClienteDto, usuario: AuthenticatedUser) {
    if (dto.pmoc_ativo !== true) {
      return;
    }

    if (!dto.engenheiro_responsavel_id?.trim()) {
      throw new BadRequestException("Cliente PMOC precisa de engenheiro responsavel.");
    }

    await this.garantirEngenheiroDaEmpresa(dto.engenheiro_responsavel_id, usuario);
  }

  private engenheiroResponsavelSelect() {
    return {
      id: true,
      nome: true,
      cpf: true,
      crea: true,
      email: true,
      telefone: true,
      atualizadoEm: true
    } satisfies Prisma.EngenheiroResponsavelSelect;
  }

  private mapearEngenheiroResponsavel(engenheiro: {
    id: string;
    nome: string;
    cpf: string;
    crea: string;
    email: string;
    telefone: string | null;
    atualizadoEm: Date;
  }) {
    return {
      id: engenheiro.id,
      nome: engenheiro.nome,
      cpf: engenheiro.cpf,
      crea: engenheiro.crea,
      email: engenheiro.email,
      telefone: engenheiro.telefone,
      atualizado_em: engenheiro.atualizadoEm.toISOString()
    };
  }

  private montarEngenheiroResponsavelData(
    dto: SalvarEngenheiroResponsavelDto,
    empresaId: string,
    incluirEmpresa = true
  ): Prisma.EngenheiroResponsavelUncheckedCreateInput | Prisma.EngenheiroResponsavelUncheckedUpdateInput {
    const data: Prisma.EngenheiroResponsavelUncheckedCreateInput | Prisma.EngenheiroResponsavelUncheckedUpdateInput = {
      nome: dto.nome.trim(),
      cpf: dto.cpf.replace(/\D/g, ""),
      crea: dto.crea.trim().toUpperCase(),
      email: dto.email.trim().toLowerCase(),
      telefone: dto.telefone?.replace(/\D/g, "") || null
    };

    if (incluirEmpresa) {
      data.empresaId = empresaId;
    }

    return data;
  }

  private equipamentoSelect() {
    return {
      id: true,
      codigoPublico: true,
      acessoPublicoAtivo: true,
      tipo: true,
      patrimonio: true,
      codigoBarras: true,
      marca: true,
      modelo: true,
      capacidadeBtu: true,
      gasRefrigerante: true,
      numeroSerie: true,
      localInstalacao: true,
      atualizadoEm: true,
      ordensServico: {
        select: {
          id: true,
          status: true
        }
      }
    } satisfies Prisma.EquipamentoSelect;
  }

  private mapearEquipamento(equipamento: {
    id: string;
    codigoPublico: string | null;
    acessoPublicoAtivo: boolean;
    tipo: string | null;
    patrimonio: string | null;
    codigoBarras: string | null;
    marca: string;
    modelo: string;
    capacidadeBtu: number | null;
    gasRefrigerante: string | null;
    numeroSerie: string | null;
    localInstalacao: string | null;
    atualizadoEm: Date;
    ordensServico: { id: string; status: OrdemServicoStatus }[];
  }) {
    return {
      id: equipamento.id,
      codigo_publico: equipamento.codigoPublico,
      acesso_publico_ativo: equipamento.acessoPublicoAtivo,
      link_publico: equipamento.codigoPublico
        ? `/landing/equipamento.html?codigo=${equipamento.codigoPublico}`
        : null,
      tipo: equipamento.tipo,
      patrimonio: equipamento.patrimonio,
      codigo_barras: equipamento.codigoBarras,
      marca: equipamento.marca,
      modelo: equipamento.modelo,
      capacidade_btu: equipamento.capacidadeBtu,
      gas_refrigerante: equipamento.gasRefrigerante,
      numero_serie: equipamento.numeroSerie,
      local_instalacao: equipamento.localInstalacao,
      atualizado_em: equipamento.atualizadoEm.toISOString(),
      total_os: equipamento.ordensServico.length,
      os_abertas: equipamento.ordensServico.filter((ordem) =>
        STATUS_OS_OPERACIONAIS.includes(ordem.status)
      ).length
    };
  }

  private async gerarCodigoPublicoEquipamento() {
    for (let tentativa = 0; tentativa < 5; tentativa += 1) {
      const codigo = `EQ-${randomBytes(5).toString("hex").toUpperCase()}`;
      const existente = await this.prisma.equipamento.findUnique({
        where: {
          codigoPublico: codigo
        },
        select: {
          id: true
        }
      });

      if (!existente) {
        return codigo;
      }
    }

    throw new ConflictException("Nao foi possivel gerar codigo publico unico para o equipamento.");
  }

  private gerarSenhaPublica() {
    return String(randomInt(100000, 1000000));
  }

  private montarEnderecoData(
    dto: SalvarClienteDto,
    empresaId: string,
    clienteId: string,
    incluirPrincipal = true
  ): Prisma.ClienteEnderecoUncheckedCreateInput {
    return {
      empresaId,
      clienteId,
      nome: "Principal",
      logradouro: dto.logradouro?.trim() || "",
      numero: dto.numero?.trim() || null,
      complemento: dto.complemento?.trim() || null,
      bairro: dto.bairro?.trim() || null,
      cidade: dto.cidade?.trim() || "",
      uf: dto.uf?.trim().toUpperCase() || "PR",
      cep: dto.cep?.trim() || null,
      principal: incluirPrincipal
    };
  }

  private async obterClientePorId(clienteId: string, usuario: AuthenticatedUser) {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id: clienteId,
        empresaId: usuario.empresa_id
      },
      select: {
        id: true,
        nome: true,
        tipo: true,
        documento: true,
        telefone: true,
        email: true,
        pmocAtivo: true,
        engenheiroResponsavel: {
          select: {
            id: true,
            nome: true,
            crea: true,
            email: true
          }
        },
        atualizadoEm: true,
        enderecos: {
          orderBy: {
            principal: "desc"
          },
          take: 1,
          select: {
            id: true,
            logradouro: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            uf: true,
            cep: true
          }
        }
      }
    });

    if (!cliente) {
      throw new NotFoundException("Cliente nao encontrado.");
    }

    return {
      id: cliente.id,
      nome: cliente.nome,
      tipo: cliente.tipo,
      documento: cliente.documento,
      telefone: cliente.telefone,
      email: cliente.email,
      pmoc_ativo: cliente.pmocAtivo,
      engenheiro_responsavel: cliente.engenheiroResponsavel,
      atualizado_em: cliente.atualizadoEm.toISOString(),
      endereco: cliente.enderecos[0] ?? null
    };
  }
}
