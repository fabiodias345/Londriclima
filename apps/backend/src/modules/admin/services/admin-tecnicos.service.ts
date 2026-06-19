import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UsuarioRole } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { PasswordHashService } from "../../auth/password-hash.service";
import { SalvarTecnicoDto } from "../dto/salvar-tecnico.dto";

@Injectable()
export class AdminTecnicosService {
  private readonly passwordHash = new PasswordHashService();

  constructor(private readonly prisma: PrismaService) {}

  async listarTecnicos(usuario: AuthenticatedUser) {
    const tecnicos = await this.prisma.usuario.findMany({
      where: {
        empresaId: usuario.empresa_id,
        ativo: true,
        role: {
          in: [UsuarioRole.tecnico, UsuarioRole.auxiliar]
        }
      },
      orderBy: {
        nome: "asc"
      },
      select: this.tecnicoSelect()
    });

    return {
      total: tecnicos.length,
      items: tecnicos.map((tecnico) => this.mapearTecnico(tecnico))
    };
  }

  async criarTecnico(dto: SalvarTecnicoDto, usuario: AuthenticatedUser) {
    if (!dto.senha?.trim()) {
      throw new BadRequestException("Senha inicial e obrigatoria.");
    }

    const tecnico = await this.prisma.usuario.create({
      data: {
        empresaId: usuario.empresa_id,
        nome: dto.nome.trim(),
        email: dto.email.trim().toLowerCase(),
        telefone: this.digitosOuNulo(dto.telefone),
        senhaHash: await this.passwordHash.hash(dto.senha),
        role: this.normalizarRoleTecnico(dto.role),
        ativo: true
      },
      select: this.tecnicoSelect()
    });

    return this.mapearTecnico(tecnico);
  }

  async atualizarTecnico(tecnicoId: string, dto: SalvarTecnicoDto, usuario: AuthenticatedUser) {
    await this.garantirTecnicoDaEmpresa(tecnicoId, usuario);

    const data: Prisma.UsuarioUpdateInput = {
      nome: dto.nome.trim(),
      email: dto.email.trim().toLowerCase(),
      telefone: this.digitosOuNulo(dto.telefone),
      role: this.normalizarRoleTecnico(dto.role)
    };

    if (dto.senha?.trim()) {
      data.senhaHash = await this.passwordHash.hash(dto.senha);
    }

    const tecnico = await this.prisma.usuario.update({
      where: {
        id: tecnicoId
      },
      data,
      select: this.tecnicoSelect()
    });

    return this.mapearTecnico(tecnico);
  }

  async apagarTecnico(tecnicoId: string, usuario: AuthenticatedUser) {
    await this.garantirTecnicoDaEmpresa(tecnicoId, usuario);

    const tecnico = await this.prisma.usuario.update({
      where: {
        id: tecnicoId
      },
      data: {
        ativo: false
      },
      select: {
        id: true
      }
    });

    return {
      id: tecnico.id,
      apagado: true
    };
  }

  private async garantirTecnicoDaEmpresa(tecnicoId: string, usuario: AuthenticatedUser) {
    const tecnico = await this.prisma.usuario.findFirst({
      where: {
        id: tecnicoId,
        empresaId: usuario.empresa_id,
        role: {
          in: [UsuarioRole.tecnico, UsuarioRole.auxiliar]
        }
      },
      select: {
        id: true
      }
    });

    if (!tecnico) {
      throw new NotFoundException("Tecnico nao encontrado.");
    }
  }

  private normalizarRoleTecnico(role?: "tecnico" | "auxiliar") {
    return role === "auxiliar" ? UsuarioRole.auxiliar : UsuarioRole.tecnico;
  }

  private tecnicoSelect() {
    return {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      role: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true
    } satisfies Prisma.UsuarioSelect;
  }

  private mapearTecnico(tecnico: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
    role: UsuarioRole;
    ativo: boolean;
    criadoEm: Date;
    atualizadoEm: Date;
  }) {
    return {
      id: tecnico.id,
      nome: tecnico.nome,
      email: tecnico.email,
      telefone: tecnico.telefone,
      role: tecnico.role,
      ativo: tecnico.ativo,
      criado_em: tecnico.criadoEm.toISOString(),
      atualizado_em: tecnico.atualizadoEm.toISOString()
    };
  }

  private digitosOuNulo(valor?: string) {
    const digitos = valor?.replace(/\D/g, "");
    return digitos ? digitos : null;
  }
}
