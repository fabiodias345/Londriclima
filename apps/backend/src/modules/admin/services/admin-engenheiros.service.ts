import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { SalvarEngenheiroResponsavelDto } from "../dto/salvar-engenheiro-responsavel.dto";

@Injectable()
export class AdminEngenheirosService {
  constructor(private readonly prisma: PrismaService) {}

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
}
