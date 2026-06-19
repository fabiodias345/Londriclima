import { Injectable, NotFoundException } from "@nestjs/common";
import { EquipeMembroFuncao, Prisma, UsuarioRole } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { SalvarEquipeDto } from "../dto/salvar-equipe.dto";

@Injectable()
export class AdminEquipesService {
  constructor(private readonly prisma: PrismaService) {}

  async listarEquipes(usuario: AuthenticatedUser) {
    const equipes = await this.prisma.equipe.findMany({
      where: {
        empresaId: usuario.empresa_id,
        ativa: true
      },
      orderBy: {
        nome: "asc"
      },
      select: this.equipeSelect()
    });

    return {
      total: equipes.length,
      items: equipes.map((equipe) => this.mapearEquipe(equipe))
    };
  }

  async criarEquipe(dto: SalvarEquipeDto, usuario: AuthenticatedUser) {
    await this.validarEquipePayload(dto, usuario);

    const equipe = await this.prisma.$transaction(async (tx) => {
      const criada = await tx.equipe.create({
        data: {
          empresaId: usuario.empresa_id,
          nome: dto.nome.trim(),
          ativa: dto.ativa !== false
        },
        select: {
          id: true
        }
      });

      await this.sincronizarEquipeRelacionamentos(tx, criada.id, dto, usuario);
      return criada;
    });

    return this.obterEquipePorId(equipe.id, usuario);
  }

  async atualizarEquipe(equipeId: string, dto: SalvarEquipeDto, usuario: AuthenticatedUser) {
    await this.garantirEquipeDaEmpresa(equipeId, usuario);
    await this.validarEquipePayload(dto, usuario);

    await this.prisma.$transaction(async (tx) => {
      await tx.equipe.update({
        where: {
          id: equipeId
        },
        data: {
          nome: dto.nome.trim(),
          ativa: dto.ativa !== false
        }
      });

      await this.sincronizarEquipeRelacionamentos(tx, equipeId, dto, usuario);
    });

    return this.obterEquipePorId(equipeId, usuario);
  }

  async apagarEquipe(equipeId: string, usuario: AuthenticatedUser) {
    await this.garantirEquipeDaEmpresa(equipeId, usuario);

    const equipe = await this.prisma.equipe.update({
      where: {
        id: equipeId
      },
      data: {
        ativa: false
      },
      select: {
        id: true
      }
    });

    return {
      id: equipe.id,
      apagado: true
    };
  }

  private async garantirEquipeDaEmpresa(equipeId: string, usuario: AuthenticatedUser) {
    const equipe = await this.prisma.equipe.findFirst({
      where: {
        id: equipeId,
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

  private async obterEquipePorId(equipeId: string, usuario: AuthenticatedUser) {
    const equipe = await this.prisma.equipe.findFirst({
      where: {
        id: equipeId,
        empresaId: usuario.empresa_id
      },
      select: this.equipeSelect()
    });

    if (!equipe) {
      throw new NotFoundException("Equipe nao encontrada.");
    }

    return this.mapearEquipe(equipe);
  }

  private async validarEquipePayload(dto: SalvarEquipeDto, usuario: AuthenticatedUser) {
    const clienteIds = this.obterIdsUnicos(dto.cliente_ids || []);
    const usuarioIds = this.obterIdsUnicos((dto.membros || []).map((membro) => membro.usuario_id));

    if (clienteIds.length > 0) {
      const totalClientes = await this.prisma.cliente.count({
        where: {
          id: {
            in: clienteIds
          },
          empresaId: usuario.empresa_id
        }
      });

      if (totalClientes !== clienteIds.length) {
        throw new NotFoundException("Cliente nao encontrado.");
      }
    }

    if (usuarioIds.length > 0) {
      const totalUsuarios = await this.prisma.usuario.count({
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

      if (totalUsuarios !== usuarioIds.length) {
        throw new NotFoundException("Tecnico nao encontrado.");
      }
    }
  }

  private async sincronizarEquipeRelacionamentos(
    tx: Prisma.TransactionClient,
    equipeId: string,
    dto: SalvarEquipeDto,
    usuario: AuthenticatedUser
  ) {
    await tx.clienteEquipe.deleteMany({
      where: {
        equipeId,
        empresaId: usuario.empresa_id
      }
    });

    await tx.equipeMembro.deleteMany({
      where: {
        equipeId,
        empresaId: usuario.empresa_id
      }
    });

    const clienteIds = this.obterIdsUnicos(dto.cliente_ids || []);
    const membros = this.deduplicarMembrosEquipe(dto.membros || []);

    if (clienteIds.length > 0) {
      await tx.clienteEquipe.createMany({
        data: clienteIds.map((clienteId, index) => ({
          empresaId: usuario.empresa_id,
          clienteId,
          equipeId,
          principal: index === 0
        })),
        skipDuplicates: true
      });
    }

    if (membros.length > 0) {
      await tx.equipeMembro.createMany({
        data: membros.map((membro) => ({
          empresaId: usuario.empresa_id,
          equipeId,
          usuarioId: membro.usuario_id,
          funcao: membro.funcao
        })),
        skipDuplicates: true
      });
    }
  }

  private obterIdsUnicos(ids: Array<string | undefined>) {
    return [...new Set(ids.map((id) => id?.trim()).filter((id): id is string => Boolean(id)))];
  }

  private deduplicarMembrosEquipe(membros: Array<{ usuario_id: string; funcao: "lider" | "tecnico" | "auxiliar" }>) {
    const vistos = new Set<string>();

    return membros.filter((membro) => {
      if (vistos.has(membro.usuario_id)) {
        return false;
      }

      vistos.add(membro.usuario_id);
      return true;
    });
  }

  private equipeSelect() {
    return {
      id: true,
      nome: true,
      ativa: true,
      criadoEm: true,
      atualizadoEm: true,
      clientes: {
        select: {
          cliente: {
            select: {
              id: true,
              nome: true
            }
          }
        }
      },
      membros: {
        where: {
          ativo: true
        },
        orderBy: {
          criadoEm: "asc"
        },
        select: {
          id: true,
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
      }
    } satisfies Prisma.EquipeSelect;
  }

  private mapearEquipe(equipe: {
    id: string;
    nome: string;
    ativa: boolean;
    criadoEm: Date;
    atualizadoEm: Date;
    clientes: Array<{ cliente: { id: string; nome: string } }>;
    membros: Array<{
      id: string;
      funcao: EquipeMembroFuncao;
      usuario: {
        id: string;
        nome: string;
        email: string;
        role: UsuarioRole;
      };
    }>;
  }) {
    return {
      id: equipe.id,
      nome: equipe.nome,
      ativa: equipe.ativa,
      clientes: equipe.clientes.map((vinculo) => vinculo.cliente),
      membros: equipe.membros.map((membro) => ({
        id: membro.id,
        funcao: membro.funcao,
        usuario: membro.usuario
      })),
      criado_em: equipe.criadoEm.toISOString(),
      atualizado_em: equipe.atualizadoEm.toISOString()
    };
  }
}
