import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AutomacaoStatus,
  AutomacaoTipo,
  OrdemServicoEventoAcao,
  OrdemServicoStatus,
  PessoaTipo,
  PmocRelatorioStatus,
  Prisma,
  UsuarioRole
} from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { PrismaService } from "../../database/prisma.service";
import { PasswordHashService } from "../auth/password-hash.service";
import { AuthenticatedUser } from "../auth/auth-user";
import { AprovarPreChamadoDto } from "./dto/aprovar-pre-chamado.dto";
import { CriarAbastecimentoDto } from "./dto/criar-abastecimento.dto";
import { SalvarEquipamentoDto } from "./dto/salvar-equipamento.dto";
import { SalvarClienteDto } from "./dto/salvar-cliente.dto";
import { SalvarEmpresaDto } from "./dto/salvar-empresa.dto";
import { SalvarEngenheiroResponsavelDto } from "./dto/salvar-engenheiro-responsavel.dto";

const STATUS_OS_OPERACIONAIS: OrdemServicoStatus[] = [
  OrdemServicoStatus.aberta,
  OrdemServicoStatus.em_deslocamento,
  OrdemServicoStatus.em_atendimento
];

type PreviaPmocCliente = Awaited<ReturnType<AdminService["obterPreviaPmocCliente"]>>;
type PreviaRelatorioAvulsoCliente = Awaited<ReturnType<AdminService["obterPreviaRelatorioAvulsoCliente"]>>;

@Injectable()
export class AdminService {
  private readonly passwordHash = new PasswordHashService();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config?: ConfigService
  ) {}

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

  async obterRelatorioFrota(usuario: AuthenticatedUser, referencia = new Date()) {
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

    const periodo = this.obterPeriodoRelatorio(referencia);
    const kmRodadosPeriodo = { dia: 0, mes: 0, ano: 0 };
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

      for (let index = 1; index < abastecimentos.length; index += 1) {
        const anterior = abastecimentos[index - 1];
        const atual = abastecimentos[index];
        const kmPeriodo = Math.max(0, atual.odometroKm.toNumber() - anterior.odometroKm.toNumber());

        if (this.estaNoPeriodo(atual.abastecidoEm, periodo.dia)) {
          kmRodadosPeriodo.dia += kmPeriodo;
        }

        if (this.estaNoPeriodo(atual.abastecidoEm, periodo.mes)) {
          kmRodadosPeriodo.mes += kmPeriodo;
        }

        if (this.estaNoPeriodo(atual.abastecidoEm, periodo.ano)) {
          kmRodadosPeriodo.ano += kmPeriodo;
        }
      }

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
      km_rodados_periodo: kmRodadosPeriodo,
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

  async obterEmpresa(usuario: AuthenticatedUser) {
    const empresa = await this.prisma.empresa.findUnique({
      where: {
        id: usuario.empresa_id
      },
      select: this.empresaSelect()
    });

    if (!empresa) {
      throw new NotFoundException("Empresa nao encontrada.");
    }

    return this.mapearEmpresa(empresa);
  }

  async atualizarEmpresa(dto: SalvarEmpresaDto, usuario: AuthenticatedUser) {
    const nomeFantasia = this.stringOuNulo(dto.nome_fantasia);
    const razaoSocial = this.stringOuNulo(dto.razao_social);
    const nome = nomeFantasia ?? razaoSocial;

    if (!nome) {
      throw new BadRequestException("Informe razao social ou nome fantasia.");
    }

    const empresa = await this.prisma.empresa.update({
      where: {
        id: usuario.empresa_id
      },
      data: {
        nome,
        razaoSocial,
        nomeFantasia,
        cnpj: this.digitosOuNulo(dto.cnpj),
        email: this.emailOuNulo(dto.email),
        telefone: this.digitosOuNulo(dto.telefone),
        logradouro: this.stringOuNulo(dto.logradouro),
        numero: this.stringOuNulo(dto.numero),
        complemento: this.stringOuNulo(dto.complemento),
        bairro: this.stringOuNulo(dto.bairro),
        cidade: this.stringOuNulo(dto.cidade),
        uf: this.stringOuNulo(dto.uf)?.toUpperCase() ?? null,
        cep: this.digitosOuNulo(dto.cep),
        inscricaoEstadual: this.stringOuNulo(dto.inscricao_estadual),
        inscricaoMunicipal: this.stringOuNulo(dto.inscricao_municipal),
        responsavelLegal: this.stringOuNulo(dto.responsavel_legal),
        responsavelCpf: this.digitosOuNulo(dto.responsavel_cpf),
        contatoPrincipal: this.stringOuNulo(dto.contato_principal),
        contatoCargo: this.stringOuNulo(dto.contato_cargo),
        status: dto.status ?? "ativa",
        observacoes: this.stringOuNulo(dto.observacoes),
        ativa: (dto.status ?? "ativa") === "ativa"
      },
      select: this.empresaSelect()
    });

    return this.mapearEmpresa(empresa);
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

  async obterPreviaPmocCliente(clienteId: string, usuario: AuthenticatedUser) {
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
        atualizadoEm: true,
        engenheiroResponsavel: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            crea: true,
            email: true,
            telefone: true,
            atualizadoEm: true
          }
        },
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
          orderBy: [
            {
              localInstalacao: "asc"
            },
            {
              marca: "asc"
            }
          ],
          select: {
            id: true,
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
              where: {
                status: OrdemServicoStatus.concluida
              },
              orderBy: {
                concluidaEm: "desc"
              },
              select: this.ordemRelatorioTecnicoSelect()
            }
          }
        }
      }
    });

    if (!cliente) {
      throw new NotFoundException("Cliente nao encontrado.");
    }

    if (!cliente.pmocAtivo) {
      throw new BadRequestException("Cliente nao possui PMOC ativo.");
    }

    const maquinas = cliente.equipamentos.map((equipamento) => this.mapearMaquinaRelatorioTecnico(equipamento));
    const pendencias = this.obterPendenciasPreviaPmoc(cliente, maquinas);
    const anoPmoc = this.obterAnoPmoc(maquinas);
    const relatoriosPmoc = await this.prisma.pmocRelatorio.findMany({
      where: {
        empresaId: usuario.empresa_id,
        clienteId: cliente.id,
        criadoEm: {
          gte: new Date(Date.UTC(anoPmoc, 0, 1, 0, 0, 0, 0)),
          lt: new Date(Date.UTC(anoPmoc + 1, 0, 1, 0, 0, 0, 0))
        }
      },
      orderBy: {
        criadoEm: "desc"
      },
      select: {
        id: true,
        status: true,
        pdfHash: true,
        assinafyDocumentId: true,
        assinafyAssignmentId: true,
        assinafyStatus: true,
        criadoEm: true,
        emailAgendadoEm: true,
        assinadoEm: true
      }
    });
    const relatoriosPmocOrdenados = [...relatoriosPmoc].sort(
      (a, b) => b.criadoEm.getTime() - a.criadoEm.getTime()
    );
    const relatoriosEntregues = await this.obterEntregasEmailPmoc(
      usuario.empresa_id,
      anoPmoc,
      relatoriosPmocOrdenados.map((relatorio) => relatorio.id)
    );
    const relatoriosPmocComEntrega = relatoriosPmocOrdenados.map((relatorio) => ({
      ...relatorio,
      emailEntregue: relatoriosEntregues.has(relatorio.id)
    }));
    const assinaturaAtual = this.obterRelatorioPmocPreferido(relatoriosPmocComEntrega);

    return {
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        tipo: cliente.tipo,
        documento: cliente.documento,
        telefone: cliente.telefone,
        email: cliente.email,
        endereco: cliente.enderecos[0] ?? null,
        pmoc_ativo: cliente.pmocAtivo,
        atualizado_em: cliente.atualizadoEm.toISOString()
      },
      engenheiro_responsavel: cliente.engenheiroResponsavel
        ? this.mapearEngenheiroResponsavel(cliente.engenheiroResponsavel)
        : null,
      periodo: this.obterPeriodoRelatorioTecnico(maquinas),
      total_maquinas: maquinas.length,
      total_os_concluidas: maquinas.reduce((total, maquina) => total + maquina.os_concluidas.length, 0),
      pronto_para_pdf: pendencias.length === 0,
      pendencias,
      assinatura_atual: assinaturaAtual
        ? {
            id: assinaturaAtual.id,
            status: assinaturaAtual.status,
            assinafy_document_id: assinaturaAtual.assinafyDocumentId,
            assinafy_assignment_id: assinaturaAtual.assinafyAssignmentId,
            assinafy_status: assinaturaAtual.assinafyStatus,
            email_agendado: Boolean(assinaturaAtual.emailAgendadoEm),
            email_entregue: assinaturaAtual.emailEntregue,
            assinado_em: assinaturaAtual.assinadoEm?.toISOString() ?? null,
            criado_em: assinaturaAtual.criadoEm.toISOString()
          }
        : null,
      pmoc_meses: this.mapearMesesPmoc(anoPmoc, relatoriosPmocComEntrega),
      maquinas
    };
  }

  async gerarPdfPmocCliente(clienteId: string, usuario: AuthenticatedUser) {
    const previa = await this.obterPreviaPmocCliente(clienteId, usuario);
    const buffer = this.gerarPdfBasicoPmoc(previa);

    return {
      filename: `${this.slugArquivo(`pmoc-${previa.cliente.nome}`)}.pdf`,
      contentType: "application/pdf",
      buffer
    };
  }

  async solicitarAssinaturaPmocEngenheiro(clienteId: string, usuario: AuthenticatedUser) {
    const previa = await this.obterPreviaPmocCliente(clienteId, usuario);

    if (!previa.engenheiro_responsavel) {
      throw new BadRequestException("Cliente PMOC precisa de engenheiro responsavel antes da assinatura.");
    }

    const pdf = await this.gerarPdfPmocCliente(clienteId, usuario);
    const pdfHash = createHash("sha256").update(pdf.buffer).digest("hex");
    const tokenAssinatura = randomBytes(24).toString("hex");
    const dataEnvio = new Date();

    const relatorio = await this.prisma.pmocRelatorio.create({
      data: {
        empresaId: usuario.empresa_id,
        clienteId: previa.cliente.id,
        engenheiroResponsavelId: previa.engenheiro_responsavel.id,
        criadoPorUsuarioId: usuario.id,
        status: PmocRelatorioStatus.aguardando_assinatura_engenheiro,
        tokenAssinatura,
        pdfHash
      }
    });
    const linkAssinatura = this.montarLinkAssinaturaPmoc(relatorio.tokenAssinatura);

    await this.prisma.automacaoAgendada.create({
      data: {
        empresaId: usuario.empresa_id,
        tipo: AutomacaoTipo.enviar_email,
        executarEm: dataEnvio,
        payload: {
          tipo: "pmoc_assinatura_engenheiro",
          relatorio_id: relatorio.id,
          cliente_nome: previa.cliente.nome,
          cliente_email: previa.cliente.email,
          data_envio: dataEnvio.toISOString(),
          engenheiro_email: previa.engenheiro_responsavel.email,
          engenheiro_nome: previa.engenheiro_responsavel.nome,
          link_assinatura: linkAssinatura,
          pdf_hash: relatorio.pdfHash,
          pdf_filename: pdf.filename,
          pdf_base64: pdf.buffer.toString("base64")
        } satisfies Prisma.JsonObject
      }
    });

    return {
      id: relatorio.id,
      cliente: previa.cliente,
      engenheiro_responsavel: previa.engenheiro_responsavel,
      status: relatorio.status,
      pdf_hash: relatorio.pdfHash,
      email_engenheiro_agendado: true,
      criado_em: relatorio.criadoEm.toISOString()
    };
  }

  async listarRelatoriosAvulsos(usuario: AuthenticatedUser) {
    const clientes = await this.prisma.cliente.findMany({
      where: {
        empresaId: usuario.empresa_id,
        pmocAtivo: false
      },
      orderBy: {
        atualizadoEm: "desc"
      },
      take: 50,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        atualizadoEm: true,
        equipamentos: {
          select: {
            id: true,
            ordensServico: {
              where: {
                status: OrdemServicoStatus.concluida
              },
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    const items = clientes.map((cliente) => {
      const totalOsConcluidas = cliente.equipamentos.reduce((total, equipamento) => total + equipamento.ordensServico.length, 0);

      return {
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        atualizado_em: cliente.atualizadoEm.toISOString(),
        total_maquinas: cliente.equipamentos.length,
        total_os_concluidas: totalOsConcluidas,
        pronto_para_envio: Boolean(cliente.email) && totalOsConcluidas > 0
      };
    });

    return {
      total: items.length,
      pendentes: items.filter((item) => item.pronto_para_envio).length,
      items
    };
  }

  async obterPreviaRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    const cliente = await this.obterClienteRelatorioAvulso(clienteId, usuario);
    const maquinas = cliente.equipamentos
      .map((equipamento) => this.mapearMaquinaRelatorioTecnico(equipamento))
      .filter((maquina) => maquina.os_concluidas.length > 0);
    const pendencias = this.obterPendenciasRelatorioAvulso(cliente, maquinas);

    return {
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        tipo: cliente.tipo,
        documento: cliente.documento,
        telefone: cliente.telefone,
        email: cliente.email,
        endereco: cliente.enderecos[0] ?? null,
        pmoc_ativo: cliente.pmocAtivo,
        atualizado_em: cliente.atualizadoEm.toISOString()
      },
      periodo: this.obterPeriodoRelatorioTecnico(maquinas),
      total_maquinas: maquinas.length,
      total_os_concluidas: maquinas.reduce((total, maquina) => total + maquina.os_concluidas.length, 0),
      pronto_para_envio: pendencias.length === 0,
      pendencias,
      maquinas
    };
  }

  async gerarPdfRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    const previa = await this.obterPreviaRelatorioAvulsoCliente(clienteId, usuario);
    const buffer = this.gerarPdfBasicoRelatorioAvulso(previa);

    return {
      filename: `${this.slugArquivo(`relatorio-tecnico-${previa.cliente.nome}`)}.pdf`,
      contentType: "application/pdf",
      buffer
    };
  }

  async enviarRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    const previa = await this.obterPreviaRelatorioAvulsoCliente(clienteId, usuario);

    if (!previa.pronto_para_envio) {
      throw new BadRequestException("Relatorio avulso possui pendencias antes do envio.");
    }

    if (!previa.cliente.email) {
      throw new BadRequestException("Cliente sem e-mail para envio do relatorio.");
    }

    const pdf = await this.gerarPdfRelatorioAvulsoCliente(clienteId, usuario);
    const dataEnvio = new Date();
    const osIds = previa.maquinas.flatMap((maquina) => maquina.os_concluidas.map((ordem) => ordem.id));

    await this.prisma.automacaoAgendada.create({
      data: {
        empresaId: usuario.empresa_id,
        tipo: AutomacaoTipo.enviar_email,
        executarEm: dataEnvio,
        payload: {
          tipo: "relatorio_tecnico_avulso",
          cliente_id: previa.cliente.id,
          cliente_nome: previa.cliente.nome,
          cliente_email: previa.cliente.email,
          data_envio: dataEnvio.toISOString(),
          periodo_inicio: previa.periodo.inicio,
          periodo_fim: previa.periodo.fim,
          total_maquinas: previa.total_maquinas,
          total_os_concluidas: previa.total_os_concluidas,
          os_ids: osIds,
          pdf_filename: pdf.filename,
          pdf_base64: pdf.buffer.toString("base64")
        } satisfies Prisma.JsonObject
      }
    });

    return {
      cliente: previa.cliente,
      total_maquinas: previa.total_maquinas,
      total_os_concluidas: previa.total_os_concluidas,
      email_cliente_agendado: true,
      criado_em: dataEnvio.toISOString()
    };
  }

  async criarEngenheiroResponsavel(dto: SalvarEngenheiroResponsavelDto, usuario: AuthenticatedUser) {
    const engenheiro = await this.prisma.engenheiroResponsavel.create({
      data: this.montarEngenheiroResponsavelCreateData(dto, usuario.empresa_id),
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
      data: this.montarEngenheiroResponsavelUpdateData(dto),
      select: this.engenheiroResponsavelSelect()
    });

    return this.mapearEngenheiroResponsavel(engenheiro);
  }

  async apagarEngenheiroResponsavel(engenheiroId: string, usuario: AuthenticatedUser) {
    const engenheiro = await this.prisma.engenheiroResponsavel.findFirst({
      where: {
        id: engenheiroId,
        empresaId: usuario.empresa_id,
        ativo: true
      },
      select: {
        id: true,
        _count: {
          select: {
            clientes: true,
            pmocRelatorios: true
          }
        }
      }
    });

    if (!engenheiro) {
      throw new NotFoundException("Engenheiro responsavel nao encontrado.");
    }

    if (engenheiro._count.pmocRelatorios > 0) {
      throw new ConflictException("Engenheiro possui relatorios PMOC vinculados e nao pode ser apagado.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cliente.updateMany({
        where: {
          empresaId: usuario.empresa_id,
          engenheiroResponsavelId: engenheiroId
        },
        data: {
          engenheiroResponsavelId: null
        }
      });

      await tx.engenheiroResponsavel.delete({
        where: {
          id: engenheiroId
        }
      });
    });

    return {
      id: engenheiro.id,
      clientes_desvinculados: engenheiro._count.clientes,
      apagado: true
    };
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

  async apagarEquipamento(equipamentoId: string, usuario: AuthenticatedUser) {
    const equipamento = await this.prisma.equipamento.findFirst({
      where: {
        id: equipamentoId,
        empresaId: usuario.empresa_id
      },
      select: {
        id: true,
        clienteId: true,
        marca: true,
        modelo: true
      }
    });

    if (!equipamento) {
      throw new NotFoundException("Equipamento nao encontrado.");
    }

    const ordens = await this.prisma.ordemServico.findMany({
      where: {
        equipamentoId,
        empresaId: usuario.empresa_id
      },
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

    await this.prisma.$transaction(async (tx) => {
      if (ordemIds.length) {
        await tx.automacaoAgendada.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            },
            empresaId: usuario.empresa_id
          }
        });

        if (checklistIds.length) {
          await tx.ordemServicoPeca.deleteMany({
            where: {
              checklistId: {
                in: checklistIds
              },
              empresaId: usuario.empresa_id
            }
          });
        }

        await tx.ordemServicoChecklist.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            },
            empresaId: usuario.empresa_id
          }
        });
        await tx.ordemServicoEvidencia.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            },
            empresaId: usuario.empresa_id
          }
        });
        await tx.ordemServicoAssinatura.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            },
            empresaId: usuario.empresa_id
          }
        });
        await tx.ordemServicoObservacao.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            },
            empresaId: usuario.empresa_id
          }
        });
        await tx.ordemServicoEvento.deleteMany({
          where: {
            ordemServicoId: {
              in: ordemIds
            },
            empresaId: usuario.empresa_id
          }
        });
        await tx.ordemServico.deleteMany({
          where: {
            id: {
              in: ordemIds
            },
            empresaId: usuario.empresa_id
          }
        });
      }

      await tx.equipamento.delete({
        where: {
          id: equipamentoId
        }
      });
    });

    return {
      id: equipamento.id,
      cliente_id: equipamento.clienteId,
      ordens_removidas: ordemIds.length,
      apagado: true
    };
  }

  async obterRelatorios(usuario: AuthenticatedUser, referencia = new Date()) {
    const relatorioFrota = await this.obterRelatorioFrota(usuario, referencia);
    const [ordens, clientes, veiculos, automacoesPendentes] = await Promise.all([
      this.prisma.ordemServico.findMany({
        where: {
          empresaId: usuario.empresa_id
        },
        select: {
          status: true,
          valorCobrado: true,
          criadaEm: true,
          agendadaPara: true,
          concluidaEm: true
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
    const periodo = this.obterPeriodoRelatorio(referencia);
    const receitaPrevista = ordens.reduce(
      (total, ordem) =>
        this.estaNoPeriodo(this.obterDataReferenciaOrdem(ordem), periodo.ano)
          ? total + (ordem.valorCobrado?.toNumber() ?? 0)
          : total,
      0
    );
    const receitaArrecadada = ordens.reduce(
      (total, ordem) =>
        ordem.status === OrdemServicoStatus.concluida && ordem.concluidaEm && this.estaNoPeriodo(ordem.concluidaEm, periodo.ano)
          ? total + (ordem.valorCobrado?.toNumber() ?? 0)
          : total,
      0
    );
    const preChamados = this.contarOrdensPorPeriodo(ordens, OrdemServicoStatus.pre_chamado, periodo, (ordem) => ordem.criadaEm);
    const osAbertas = this.contarOrdensPorPeriodo(ordens, OrdemServicoStatus.aberta, periodo, (ordem) => ordem.agendadaPara ?? ordem.criadaEm);
    const emAtendimento = this.contarOrdensPorPeriodo(ordens, OrdemServicoStatus.em_atendimento, periodo, (ordem) => ordem.agendadaPara ?? ordem.criadaEm);
    const concluidas = this.contarOrdensPorPeriodo(ordens, OrdemServicoStatus.concluida, periodo, (ordem) => ordem.concluidaEm ?? ordem.criadaEm);

    return {
      total_os: ordens.length,
      clientes,
      veiculos_ativos: veiculos,
      automacoes_pendentes: automacoesPendentes,
      receita_prevista: receitaPrevista,
      receita_arrecadada: receitaArrecadada,
      por_status: porStatus,
      pre_chamados: preChamados,
      os_abertas: osAbertas,
      em_atendimento: emAtendimento,
      concluidas,
      manutencoes: concluidas,
      frota: {
        km_rodados: relatorioFrota.km_rodados,
        km_rodados_periodo: relatorioFrota.km_rodados_periodo,
        litros: relatorioFrota.litros,
        valor_total: relatorioFrota.valor_total
      }
    };
  }

  private obterPeriodoRelatorio(referencia: Date) {
    const inicioDia = new Date(referencia);
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(inicioDia);
    fimDia.setDate(fimDia.getDate() + 1);

    const inicioMes = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
    const fimMes = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 1);

    const inicioAno = new Date(referencia.getFullYear(), 0, 1);
    const fimAno = new Date(referencia.getFullYear() + 1, 0, 1);

    return {
      dia: { inicio: inicioDia, fim: fimDia },
      mes: { inicio: inicioMes, fim: fimMes },
      ano: { inicio: inicioAno, fim: fimAno }
    };
  }

  private estaNoPeriodo(data: Date | null | undefined, periodo: { inicio: Date; fim: Date }) {
    return Boolean(data && data >= periodo.inicio && data < periodo.fim);
  }

  private contarOrdensPorPeriodo<T extends { status: OrdemServicoStatus }>(
    ordens: T[],
    status: OrdemServicoStatus,
    periodo: ReturnType<AdminService["obterPeriodoRelatorio"]>,
    obterData: (ordem: T) => Date | null | undefined
  ) {
    return ordens.reduce(
      (acc, ordem) => {
        if (ordem.status !== status) {
          return acc;
        }

        const data = obterData(ordem);

        if (this.estaNoPeriodo(data, periodo.dia)) {
          acc.dia += 1;
        }

        if (this.estaNoPeriodo(data, periodo.mes)) {
          acc.mes += 1;
        }

        if (this.estaNoPeriodo(data, periodo.ano)) {
          acc.ano += 1;
        }

        return acc;
      },
      { dia: 0, mes: 0, ano: 0 }
    );
  }

  private obterDataReferenciaOrdem(ordem: {
    status: OrdemServicoStatus;
    criadaEm: Date;
    agendadaPara: Date | null;
    concluidaEm: Date | null;
  }) {
    if (ordem.status === OrdemServicoStatus.concluida) {
      return ordem.concluidaEm ?? ordem.criadaEm;
    }

    return ordem.agendadaPara ?? ordem.criadaEm;
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

  private montarEngenheiroResponsavelCreateData(
    dto: SalvarEngenheiroResponsavelDto,
    empresaId: string
  ): Prisma.EngenheiroResponsavelUncheckedCreateInput {
    return {
      ...this.montarEngenheiroResponsavelCampos(dto),
      empresaId
    };
  }

  private montarEngenheiroResponsavelUpdateData(
    dto: SalvarEngenheiroResponsavelDto
  ): Prisma.EngenheiroResponsavelUncheckedUpdateInput {
    return this.montarEngenheiroResponsavelCampos(dto);
  }

  private montarEngenheiroResponsavelCampos(dto: SalvarEngenheiroResponsavelDto) {
    return {
      nome: dto.nome.trim(),
      cpf: dto.cpf.replace(/\D/g, ""),
      crea: dto.crea.trim().toUpperCase(),
      email: dto.email.trim().toLowerCase(),
      telefone: dto.telefone?.replace(/\D/g, "") || null
    };
  }

  private empresaSelect() {
    return {
      id: true,
      nome: true,
      razaoSocial: true,
      nomeFantasia: true,
      cnpj: true,
      email: true,
      telefone: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      uf: true,
      cep: true,
      inscricaoEstadual: true,
      inscricaoMunicipal: true,
      responsavelLegal: true,
      responsavelCpf: true,
      contatoPrincipal: true,
      contatoCargo: true,
      status: true,
      observacoes: true,
      ativa: true,
      criadoEm: true,
      atualizadoEm: true
    } satisfies Prisma.EmpresaSelect;
  }

  private mapearEmpresa(empresa: {
    id: string;
    nome: string;
    razaoSocial: string | null;
    nomeFantasia: string | null;
    cnpj: string | null;
    email: string | null;
    telefone: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    cep: string | null;
    inscricaoEstadual: string | null;
    inscricaoMunicipal: string | null;
    responsavelLegal: string | null;
    responsavelCpf: string | null;
    contatoPrincipal: string | null;
    contatoCargo: string | null;
    status: string;
    observacoes: string | null;
    ativa: boolean;
    criadoEm: Date;
    atualizadoEm: Date;
  }) {
    return {
      id: empresa.id,
      nome: empresa.nome,
      razao_social: empresa.razaoSocial,
      nome_fantasia: empresa.nomeFantasia,
      cnpj: this.formatarCnpj(empresa.cnpj),
      email: empresa.email,
      telefone: empresa.telefone,
      logradouro: empresa.logradouro,
      numero: empresa.numero,
      complemento: empresa.complemento,
      bairro: empresa.bairro,
      cidade: empresa.cidade,
      uf: empresa.uf,
      cep: empresa.cep,
      inscricao_estadual: empresa.inscricaoEstadual,
      inscricao_municipal: empresa.inscricaoMunicipal,
      responsavel_legal: empresa.responsavelLegal,
      responsavel_cpf: this.formatarCpf(empresa.responsavelCpf),
      contato_principal: empresa.contatoPrincipal,
      contato_cargo: empresa.contatoCargo,
      status: empresa.status,
      ativa: empresa.ativa,
      observacoes: empresa.observacoes,
      criado_em: empresa.criadoEm.toISOString(),
      atualizado_em: empresa.atualizadoEm.toISOString()
    };
  }

  private stringOuNulo(valor?: string) {
    const texto = valor?.trim();
    return texto ? texto : null;
  }

  private emailOuNulo(valor?: string) {
    const texto = valor?.trim().toLowerCase();
    return texto ? texto : null;
  }

  private digitosOuNulo(valor?: string) {
    const digitos = valor?.replace(/\D/g, "");
    return digitos ? digitos : null;
  }

  private formatarCnpj(valor: string | null) {
    if (!valor || valor.length !== 14) {
      return valor;
    }

    return `${valor.slice(0, 2)}.${valor.slice(2, 5)}.${valor.slice(5, 8)}/${valor.slice(8, 12)}-${valor.slice(12)}`;
  }

  private formatarCpf(valor: string | null) {
    if (!valor || valor.length !== 11) {
      return valor;
    }

    return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9)}`;
  }

  private ordemRelatorioTecnicoSelect() {
    return {
      id: true,
      titulo: true,
      problemaRelatado: true,
      status: true,
      agendadaPara: true,
      concluidaEm: true,
      valorCobrado: true,
      tecnico: {
        select: {
          id: true,
          nome: true,
          email: true
        }
      },
      equipe: {
        select: {
          id: true,
          nome: true
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
      assinatura: {
        select: {
          id: true,
          nomeResponsavel: true,
          storageUrl: true,
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

  private async obterClienteRelatorioAvulso(clienteId: string, usuario: AuthenticatedUser) {
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
          orderBy: [
            {
              localInstalacao: "asc"
            },
            {
              marca: "asc"
            }
          ],
          select: {
            id: true,
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
              where: {
                status: OrdemServicoStatus.concluida
              },
              orderBy: {
                concluidaEm: "desc"
              },
              select: this.ordemRelatorioTecnicoSelect()
            }
          }
        }
      }
    });

    if (!cliente) {
      throw new NotFoundException("Cliente nao encontrado.");
    }

    if (cliente.pmocAtivo) {
      throw new BadRequestException("Cliente possui PMOC ativo. Use o fluxo PMOC.");
    }

    return cliente;
  }

  private mapearMaquinaRelatorioTecnico(equipamento: {
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
    atualizadoEm: Date;
    ordensServico: Array<{
      id: string;
      titulo: string;
      problemaRelatado: string | null;
      status: OrdemServicoStatus;
      agendadaPara: Date | null;
      concluidaEm: Date | null;
      valorCobrado: Prisma.Decimal | null;
      tecnico: { id: string; nome: string; email: string } | null;
      equipe: { id: string; nome: string } | null;
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
      assinatura: {
        id: string;
        nomeResponsavel: string;
        storageUrl: string;
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
      atualizado_em: equipamento.atualizadoEm.toISOString(),
      pendencias: this.obterPendenciasMaquinaRelatorioTecnico(equipamento, osConcluidas),
      os_concluidas: osConcluidas
    };
  }

  private mapearOrdemRelatorioTecnico(ordem: {
    id: string;
    titulo: string;
    problemaRelatado: string | null;
    status: OrdemServicoStatus;
    agendadaPara: Date | null;
    concluidaEm: Date | null;
    valorCobrado: Prisma.Decimal | null;
    tecnico: { id: string; nome: string; email: string } | null;
    equipe: { id: string; nome: string } | null;
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
    assinatura: {
      id: string;
      nomeResponsavel: string;
      storageUrl: string;
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
      problema_relatado: ordem.problemaRelatado,
      status: ordem.status,
      agendada_para: ordem.agendadaPara?.toISOString() ?? null,
      concluida_em: ordem.concluidaEm?.toISOString() ?? null,
      valor_cobrado: ordem.valorCobrado?.toNumber() ?? null,
      tecnico: ordem.tecnico,
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

  private obterPendenciasMaquinaRelatorioTecnico(
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

  private obterPendenciasPreviaPmoc(
    cliente: { email: string | null; engenheiroResponsavel: unknown; equipamentos: unknown[] },
    maquinas: Array<{ pendencias: string[]; os_concluidas: unknown[] }>
  ) {
    const pendencias: string[] = [];

    if (!cliente.email) {
      pendencias.push("email_cliente_pendente");
    }

    if (!cliente.engenheiroResponsavel) {
      pendencias.push("engenheiro_responsavel_pendente");
    }

    if (!cliente.equipamentos.length) {
      pendencias.push("sem_maquinas");
    }

    if (!maquinas.some((maquina) => maquina.os_concluidas.length > 0)) {
      pendencias.push("sem_os_concluida");
    }

    for (const maquina of maquinas) {
      pendencias.push(...maquina.pendencias.map((pendencia) => `maquina_${pendencia}`));
    }

    return Array.from(new Set(pendencias));
  }

  private obterPendenciasRelatorioAvulso(
    cliente: { email: string | null },
    maquinas: Array<{ os_concluidas: unknown[] }>
  ) {
    const pendencias: string[] = [];

    if (!cliente.email) {
      pendencias.push("email_cliente_pendente");
    }

    if (!maquinas.length) {
      pendencias.push("sem_maquinas_com_os_concluida");
    }

    if (!maquinas.some((maquina) => maquina.os_concluidas.length > 0)) {
      pendencias.push("sem_os_concluida");
    }

    return Array.from(new Set(pendencias));
  }

  private obterPeriodoRelatorioTecnico(maquinas: Array<{ os_concluidas: Array<{ concluida_em: string | null }> }>) {
    const datas = maquinas
      .flatMap((maquina) => maquina.os_concluidas.map((ordem) => ordem.concluida_em))
      .filter((data): data is string => Boolean(data))
      .sort();

    return {
      inicio: datas[0] ?? null,
      fim: datas[datas.length - 1] ?? null
    };
  }

  private obterAnoPmoc(maquinas: Array<{ os_concluidas: Array<{ concluida_em: string | null }> }>) {
    const periodo = this.obterPeriodoRelatorioTecnico(maquinas);
    const dataBase = periodo.fim ? new Date(periodo.fim) : new Date();
    return dataBase.getUTCFullYear();
  }

  private mapearMesesPmoc(
    ano: number,
    relatorios: Array<{
      id: string;
      status: PmocRelatorioStatus;
      pdfHash: string;
      assinafyDocumentId: string | null;
      assinafyAssignmentId: string | null;
      assinafyStatus: string | null;
      criadoEm: Date;
      emailAgendadoEm: Date | null;
      assinadoEm: Date | null;
      emailEntregue: boolean;
    }>
  ) {
    const labels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const porMes = new Map<number, (typeof relatorios)[number]>();

    for (const relatorio of relatorios) {
      const mes = relatorio.criadoEm.getUTCMonth();
      const atual = porMes.get(mes);
      if (!atual || this.compararRelatoriosPmoc(relatorio, atual) < 0) {
        porMes.set(mes, relatorio);
      }
    }

    return labels.map((label, indice) => {
      const relatorio = porMes.get(indice);

      return {
        mes: label,
        ano,
        numero: indice + 1,
        status: relatorio?.emailEntregue ? "enviado" : "pendente",
        relatorio_id: relatorio?.id ?? null,
        relatorio_status: relatorio?.status ?? null,
        assinafy_status: relatorio?.assinafyStatus ?? null,
        email_entregue: relatorio?.emailEntregue ?? false,
        enviado_em: relatorio?.criadoEm.toISOString() ?? null,
        assinado_em: relatorio?.assinadoEm?.toISOString() ?? null,
        pdf_hash: relatorio?.pdfHash ?? null
      };
    });
  }

  private async obterEntregasEmailPmoc(empresaId: string, ano: number, relatorioIds: string[]) {
    if (!relatorioIds.length) {
      return new Set<string>();
    }

    const automacoes = await this.prisma.automacaoAgendada.findMany({
      where: {
        empresaId,
        tipo: AutomacaoTipo.enviar_email,
        status: AutomacaoStatus.concluida,
        criadoEm: {
          gte: new Date(Date.UTC(ano, 0, 1, 0, 0, 0, 0)),
          lt: new Date(Date.UTC(ano + 1, 0, 1, 0, 0, 0, 0))
        }
      },
      select: {
        payload: true
      }
    });
    const relatorioIdsAlvo = new Set(relatorioIds);
    const entregues = new Set<string>();

    for (const automacao of automacoes) {
      if (!automacao.payload || typeof automacao.payload !== "object" || Array.isArray(automacao.payload)) {
        continue;
      }

      const payload = automacao.payload as Record<string, unknown>;
      const entrega = payload.smtp_entrega;
      if (
        payload.tipo === "pmoc_relatorio_assinado" &&
        typeof payload.relatorio_id === "string" &&
        relatorioIdsAlvo.has(payload.relatorio_id) &&
        entrega &&
        typeof entrega === "object" &&
        !Array.isArray(entrega)
      ) {
        entregues.add(payload.relatorio_id);
      }
    }

    return entregues;
  }

  private obterRelatorioPmocPreferido<T extends { status: PmocRelatorioStatus; criadoEm: Date; emailEntregue?: boolean }>(relatorios: T[]) {
    const ultimoMes = relatorios.reduce<number | null>((maior, relatorio) => {
      const mes = Date.UTC(relatorio.criadoEm.getUTCFullYear(), relatorio.criadoEm.getUTCMonth(), 1);
      return maior === null || mes > maior ? mes : maior;
    }, null);

    if (ultimoMes === null) {
      return null;
    }

    return relatorios
      .filter((relatorio) => Date.UTC(relatorio.criadoEm.getUTCFullYear(), relatorio.criadoEm.getUTCMonth(), 1) === ultimoMes)
      .sort((a, b) => this.compararRelatoriosPmoc(a, b))[0] ?? null;
  }

  private compararRelatoriosPmoc<T extends { status: PmocRelatorioStatus; criadoEm: Date; emailEntregue?: boolean }>(a: T, b: T) {
    const prioridadeA = this.prioridadeRelatorioPmoc(a.status, a.emailEntregue);
    const prioridadeB = this.prioridadeRelatorioPmoc(b.status, b.emailEntregue);

    if (prioridadeA !== prioridadeB) {
      return prioridadeA - prioridadeB;
    }

    return b.criadoEm.getTime() - a.criadoEm.getTime();
  }

  private prioridadeRelatorioPmoc(status: PmocRelatorioStatus, emailEntregue = false) {
    if (status === PmocRelatorioStatus.assinado && emailEntregue) {
      return 0;
    }

    if (status === PmocRelatorioStatus.aguardando_assinatura_engenheiro) {
      return 1;
    }

    if (status === PmocRelatorioStatus.assinado) {
      return 2;
    }

    if (status === PmocRelatorioStatus.gerado) {
      return 3;
    }

    return 4;
  }

  private gerarPdfBasicoPmoc(previa: PreviaPmocCliente) {
    const paginas: string[][] = [this.montarCapaPmoc(previa)];

    if (!previa.maquinas.length) {
      paginas.push([
        "MAQUINA N:001",
        "",
        "Nenhuma maquina cadastrada para este cliente.",
        "Cadastre maquinas antes de emitir o PMOC final."
      ]);
    }

    for (const [indice, maquina] of previa.maquinas.entries()) {
      paginas.push(this.montarPaginaMaquinaPmoc(previa, maquina, indice));
    }

    paginas.push(this.montarDeclaracaoPmoc(previa));

    return this.criarPdfTexto(paginas);
  }

  private gerarPdfBasicoRelatorioAvulso(previa: PreviaRelatorioAvulsoCliente) {
    const paginas: string[][] = [this.montarCapaRelatorioAvulso(previa)];

    if (!previa.maquinas.length) {
      paginas.push([
        "MAQUINA N:001",
        "",
        "Nenhuma maquina com manutencao concluida para este relatorio.",
        "Finalize a OS antes de emitir o relatorio tecnico."
      ]);
    }

    for (const [indice, maquina] of previa.maquinas.entries()) {
      paginas.push(this.montarPaginaMaquinaRelatorioAvulso(maquina, indice));
    }

    return this.criarPdfTexto(paginas);
  }

  private montarCapaRelatorioAvulso(previa: PreviaRelatorioAvulsoCliente) {
    return [
      "AIRMOVEBR - RELATORIO TECNICO",
      "Atendimento avulso sem PMOC",
      "",
      this.formatarLinhaCampoPmoc("Campo", "Informacao"),
      this.formatarLinhaCampoPmoc("Empresa", "AIRMOVEBR"),
      this.formatarLinhaCampoPmoc("Base operacional", "Londrina, PR"),
      this.formatarLinhaCampoPmoc("Dominio", "airmovebr.com.br"),
      "",
      this.formatarLinhaCampoPmoc("Cliente", previa.cliente.nome),
      this.formatarLinhaCampoPmoc("Documento", previa.cliente.documento || "nao informado"),
      this.formatarLinhaCampoPmoc("E-mail", previa.cliente.email || "pendente"),
      this.formatarLinhaCampoPmoc("Endereco", this.formatarEnderecoPmoc(previa.cliente.endereco)),
      this.formatarLinhaCampoPmoc(
        "Periodo",
        `${this.formatarDataPmoc(previa.periodo.inicio)} a ${this.formatarDataPmoc(previa.periodo.fim)}`
      ),
      this.formatarLinhaCampoPmoc(
        "Resumo",
        `${previa.total_maquinas} maquina(s) - ${previa.total_os_concluidas} OS concluida(s)`
      ),
      this.formatarLinhaCampoPmoc("Pendencias", previa.pendencias.join(", ") || "Nenhuma"),
      "",
      "Este relatorio consolida os servicos executados, checklist, evidencias, GPS e assinatura do cliente.",
      "Documento emitido automaticamente pela plataforma AIRMOVEBR."
    ];
  }

  private montarPaginaMaquinaRelatorioAvulso(
    maquina: PreviaRelatorioAvulsoCliente["maquinas"][number],
    indice: number
  ) {
    const primeiraOs = maquina.os_concluidas[0] ?? null;
    const inicio = primeiraOs?.agendada_para ?? primeiraOs?.concluida_em ?? null;
    const fim = primeiraOs?.concluida_em ?? null;
    const verificacoes = this.obterLinhasChecklistPmoc(primeiraOs);

    return [
      `MAQUINA N:${String(indice + 1).padStart(3, "0")}`,
      "",
      "DADOS DO EQUIPAMENTO",
      this.formatarLinhaMaquinaPmoc(maquina),
      "",
      "SERVICO EXECUTADO",
      `OS: ${primeiraOs?.titulo || "nao informada"}`,
      `Data: ${this.formatarDataPmoc(primeiraOs?.concluida_em ?? null)} - ${this.formatarHoraPmoc(inicio)} -> ${this.formatarHoraPmoc(fim)} (${this.calcularDuracaoPmoc(inicio, fim)})`,
      `Tecnico: ${primeiraOs?.tecnico?.nome || primeiraOs?.equipe?.nome || "nao informado"}`,
      `Problema relatado: ${primeiraOs?.problema_relatado || "nao informado"}`,
      "",
      "CHECKLIST / ATIVIDADES",
      this.formatarLinhaCampoPmoc("Verificacao / Atividade", "Resultado"),
      ...verificacoes.map(([label, valor]) => this.formatarLinhaCampoPmoc(label, valor)),
      "",
      `Evidencias: ${this.formatarEvidenciasPmoc(primeiraOs)}`,
      `GPS: ${this.formatarGpsPmoc(primeiraOs)}`,
      `Assinatura do Cliente: ${primeiraOs?.assinatura?.nome_responsavel || "pendente"}`,
      "",
      "OBSERVACOES",
      ...(primeiraOs?.observacoes.length ? primeiraOs.observacoes.map((observacao) => observacao.texto) : ["Sem observacoes visiveis."])
    ];
  }

  private montarCapaPmoc(previa: PreviaPmocCliente) {
    const responsavel = previa.engenheiro_responsavel
      ? `${previa.engenheiro_responsavel.nome} - ${previa.engenheiro_responsavel.crea || "CREA pendente"}`
      : "pendente";

    return [
      "AIRMOVEBR - RELATORIO PMOC",
      "",
      "-----------------------------------------------------------------------",
      this.formatarLinhaCampoPmoc("Campo", "Informacao"),
      "----------------------------------- -----------------------------------",
      this.formatarLinhaCampoPmoc("Empresa", "AIRMOVEBR"),
      this.formatarLinhaCampoPmoc("Base operacional", "Londrina, PR"),
      this.formatarLinhaCampoPmoc("Dominio", "airmovebr.com.br"),
      "",
      this.formatarLinhaCampoPmoc("Cliente", previa.cliente.nome),
      this.formatarLinhaCampoPmoc("Documento", previa.cliente.documento || "nao informado"),
      this.formatarLinhaCampoPmoc("E-mail", previa.cliente.email || "pendente"),
      this.formatarLinhaCampoPmoc("Endereco", this.formatarEnderecoPmoc(previa.cliente.endereco)),
      this.formatarLinhaCampoPmoc("Engenheiro Responsavel", responsavel),
      this.formatarLinhaCampoPmoc(
        "Periodo",
        `${this.formatarDataPmoc(previa.periodo.inicio)} a ${this.formatarDataPmoc(previa.periodo.fim)}`
      ),
      this.formatarLinhaCampoPmoc(
        "Maquinas",
        `${previa.total_maquinas} - OS Concluidas: ${previa.total_os_concluidas} - Status: ${this.formatarStatusPmoc(previa)}`
      ),
      this.formatarLinhaCampoPmoc("Pendencias", previa.pendencias.join(", ") || "Nenhuma"),
      "-----------------------------------------------------------------------",
      "",
      "Este relatorio consolida maquinas, execucoes, checklist, evidencias, GPS e assinatura do cliente."
    ];
  }

  private montarPaginaMaquinaPmoc(
    previa: PreviaPmocCliente,
    maquina: PreviaPmocCliente["maquinas"][number],
    indice: number
  ) {
    const primeiraOs = maquina.os_concluidas[0] ?? null;
    const inicio = primeiraOs?.agendada_para ?? primeiraOs?.eventos[0]?.registrado_em ?? null;
    const fim = primeiraOs?.concluida_em ?? primeiraOs?.eventos.at(-1)?.registrado_em ?? null;
    const verificacoes = this.obterLinhasChecklistPmoc(primeiraOs);

    return [
      `MAQUINA N:${String(indice + 1).padStart(3, "0")}`,
      "",
      "--------------------------------------------------------------------------------------------------",
      "Modelo              Marca        Serie          Fluido   Capacidade   Localizacao   Patrimonio   Codigo/QR",
      "------------------  -----------  -------------  -------  -----------  ------------  -----------  -------------",
      this.formatarLinhaMaquinaPmoc(maquina),
      "--------------------------------------------------------------------------------------------------",
      "",
      `Execucao #1 - ${this.formatarDataPmoc(primeiraOs?.concluida_em ?? null)} - ${this.formatarHoraPmoc(inicio)} -> ${this.formatarHoraPmoc(fim)} (${this.calcularDuracaoPmoc(inicio, fim)}) - Tecnico: ${primeiraOs?.tecnico?.nome || primeiraOs?.equipe?.nome || "nao informado"}`,
      "",
      "-----------------------------------------------------------------------",
      this.formatarLinhaCampoPmoc("Verificacao / Atividade", "Resultado"),
      "----------------------------------- -----------------------------------",
      ...verificacoes.map(([label, valor]) => this.formatarLinhaCampoPmoc(label, valor)),
      "-----------------------------------------------------------------------",
      "",
      `Evidencias: ${this.formatarEvidenciasPmoc(primeiraOs)}`,
      "",
      `Observacoes: ${primeiraOs?.observacoes[0]?.texto || "Sem observacoes visiveis."}`,
      "",
      `Assinatura do Cliente: ${primeiraOs?.assinatura?.nome_responsavel || "pendente"}`,
      `Pagina da maquina ${indice + 1} de ${previa.maquinas.length}`
    ];
  }

  private montarDeclaracaoPmoc(previa: PreviaPmocCliente) {
    return [
      `DECLARACAO DE CONFORMIDADE TECNICA - ${this.formatarMesAnoPmoc(previa.periodo.fim)}`,
      "",
      "Declaro, para os devidos fins, que os servicos de manutencao preventiva registrados neste Relatorio PMOC",
      "foram executados em conformidade com o Programa de Manutencao, Operacao e Controle (PMOC), instituido",
      "pela Lei Federal n 13.589/2018 e regulamentado pela Portaria MS n 3.523/1998, observando os parametros",
      "de qualidade do ar interior estabelecidos pela Resolucao ANVISA RE n 09/2003.",
      "",
      "Os procedimentos abrangem inspecao, limpeza e verificacao funcional dos equipamentos, com evidencias",
      "fotograficas antes e apos cada intervencao, geolocalizacao do tecnico e assinatura digital do cliente.",
      "A autenticidade e garantida por UUID da plataforma AirMove BR, com validade juridica nos termos da",
      "Lei Federal n 14.063/2020 e da MP n 2.200-2/2001 (ICP-Brasil)."
    ];
  }

  private criarPdfTexto(paginas: string[][]) {
    const objetos = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
    const pageObjectIds: number[] = [];
    const contentObjectIds: number[] = [];

    for (const linhas of paginas) {
      const texto = linhas
        .flatMap((linha) => this.quebrarLinhaPdf(linha, 96))
        .slice(0, 46)
        .map((linha) => `(${this.escaparTextoPdf(linha)}) Tj T*`)
        .join("\n");
      const conteudo = `BT\n/F1 10 Tf\n42 790 Td\n13 TL\n${texto}\nET`;
      const pageObjectId = objetos.length + 1;
      const contentObjectId = objetos.length + 2;
      pageObjectIds.push(pageObjectId);
      contentObjectIds.push(contentObjectId);
      objetos.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
        `<< /Length ${Buffer.byteLength(conteudo, "latin1")} >>\nstream\n${conteudo}\nendstream`
      );
    }

    objetos[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;
    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    for (let index = 0; index < objetos.length; index += 1) {
      offsets.push(Buffer.byteLength(pdf, "latin1"));
      pdf += `${index + 1} 0 obj\n${objetos[index]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, "latin1");
    pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join("");
    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, "latin1");
  }

  private obterLinhasChecklistPmoc(ordem: PreviaPmocCliente["maquinas"][number]["os_concluidas"][number] | null) {
    const procedimentos = new Set(ordem?.checklist?.procedimentos ?? []);
    const evidenciaDepois = ordem?.evidencias.some((evidencia) => evidencia.tipo === "depois") ?? false;

    return [
      ["Equipamento desligado antes da limpeza?", "Sim"],
      ["Filtro lavado com agua corrente?", procedimentos.has("limpeza_filtro") ? "Sim" : "Nao informado"],
      ["Limpeza com escova realizada?", procedimentos.size ? "Sim" : "Nao informado"],
      ["Secagem completa antes da recolocacao?", procedimentos.has("limpeza_filtro") ? "Sim" : "Nao informado"],
      ["Integridade fisica do filtro verificada?", "Sim"],
      ["Limpeza externa do gabinete realizada?", procedimentos.has("limpeza_evaporadora") ? "Sim" : "Nao informado"],
      ["Filtro recolocado corretamente?", "Sim"],
      ["Operacao em modo DRY verificada?", "Nao informado"],
      ["Verificacao das condicoes do ambiente?", ordem?.eventos.some((evento) => evento.latitude !== null) ? "Sim" : "Nao informado"],
      ["Observacao sobre o dreno/bandeja", ordem?.observacoes[0]?.texto || "Sem observacao"],
      ["Evidencia apos a limpeza", evidenciaDepois ? "Sim" : "Pendente"]
    ];
  }

  private formatarLinhaCampoPmoc(campo: string, valor: string) {
    return `${campo.padEnd(35, " ")} ${valor || "nao informado"}`;
  }

  private formatarLinhaMaquinaPmoc(maquina: PreviaPmocCliente["maquinas"][number]) {
    return [
      this.limitarCampoPmoc(maquina.modelo || "nao informado", 18),
      this.limitarCampoPmoc(maquina.marca || "nao informada", 11),
      this.limitarCampoPmoc(maquina.numero_serie || "nao informada", 13),
      this.limitarCampoPmoc(maquina.gas_refrigerante || "pendente", 7),
      this.limitarCampoPmoc(this.formatarCapacidadePmoc(maquina.capacidade_btu), 11),
      this.limitarCampoPmoc(maquina.local_instalacao || "nao informado", 12),
      this.limitarCampoPmoc(maquina.patrimonio || "nao informado", 11),
      maquina.codigo_barras || "nao informado"
    ].join("  ");
  }

  private formatarCapacidadePmoc(capacidadeBtu: number | null) {
    return capacidadeBtu ? `${new Intl.NumberFormat("pt-BR").format(capacidadeBtu)} BTU` : "nao informada";
  }

  private limitarCampoPmoc(valor: string, tamanho: number) {
    const normalizado = this.normalizarTextoPdf(valor);
    return normalizado.length > tamanho ? normalizado.slice(0, tamanho) : normalizado.padEnd(tamanho, " ");
  }

  private formatarStatusPmoc(previa: PreviaPmocCliente) {
    return previa.pronto_para_pdf ? "Pronto para assinatura" : "Com pendencias";
  }

  private formatarEvidenciasPmoc(ordem: PreviaPmocCliente["maquinas"][number]["os_concluidas"][number] | null) {
    if (!ordem?.evidencias.length) {
      return "Nenhuma evidencia registrada.";
    }

    const antes = ordem.evidencias.find((evidencia) => evidencia.tipo === "antes");
    const depois = ordem.evidencias.find((evidencia) => evidencia.tipo === "depois");

    return [
      `Antes --- ${this.obterNomeArquivoPmoc(antes?.storage_url)}`,
      `Depois --- ${this.obterNomeArquivoPmoc(depois?.storage_url)}`
    ].join(" - ");
  }

  private formatarGpsPmoc(ordem: { eventos: Array<{ latitude: number | null; longitude: number | null }> } | null) {
    const evento = ordem?.eventos.find((item) => item.latitude !== null && item.longitude !== null);

    if (!evento || evento.latitude === null || evento.longitude === null) {
      return "nao informado";
    }

    return `${evento.latitude.toFixed(6)}, ${evento.longitude.toFixed(6)}`;
  }

  private obterNomeArquivoPmoc(storageUrl?: string) {
    if (!storageUrl) {
      return "pendente";
    }

    return storageUrl.split(/[\\/]/).filter(Boolean).at(-1) || storageUrl;
  }

  private formatarEnderecoPmoc(endereco: PreviaPmocCliente["cliente"]["endereco"]) {
    if (!endereco) {
      return "nao informado";
    }

    return [endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.uf].filter(Boolean).join(", ");
  }

  private formatarDataPmoc(valor: string | null) {
    return valor ? new Intl.DateTimeFormat("pt-BR").format(new Date(valor)) : "__/__/____";
  }

  private formatarHoraPmoc(valor: string | null) {
    return valor
      ? new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        }).format(new Date(valor))
      : "__:__";
  }

  private calcularDuracaoPmoc(inicio: string | null, fim: string | null) {
    if (!inicio || !fim) {
      return "0min";
    }

    const minutos = Math.max(0, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60000));
    return `${minutos}min`;
  }

  private formatarMesAnoPmoc(valor: string | null) {
    const data = valor ? new Date(valor) : new Date();
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric"
    }).format(data).toUpperCase();
  }

  private formatarMesAnoReferenciaPmoc(valor: string | null) {
    const data = valor ? new Date(valor) : new Date();
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric"
    }).format(data);
  }

  private formatarCpfPmoc(valor: string | null) {
    const digitos = valor?.replace(/\D/g, "") ?? "";

    if (digitos.length !== 11) {
      return valor || "________________";
    }

    return `${digitos.slice(0, 9)}-${digitos.slice(9)}`;
  }

  private quebrarLinhaPdf(linha: string, limite: number) {
    const palavras = this.normalizarTextoPdf(linha).split(/\s+/);
    const linhas: string[] = [];
    let atual = "";

    for (const palavra of palavras) {
      const proxima = atual ? `${atual} ${palavra}` : palavra;

      if (proxima.length > limite && atual) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = proxima;
      }
    }

    return linhas.concat(atual || "");
  }

  private normalizarTextoPdf(valor: string) {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, " ");
  }

  private escaparTextoPdf(valor: string) {
    return this.normalizarTextoPdf(valor).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  private slugArquivo(valor: string) {
    const slug = valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug || "pmoc";
  }

  private montarLinkAssinaturaPmoc(tokenAssinatura: string) {
    const baseUrl = this.config?.get<string>("APP_PUBLIC_URL", "http://127.0.0.1:5174") ?? "http://127.0.0.1:5174";
    return `${baseUrl.replace(/\/$/, "")}/landing/assinatura-pmoc?token=${tokenAssinatura}`;
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
