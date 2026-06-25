import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AutomacaoStatus,
  AutomacaoTipo,
  OrdemServicoEventoAcao,
  OrdemServicoStatus,
  OrdemServicoTipoServico,
  PmocRelatorioStatus,
  Prisma,
  UsuarioRole
} from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { AprovarPreChamadoDto } from "../dto/aprovar-pre-chamado.dto";
import { CriarAbastecimentoDto } from "../dto/criar-abastecimento.dto";
import { SalvarEquipamentoDto } from "../dto/salvar-equipamento.dto";
import { SalvarClienteDto } from "../dto/salvar-cliente.dto";
import { SalvarEmpresaDto } from "../dto/salvar-empresa.dto";
import { SalvarEngenheiroResponsavelDto } from "../dto/salvar-engenheiro-responsavel.dto";
import { SalvarEquipeDto } from "../dto/salvar-equipe.dto";
import { SalvarOsAgendaDto } from "../dto/salvar-os-agenda.dto";
import { SalvarPlanoRecorrenciaDto } from "../dto/salvar-plano-recorrencia.dto";
import { SalvarTecnicoDto } from "../dto/salvar-tecnico.dto";
import { AdminAgendaService } from "./admin-agenda.service";
import { AdminClientesService } from "./admin-clientes.service";
import { AdminEquipamentosService } from "./admin-equipamentos.service";
import { AdminEngenheirosService } from "./admin-engenheiros.service";
import { AdminEquipesService } from "./admin-equipes.service";
import { AdminFrotaService } from "./admin-frota.service";
import { AdminPreChamadosService } from "./admin-pre-chamados.service";
import { AdminRecorrenciaService } from "./admin-recorrencia.service";
import { AdminTecnicosService } from "./admin-tecnicos.service";
import { AdminPmocPdfRendererService } from "./admin-pmoc-pdf-renderer.service";

type PreviaPmocCliente = Awaited<ReturnType<AdminRelatorioTecnicoCoreService["obterPreviaPmocCliente"]>>;
type PreviaRelatorioAvulsoCliente = Awaited<ReturnType<AdminRelatorioTecnicoCoreService["obterPreviaRelatorioAvulsoCliente"]>>;
type PaginaPdfTexto = { linhas: string[]; imagens?: Buffer[] };

@Injectable()
export class AdminRelatorioTecnicoCoreService {
  private readonly agendaService: AdminAgendaService;
  private readonly recorrenciaService: AdminRecorrenciaService;
  private readonly frotaService: AdminFrotaService;
  private readonly clientesService: AdminClientesService;
  private readonly equipamentosService: AdminEquipamentosService;
  private readonly tecnicosService: AdminTecnicosService;
  private readonly equipesService: AdminEquipesService;
  private readonly engenheirosService: AdminEngenheirosService;
  private readonly preChamadosService: AdminPreChamadosService;
  private readonly pmocPdfRenderer = new AdminPmocPdfRendererService();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config?: ConfigService,
    agendaService?: AdminAgendaService,
    recorrenciaService?: AdminRecorrenciaService,
    frotaService?: AdminFrotaService,
    clientesService?: AdminClientesService,
    equipamentosService?: AdminEquipamentosService,
    tecnicosService?: AdminTecnicosService,
    equipesService?: AdminEquipesService,
    engenheirosService?: AdminEngenheirosService,
    preChamadosService?: AdminPreChamadosService
  ) {
    this.agendaService = agendaService ?? new AdminAgendaService(prisma);
    this.recorrenciaService = recorrenciaService ?? new AdminRecorrenciaService(prisma);
    this.frotaService = frotaService ?? new AdminFrotaService(prisma);
    this.clientesService = clientesService ?? new AdminClientesService(prisma);
    this.equipamentosService = equipamentosService ?? new AdminEquipamentosService(prisma);
    this.tecnicosService = tecnicosService ?? new AdminTecnicosService(prisma);
    this.equipesService = equipesService ?? new AdminEquipesService(prisma);
    this.engenheirosService = engenheirosService ?? new AdminEngenheirosService(prisma);
    this.preChamadosService = preChamadosService ?? new AdminPreChamadosService(prisma);
  }

  async listarPreChamados(usuario: AuthenticatedUser) {
    return this.preChamadosService.listarPreChamados(usuario);
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
          membros: {
            where: {
              ativo: true
            },
            select: {
              funcao: true,
              usuario: {
                select: {
                  id: true,
                  nome: true,
                  email: true,
                  role: true
                }
              }
            }
          },
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
            in: [UsuarioRole.admin, UsuarioRole.supervisor, UsuarioRole.tecnico, UsuarioRole.auxiliar]
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
        tecnico: equipe.tecnico,
        membros: equipe.membros.map((membro) => ({
          funcao: membro.funcao,
          usuario: membro.usuario
        }))
      })),
      tecnicos
    };
  }

  async listarLocalizacoesFrota(usuario: AuthenticatedUser) {
    return this.frotaService.listarLocalizacoesFrota(usuario);
  }

  async listarAbastecimentos(usuario: AuthenticatedUser) {
    return this.frotaService.listarAbastecimentos(usuario);
  }

  async criarAbastecimento(dto: CriarAbastecimentoDto, usuario: AuthenticatedUser) {
    return this.frotaService.criarAbastecimento(dto, usuario);
  }

  async obterRelatorioFrota(usuario: AuthenticatedUser, referencia = new Date()) {
    return this.frotaService.obterRelatorioFrota(usuario, referencia);
  }

  async listarAgenda(usuario: AuthenticatedUser) {
    return this.agendaService.listarAgenda(usuario);
  }

  async criarOrdemAgenda(dto: SalvarOsAgendaDto, usuario: AuthenticatedUser) {
    return this.agendaService.criarOrdemAgenda(dto, usuario);
  }

  async reprogramarOrdemAgenda(osId: string, dto: SalvarOsAgendaDto, usuario: AuthenticatedUser) {
    return this.agendaService.reprogramarOrdemAgenda(osId, dto, usuario);
  }

  async listarPlanosRecorrencia(usuario: AuthenticatedUser) {
    return this.recorrenciaService.listarPlanosRecorrencia(usuario);
  }

  async criarPlanoRecorrencia(dto: SalvarPlanoRecorrenciaDto, usuario: AuthenticatedUser) {
    return this.recorrenciaService.criarPlanoRecorrencia(dto, usuario);
  }

  async atualizarPlanoRecorrencia(planoId: string, dto: SalvarPlanoRecorrenciaDto, usuario: AuthenticatedUser) {
    return this.recorrenciaService.atualizarPlanoRecorrencia(planoId, dto, usuario);
  }

  async gerarOrdemPlanoRecorrencia(planoId: string, usuario: AuthenticatedUser) {
    return this.recorrenciaService.gerarOrdemPlanoRecorrencia(planoId, usuario);
  }

  async listarClientes(usuario: AuthenticatedUser) {
    return this.clientesService.listarClientes(usuario);
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
    return this.engenheirosService.listarEngenheirosResponsaveis(usuario);
  }

  async listarTecnicos(usuario: AuthenticatedUser) {
    return this.tecnicosService.listarTecnicos(usuario);
  }

  async criarTecnico(dto: SalvarTecnicoDto, usuario: AuthenticatedUser) {
    return this.tecnicosService.criarTecnico(dto, usuario);
  }

  async atualizarTecnico(tecnicoId: string, dto: SalvarTecnicoDto, usuario: AuthenticatedUser) {
    return this.tecnicosService.atualizarTecnico(tecnicoId, dto, usuario);
  }

  async apagarTecnico(tecnicoId: string, usuario: AuthenticatedUser) {
    return this.tecnicosService.apagarTecnico(tecnicoId, usuario);
  }

  async listarEquipes(usuario: AuthenticatedUser) {
    return this.equipesService.listarEquipes(usuario);
  }

  async criarEquipe(dto: SalvarEquipeDto, usuario: AuthenticatedUser) {
    return this.equipesService.criarEquipe(dto, usuario);
  }

  async atualizarEquipe(equipeId: string, dto: SalvarEquipeDto, usuario: AuthenticatedUser) {
    return this.equipesService.atualizarEquipe(equipeId, dto, usuario);
  }

  async apagarEquipe(equipeId: string, usuario: AuthenticatedUser) {
    return this.equipesService.apagarEquipe(equipeId, usuario);
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
        pmocArtNumero: true,
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
            areaClimatizadaM2: true,
            ocupantesFixo: true,
            ocupantesVariavel: true,
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
        pmoc_art_numero: cliente.pmocArtNumero,
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
    const buffer = this.pmocPdfRenderer.gerar(previa);

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
    const relatoriosApagados = await this.prisma.automacaoAgendada.findMany({
      where: {
        empresaId: usuario.empresa_id,
        tipo: AutomacaoTipo.enviar_email,
        payload: {
          path: ["tipo"],
          equals: "relatorio_tecnico_avulso_apagado"
        }
      },
      select: {
        payload: true
      }
    });
    const osApagadasPorCliente = this.mapearOsRelatoriosAvulsosApagados(relatoriosApagados);
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
        },
        ordensServico: {
          where: {
            status: OrdemServicoStatus.concluida
          },
          select: {
            id: true,
            checklistRespostas: {
              select: {
                equipamentoId: true
              }
            }
          }
        }
      }
    });

    const items = clientes.map((cliente) => {
      const equipamentoIds = new Set(cliente.equipamentos.map((equipamento) => equipamento.id));
      const osConcluidas = Array.from(
        new Set([
          ...cliente.equipamentos.flatMap((equipamento) => equipamento.ordensServico.map((ordem) => ordem.id)),
          ...(cliente.ordensServico ?? [])
            .filter((ordem) =>
              ordem.checklistRespostas.some((resposta) => equipamentoIds.has(resposta.equipamentoId))
            )
            .map((ordem) => ordem.id)
        ])
      );
      const osApagadas = osApagadasPorCliente.get(cliente.id) ?? new Set<string>();
      const osVisiveis = osConcluidas.filter((ordemId) => !osApagadas.has(ordemId));
      const totalOsConcluidas = osVisiveis.length;

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
    }).filter((item) => item.total_os_concluidas > 0);

    return {
      total: items.length,
      pendentes: items.filter((item) => item.pronto_para_envio).length,
      items
    };
  }

  async obterPreviaRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    const cliente = await this.obterClienteRelatorioAvulso(clienteId, usuario);
    const ordensPorEquipamento = this.mapearOrdensPorEquipamentoChecklist(cliente.ordensServico ?? []);
    const maquinas = cliente.equipamentos
      .map((equipamento) =>
        this.mapearMaquinaRelatorioTecnico({
          ...equipamento,
          ordensServico: this.unirOrdensRelatorio(
            equipamento.ordensServico,
            ordensPorEquipamento.get(equipamento.id) ?? []
          )
        })
      )
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

  async apagarRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    const previa = await this.obterPreviaRelatorioAvulsoCliente(clienteId, usuario);
    const osIds = previa.maquinas.flatMap((maquina) => maquina.os_concluidas.map((ordem) => ordem.id));

    const resultado = await this.prisma.automacaoAgendada.deleteMany({
      where: {
        empresaId: usuario.empresa_id,
        tipo: AutomacaoTipo.enviar_email,
        AND: [
          { payload: { path: ["tipo"], equals: "relatorio_tecnico_avulso" } },
          { payload: { path: ["cliente_id"], equals: clienteId } }
        ]
      }
    });

    await this.prisma.automacaoAgendada.create({
      data: {
        empresaId: usuario.empresa_id,
        tipo: AutomacaoTipo.enviar_email,
        status: AutomacaoStatus.concluida,
        executarEm: new Date(),
        payload: {
          tipo: "relatorio_tecnico_avulso_apagado",
          cliente_id: previa.cliente.id,
          cliente_nome: previa.cliente.nome,
          apagado_em: new Date().toISOString(),
          os_ids: osIds
        } satisfies Prisma.JsonObject
      }
    });

    return {
      cliente: {
        id: previa.cliente.id,
        nome: previa.cliente.nome
      },
      relatorios_apagados: Math.max(resultado.count, osIds.length)
    };
  }

  async criarEngenheiroResponsavel(dto: SalvarEngenheiroResponsavelDto, usuario: AuthenticatedUser) {
    return this.engenheirosService.criarEngenheiroResponsavel(dto, usuario);
  }

  private mapearOsRelatoriosAvulsosApagados(relatorios: Array<{ payload: Prisma.JsonValue }>) {
    const porCliente = new Map<string, Set<string>>();

    for (const relatorio of relatorios) {
      if (!relatorio.payload || typeof relatorio.payload !== "object" || Array.isArray(relatorio.payload)) {
        continue;
      }

      const payload = relatorio.payload as Record<string, unknown>;
      const clienteId = typeof payload.cliente_id === "string" ? payload.cliente_id : "";
      const osIds = Array.isArray(payload.os_ids)
        ? payload.os_ids.filter((item): item is string => typeof item === "string")
        : [];

      if (!clienteId || !osIds.length) {
        continue;
      }

      const atual = porCliente.get(clienteId) ?? new Set<string>();
      osIds.forEach((osId) => atual.add(osId));
      porCliente.set(clienteId, atual);
    }

    return porCliente;
  }

  async atualizarEngenheiroResponsavel(
    engenheiroId: string,
    dto: SalvarEngenheiroResponsavelDto,
    usuario: AuthenticatedUser
  ) {
    return this.engenheirosService.atualizarEngenheiroResponsavel(engenheiroId, dto, usuario);
  }

  async apagarEngenheiroResponsavel(engenheiroId: string, usuario: AuthenticatedUser) {
    return this.engenheirosService.apagarEngenheiroResponsavel(engenheiroId, usuario);
  }

  async criarCliente(dto: SalvarClienteDto, usuario: AuthenticatedUser) {
    return this.clientesService.criarCliente(dto, usuario);
  }

  async atualizarCliente(clienteId: string, dto: SalvarClienteDto, usuario: AuthenticatedUser) {
    return this.clientesService.atualizarCliente(clienteId, dto, usuario);
  }

  async apagarCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.clientesService.apagarCliente(clienteId, usuario);
  }

  async listarEquipamentosCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.equipamentosService.listarEquipamentosCliente(clienteId, usuario);
  }

  async criarEquipamentoCliente(
    clienteId: string,
    dto: SalvarEquipamentoDto,
    usuario: AuthenticatedUser
  ) {
    return this.equipamentosService.criarEquipamentoCliente(clienteId, dto, usuario);
  }

  async renovarAcessoPublicoEquipamento(equipamentoId: string, usuario: AuthenticatedUser) {
    return this.equipamentosService.renovarAcessoPublicoEquipamento(equipamentoId, usuario);
  }

  async apagarEquipamento(equipamentoId: string, usuario: AuthenticatedUser) {
    return this.equipamentosService.apagarEquipamento(equipamentoId, usuario);
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
    periodo: ReturnType<AdminRelatorioTecnicoCoreService["obterPeriodoRelatorio"]>,
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
    return this.preChamadosService.aprovarPreChamado(osId, usuario, dto);
  }

  async rejeitarPreChamado(osId: string, usuario: AuthenticatedUser) {
    return this.preChamadosService.rejeitarPreChamado(osId, usuario);
  }

  private mapearAtualizacaoOrdem(ordem: { id: string; status: OrdemServicoStatus; atualizadaEm: Date }) {
    return {
      os_id: ordem.id,
      status: ordem.status,
      atualizado_em: ordem.atualizadaEm.toISOString()
    };
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
      tipoServico: true,
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
            areaClimatizadaM2: true,
            ocupantesFixo: true,
            ocupantesVariavel: true,
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
        },
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
    });

    if (!cliente) {
      throw new NotFoundException("Cliente nao encontrado.");
    }

    if (cliente.pmocAtivo) {
      throw new BadRequestException("Cliente possui PMOC ativo. Use o fluxo PMOC.");
    }

    return cliente;
  }

  private mapearOrdensPorEquipamentoChecklist<T extends { checklistRespostas?: Array<{ equipamentoId?: string | null }> }>(
    ordens: T[]
  ) {
    const porEquipamento = new Map<string, T[]>();

    for (const ordem of ordens) {
      const equipamentos = new Set(
        (ordem.checklistRespostas ?? [])
          .map((resposta) => resposta.equipamentoId)
          .filter((equipamentoId): equipamentoId is string => Boolean(equipamentoId))
      );

      for (const equipamentoId of equipamentos) {
        const atuais = porEquipamento.get(equipamentoId) ?? [];
        atuais.push(ordem);
        porEquipamento.set(equipamentoId, atuais);
      }
    }

    return porEquipamento;
  }

  private unirOrdensRelatorio<T extends { id: string }>(ordensDiretas: T[], ordensPorChecklist: T[]) {
    const porId = new Map<string, T>();

    for (const ordem of [...ordensDiretas, ...ordensPorChecklist]) {
      porId.set(ordem.id, ordem);
    }

    return [...porId.values()].sort((a, b) => {
      const dataA = "concluidaEm" in a && a.concluidaEm instanceof Date ? a.concluidaEm.getTime() : 0;
      const dataB = "concluidaEm" in b && b.concluidaEm instanceof Date ? b.concluidaEm.getTime() : 0;
      return dataB - dataA;
    });
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
    areaClimatizadaM2: number | null;
    ocupantesFixo: number | null;
    ocupantesVariavel: number | null;
    atualizadoEm: Date;
    ordensServico: Array<{
      id: string;
      titulo: string;
      tipoServico: OrdemServicoTipoServico;
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

  private mapearOrdemRelatorioTecnico(ordem: {
    id: string;
    titulo: string;
    tipoServico: OrdemServicoTipoServico;
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
      checklist_respostas: (ordem.checklistRespostas ?? []).map((resposta) => ({
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

  private gerarPdfBasicoRelatorioAvulso(previa: PreviaRelatorioAvulsoCliente) {
    const paginas: Array<string[] | PaginaPdfTexto> = [this.montarCapaRelatorioAvulso(previa)];

    if (!previa.maquinas.length) {
      paginas.push([
        "MAQUINA N:001",
        "",
        "Nenhuma maquina com manutencao concluida para este relatorio.",
        "Finalize a OS antes de emitir o relatorio tecnico."
      ]);
    }

    for (const [indice, maquina] of previa.maquinas.entries()) {
      paginas.push(...this.montarPaginasMaquinaRelatorioAvulso(maquina, indice));
    }

    return this.criarPdfTexto(paginas);
  }

  private montarCapaRelatorioAvulso(previa: PreviaRelatorioAvulsoCliente) {
    return [
      "AIRMOVEBR - RELATORIO DE MANUTENCAO",
      "Documento emitido automaticamente pela plataforma AIRMOVEBR",
      "",
      `Data: ${this.formatarDataPmoc(new Date().toISOString())}`,
      "",
      "DADOS DA EMPRESA",
      this.formatarLinhaCampoPmoc("Campo", "Informacao"),
      this.formatarLinhaCampoPmoc("Razao Social", "AIRMOVEBR"),
      this.formatarLinhaCampoPmoc("Base operacional", "Londrina, PR"),
      this.formatarLinhaCampoPmoc("Dominio", "airmovebr.com.br"),
      "",
      "DADOS DO CLIENTE",
      this.formatarLinhaCampoPmoc("Campo", "Informacao"),
      this.formatarLinhaCampoPmoc("Cliente", previa.cliente.nome),
      this.formatarLinhaCampoPmoc("Documento", previa.cliente.documento || "nao informado"),
      this.formatarLinhaCampoPmoc("E-mail", previa.cliente.email || "pendente"),
      this.formatarLinhaCampoPmoc("Endereco", this.formatarEnderecoPmoc(previa.cliente.endereco)),
      "",
      "EQUIPE RESPONSAVEL",
      this.formatarLinhaCampoPmoc("Campo", "Informacao"),
      this.formatarLinhaCampoPmoc(
        "Periodo",
        `${this.formatarDataPmoc(previa.periodo.inicio)} a ${this.formatarDataPmoc(previa.periodo.fim)}`
      ),
      this.formatarLinhaCampoPmoc(
        "Total de OS Concluidas",
        String(previa.total_os_concluidas)
      ),
      this.formatarLinhaCampoPmoc("Total de Maquinas", String(previa.total_maquinas)),
      this.formatarLinhaCampoPmoc("Pendencias", previa.pendencias.join(", ") || "Nenhuma"),
      "",
      "DECLARACAO DE CONCLUSAO",
      "Este relatorio consolida o servico executado, evidencias, GPS e assinatura do cliente."
    ];
  }

  private montarPaginasMaquinaRelatorioAvulso(
    maquina: PreviaRelatorioAvulsoCliente["maquinas"][number],
    indice: number
  ) {
    const ordens = maquina.os_concluidas.length ? maquina.os_concluidas : [null];

    return ordens.map((ordem, ordemIndice) => {
      const inicio = ordem?.agendada_para ?? ordem?.concluida_em ?? null;
      const fim = ordem?.concluida_em ?? null;
      const servicoRealizado = this.obterLinhasServicoRelatorioAvulso(ordem);

      const linhas = [
        `MAQUINA N:${String(indice + 1).padStart(3, "0")}`,
        `MANUTENCAO N:${String(ordemIndice + 1).padStart(3, "0")} DE ${String(ordens.length).padStart(3, "0")}`,
        "",
        "DADOS DO EQUIPAMENTO",
        this.formatarLinhaCampoPmoc("Campo", "Informacao"),
        ...this.obterLinhasEquipamentoRelatorioAvulso(maquina),
        "",
        "SERVICO EXECUTADO",
        this.formatarLinhaCampoPmoc("Campo", "Informacao"),
        `OS: ${ordem?.titulo || "nao informada"}`,
        this.formatarLinhaCampoPmoc(
          "Data e Horario",
          `${this.formatarDataPmoc(ordem?.concluida_em ?? null)} - ${this.formatarHoraPmoc(inicio)} -> ${this.formatarHoraPmoc(fim)} (${this.calcularDuracaoPmoc(inicio, fim)})`
        ),
        this.formatarLinhaCampoPmoc("Tecnico", ordem?.tecnico?.nome || ordem?.equipe?.nome || "nao informado"),
        this.formatarLinhaCampoPmoc("Problema relatado", ordem?.problema_relatado || "nao informado"),
        ...servicoRealizado.map(([label, valor]) => this.formatarLinhaCampoPmoc(label, valor)),
        "",
        "EVIDENCIAS E VALIDACAO",
        this.formatarLinhaCampoPmoc("Campo", "Informacao"),
        this.formatarLinhaCampoPmoc("Fotos", this.formatarEvidenciasPmoc(ordem)),
        this.formatarLinhaCampoPmoc("Coordenadas GPS", this.formatarGpsPmoc(ordem)),
        this.formatarLinhaCampoPmoc("Assinatura do Cliente", ordem?.assinatura?.nome_responsavel || "pendente"),
        "",
        "OBSERVACOES",
        ...(ordem?.observacoes.length ? ordem.observacoes.map((observacao) => observacao.texto) : ["Sem observacoes visiveis."]),
        "",
        "DECLARACAO DE CONCLUSAO",
        "Declaro para os devidos fins que o servico descrito neste relatorio foi executado integralmente, sem pendencias registradas na emissao."
      ];

      return {
        linhas,
        imagens: this.carregarImagensRelatorioAvulso(ordem)
      };
    });
  }

  private criarPdfTexto(paginasEntrada: Array<string[] | PaginaPdfTexto>) {
    const paginas = paginasEntrada.map((pagina) => Array.isArray(pagina) ? { linhas: pagina, imagens: [] } : pagina);
    const objetos = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
    ];
    const pageObjectIds: number[] = [];

    for (const pagina of paginas) {
      const imageObjectIds: number[] = [];

      for (const imagem of (pagina.imagens ?? []).slice(0, 4)) {
        const imageObjectId = objetos.length + 1;
        imageObjectIds.push(imageObjectId);
        objetos.push(this.criarObjetoImagemPdf(imagem));
      }

      const xObjects = imageObjectIds.map((id, index) => `/Im${index + 1} ${id} 0 R`).join(" ");
      const recursosImagem = xObjects ? `/XObject << ${xObjects} >>` : "";
      const texto = this.montarConteudoTextoRelatorioAvulso(pagina.linhas, Boolean(imageObjectIds.length));
      const comandosImagem = imageObjectIds
        .map((_, index) => {
          const x = 42 + (index % 2) * 260;
          const y = 75 + Math.floor(index / 2) * 125;
          return [
            "q",
            "0.80 0.84 0.90 RG",
            "1 w",
            `${x} ${y} 220 110 re S`,
            `220 0 0 110 ${x} ${y} cm`,
            `/Im${index + 1} Do`,
            "Q"
          ].join("\n");
        })
        .join("\n");
      const conteudo = [texto, comandosImagem]
        .filter(Boolean)
        .join("\n");
      const pageObjectId = objetos.length + 1;
      const contentObjectId = objetos.length + 2;
      pageObjectIds.push(pageObjectId);
      objetos.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${recursosImagem} >> /Contents ${contentObjectId} 0 R >>`,
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

  private montarConteudoTextoRelatorioAvulso(linhas: string[], reservarEspacoImagens: boolean) {
    const comandos: string[] = [
      "0.09 0.18 0.30 rg",
      "42 776 528 44 re f",
      "0.21 0.53 0.73 rg",
      "42 772 528 4 re f"
    ];
    const titulo = linhas[0] ?? "AIRMOVEBR - RELATORIO DE MANUTENCAO";
    const subtitulo = linhas[1] ?? "";
    comandos.push(this.comandoTextoPdf(titulo, 54, 804, 15, "F2", "1 1 1"));
    comandos.push(this.comandoTextoPdf(subtitulo, 54, 787, 9, "F1", "0.88 0.93 0.98"));

    let y = 748;
    const limiteInferior = reservarEspacoImagens ? 250 : 58;

    for (const linhaOriginal of linhas.slice(2)) {
      const linha = this.normalizarTextoPdf(linhaOriginal).trimEnd();

      if (!linha.trim()) {
        y -= 8;
        continue;
      }

      if (y < limiteInferior) {
        break;
      }

      if (this.ehTituloSecaoRelatorioAvulso(linha)) {
        const altura = linha.startsWith("MAQUINA") ? 24 : 20;
        const fill = linha.startsWith("MAQUINA") ? "0.09 0.18 0.30" : "0.93 0.95 0.97";
        const color = linha.startsWith("MAQUINA") ? "1 1 1" : "0.09 0.18 0.30";
        comandos.push(`${fill} rg\n42 ${y - altura + 6} 528 ${altura} re f`);
        comandos.push(this.comandoTextoPdf(linha, 54, y - 8, linha.startsWith("MAQUINA") ? 11 : 10, "F2", color));
        y -= altura + 8;
        continue;
      }

      if (this.ehLinhaTabelaRelatorioAvulso(linha)) {
        const linhasQuebradas = this.quebrarLinhaPdf(linha, 88);
        const altura = Math.max(22, linhasQuebradas.length * 11 + 10);
        const cabecalho = /^Campo\s+Informacao$/i.test(linha.trim());
        const fill = cabecalho ? "0.94 0.95 0.96" : "1 1 1";
        comandos.push(`${fill} rg\n42 ${y - altura + 6} 528 ${altura} re f`);
        comandos.push("0.82 0.85 0.88 RG\n0.6 w");
        comandos.push(`42 ${y - altura + 6} 528 ${altura} re S`);
        linhasQuebradas.forEach((parte, index) => {
          comandos.push(this.comandoTextoPdf(parte, 54, y - 8 - index * 11, 8.5, cabecalho ? "F2" : "F1", "0.12 0.16 0.22"));
        });
        y -= altura;
        continue;
      }

      const linhasTexto = this.quebrarLinhaPdf(linha, 94);
      linhasTexto.forEach((parte, index) => {
        comandos.push(this.comandoTextoPdf(parte, 54, y - index * 12, 9, "F1", "0.12 0.16 0.22"));
      });
      y -= linhasTexto.length * 12 + 2;
    }

    comandos.push("0.55 0.60 0.66 rg\n42 34 528 1 re f");
    comandos.push(this.comandoTextoPdf("Documento gerado automaticamente pela plataforma AIRMOVEBR.", 42, 20, 7.5, "F1", "0.38 0.42 0.48"));

    return comandos.join("\n");
  }

  private comandoTextoPdf(texto: string, x: number, y: number, tamanho: number, fonte: "F1" | "F2", cor: string) {
    return `BT\n${cor} rg\n/${fonte} ${tamanho} Tf\n${x} ${y} Td\n(${this.escaparTextoPdf(texto)}) Tj\nET`;
  }

  private ehTituloSecaoRelatorioAvulso(linha: string) {
    return /^(DADOS|EQUIPE|SERVICO|EVIDENCIAS|OBSERVACOES|DECLARACAO|MAQUINA)/.test(linha);
  }

  private ehLinhaTabelaRelatorioAvulso(linha: string) {
    return /\S\s{2,}\S/.test(linha) || /^[^:]{2,30}:\s+\S/.test(linha);
  }

  private obterLinhasEquipamentoRelatorioAvulso(maquina: PreviaRelatorioAvulsoCliente["maquinas"][number]) {
    return [
      this.formatarLinhaCampoPmoc("Identificador Interno", maquina.patrimonio || maquina.codigo_barras || "nao informado"),
      this.formatarLinhaCampoPmoc("Marca / Modelo", `${maquina.marca || "nao informada"} ${maquina.modelo || ""}`.trim()),
      this.formatarLinhaCampoPmoc("Fluido Refrigerante", maquina.gas_refrigerante || "pendente"),
      this.formatarLinhaCampoPmoc("Capacidade", this.formatarCapacidadePmoc(maquina.capacidade_btu)),
      this.formatarLinhaCampoPmoc("Ambiente Instalado", maquina.local_instalacao || "nao informado"),
      this.formatarLinhaCampoPmoc("N de Serie", maquina.numero_serie || "nao informado"),
      this.formatarLinhaCampoPmoc("Codigo Interno", maquina.codigo_barras || "nao informado")
    ];
  }

  private carregarImagensRelatorioAvulso(
    ordem: PreviaRelatorioAvulsoCliente["maquinas"][number]["os_concluidas"][number] | null
  ) {
    if (!ordem) {
      return [];
    }

    const imagens: Buffer[] = [];

    for (const evidencia of ordem.evidencias) {
      if (!evidencia.storage_url) {
        continue;
      }

      const imagem = this.carregarArquivoStorage(evidencia.storage_url);
      if (imagem) {
        imagens.push(imagem);
      }
    }

    return imagens;
  }

  private carregarArquivoStorage(storageUrl: string) {
    if (!storageUrl.startsWith("/storage/")) {
      return null;
    }

    const partes = storageUrl.replace(/^\/storage\//, "").split("/").filter(Boolean);
    const caminho = resolve(this.resolveStorageRoot(), join(...partes));

    try {
      return readFileSync(caminho);
    } catch {
      return null;
    }
  }

  private resolveStorageRoot() {
    const cwd = process.cwd();

    if (basename(cwd) === "backend") {
      return resolve(cwd, "..", "..", "storage");
    }

    return resolve(cwd, "storage");
  }

  private criarObjetoImagemPdf(buffer: Buffer) {
    const imagem = this.normalizarImagemPdf(buffer);

    return `<< /Type /XObject /Subtype /Image /Width ${imagem.width} /Height ${imagem.height} /ColorSpace /DeviceRGB /BitsPerComponent 8${imagem.filtro} /Length ${imagem.dados.length} >>\nstream\n${imagem.dados.toString("latin1")}\nendstream`;
  }

  private normalizarImagemPdf(buffer: Buffer) {
    if (this.ehJpeg(buffer)) {
      return {
        dados: buffer,
        ...this.obterDimensoesJpeg(buffer),
        filtro: " /Filter /DCTDecode"
      };
    }

    if (this.ehPng(buffer)) {
      const png = this.converterPngParaRgb(buffer);
      if (png) {
        return {
          dados: deflateSync(png.rgb),
          width: png.width,
          height: png.height,
          filtro: " /Filter /FlateDecode"
        };
      }
    }

    return {
      dados: Buffer.from([255, 255, 255]),
      width: 1,
      height: 1,
      filtro: ""
    };
  }

  private ehJpeg(buffer: Buffer) {
    return buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
  }

  private ehPng(buffer: Buffer) {
    return buffer.length > 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }

  private converterPngParaRgb(buffer: Buffer) {
    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    const idat: Buffer[] = [];

    while (offset < buffer.length - 8) {
      const length = buffer.readUInt32BE(offset);
      const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
      const data = buffer.subarray(offset + 8, offset + 8 + length);

      if (type === "IHDR") {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data[8];
        colorType = data[9];
      }

      if (type === "IDAT") {
        idat.push(data);
      }

      if (type === "IEND") {
        break;
      }

      offset += length + 12;
    }

    const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
    if (!width || !height || bitDepth !== 8 || !channels || !idat.length) {
      return null;
    }

    const raw = inflateSync(Buffer.concat(idat));
    const stride = width * channels;
    const linhas: Buffer[] = [];
    let rawOffset = 0;
    let anterior = Buffer.alloc(stride);

    for (let y = 0; y < height; y += 1) {
      const filtro = raw[rawOffset];
      rawOffset += 1;
      const atual = Buffer.from(raw.subarray(rawOffset, rawOffset + stride));
      rawOffset += stride;
      this.aplicarFiltroPng(atual, anterior, filtro, channels);
      linhas.push(atual);
      anterior = atual;
    }

    const rgb = Buffer.alloc(width * height * 3);
    let destino = 0;

    for (const linha of linhas) {
      for (let index = 0; index < linha.length; index += channels) {
        rgb[destino++] = linha[index];
        rgb[destino++] = linha[index + 1];
        rgb[destino++] = linha[index + 2];
      }
    }

    return { width, height, rgb };
  }

  private aplicarFiltroPng(linha: Buffer, anterior: Buffer, filtro: number, bytesPorPixel: number) {
    for (let index = 0; index < linha.length; index += 1) {
      const esquerda = index >= bytesPorPixel ? linha[index - bytesPorPixel] : 0;
      const acima = anterior[index] ?? 0;
      const acimaEsquerda = index >= bytesPorPixel ? anterior[index - bytesPorPixel] : 0;
      let ajuste = 0;

      if (filtro === 1) ajuste = esquerda;
      if (filtro === 2) ajuste = acima;
      if (filtro === 3) ajuste = Math.floor((esquerda + acima) / 2);
      if (filtro === 4) ajuste = this.paethPng(esquerda, acima, acimaEsquerda);

      linha[index] = (linha[index] + ajuste) & 0xff;
    }
  }

  private paethPng(esquerda: number, acima: number, acimaEsquerda: number) {
    const estimativa = esquerda + acima - acimaEsquerda;
    const distanciaEsquerda = Math.abs(estimativa - esquerda);
    const distanciaAcima = Math.abs(estimativa - acima);
    const distanciaAcimaEsquerda = Math.abs(estimativa - acimaEsquerda);

    if (distanciaEsquerda <= distanciaAcima && distanciaEsquerda <= distanciaAcimaEsquerda) return esquerda;
    if (distanciaAcima <= distanciaAcimaEsquerda) return acima;
    return acimaEsquerda;
  }

  private obterDimensoesJpeg(buffer: Buffer) {
    for (let offset = 2; offset < buffer.length - 9; ) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);

      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7)
        };
      }

      offset += 2 + length;
    }

    return { width: 1, height: 1 };
  }

  private obterLinhasServicoRelatorioAvulso(
    ordem: (PreviaRelatorioAvulsoCliente["maquinas"][number]["os_concluidas"][number] & {
      checklist_respostas?: Array<{ codigo: string; valor: string; observacao: string | null }>;
    }) | null
  ) {
    const linhas = (ordem?.checklist_respostas ?? [])
      .filter((resposta) => this.deveExibirRespostaRelatorioAvulso(resposta))
      .map((resposta) => {
        const observacao = resposta.observacao?.trim() ? ` (${resposta.observacao.trim()})` : "";
        return [this.obterLabelRespostaRelatorioAvulso(resposta.codigo), `${resposta.valor.trim()}${observacao}`];
      });

    if (linhas.length) {
      return linhas;
    }

    return [
      ["Problema relatado", ordem?.problema_relatado || "nao informado"],
      ["Servico realizado", ordem?.checklist?.servico_realizado || "nao informado"]
    ];
  }

  private deveExibirRespostaRelatorioAvulso(resposta: { codigo: string; valor: string }) {
    const valor = resposta.valor?.trim() ?? "";

    if (!valor || /^pendente$/i.test(valor)) {
      return false;
    }

    if (resposta.codigo === "C3" || valor.startsWith("/storage/")) {
      return false;
    }

    return true;
  }

  private obterLabelRespostaRelatorioAvulso(codigo: string) {
    return {
      C1: "Problema encontrado",
      C2: "Acao realizada",
      C4: "Pecas utilizadas",
      C5: "Observacao final",
      M1: "EPIs utilizados",
      M2: "Desligar pelo controle remoto",
      M3: "Abrir tampa frontal",
      M5: "Lavar filtros",
      M6: "Condicao dos filtros",
      M7: "Limpeza da serpentina",
      M8: "Limpeza da evaporadora",
      M9: "Dreno desobstruido",
      M10: "Bandeja do condensado",
      M11: "Reinstalar filtros",
      M12: "Fechar tampa",
      M13: "Ligar disjuntor",
      M14: "Funcao Dry se existir por 10 minutos",
      M15: "Temperatura de entrada do ar",
      M17: "Temperatura de insuflamento",
      M18: "Observacoes gerais",
      T1: "Fixacao e suportes",
      T2: "Isolamento termico",
      T3: "Conexoes eletricas",
      T4: "Teste de drenagem",
      S1: "Limpeza da condensadora",
      S2: "Foto da condensadora limpa",
      S3: "Medicao de corrente",
      S4: "Medicao de tensao",
      S5: "Estado das tubulacoes",
      S6: "Pressao do fluido refrigerante",
      S7: "Fluido refrigerante utilizado",
      A1: "Inspecao geral anual",
      A2: "Teste de rendimento",
      A3: "Avaliacao de ruido",
      A4: "Avaliacao de vibracao",
      A5: "Recomendacoes tecnicas",
      A6: "Plano de acoes",
      A7: "Relatorio consolidado anual"
    }[codigo] ?? codigo;
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

  private formatarEvidenciasPmoc(ordem: PreviaPmocCliente["maquinas"][number]["os_concluidas"][number] | null) {
    if (!ordem?.evidencias.length) {
      return "Nenhuma evidencia registrada.";
    }

    const evidenciasComArquivo = ordem.evidencias.filter((evidencia) => Boolean(evidencia.storage_url));

    if (!evidenciasComArquivo.length) {
      return "Nenhuma evidencia registrada.";
    }

    return evidenciasComArquivo
      .map((evidencia) => {
        const rotulo = evidencia.tipo === "antes" ? "Antes" : evidencia.tipo === "depois" ? "Depois" : "Foto";
        return `${rotulo} --- ${this.obterNomeArquivoPmoc(evidencia.storage_url)}`;
      })
      .join(" - ");
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

}
