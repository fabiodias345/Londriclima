import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { OrdemServicoStatus, PessoaTipo, Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { SalvarClienteDto } from "../dto/salvar-cliente.dto";

const STATUS_OS_OPERACIONAIS: OrdemServicoStatus[] = [
  OrdemServicoStatus.aberta,
  OrdemServicoStatus.em_deslocamento,
  OrdemServicoStatus.em_atendimento
];

@Injectable()
export class AdminClientesService {
  constructor(private readonly prisma: PrismaService) {}

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
        equipes: {
          select: {
            equipe: {
              select: {
                id: true,
                nome: true,
                ativa: true
              }
            }
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
        equipes: (cliente.equipes || []).map((vinculo) => vinculo.equipe),
        atualizado_em: cliente.atualizadoEm.toISOString(),
        endereco: cliente.enderecos[0] ?? null,
        total_equipamentos: cliente.equipamentos.length,
        total_os: cliente.ordensServico.length,
        os_abertas: cliente.ordensServico.filter((ordem) => STATUS_OS_OPERACIONAIS.includes(ordem.status)).length
      }))
    };
  }

  async criarCliente(dto: SalvarClienteDto, usuario: AuthenticatedUser) {
    this.validarCadastroCliente(dto);
    await this.validarVinculoPmoc(dto, usuario);
    await this.validarEquipesDaEmpresa(dto.equipe_ids, usuario);

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

      await this.sincronizarEquipesCliente(tx, criado.id, dto.equipe_ids || [], usuario);

      return criado;
    });

    return this.obterClientePorId(cliente.id, usuario);
  }

  async atualizarCliente(clienteId: string, dto: SalvarClienteDto, usuario: AuthenticatedUser) {
    this.validarCadastroCliente(dto);
    await this.validarVinculoPmoc(dto, usuario);
    await this.validarEquipesDaEmpresa(dto.equipe_ids, usuario);

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

      await this.sincronizarEquipesCliente(tx, clienteId, dto.equipe_ids || [], usuario);
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

  private async validarEquipesDaEmpresa(equipeIds: string[] | undefined, usuario: AuthenticatedUser) {
    const ids = this.obterIdsUnicos(equipeIds || []);

    if (!ids.length) {
      return;
    }

    const total = await this.prisma.equipe.count({
      where: {
        id: {
          in: ids
        },
        empresaId: usuario.empresa_id,
        ativa: true
      }
    });

    if (total !== ids.length) {
      throw new NotFoundException("Equipe nao encontrada.");
    }
  }

  private async sincronizarEquipesCliente(
    tx: Prisma.TransactionClient,
    clienteId: string,
    equipeIds: string[],
    usuario: AuthenticatedUser
  ) {
    await tx.clienteEquipe.deleteMany({
      where: {
        clienteId,
        empresaId: usuario.empresa_id
      }
    });

    const ids = this.obterIdsUnicos(equipeIds);

    if (!ids.length) {
      return;
    }

    await tx.clienteEquipe.createMany({
      data: ids.map((equipeId, index) => ({
        empresaId: usuario.empresa_id,
        clienteId,
        equipeId,
        principal: index === 0
      })),
      skipDuplicates: true
    });
  }

  private obterIdsUnicos(ids: Array<string | undefined>) {
    return [...new Set(ids.map((id) => id?.trim()).filter((id): id is string => Boolean(id)))];
  }

  private async validarVinculoPmoc(dto: SalvarClienteDto, usuario: AuthenticatedUser) {
    if (dto.pmoc_ativo !== true) {
      return;
    }

    if (!dto.engenheiro_responsavel_id?.trim()) {
      throw new BadRequestException("Cliente PMOC precisa de engenheiro responsavel.");
    }

    const engenheiro = await this.prisma.engenheiroResponsavel.findFirst({
      where: {
        id: dto.engenheiro_responsavel_id,
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
