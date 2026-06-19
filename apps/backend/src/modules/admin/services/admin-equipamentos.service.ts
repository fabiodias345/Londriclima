import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { OrdemServicoStatus, Prisma } from "@prisma/client";
import { randomBytes, randomInt } from "node:crypto";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { PasswordHashService } from "../../auth/password-hash.service";
import { SalvarEquipamentoDto } from "../dto/salvar-equipamento.dto";

const STATUS_OS_OPERACIONAIS: OrdemServicoStatus[] = [
  OrdemServicoStatus.aberta,
  OrdemServicoStatus.em_deslocamento,
  OrdemServicoStatus.em_atendimento
];

@Injectable()
export class AdminEquipamentosService {
  private readonly passwordHash = new PasswordHashService();

  constructor(private readonly prisma: PrismaService) {}

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
      os_abertas: equipamento.ordensServico.filter((ordem) => STATUS_OS_OPERACIONAIS.includes(ordem.status)).length
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
}
