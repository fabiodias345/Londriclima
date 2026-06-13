import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
  UnauthorizedException
} from "@nestjs/common";
import { AutomacaoTipo, PmocRelatorioStatus, Prisma, UsuarioRole } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AdminService } from "../admin/admin.service";
import { PasswordHashService } from "../auth/password-hash.service";
import { ConsultarEquipamentoDto } from "./dto/consultar-equipamento.dto";
import { CriarPreChamadoDto } from "./dto/criar-pre-chamado.dto";

const EMPRESA_PILOTO_CNPJ = "00000000000000";

@Injectable()
export class SiteService {
  private readonly passwordHash = new PasswordHashService();

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(AdminService)
    private readonly adminService?: Pick<AdminService, "gerarPdfPmocCliente">
  ) {}

  async criarPreChamado(dto: CriarPreChamadoDto) {
    const empresa = await this.prisma.empresa.findUnique({
      where: {
        cnpj: EMPRESA_PILOTO_CNPJ
      },
      select: {
        id: true
      }
    });

    if (!empresa) {
      throw new NotFoundException("Empresa piloto não encontrada.");
    }

    const telefone = this.normalizarTelefone(dto.telefone);
    const local = this.parseLocal(dto.local);

    const clienteExistente = await this.prisma.cliente.findFirst({
      where: {
        empresaId: empresa.id,
        telefone
      },
      select: {
        id: true
      }
    });

    const resultado = await this.prisma.$transaction(async (tx) => {
      const cliente = clienteExistente
        ? await tx.cliente.update({
            where: {
              id: clienteExistente.id
            },
            data: {
              nome: dto.nome,
              telefone
            },
            select: {
              id: true
            }
          })
        : await tx.cliente.create({
            data: {
              empresaId: empresa.id,
              tipo: "pf",
              nome: dto.nome,
              telefone
            },
            select: {
              id: true
            }
          });

      const endereco = await tx.clienteEndereco.create({
        data: {
          empresaId: empresa.id,
          clienteId: cliente.id,
          nome: "Endereço informado no site",
          logradouro: local.logradouro,
          bairro: local.bairro,
          cidade: local.cidade,
          uf: "PR"
        },
        select: {
          id: true
        }
      });

      const ordemServico = await tx.ordemServico.create({
        data: {
          empresaId: empresa.id,
          clienteId: cliente.id,
          enderecoId: endereco.id,
          status: "pre_chamado",
          titulo: dto.servico,
          problemaRelatado: dto.detalhes?.trim() || "Solicitação criada pelo site."
        },
        select: {
          id: true,
          status: true,
          criadaEm: true
        }
      });

      await tx.ordemServicoEvento.create({
        data: {
          empresaId: empresa.id,
          ordemServicoId: ordemServico.id,
          acao: "criar_pre_chamado",
          statusNovo: "pre_chamado",
          registradoEm: ordemServico.criadaEm
        }
      });

      return ordemServico;
    });

    return {
      pre_chamado_id: resultado.id,
      status: resultado.status,
      mensagem: "Pré-chamado registrado. A equipe AIRMOVEBR retornará pelo WhatsApp.",
      criado_em: resultado.criadaEm.toISOString()
    };
  }

  async consultarEquipamentoPublico(codigoPublico: string, dto: ConsultarEquipamentoDto) {
    const equipamento = await this.prisma.equipamento.findUnique({
      where: {
        codigoPublico
      },
      select: {
        id: true,
        codigoPublico: true,
        senhaPublicaHash: true,
        acessoPublicoAtivo: true,
        tipo: true,
        marca: true,
        modelo: true,
        capacidadeBtu: true,
        gasRefrigerante: true,
        numeroSerie: true,
        localInstalacao: true,
        atualizadoEm: true,
        cliente: {
          select: {
            nome: true
          }
        },
        ordensServico: {
          orderBy: {
            atualizadaEm: "desc"
          },
          take: 5,
          select: {
            id: true,
            status: true,
            titulo: true,
            agendadaPara: true,
            concluidaEm: true,
            atualizadaEm: true
          }
        }
      }
    });

    if (!equipamento || !equipamento.acessoPublicoAtivo || !equipamento.senhaPublicaHash) {
      throw new NotFoundException("Equipamento nao encontrado.");
    }

    const senhaValida = await this.passwordHash.verify(dto.senha, equipamento.senhaPublicaHash);

    if (!senhaValida) {
      throw new UnauthorizedException("Senha invalida.");
    }

    const ultimaOs = equipamento.ordensServico[0] ?? null;

    return {
      codigo_publico: equipamento.codigoPublico,
      cliente: {
        nome: equipamento.cliente.nome
      },
      equipamento: {
        tipo: equipamento.tipo,
        marca: equipamento.marca,
        modelo: equipamento.modelo,
        capacidade_btu: equipamento.capacidadeBtu,
        gas_refrigerante: equipamento.gasRefrigerante,
        numero_serie: equipamento.numeroSerie,
        local_instalacao: equipamento.localInstalacao
      },
      manutencao: {
        status: ultimaOs?.status ?? "sem_historico",
        ultima_atualizacao: ultimaOs?.atualizadaEm.toISOString() ?? equipamento.atualizadoEm.toISOString(),
        ultima_os: ultimaOs
          ? {
              titulo: ultimaOs.titulo,
              status: ultimaOs.status,
              agendada_para: ultimaOs.agendadaPara?.toISOString() ?? null,
              concluida_em: ultimaOs.concluidaEm?.toISOString() ?? null
            }
          : null
      },
      historico: equipamento.ordensServico.map((ordem) => ({
        titulo: ordem.titulo,
        status: ordem.status,
        agendada_para: ordem.agendadaPara?.toISOString() ?? null,
        concluida_em: ordem.concluidaEm?.toISOString() ?? null,
        atualizada_em: ordem.atualizadaEm.toISOString()
      }))
    };
  }

  async consultarAssinaturaPmoc(token: string) {
    const relatorio = await this.prisma.pmocRelatorio.findUnique({
      where: {
        tokenAssinatura: token
      },
      select: {
        id: true,
        status: true,
        pdfHash: true,
        assinadoEm: true,
        emailCliente: true,
        emailAgendadoEm: true,
        historicoFinalizadoEm: true,
        cliente: {
          select: {
            nome: true,
            email: true
          }
        },
        engenheiroResponsavel: {
          select: {
            nome: true,
            cpf: true,
            crea: true,
            email: true
          }
        }
      }
    });

    if (!relatorio) {
      throw new NotFoundException("Relatorio PMOC nao encontrado.");
    }

    return this.mapearAssinaturaPmoc(relatorio);
  }

  async confirmarAssinaturaPmoc(token: string) {
    const relatorio = await this.prisma.pmocRelatorio.findUnique({
      where: {
        tokenAssinatura: token
      },
      select: {
        id: true,
        empresaId: true,
        clienteId: true,
        status: true,
        pdfHash: true,
        emailCliente: true,
        emailAgendadoEm: true,
        historicoFinalizadoEm: true,
        cliente: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        engenheiroResponsavel: {
          select: {
            nome: true,
            cpf: true,
            crea: true,
            email: true
          }
        }
      }
    });

    if (!relatorio) {
      throw new NotFoundException("Relatorio PMOC nao encontrado.");
    }

    if (relatorio.status === PmocRelatorioStatus.assinado) {
      return {
        id: relatorio.id,
        status: relatorio.status,
        email_cliente: relatorio.emailCliente,
        email_agendado: Boolean(relatorio.emailAgendadoEm),
        historico_finalizado: Boolean(relatorio.historicoFinalizadoEm)
      };
    }

    if (relatorio.status !== PmocRelatorioStatus.aguardando_assinatura_engenheiro) {
      throw new ConflictException("Relatorio PMOC nao esta aguardando assinatura.");
    }

    if (!relatorio.cliente.email) {
      throw new BadRequestException("Cliente sem e-mail para envio final.");
    }

    const agora = new Date();
    if (!this.adminService) {
      throw new InternalServerErrorException("Gerador de PDF PMOC indisponivel.");
    }

    const pdf = await this.adminService.gerarPdfPmocCliente(relatorio.clienteId, {
      id: "sistema",
      empresa_id: relatorio.empresaId,
      email: "sistema@airmovebr.local",
      role: UsuarioRole.admin
    });

    if (!pdf.buffer.length) {
      throw new InternalServerErrorException("PDF PMOC vazio.");
    }

    const payload: Prisma.JsonObject = {
      tipo: "pmoc_relatorio_assinado",
      relatorio_id: relatorio.id,
      cliente_id: relatorio.clienteId,
      cliente_nome: relatorio.cliente.nome,
      cliente_email: relatorio.cliente.email,
      data_envio: agora.toISOString(),
      engenheiro_nome: relatorio.engenheiroResponsavel.nome,
      engenheiro_cpf: relatorio.engenheiroResponsavel.cpf,
      engenheiro_crea: relatorio.engenheiroResponsavel.crea,
      pdf_hash: relatorio.pdfHash,
      pdf_filename: pdf.filename,
      pdf_base64: pdf.buffer.toString("base64")
    };

    const assinado = await this.prisma.$transaction(async (tx) => {
      const atualizado = await tx.pmocRelatorio.update({
        where: {
          id: relatorio.id
        },
        data: {
          status: PmocRelatorioStatus.assinado,
          assinadoEm: agora,
          emailCliente: relatorio.cliente.email,
          emailAgendadoEm: agora,
          historicoFinalizadoEm: agora
        },
        select: {
          id: true,
          status: true,
          pdfHash: true,
          assinadoEm: true,
          emailCliente: true,
          emailAgendadoEm: true,
          historicoFinalizadoEm: true
        }
      });

      await tx.automacaoAgendada.create({
        data: {
          empresaId: relatorio.empresaId,
          tipo: AutomacaoTipo.enviar_email,
          executarEm: agora,
          payload
        }
      });

      return atualizado;
    });

    return {
      id: assinado.id,
      status: assinado.status,
      pdf_hash: assinado.pdfHash,
      assinado_em: assinado.assinadoEm?.toISOString() ?? null,
      email_cliente: assinado.emailCliente,
      email_agendado: Boolean(assinado.emailAgendadoEm),
      historico_finalizado: Boolean(assinado.historicoFinalizadoEm)
    };
  }

  private normalizarTelefone(telefone: string) {
    return telefone.replace(/\D/g, "");
  }

  private parseLocal(local: string) {
    const [bairro, cidade] = local.split(",").map((parte) => parte.trim());

    return {
      logradouro: local.trim(),
      bairro: bairro || null,
      cidade: cidade || "Londrina"
    };
  }

  private mapearAssinaturaPmoc(relatorio: {
    id: string;
    status: PmocRelatorioStatus;
    pdfHash: string;
    assinadoEm: Date | null;
    emailCliente?: string | null;
    emailAgendadoEm?: Date | null;
    historicoFinalizadoEm?: Date | null;
    cliente: {
      nome: string;
      email: string | null;
    };
    engenheiroResponsavel: {
      nome: string;
      crea: string;
      email: string;
    };
  }) {
    return {
      id: relatorio.id,
      status: relatorio.status,
      pdf_hash: relatorio.pdfHash,
      assinado_em: relatorio.assinadoEm?.toISOString() ?? null,
      email_cliente: relatorio.emailCliente ?? null,
      email_agendado_em: relatorio.emailAgendadoEm?.toISOString() ?? null,
      historico_finalizado_em: relatorio.historicoFinalizadoEm?.toISOString() ?? null,
      cliente: {
        nome: relatorio.cliente.nome,
        email: relatorio.cliente.email
      },
      engenheiro_responsavel: {
        nome: relatorio.engenheiroResponsavel.nome,
        crea: relatorio.engenheiroResponsavel.crea,
        email: relatorio.engenheiroResponsavel.email
      }
    };
  }
}
