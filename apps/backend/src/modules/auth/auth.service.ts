import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { FinalizarPrimeiroAcessoDto } from "./dto/finalizar-primeiro-acesso.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { PasswordHashService } from "./password-hash.service";
import { TokenPayload, TokenService } from "./token.service";
import { CadastroFuncionarioArquivo, FuncionarioStorageService } from "./funcionario-storage.service";
import { FuncionarioTermoService, TERMO_RESPONSABILIDADE_VERSAO } from "./funcionario-termo.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHashService: PasswordHashService,
    private readonly tokenService: TokenService,
    private readonly funcionarioStorageService: FuncionarioStorageService,
    private readonly funcionarioTermoService: FuncionarioTermoService
  ) {}

  async login(dto: LoginDto) {
    const identificador = (dto.login?.trim() || dto.email?.trim() || "").toLowerCase();
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ login: identificador }, { email: identificador }],
        ativo: true,
        empresa: {
          ativa: true
        }
      },
      select: {
        id: true,
        empresaId: true,
        nome: true,
        login: true,
        email: true,
        senhaHash: true,
        role: true,
        primeiroAcessoPendente: true
      }
    });

    if (!usuario) {
      throw new UnauthorizedException("Credenciais invalidas.");
    }

    const senhaValida = await this.passwordHashService.verify(dto.senha, usuario.senhaHash);

    if (!senhaValida) {
      throw new UnauthorizedException("Credenciais invalidas.");
    }

    if (usuario.primeiroAcessoPendente) {
      const onboardingToken = this.tokenService.sign(
        {
          sub: usuario.id,
          empresa_id: usuario.empresaId,
          email: usuario.email,
          role: usuario.role
        },
        "onboarding"
      );

      return {
        onboarding_required: true,
        onboarding_token: onboardingToken.token,
        expires_in: onboardingToken.expiresIn,
        usuario: {
          id: usuario.id,
          empresa_id: usuario.empresaId,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role
        }
      };
    }

    await this.prisma.usuario.update({
      where: {
        id: usuario.id
      },
      data: {
        ultimoLoginEm: new Date()
      }
    });

    return this.criarRespostaAutenticacao(
      {
        sub: usuario.id,
        empresa_id: usuario.empresaId,
        email: usuario.email,
        role: usuario.role
      },
      {
        id: usuario.id,
        empresa_id: usuario.empresaId,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      }
    );
  }

  async finalizarPrimeiroAcesso(
    dto: FinalizarPrimeiroAcessoDto,
    arquivos: { foto?: CadastroFuncionarioArquivo; assinatura?: CadastroFuncionarioArquivo }
  ) {
    const payload = this.tokenService.verify(dto.onboarding_token, "onboarding");
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        id: payload.sub,
        ativo: true,
        primeiroAcessoPendente: true,
        empresa: {
          ativa: true
        }
      },
      select: {
        id: true,
        empresaId: true,
        nome: true,
        email: true,
        role: true
      }
    });

    if (!usuario) {
      throw new UnauthorizedException("Token invalido.");
    }

    if (!dto.termo_aceito) {
      throw new BadRequestException("O aceite do termo de responsabilidade e obrigatorio.");
    }

    const aceitoEm = new Date();
    const [senhaHash, storage] = await Promise.all([
      this.passwordHashService.hash(dto.senha),
      this.funcionarioStorageService.salvarCadastro({
        empresaId: usuario.empresaId,
        usuarioId: usuario.id,
        foto: arquivos.foto,
        assinatura: arquivos.assinatura
      })
    ]);
    const termo = this.funcionarioTermoService.gerar({
      nome: dto.nome.trim(),
      cpf: dto.cpf,
      aceitoEm,
      foto: arquivos.foto!.buffer,
      assinatura: arquivos.assinatura!.buffer
    });
    const termoStorageUrl = await this.funcionarioStorageService.salvarDocumentoPdf({
      empresaId: usuario.empresaId,
      usuarioId: usuario.id,
      nomeArquivo: `termo-responsabilidade-${TERMO_RESPONSABILIDADE_VERSAO}.pdf`,
      pdf: termo.pdf
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: usuario.id },
        data: {
          senhaHash,
          nome: dto.nome.trim(),
          cpf: dto.cpf,
          telefone: dto.telefone,
          fotoPerfilStorageUrl: storage.fotoStorageUrl,
          assinaturaStorageUrl: storage.assinaturaStorageUrl,
          primeiroAcessoPendente: false,
          primeiroAcessoEm: aceitoEm,
          ultimoLoginEm: aceitoEm
        }
      });
      await tx.funcionarioDocumento.create({
        data: {
          empresaId: usuario.empresaId,
          usuarioId: usuario.id,
          tipo: "termo_responsabilidade_app",
          versao: TERMO_RESPONSABILIDADE_VERSAO,
          nomeFuncionario: dto.nome.trim(),
          cpf: dto.cpf,
          storageUrl: termoStorageUrl,
          sha256: termo.sha256,
          aceitoEm
        }
      });
    });

    return this.criarRespostaAutenticacao(
      {
        sub: usuario.id,
        empresa_id: usuario.empresaId,
        email: usuario.email,
        role: usuario.role
      },
      {
        id: usuario.id,
        empresa_id: usuario.empresaId,
        nome: dto.nome.trim(),
        email: usuario.email,
        role: usuario.role
      }
    );
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = this.tokenService.verify(dto.refresh_token, "refresh");
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        id: payload.sub,
        ativo: true,
        empresa: {
          ativa: true
        }
      },
      select: {
        id: true,
        empresaId: true,
        nome: true,
        email: true,
        role: true
      }
    });

    if (!usuario) {
      throw new UnauthorizedException("Refresh token invalido.");
    }

    return this.criarRespostaAutenticacao(
      {
        sub: usuario.id,
        empresa_id: usuario.empresaId,
        email: usuario.email,
        role: usuario.role
      },
      {
        id: usuario.id,
        empresa_id: usuario.empresaId,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      }
    );
  }

  private criarRespostaAutenticacao(
    payload: TokenPayload,
    usuario: {
      id: string;
      empresa_id: string;
      nome: string;
      email: string;
      role: string;
    }
  ) {
    const accessToken = this.tokenService.sign(payload, "access");
    const refreshToken = this.tokenService.sign(payload, "refresh");

    return {
      access_token: accessToken.token,
      refresh_token: refreshToken.token,
      token_type: "Bearer",
      expires_in: accessToken.expiresIn,
      usuario
    };
  }
}
