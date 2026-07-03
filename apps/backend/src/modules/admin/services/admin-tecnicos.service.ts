import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UsuarioRole } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { PasswordHashService } from "../../auth/password-hash.service";
import { FuncionarioStorageService } from "../../auth/funcionario-storage.service";
import { SalvarTecnicoDto } from "../dto/salvar-tecnico.dto";

@Injectable()
export class AdminTecnicosService {
  private readonly passwordHash = new PasswordHashService();
  private readonly rolesAcesso = [UsuarioRole.admin, UsuarioRole.tecnico, UsuarioRole.auxiliar];

  constructor(private readonly prisma: PrismaService, private readonly storage?: FuncionarioStorageService) {}

  async listarTecnicos(usuario: AuthenticatedUser) {
    const tecnicos = await this.prisma.usuario.findMany({
      where: {
        empresaId: usuario.empresa_id,
        ativo: true,
        role: {
          in: this.rolesAcesso
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

    const login = this.normalizarLogin(dto.login);
    await this.garantirLoginDisponivel(login);

    const tecnico = await this.prisma.usuario.create({
      data: {
        empresaId: usuario.empresa_id,
        nome: dto.nome.trim(),
        login,
        email: dto.email.trim().toLowerCase(),
        telefone: this.digitosOuNulo(dto.telefone),
        senhaHash: await this.passwordHash.hash(dto.senha),
        role: this.normalizarRoleTecnico(dto.role),
        ativo: true,
        primeiroAcessoPendente: true
      },
      select: this.tecnicoSelect()
    });

    return this.mapearTecnico(tecnico);
  }

  async atualizarTecnico(tecnicoId: string, dto: SalvarTecnicoDto, usuario: AuthenticatedUser) {
    await this.garantirAcessoDaEmpresa(tecnicoId, usuario);
    const login = this.normalizarLogin(dto.login);
    await this.garantirLoginDisponivel(login, tecnicoId);

    const data: Prisma.UsuarioUpdateInput = {
      nome: dto.nome.trim(),
      login,
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
    const acesso = await this.garantirAcessoDaEmpresa(tecnicoId, usuario);
    if (acesso.role === UsuarioRole.admin) {
      const totalAdminsAtivos = await this.prisma.usuario.count({
        where: {
          empresaId: usuario.empresa_id,
          ativo: true,
          role: UsuarioRole.admin
        }
      });

      if (totalAdminsAtivos <= 1) {
        throw new BadRequestException("Nao e possivel apagar o unico admin ativo.");
      }
    }

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

  private async garantirAcessoDaEmpresa(tecnicoId: string, usuario: AuthenticatedUser) {
    const tecnico = await this.prisma.usuario.findFirst({
      where: {
        id: tecnicoId,
        empresaId: usuario.empresa_id,
        role: {
          in: this.rolesAcesso
        }
      },
      select: {
        id: true,
        role: true
      }
    });

    if (!tecnico) {
      throw new NotFoundException("Acesso nao encontrado.");
    }

    return tecnico;
  }

  private normalizarRoleTecnico(role?: "admin" | "tecnico" | "auxiliar") {
    if (role === "admin") {
      return UsuarioRole.admin;
    }
    return role === "auxiliar" ? UsuarioRole.auxiliar : UsuarioRole.tecnico;
  }

  private tecnicoSelect() {
    return {
      id: true,
      nome: true,
      login: true,
      email: true,
      telefone: true,
      cpf: true,
      role: true,
      ativo: true,
      primeiroAcessoPendente: true,
      primeiroAcessoEm: true,
      fotoPerfilStorageUrl: true,
      assinaturaStorageUrl: true,
      documentosFuncionario: {
        orderBy: { aceitoEm: "desc" as const },
        select: {
          id: true,
          tipo: true,
          versao: true,
          sha256: true,
          aceitoEm: true
        }
      },
      criadoEm: true,
      atualizadoEm: true
    } satisfies Prisma.UsuarioSelect;
  }

  private mapearTecnico(tecnico: {
    id: string;
    nome: string;
    login: string | null;
    email: string;
    telefone: string | null;
    cpf: string | null;
    role: UsuarioRole;
    ativo: boolean;
    primeiroAcessoPendente: boolean;
    primeiroAcessoEm: Date | null;
    fotoPerfilStorageUrl: string | null;
    assinaturaStorageUrl: string | null;
    documentosFuncionario?: Array<{ id: string; tipo: string; versao: string; sha256: string; aceitoEm: Date }>;
    criadoEm: Date;
    atualizadoEm: Date;
  }) {
    return {
      id: tecnico.id,
      nome: tecnico.nome,
      login: tecnico.login,
      email: tecnico.email,
      telefone: tecnico.telefone,
      cpf: tecnico.cpf,
      role: tecnico.role,
      ativo: tecnico.ativo,
      primeiro_acesso_pendente: tecnico.primeiroAcessoPendente,
      primeiro_acesso_em: tecnico.primeiroAcessoEm?.toISOString() ?? null,
      foto_perfil_storage_url: tecnico.fotoPerfilStorageUrl,
      assinatura_storage_url: tecnico.assinaturaStorageUrl,
      documentos: (tecnico.documentosFuncionario ?? []).map((documento) => ({
        id: documento.id,
        tipo: documento.tipo,
        versao: documento.versao,
        sha256: documento.sha256,
        aceito_em: documento.aceitoEm.toISOString()
      })),
      criado_em: tecnico.criadoEm.toISOString(),
      atualizado_em: tecnico.atualizadoEm.toISOString()
    };
  }

  async obterDocumentoFuncionario(
    tecnicoId: string,
    documentoId: string,
    usuario: AuthenticatedUser
  ) {
    const documento = await this.prisma.funcionarioDocumento.findFirst({
      where: {
        id: documentoId,
        usuarioId: tecnicoId,
        empresaId: usuario.empresa_id
      },
      select: {
        storageUrl: true,
        versao: true
      }
    });
    if (!documento) throw new NotFoundException("Documento do funcionario nao encontrado.");
    if (!this.storage) throw new NotFoundException("Storage de documentos indisponivel.");
    return {
      filename: `termo-responsabilidade-${documento.versao}.pdf`,
      buffer: await this.storage.carregarDocumento(documento.storageUrl)
    };
  }

  private digitosOuNulo(valor?: string) {
    const digitos = valor?.replace(/\D/g, "");
    return digitos ? digitos : null;
  }

  private normalizarLogin(valor: string) {
    return valor.trim().toLowerCase();
  }

  private async garantirLoginDisponivel(login: string, tecnicoId?: string) {
    const existente = await this.prisma.usuario.findFirst({
      where: {
        login,
        ...(tecnicoId ? { NOT: { id: tecnicoId } } : {})
      },
      select: { id: true }
    });

    if (existente) {
      throw new ConflictException("Login ja cadastrado.");
    }
  }
}
